'use client';
// StaffingPlan — Interactive KPI Dashboard + role cards + team summary
// + Market Rate benchmark badges (Feature 7 — feature/enriched)
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Users, TrendingUp, DollarSign, Flame, Search, Plus, Trash2,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Minus,
  BarChart2, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
  ReferenceLine, ReferenceArea,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import type { IBMBand, StaffingRole, DeployCategory, ProjectPhase } from '@/types';

// ── Palette ────────────────────────────────────────────────────
const INDIGO = '#6366F1';

// ── Chart colour palette ──────────────────────────────────────
const CHART_COLORS = ['#6366F1','#10B981','#8B5CF6','#F59E0B','#06B6D4','#F43F5E','#3B82F6','#EC4899','#14B8A6','#A78BFA'];

// ── CustomTooltip (same pattern as all other pages) ───────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color?: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const color = payload[0].color ?? '#6366F1';
  return (
    <div style={{
      backgroundColor: '#F8F9FA',
      border: `2px solid ${color}`,
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: 140,
    }}>
      <div style={{ color, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.name} style={{ color: '#1F2937', fontSize: 13 }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </div>
      ))}
    </div>
  );
}

// ── IBM Band data ──────────────────────────────────────────────
const IBM_BANDS: IBMBand[] = ['6A','6B','6G','7A','7B','8','9','10','Executive','D'];
const BAND_RATES: Record<IBMBand, number> = {
  '6A':45,'6B':48,'6G':50,'7A':65,'7B':70,
  '8':90,'9':100,'10':120,'Executive':150,'D':200,
};
const BAND_DESC: Record<IBMBand, string> = {
  '6A':'Entry Level','6B':'Entry Level','6G':'Entry Level',
  '7A':'Middle Level','7B':'Middle Level',
  '8':'Senior Middle','9':'Senior Middle',
  '10':'Senior','Executive':'Sr. Executive','D':'Distinguished',
};

type LocationType = 'Geo' | 'Nearshore' | 'Offshore' | 'Landed';
const LOCATION_CATEGORY: Record<LocationType, DeployCategory> = {
  Geo:'Mainline Domestic', Nearshore:'Nearshore',
  Offshore:'Offshore CIC', Landed:'Landed India',
};

// ── Seniority derived from band ───────────────────────────────
function getSeniority(band: IBMBand): string {
  if (['D','Executive','10'].includes(band)) return 'lead';
  if (['8','9'].includes(band))              return 'senior';
  if (['7A','7B'].includes(band))            return 'mid';
  return 'junior';
}

// ── Seniority badge colour ────────────────────────────────────
const SENIORITY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  lead:   { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  senior: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
  mid:    { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' },
  junior: { bg: '#F7FEE7', text: '#3F6212', border: '#BEF264' },
};

// ── Allocation % = actual phase hours ÷ available hours over active period ──
// Uses the canonical phase-hours spread to determine how many months this role
// is truly active, then compares role hours against IBM capacity for that period.
function getAllocPct(role: StaffingRole, projectMonths: number, canonical?: CanonicalRole): number {
  if (!role.totalHours || !projectMonths) return 100;
  // IBM capacity constants — 'Offshore CIC' = 172.5 h/mo, all others = 140 h/mo
  const monthlyHrs = role.deployCategory === 'Offshore CIC' ? 172.5 : 140;
  // If we have canonical phase data, use only months where the role is active
  if (canonical) {
    const activePhases = Object.entries(canonical.phaseHours).filter(([, h]) => h > 0).length;
    const totalIBMPhases = IBM_PHASES.length; // 7
    const activeFraction = activePhases / totalIBMPhases;
    const activeMonths = Math.max(1, Math.round(projectMonths * activeFraction));
    const available = monthlyHrs * activeMonths;
    return Math.min(100, Math.max(1, Math.round((role.totalHours / available) * 100)));
  }
  const available = monthlyHrs * projectMonths;
  return Math.min(100, Math.max(1, Math.round((role.totalHours / available) * 100)));
}

// ── Allocation bar colour ─────────────────────────────────────
function allocColor(pct: number): string {
  if (pct >= 80) return '#6366F1';   // indigo — full
  if (pct >= 50) return '#06B6D4';   // cyan — moderate
  return '#F59E0B';                   // amber — low
}

// ── Small info tooltip for Role Details cards ─────────────────
function InfoTip({ text }: { text: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <span className="relative inline-flex items-center" style={{ verticalAlign: 'middle' }}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label="More info"
        style={{
          width: 14, height: 14, borderRadius: '50%',
          background: '#E2E8F0', color: '#475569',
          fontSize: 9, fontWeight: 700,
          border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginLeft: 3,
        }}
      >ⓘ</button>
      {show && (
        <span style={{
          position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
          background: '#1E2436', color: '#F1F5F9',
          fontSize: 10, lineHeight: 1.55, whiteSpace: 'normal',
          borderRadius: 8, padding: '7px 11px', width: 220,
          boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
          zIndex: 9999, pointerEvents: 'none',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid #1E2436',
          }} />
        </span>
      )}
    </span>
  );
}

// ── Skills map per role-name ──────────────────────────────────
const SKILLS_MAP: Record<string, string[]> = {
  'Project Manager':    ['PMP/PMI','Agile/Scrum','Risk Management','Stakeholder Management','MS Project'],
  'Program Manager':    ['PgMP','Portfolio Mgmt','Executive Stakeholders','Governance','Agile at Scale'],
  'Lead Architect':     ['Solution Architecture','Cloud Design','IBM Cloud','API Design','Security Arch'],
  'Business Analyst':   ['Requirements','Process Mapping','User Stories','BPMN','Data Analysis'],
  'Functional Consultant':['SAP/Functional','Gap Analysis','Configuration','UAT Support','Training'],
  'Developer-Application':['Java/Node','REST APIs','Microservices','CI/CD','Unit Testing'],
  'Developer-Migration':['Data Migration','ETL','SQL','Cloud Migration','Legacy Modernisation'],
  'Test Lead':          ['Test Planning','JIRA','Selenium','API Testing','Defect Management'],
  'Testing Consultant': ['Manual Testing','Regression','UAT','Test Cases','Quality Reporting'],
  'Training Lead':      ['Curriculum Design','eLearning','Facilitation','LMS','Change Management'],
};
function getSkills(roleName: string): string[] {
  return SKILLS_MAP[roleName] ?? ['Consulting','Analysis','Delivery','Collaboration'];
}

// ── Phase-hours active check ──────────────────────────────────
// Single source of truth used by BOTH charts (line tooltip + bar rollout).
//
// A canonical role is considered "active" in a real project phase at index
// `realPhaseIdx` when it has non-zero hours in at least one IBM canonical
// phase that maps to the same proportional slot.
//
// IBM_PHASES has 7 slots (indices 0-6); real phases may differ in count.
// Mapping: ibmSlot → realSlot = round((ibmSlot / (ibmCount-1)) * (realCount-1))
//
// This is a pure predicate — no continuous week-range arithmetic — so the
// bar chart (per-phase count) and the line chart (per-week count inside a
// phase's startWeek..endWeek) always see identical active/inactive decisions.
function ibmToRealPhaseIdx(ibmIdx: number, realCount: number): number {
  const ibmCount = IBM_PHASES.length; // 7
  if (realCount <= 1) return 0;
  return Math.min(Math.round((ibmIdx / (ibmCount - 1)) * (realCount - 1)), realCount - 1);
}

/** True when canonical role `cr` has work hours mapped to real phase at index `realIdx`. */
function canonicalActiveInPhase(cr: CanonicalRole, realIdx: number, realCount: number): boolean {
  return IBM_PHASES.some(
    (ibmPhase, ibmIdx) =>
      (cr.phaseHours[ibmPhase] ?? 0) > 0 &&
      ibmToRealPhaseIdx(ibmIdx, realCount) === realIdx,
  );
}

/** True when canonical role `cr` is active during `week`, given the live project phases. */
function canonicalActiveAtWeek(cr: CanonicalRole, week: number, phases: ProjectPhase[]): boolean {
  if (phases.length === 0) return true; // no phase data — show role as always active
  const realIdx = phases.findIndex(p => week >= p.startWeek && week <= p.endWeek);
  if (realIdx === -1) return false; // week outside all phases
  return canonicalActiveInPhase(cr, realIdx, phases.length);
}

/** Display week range for role cards / summary table (first→last active real phase). */
function resolveWeekRange(cr: CanonicalRole, phases: ProjectPhase[]): { start: number; end: number } {
  if (phases.length === 0) return { start: 1, end: 72 };
  const activeRealIndices = phases
    .map((_, i) => i)
    .filter(i => canonicalActiveInPhase(cr, i, phases.length));
  if (!activeRealIndices.length) return { start: phases[0].startWeek, end: phases[phases.length - 1].endWeek };
  return {
    start: phases[activeRealIndices[0]].startWeek,
    end:   phases[activeRealIndices[activeRealIndices.length - 1]].endWeek,
  };
}

// ── Format helpers ─────────────────────────────────────────────
function fmtCost(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

// ── Canonical role dataset ─────────────────────────────────────
type IBMPhase = 'Prepare'|'Explore'|'Realize-Build'|'Realize-Test'|'Training'|'Deploy'|'Hypercare';
const IBM_PHASES: IBMPhase[] = ['Prepare','Explore','Realize-Build','Realize-Test','Training','Deploy','Hypercare'];

const ZERO_PH: Record<IBMPhase,number> = {Prepare:0,Explore:0,'Realize-Build':0,'Realize-Test':0,Training:0,Deploy:0,Hypercare:0};

interface CanonicalRole {
  roleName: string; location: LocationType; band: IBMBand;
  totalHours: number; phaseHours: Record<IBMPhase,number>;
}

const CANONICAL_ROLES: CanonicalRole[] = [
  { roleName:'Client Partner',     location:'Geo',      band:'D',
    totalHours:302, phaseHours:{...ZERO_PH, Prepare:25, Explore:50, 'Realize-Build':126, 'Realize-Test':76, Deploy:25} },
  { roleName:'DPE',                location:'Geo',      band:'10',
    totalHours:378, phaseHours:{...ZERO_PH, Prepare:25, Explore:50, 'Realize-Build':126, 'Realize-Test':76, Deploy:25, Hypercare:76} },
  { roleName:'Sector Partner',     location:'Offshore', band:'10',
    totalHours:93,  phaseHours:{...ZERO_PH, Prepare:31, Explore:62} },
  { roleName:'Program Manager',    location:'Geo',      band:'8',
    totalHours:756, phaseHours:{...ZERO_PH, Prepare:50, Explore:101, 'Realize-Build':252, 'Realize-Test':151, Deploy:50, Hypercare:151} },
  { roleName:'Project Manager',    location:'Offshore', band:'8',
    totalHours:1397, phaseHours:{...ZERO_PH, 'Realize-Build':776, 'Realize-Test':466, Deploy:155} },
  { roleName:'PMO',                location:'Offshore', band:'6B',
    totalHours:373, phaseHours:{...ZERO_PH, Prepare:31, Explore:62, 'Realize-Build':155, 'Realize-Test':93, Deploy:31} },
  { roleName:'DS&P',               location:'Offshore', band:'7A',
    totalHours:207, phaseHours:{...ZERO_PH, Prepare:17, Explore:35, 'Realize-Build':86, 'Realize-Test':52, Deploy:17} },
  { roleName:'Lead Architect',     location:'Geo',      band:'8',
    totalHours:1610, phaseHours:{...ZERO_PH, Prepare:140, Explore:280, 'Realize-Build':700, 'Realize-Test':420, Deploy:70} },
  { roleName:'Architect Manage',   location:'Offshore', band:'8',
    totalHours:2415, phaseHours:{...ZERO_PH, Explore:690, 'Realize-Build':1725} },
  { roleName:'Functional Consultant',location:'Offshore',band:'7B',
    totalHours:1984, phaseHours:{...ZERO_PH, Prepare:173, Explore:345, 'Realize-Build':863, 'Realize-Test':518, Deploy:86} },
  { roleName:'Business Analyst',   location:'Offshore', band:'6B',
    totalHours:1898, phaseHours:{...ZERO_PH, Prepare:173, Explore:345, 'Realize-Build':863, 'Realize-Test':518} },
  { roleName:'Red Hat OpenShift Consultant',location:'Offshore',band:'7B',
    totalHours:1909, phaseHours:{...ZERO_PH, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:136, Hypercare:409} },
  { roleName:'Integration Developer-Manage',location:'Offshore',band:'7B',
    totalHours:1909, phaseHours:{...ZERO_PH, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:136, Hypercare:409} },
  { roleName:'Developer-Migration',location:'Offshore', band:'6B',
    totalHours:1432, phaseHours:{...ZERO_PH, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:68} },
  { roleName:'Developer-Application',location:'Offshore',band:'7B',
    totalHours:1909, phaseHours:{...ZERO_PH, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:136, Hypercare:409} },
  { roleName:'Developer-Workflow', location:'Offshore', band:'6B',
    totalHours:818,  phaseHours:{...ZERO_PH, 'Realize-Build':682, Deploy:136} },
  { roleName:'Developer-Report',   location:'Offshore', band:'6B',
    totalHours:1228, phaseHours:{...ZERO_PH, 'Realize-Build':682, 'Realize-Test':409, Deploy:136} },
  { roleName:'Test Lead',          location:'Offshore', band:'7B',
    totalHours:868,  phaseHours:{...ZERO_PH, 'Realize-Test':868} },
  { roleName:'Testing Consultant', location:'Offshore', band:'6B',
    totalHours:1302, phaseHours:{...ZERO_PH, 'Realize-Test':1302} },
  { roleName:'Training Lead',      location:'Geo',      band:'7B',
    totalHours:205,  phaseHours:{...ZERO_PH, Training:205} },
  { roleName:'Training Consultant',location:'Offshore', band:'6B',
    totalHours:479,  phaseHours:{...ZERO_PH, Training:479} },
];

function buildRolesFromCanonical(): StaffingRole[] {
  return CANONICAL_ROLES.map(cr => ({
    id: uuid(), roleName: cr.roleName, band: cr.band,
    levelDescription: BAND_DESC[cr.band],
    numberOfResources: 1, hoursPerResource: cr.totalHours,
    totalHours: cr.totalHours, hourlyRate: BAND_RATES[cr.band],
    totalCost: cr.totalHours * BAND_RATES[cr.band],
    deployCategory: LOCATION_CATEGORY[cr.location],
  } as StaffingRole));
}

// ── Staffing Assumptions ───────────────────────────────────────
const ASSUMPTIONS = [
  'All roles available and onboarded per schedule',
  'Ramp-up periods account for knowledge transfer and environment access',
  'Allocation percentages reflect active work commitment (not availability)',
  'Part-time roles (DevOps, Security) can be sourced through staff augmentation',
  'QA engagement begins at 40% of project duration to allow testable features',
  'Offshore/nearshore staffing can reduce costs by 30–40% on development roles',
];

// ════════════════════════════════════════════════════════════════
// Animated KPI Card
// ════════════════════════════════════════════════════════════════
interface AnimatedKpiCardProps {
  label: string;
  targetValue: number;
  /** 'count' | 'currency' — currency shows $K or $M */
  format: 'count' | 'currency';
  icon: React.ReactNode;
  accentColor: string;
  duration?: number;
}
function AnimatedKpiCard({ label, targetValue, format, icon, accentColor, duration = 1600 }: AnimatedKpiCardProps) {
  const [displayed, setDisplayed] = useState(0);
  const [hovered, setHovered] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    // FIX: The previous version suppressed the react-hooks/exhaustive-deps warning
    // with an eslint-disable comment and omitted `duration` from the dep array.
    // If `duration` ever changed the animation would silently use the stale value.
    // Including it in the dependency array costs nothing (it's a stable prop default)
    // and correctly re-animates if the caller passes a different duration.
    startRef.current = null;
    setDisplayed(0);

    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const progress = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayed(Math.round(progress * targetValue));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // Both targetValue and duration are declared — no stale-closure risk.
  }, [targetValue, duration]);

  function fmt(n: number): string {
    if (format === 'currency') {
      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
      if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
      return `$${n}`;
    }
    return String(n);
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 12,
        padding: 24,
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderLeft: `4px solid ${accentColor}`,
        boxShadow: hovered
          ? `0 8px 24px rgba(0,0,0,0.14)`
          : '0 4px 16px rgba(0,0,0,0.10)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
        overflow: 'hidden',
      }}
    >
      {/* Radial gradient accent layer */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(circle at top right, ${accentColor}14, transparent 70%)`,
      }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.07em', color: '#64748B', marginBottom: 8,
          }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: accentColor, lineHeight: 1 }}>
            {fmt(displayed)}
          </div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${accentColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accentColor,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Role Card  (matches screenshot)
// ════════════════════════════════════════════════════════════════
interface MarketBenchmark { role: string; p25: number; median: number; p75: number; source: string }

interface RoleCardProps {
  role: StaffingRole;
  canonical: CanonicalRole | undefined;
  projectMonths: number;
  phases: ProjectPhase[];
  benchmark?: MarketBenchmark;
  onRemove: (id: string) => void;
}
function RoleCard({ role, canonical, projectMonths, phases, benchmark, onRemove }: RoleCardProps) {
  const [showAll, setShowAll] = useState(false);
  const seniority = getSeniority(role.band);
  const senStyle  = SENIORITY_STYLE[seniority] ?? SENIORITY_STYLE.mid;
  const allocPct  = getAllocPct(role, projectMonths, canonical);
  const barColor  = allocColor(allocPct);
  const skills    = getSkills(role.roleName);
  const wr        = canonical ? resolveWeekRange(canonical, phases) : { start: 1, end: phases[phases.length - 1]?.endWeek ?? 72 };
  const totalWeeks = wr.end - wr.start + 1;
  // Allocation tooltip text — explains how the % was computed
  const monthlyHrs = role.deployCategory === 'Offshore CIC' ? 172.5 : 140;
  const activePhases = canonical ? Object.entries(canonical.phaseHours).filter(([, h]) => h > 0).length : null;
  const activeFraction = activePhases != null ? activePhases / IBM_PHASES.length : 1;
  const activeMonths = Math.max(1, Math.round(projectMonths * activeFraction));
  const allocTip = `${role.totalHours.toLocaleString()} hrs ÷ (${monthlyHrs} hrs/mo × ${activeMonths} active months) = ${allocPct}%` +
    (activePhases != null ? `. Active in ${activePhases} of ${IBM_PHASES.length} IBM phases.` : '');
  const visibleSkills = showAll ? skills : skills.slice(0, 4);
  const hasMore = skills.length > 4;

  // Market rate delta badge
  const rateVsMarket = benchmark
    ? role.hourlyRate < benchmark.p25 ? { label: 'Below market', color: '#10B981', bg: '#D1FAE5' }
    : role.hourlyRate > benchmark.p75 ? { label: 'Above market', color: '#F43F5E', bg: '#FEE2E2' }
    : { label: 'At market', color: '#3B82F6', bg: '#DBEAFE' }
    : null;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
      {/* ── Top row ── */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate">{role.roleName}</div>
          <div className="text-xs text-indigo-500 mt-0.5">
            Week {wr.start}–{wr.end} · {totalWeeks}w
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {role.numberOfResources ?? 1}x
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
            style={{ background: senStyle.bg, color: senStyle.text, border: `1px solid ${senStyle.border}` }}>
            {seniority}
          </span>
          <button onClick={() => onRemove(role.id)} className="text-slate-300 hover:text-rose-400 transition-colors ml-1">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Allocation bar ── */}
      <div className="mt-3 mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500 font-medium">
            Allocation
            <InfoTip text={allocTip} />
          </span>
          <span className="text-xs font-bold" style={{ color: barColor }}>{allocPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${allocPct}%`, background: barColor }} />
        </div>
      </div>

      {/* ── Rate + Ramp row + Market badge ── */}
      <div className="flex items-center justify-between mt-3 mb-3 flex-wrap gap-1">
        <span className="text-xs font-semibold text-slate-700">${role.hourlyRate}/hr</span>
        {rateVsMarket && (
          <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 999, padding: '2px 8px', background: rateVsMarket.bg, color: rateVsMarket.color }}>
            {rateVsMarket.label}
            {benchmark && ` · mkt $${benchmark.p25}–$${benchmark.p75}`}
          </span>
        )}
        <span className="text-xs text-slate-400">Ramp: 1w up / 2w down</span>
      </div>

      {/* ── Skill chips ── */}
      <div className="flex flex-wrap gap-1.5">
        {visibleSkills.map(s => (
          <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{s}</span>
        ))}
        {hasMore && !showAll && (
          <button onClick={() => setShowAll(true)}
            className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 border border-indigo-100 hover:bg-indigo-100 transition-colors">
            +{skills.length - 4} more
          </button>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════
export default function StaffingPlanModule() {
  // Subscribe only to the staffing-related store slices to reduce rerenders from unrelated tabs.
  const activeDocumentId = useRFPStore((state) => state.activeDocumentId);
  const analysisResults = useRFPStore((state) => state.analysisResults);
  const updateStaffingRole = useRFPStore((state) => state.updateStaffingRole);
  const addStaffingRole = useRFPStore((state) => state.addStaffingRole);
  const removeStaffingRole = useRFPStore((state) => state.removeStaffingRole);
  const setAnalysisResult = useRFPStore((state) => state.setAnalysisResult);
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  const [search, setSearch]           = useState('');
  const [showAdd, setShowAdd]         = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [newRole, setNewRole]         = useState<Partial<StaffingRole & { _location: LocationType }>>({
    roleName:'', band:'7A', numberOfResources:1, hoursPerResource:640, hourlyRate:65, _location:'Offshore',
  });
  const [marketBenchmarks, setMarketBenchmarks] = useState<MarketBenchmark[]>([]);

  // ── Bootstrap canonical roles ─────────────────────────────────
  const plan = result?.staffingPlan;

  // Fetch market rate benchmarks once roles are available
  React.useEffect(() => {
    if (!plan?.roles.length) return;
    const roleNames = plan.roles.map(r => r.roleName).join(',');
    fetch(`/api/market-rates?roles=${encodeURIComponent(roleNames)}`)
      .then(r => r.json())
      .then(d => setMarketBenchmarks(d.benchmarks ?? []))
      .catch(() => {});
  }, [plan?.roles]);
  React.useEffect(() => {
    if (!activeDocumentId || !result) return;
    if (!result.staffingPlan || result.staffingPlan.roles.length === 0) {
      const canonRoles     = buildRolesFromCanonical();
      const totalLaborCost = canonRoles.reduce((a, r) => a + r.totalCost, 0);
      setAnalysisResult(activeDocumentId, {
        ...result,
        staffingPlan: {
          id: uuid(), documentId: activeDocumentId, roles: canonRoles,
          totalHeadcount: canonRoles.length, peakHeadcount: canonRoles.length,
          totalLaborCost, totalHours: canonRoles.reduce((a,r)=>a+r.totalHours,0),
          lastUpdated: new Date().toISOString(),
        },
      });
    }
  }, [activeDocumentId, result, setAnalysisResult]);

  if (!plan) return (
    <div className="flex items-center justify-center mt-20 text-slate-400 text-sm">
      Upload a document to see the staffing plan
    </div>
  );

  const roles = plan.roles;

  const projectMonths = useMemo(() => {
    const w = result?.projectPlan?.totalDurationWeeks ?? 72;
    return Math.round(w / 4.33) || 17;
  }, [result?.projectPlan?.totalDurationWeeks]);

  const totalLaborCost = roles.reduce((a, r) => a + r.totalCost, 0);
  const avgMonthlyBurn = projectMonths > 0 ? Math.round(totalLaborCost / projectMonths) : 0;
  const peakHC = plan.peakHeadcount || roles.length;

  const headcountOverTime = useMemo(() => {
    const totalWeeks = result?.projectPlan?.totalDurationWeeks ?? 72;
    const phases = result?.projectPlan?.phases ?? [];
    return Array.from({ length: totalWeeks }, (_, index) => {
      const week = index + 1;
      const activeHeadcount = roles.reduce((sum, role) => {
        const canonical = CANONICAL_ROLES.find((item) => item.roleName === role.roleName && item.band === role.band);
        if (canonical) {
          // Point-in-time active check — same IBM→real phase mapping as bar chart.
          return sum + (canonicalActiveAtWeek(canonical, week, phases) ? role.numberOfResources : 0);
        }
        const matchingPhaseCount = phases.filter((phase) =>
          week >= phase.startWeek &&
          week <= phase.endWeek &&
          phase.responsibleRoles.some((responsibleRole) => responsibleRole.toLowerCase().includes(role.roleName.toLowerCase()))
        ).length;
        return sum + (matchingPhaseCount > 0 ? role.numberOfResources : 0);
      }, 0);
      return { week: `W${week}`, Headcount: activeHeadcount };
    });
  }, [result, roles]);

  const filteredRoles = useMemo(
    () => roles.filter((role) => role.roleName.toLowerCase().includes(search.toLowerCase())),
    [roles, search]
  );

  // ── Add handler ───────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    if (!activeDocumentId || !newRole.roleName?.trim()) return;
    const band = (newRole.band ?? '7A') as IBMBand;
    const nr   = newRole.numberOfResources ?? 1;
    const hpr  = newRole.hoursPerResource ?? 640;
    const rate = BAND_RATES[band];
    const loc  = (newRole._location ?? 'Offshore') as LocationType;
    addStaffingRole(activeDocumentId, {
      id: uuid(), roleName: newRole.roleName!, band,
      levelDescription: BAND_DESC[band], numberOfResources: nr,
      hoursPerResource: hpr, totalHours: nr * hpr,
      hourlyRate: rate, totalCost: nr * hpr * rate,
      deployCategory: LOCATION_CATEGORY[loc],
    });
    setShowAdd(false);
    setNewRole({ roleName:'', band:'7A', numberOfResources:1, hoursPerResource:640, hourlyRate:65, _location:'Offshore' });
  }, [activeDocumentId, addStaffingRole, newRole]);

  // ── Input style for add form ──────────────────────────────────
  const inp: React.CSSProperties = {
    background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:10,
    padding:'7px 12px', color:'#0F172A', fontSize:13, outline:'none', width:'100%',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" style={{ background:'#F8FAFC', minHeight:'100%' }}>

      {/* ══ Header ══════════════════════════════════════════════ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Staffing Plan</h2>
          <p className="text-xs mt-0.5 text-slate-500">
            {roles.length} roles · IBM band rate-card · Offshore/Geo allocation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 bg-white border border-slate-200 shadow-sm">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search roles…"
              className="text-sm outline-none bg-transparent w-36 text-slate-700 placeholder:text-slate-400" />
          </div>
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background:`linear-gradient(135deg, ${INDIGO}, #4F46E5)`, boxShadow:'0 2px 10px rgba(99,102,241,0.35)' }}>
            <Plus size={14} /> Add Role
          </button>
        </div>
      </div>

      {/* ══ 4 Animated KPI Cards ════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedKpiCard
          label="Total Roles"
          targetValue={roles.length}
          format="count"
          icon={<Users size={20} />}
          accentColor="#3B82F6"
        />
        <AnimatedKpiCard
          label="Peak Headcount"
          targetValue={peakHC}
          format="count"
          icon={<TrendingUp size={20} />}
          accentColor="#10B981"
        />
        <AnimatedKpiCard
          label="Total Labor Cost"
          targetValue={totalLaborCost}
          format="currency"
          icon={<DollarSign size={20} />}
          accentColor="#8B5CF6"
        />
        <AnimatedKpiCard
          label="Avg Monthly Burn"
          targetValue={avgMonthlyBurn}
          format="currency"
          icon={<Flame size={20} />}
          accentColor="#F59E0B"
        />
      </div>

      {/* ══ Interactive KPI Dashboard ═══════════════════════════ */}
      {(() => {
        // ── Derived chart data ────────────────────────────────────
        // Headcount by role
        const hcByRole = roles.map(r => ({
          name: r.roleName.replace('Developer-', 'Dev-').replace('Consultant', 'Cons.'),
          Headcount: r.numberOfResources ?? 1,
          Hours: r.totalHours,
        })).sort((a, b) => b.Headcount - a.Headcount).slice(0, 10);

        // Utilisation rate by role — use canonical-aware getAllocPct
        const utilByRole = roles.map(r => {
          const canon = CANONICAL_ROLES.find(c => c.roleName === r.roleName && c.band === r.band);
          const pct = getAllocPct(r, projectMonths, canon);
          return {
            name: r.roleName.replace('Developer-', 'Dev-').replace('Consultant', 'Cons.'),
            Utilisation: pct,
            Hours: r.totalHours,
            Cost: fmtCost(r.totalCost),
            status: pct >= 80 ? 'full' : pct >= 50 ? 'moderate' : 'low',
          };
        }).sort((a, b) => b.Utilisation - a.Utilisation).slice(0, 10);

        // Monthly burn curve — phase-weighted spend
        // Each project phase contributes its fraction of total hours to each month in its window.
        // This produces realistic variation (ramp-up in Explore, peak in Realize, wind-down in Deploy).
        const phases = result?.projectPlan?.phases ?? [];
        const totalProjectWeeks = result?.projectPlan?.totalDurationWeeks ?? (projectMonths * 4);
        const burnCurve: { month: string; Burn: number; phase: string }[] = Array.from(
          { length: Math.min(projectMonths, 18) }, (_, mi) => {
            const monthStart = (mi / projectMonths) * totalProjectWeeks + 1;
            const monthEnd   = ((mi + 1) / projectMonths) * totalProjectWeeks;
            // Find which phases overlap this month window; weight by overlap fraction
            let burn = 0;
            if (phases.length > 0) {
              phases.forEach(ph => {
                const overlapStart = Math.max(monthStart, ph.startWeek);
                const overlapEnd   = Math.min(monthEnd,   ph.endWeek);
                if (overlapEnd >= overlapStart) {
                  const overlapFraction = (overlapEnd - overlapStart + 1) / Math.max(1, ph.durationWeeks);
                  // Fraction of total labor cost this phase represents × overlap fraction
                  const phaseFraction = ph.durationWeeks / totalProjectWeeks;
                  burn += Math.round(totalLaborCost * phaseFraction * overlapFraction);
                }
              });
            } else {
              // Fallback: smooth trapezoid ramp when no phase data
              const t = mi / Math.max(1, projectMonths - 1);
              const shape = t < 0.15 ? 0.5 + t * (1.0 / 0.15) * 0.5
                : t > 0.85 ? 1.0 - (t - 0.85) * (0.6 / 0.15)
                : 1.0;
              burn = Math.round(avgMonthlyBurn * Math.max(0.3, shape));
            }
            // Find dominant phase for this month (for tooltip)
            const dominantPhase = phases.find(ph => {
              const mid = (monthStart + monthEnd) / 2;
              return mid >= ph.startWeek && mid <= ph.endWeek;
            })?.name ?? '';
            return { month: `M${mi + 1}`, Burn: Math.max(0, burn), phase: dominantPhase };
          }
        );

        // Seniority mix
        const senMap: Record<string, number> = {};
        roles.forEach(r => {
          const s = getSeniority(r.band);
          senMap[s] = (senMap[s] ?? 0) + (r.numberOfResources ?? 1);
        });

        // Trend helpers (compare vs. "baseline" of single-resource roles)
        const avgUtil = utilByRole.length > 0 ? Math.round(utilByRole.reduce((a, r) => a + r.Utilisation, 0) / utilByRole.length) : 0;
        const fullUtilCount = utilByRole.filter(r => r.status === 'full').length;
        const fullUtilPct   = utilByRole.length > 0 ? Math.round((fullUtilCount / utilByRole.length) * 100) : 0;

        type Trend = 'up' | 'down' | 'neutral';
        function TrendBadge({ value, suffix = '%', trend }: { value: number; suffix?: string; trend: Trend }) {
          const up = trend === 'up';
          const neutral = trend === 'neutral';
          const color = neutral ? '#64748B' : up ? '#10B981' : '#F43F5E';
          const bg    = neutral ? '#F1F5F9' : up ? '#D1FAE5' : '#FEE2E2';
          const Icon  = neutral ? Minus : up ? ArrowUpRight : ArrowDownRight;
          return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: bg, color, borderRadius: 999,
              padding: '2px 8px', fontSize: 11, fontWeight: 600,
            }}>
              <Icon size={11} />
              {value}{suffix}
            </span>
          );
        }

        function KpiMini({ label, value, suffix = '', trend, trendVal, color }:
          { label: string; value: string; suffix?: string; trend: Trend; trendVal: number; color: string }) {
          return (
            <div style={{
              background: '#FFFFFF', border: `1px solid #E2E8F0`,
              borderTop: `3px solid ${color}`,
              borderRadius: 12, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                {label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                {value}{suffix}
              </div>
              <TrendBadge value={trendVal} trend={trend} />
            </div>
          );
        }

        const utilColor = (u: number) => u >= 80 ? '#10B981' : u >= 50 ? '#F59E0B' : '#F43F5E';

        // ── Enhanced Headcount Over Time data ─────────────────────
        // Build per-week data with phase label and active-role breakdown for tooltip
        // (phases already declared above for burn curve — reuse it)
        const totalWeeks = result?.projectPlan?.totalDurationWeeks ?? headcountOverTime.length;
        const hcOverTimeEnhanced = headcountOverTime.map((pt, wkIdx) => {
          const week = wkIdx + 1;
          const phase = phases.find(p => week >= p.startWeek && week <= p.endWeek);
          // active role names at this week (for tooltip)
          const activeRoles = roles
            .filter(role => {
              const canon = CANONICAL_ROLES.find(c => c.roleName === role.roleName && c.band === role.band);
              if (canon) { return canonicalActiveAtWeek(canon, week, phases); }
              return phase?.responsibleRoles.some(r => r.toLowerCase().includes(role.roleName.toLowerCase())) ?? false;
            })
            .map(r => r.roleName);
          return { ...pt, phase: phase?.name ?? '', activeRoles };
        });
        const peakHcWeek = hcOverTimeEnhanced.reduce(
          (best, pt) => pt.Headcount > best.Headcount ? pt : best,
          hcOverTimeEnhanced[0] ?? { week: 'W1', Headcount: 0, phase: '', activeRoles: [] }
        );

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={16} className="text-indigo-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Interactive KPI Dashboard</span>
            </div>

            {/* ── 4 trend KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiMini
                label="Total Headcount"
                value={String(roles.reduce((a, r) => a + (r.numberOfResources ?? 1), 0))}
                trend="up" trendVal={roles.length} color="#3B82F6"
              />
              <KpiMini
                label="Avg. Utilisation"
                value={String(avgUtil)} suffix="%"
                trend={avgUtil >= 70 ? 'up' : avgUtil >= 50 ? 'neutral' : 'down'}
                trendVal={avgUtil} color="#10B981"
              />
              <KpiMini
                label="Fully Allocated"
                value={String(fullUtilCount)} suffix={` / ${utilByRole.length}`}
                trend={fullUtilPct >= 60 ? 'up' : 'neutral'}
                trendVal={fullUtilPct} color="#8B5CF6"
              />
              <KpiMini
                label="Avg Rate / hr"
                value={roles.length > 0 ? `$${Math.round(roles.reduce((a, r) => a + r.hourlyRate, 0) / roles.length)}` : '$0'}
                trend="neutral" trendVal={roles.length} color="#F59E0B"
              />
            </div>

            {/* ── Headcount Over Time — enhanced interactive chart ── */}
            {hcOverTimeEnhanced.length > 1 && (() => {
              // Phase boundary reference lines (skip week 1 — no line before first phase)
              const phaseBoundaries = phases.map(p => p.startWeek);
              const PHASE_TINTS = ['#EFF6FF','#F0FDF4','#FAF5FF','#FFFBEB','#FFF1F2','#F0FDFA'];

              return (
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 20px 14px' }}>
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-blue-400" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Headcount Over Time</span>
                    {/* Peak badge */}
                    <span style={{
                      marginLeft: 6, background: '#EFF6FF', color: '#3B82F6',
                      borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      Peak {peakHcWeek.Headcount} @ {peakHcWeek.week}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748B' }}>
                      {totalWeeks}w project · hover for active roles
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>
                    Shaded bands = project phases · vertical dashes = phase starts · dot = peak headcount week
                  </p>

                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={hcOverTimeEnhanced} margin={{ left: -10, right: 16, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hcGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>

                      {/* Phase background tint bands */}
                      {phases.map((ph, i) => (
                        <ReferenceArea
                          key={`band-${i}`}
                          x1={`W${ph.startWeek}`}
                          x2={`W${ph.endWeek}`}
                          fill={PHASE_TINTS[i % PHASE_TINTS.length]}
                          fillOpacity={0.55}
                          strokeOpacity={0}
                        />
                      ))}

                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

                      {/* Phase boundary reference lines (dashed vertical at each phase start) */}
                      {phaseBoundaries.slice(1).map((sw, i) => (
                        <ReferenceLine
                          key={`bound-${i}`}
                          x={`W${sw}`}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={1.5}
                          strokeDasharray="5 3"
                          label={{
                            value: phases[i + 1]?.name ?? '',
                            position: 'insideTopRight',
                            style: { fontSize: 9, fill: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 600 },
                          }}
                        />
                      ))}

                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10, fill: '#94A3B8' }}
                        axisLine={false}
                        tickLine={false}
                        interval={Math.max(0, Math.floor(hcOverTimeEnhanced.length / 8) - 1)}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#94A3B8' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        label={{ value: 'Headcount', angle: -90, position: 'insideLeft', style: { fill: '#64748B', fontSize: 10 } }}
                      />

                      {/* Master tooltip with inline sub-tooltip on phase hover */}
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const pt = payload[0].payload as typeof hcOverTimeEnhanced[0];
                          const isPeak = pt.Headcount === peakHcWeek.Headcount;
                          // Sub-tooltip state lives inside this render — React re-renders on every
                          // tooltip update so we use a ref-based approach via onMouseEnter/Leave.
                          // We wrap in an inner component so useState works correctly.
                          const Inner = () => {
                            const [subOpen, setSubOpen] = React.useState(false);
                            const phaseColor = (() => {
                              const idx = phases.findIndex(p => p.name === pt.phase);
                              return idx >= 0 ? CHART_COLORS[idx % CHART_COLORS.length] : '#3B82F6';
                            })();
                            return (
                              <div style={{
                                background: '#fff',
                                border: `1.5px solid ${isPeak ? '#F59E0B' : '#3B82F6'}`,
                                borderRadius: 8, padding: '6px 10px',
                                boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                                fontSize: 11, minWidth: 130, maxWidth: 180,
                                position: 'relative',
                              }}>
                                {/* Row 1: week · phase chip · peak star */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{pt.week}</span>
                                  {pt.phase && (
                                    <span
                                      onMouseEnter={() => setSubOpen(true)}
                                      onMouseLeave={() => setSubOpen(false)}
                                      style={{
                                        color: phaseColor, fontWeight: 600,
                                        background: `${phaseColor}18`,
                                        border: `1px solid ${phaseColor}40`,
                                        borderRadius: 999, padding: '0px 6px', fontSize: 10,
                                        cursor: 'default',
                                        textDecoration: subOpen ? 'underline dotted' : 'none',
                                      }}
                                    >
                                      {pt.phase} ▾
                                    </span>
                                  )}
                                  {isPeak && (
                                    <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: 10 }}>★</span>
                                  )}
                                </div>

                                {/* Row 2: headcount number */}
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                  <span style={{ fontSize: 16, fontWeight: 800, color: isPeak ? '#F59E0B' : '#3B82F6' }}>
                                    {pt.Headcount}
                                  </span>
                                  <span style={{ color: '#64748B' }}>active</span>
                                  {pt.activeRoles.length > 0 && (
                                    <span style={{ color: '#94A3B8', fontSize: 10, marginLeft: 2 }}>
                                      · {pt.activeRoles.length} roles
                                    </span>
                                  )}
                                </div>

                                {/* Sub-tooltip — appears below the phase chip on hover */}
                                {subOpen && pt.activeRoles.length > 0 && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '100%', left: 0,
                                    marginTop: 4,
                                    background: '#fff',
                                    border: `1.5px solid ${phaseColor}`,
                                    borderRadius: 8,
                                    padding: '7px 10px',
                                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                                    minWidth: 160, maxWidth: 220,
                                    zIndex: 9999,
                                    fontSize: 11,
                                  }}>
                                    {/* Sub-header */}
                                    <div style={{
                                      display: 'flex', alignItems: 'center', gap: 5,
                                      marginBottom: 6, paddingBottom: 5,
                                      borderBottom: `1px solid ${phaseColor}25`,
                                    }}>
                                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: phaseColor, flexShrink: 0 }} />
                                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{pt.phase}</span>
                                      <span style={{ marginLeft: 'auto', color: phaseColor, fontWeight: 600, fontSize: 10 }}>
                                        {pt.activeRoles.length} active
                                      </span>
                                    </div>
                                    {/* Role list */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {pt.activeRoles.map((r, ri) => (
                                        <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <div style={{
                                            width: 5, height: 5, borderRadius: '50%',
                                            background: CHART_COLORS[ri % CHART_COLORS.length],
                                            flexShrink: 0,
                                          }} />
                                          <span style={{ color: '#374151' }}>{r}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          };
                          return <Inner />;
                        }}
                        cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 3' }}
                      />

                      <Area
                        type="monotone"
                        dataKey="Headcount"
                        stroke="#3B82F6"
                        strokeWidth={2.5}
                        fill="url(#hcGrad2)"
                        dot={false}
                        activeDot={(props: { cx?: number; cy?: number; payload?: typeof hcOverTimeEnhanced[0] }) => {
                          const isPeak = props.payload?.Headcount === peakHcWeek.Headcount;
                          return (
                            <circle
                              cx={props.cx} cy={props.cy}
                              r={isPeak ? 7 : 4}
                              fill={isPeak ? '#F59E0B' : '#3B82F6'}
                              stroke="#fff" strokeWidth={2}
                            />
                          );
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Phase legend strip */}
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: '#E2E8F0' }}>
                    {phases.map((ph, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px]"
                        style={{
                          background: `${CHART_COLORS[i % CHART_COLORS.length]}12`,
                          border: `1px solid ${CHART_COLORS[i % CHART_COLORS.length]}30`,
                          borderRadius: 999, padding: '2px 10px', color: '#374151',
                        }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="font-medium">{ph.name}</span>
                        <span style={{ color: '#94A3B8' }}>W{ph.startWeek}–W{ph.endWeek}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Headcount Roll-out by Phase ── */}
            {(() => {
              const phases = result?.projectPlan?.phases ?? [];
              if (phases.length === 0 || roles.length === 0) return null;

              // For each phase, tally how many resources from each role are active
              // A role is "active" in a phase when the phase week-window overlaps
              // its canonical week range (or falls within the phase dates for custom roles).
              const topRoles = roles.slice(0, 8); // cap legend to 8 entries for readability

              const rolloutData = phases.map((phase) => {
                const row: Record<string, number | string> = {
                  phase: phase.name.length > 11 ? phase.name.slice(0, 11) + '…' : phase.name,
                };
                topRoles.forEach((role) => {
                  const canon = CANONICAL_ROLES.find(c => c.roleName === role.roleName && c.band === role.band);
                  let active = 0;
                  if (canon) {
                    // Per-phase active check — same IBM→real mapping as the line chart.
                    const realIdx = phases.indexOf(phase);
                    active = canonicalActiveInPhase(canon, realIdx, phases.length) ? role.numberOfResources : 0;
                  } else {
                    // custom role: active if phase references the role name
                    active = phase.responsibleRoles.some(r =>
                      r.toLowerCase().includes(role.roleName.toLowerCase())
                    ) ? role.numberOfResources : 0;
                  }
                  const key = role.roleName.length > 16 ? role.roleName.slice(0, 16) + '…' : role.roleName;
                  row[key] = (row[key] as number ?? 0) + active;
                });
                return row;
              });

              const barKeys = topRoles.map(r =>
                r.roleName.length > 16 ? r.roleName.slice(0, 16) + '…' : r.roleName
              );
              // deduplicate keys that truncate to the same string
              const uniqueKeys = [...new Set(barKeys)];

              return (
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 20px 12px' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-indigo-400" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Headcount Roll-out by Phase</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748B' }}>
                      Active resources per role across project phases
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>
                    Stacked view — each colour represents a role; height = number of active resources in that phase
                  </p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={rolloutData} margin={{ left: -10, right: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis
                        dataKey="phase"
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={48}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#94A3B8' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        label={{ value: 'Headcount', angle: -90, position: 'insideLeft', style: { fill: '#64748B', fontSize: 10 } }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const total = payload.reduce((s, e) => s + (e.value as number), 0);
                          return (
                            <div style={{
                              background: '#F8F9FA', border: '2px solid #6366F1',
                              borderRadius: 8, padding: '10px 14px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 160,
                            }}>
                              <div style={{ color: '#6366F1', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{label}</div>
                              {payload.filter(e => (e.value as number) > 0).map(e => (
                                <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: '#374151' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, display: 'inline-block' }} />
                                    {e.name}
                                  </span>
                                  <span style={{ fontWeight: 600 }}>{e.value}</span>
                                </div>
                              ))}
                              <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 6, paddingTop: 6, fontSize: 12, fontWeight: 700, color: '#0F172A', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Total</span><span>{total}</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                        iconType="circle"
                        iconSize={8}
                      />
                      {uniqueKeys.map((key, i) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          stackId="hc"
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                          radius={i === uniqueKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Headcount by Role bar chart */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 20px 12px' }}>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={14} className="text-indigo-400" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Headcount by Role</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={hcByRole} barSize={18} layout="vertical" margin={{ left: 8, right: 32, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                    <Bar dataKey="Headcount" radius={[0, 4, 4, 0]}>
                      {hcByRole.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Utilisation rate bar chart */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 20px 12px' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={14} className="text-emerald-400" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Utilisation Rate by Role</span>
                  <InfoTip text="Allocation % = total role hours ÷ (IBM capacity hrs/month × active months). Offshore CIC = 172.5 hrs/mo; all other locations = 140 hrs/mo. Active months = project duration × fraction of IBM phases with non-zero hours for that role. Green ≥80% = fully allocated; amber 50–79% = moderate; red <50% = under-utilised." />
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748B' }}>
                    <span style={{ color: '#10B981', fontWeight: 600 }}>■</span> ≥80%&nbsp;
                    <span style={{ color: '#F59E0B', fontWeight: 600 }}>■</span> 50–79%&nbsp;
                    <span style={{ color: '#F43F5E', fontWeight: 600 }}>■</span> &lt;50%
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={utilByRole} barSize={18} layout="vertical" margin={{ left: 8, right: 32, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip
                      cursor={{ fill: 'rgba(16,185,129,0.05)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as typeof utilByRole[0];
                        const color = utilColor(d.Utilisation);
                        const label = d.Utilisation >= 80 ? 'Fully allocated' : d.Utilisation >= 50 ? 'Moderately allocated' : 'Under-utilised';
                        return (
                          <div style={{ background: '#F8F9FA', border: `2px solid ${color}`, borderRadius: 8, padding: '9px 13px', fontSize: 12, minWidth: 160 }}>
                            <div style={{ fontWeight: 700, color, marginBottom: 4 }}>{d.name}</div>
                            <div style={{ color: '#1F2937' }}>Utilisation: <strong style={{ color }}>{d.Utilisation}%</strong></div>
                            <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{d.Hours.toLocaleString()} hrs · {d.Cost}</div>
                            <div style={{ color: '#94A3B8', fontSize: 10, marginTop: 3, fontStyle: 'italic' }}>{label}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="Utilisation" radius={[0, 4, 4, 0]}>
                      {utilByRole.map((r, i) => (
                        <Cell key={i} fill={utilColor(r.Utilisation)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Burn area chart */}
            {burnCurve.length > 1 && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 20px 12px' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Flame size={14} className="text-amber-400" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Monthly Burn Curve</span>
                  <InfoTip text="Phase-weighted monthly spend. Each bar = labour cost distributed across the weeks of each phase in that month. Development months peak highest; Discovery and Hypercare are lighter. Hover to see the dominant phase and exact spend." />
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748B' }}>Projected over {projectMonths} months</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={burnCurve} margin={{ left: -10, right: 10 }}>
                    <defs>
                      <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { month: string; Burn: number; phase: string };
                        const fmtBurn = d.Burn >= 1_000_000 ? `$${(d.Burn/1_000_000).toFixed(2)}M` : `$${Math.round(d.Burn/1000)}K`;
                        return (
                          <div style={{ background: '#F8F9FA', border: '2px solid #F59E0B', borderRadius: 8, padding: '9px 13px', fontSize: 12, minWidth: 150 }}>
                            <div style={{ fontWeight: 700, color: '#B45309', marginBottom: 4 }}>{d.month}</div>
                            <div style={{ color: '#1F2937' }}>Burn: <strong style={{ color: '#F59E0B' }}>{fmtBurn}</strong></div>
                            {d.phase && <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>Phase: {d.phase}</div>}
                          </div>
                        );
                      }}
                    />
                    <Area type="monotone" dataKey="Burn" stroke="#F59E0B" strokeWidth={2.5}
                      fill="url(#burnGrad)" dot={false} activeDot={{ r: 5, fill: '#F59E0B' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Seniority mix row */}
            {Object.keys(senMap).length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-indigo-400" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Seniority Mix</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(['lead','senior','mid','junior'] as const).map(s => {
                    const count = senMap[s] ?? 0;
                    if (!count) return null;
                    const total = Object.values(senMap).reduce((a, v) => a + v, 0);
                    const pct   = Math.round((count / total) * 100);
                    const style = SENIORITY_STYLE[s];
                    return (
                      <div key={s} style={{
                        background: style.bg, border: `1px solid ${style.border}`,
                        borderRadius: 10, padding: '10px 16px', minWidth: 110, textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: style.text }}>{count}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: style.text, textTransform: 'capitalize', marginTop: 2 }}>{s}</div>
                        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{pct}% of team</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ Add Role Form ════════════════════════════════════════ */}
      {showAdd && (
        <div className="rounded-2xl p-5 space-y-4 bg-white border border-indigo-100 shadow-sm">
          <div className="text-sm font-bold text-slate-800">Add New Role</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <input placeholder="Role Name" value={newRole.roleName ?? ''}
              onChange={e => setNewRole({...newRole, roleName:e.target.value})}
              className="col-span-2" style={inp} />
            <select value={newRole.band}
              onChange={e => { const b = e.target.value as IBMBand; setNewRole({...newRole, band:b, hourlyRate:BAND_RATES[b]}); }}
              style={{ ...inp, cursor:'pointer' }}>
              {IBM_BANDS.map(b => <option key={b} value={b}>{b} — {BAND_DESC[b]}</option>)}
            </select>
            <select value={newRole._location ?? 'Offshore'}
              onChange={e => setNewRole({...newRole, _location: e.target.value as LocationType})}
              style={{ ...inp, cursor:'pointer' }}>
              <option value="Geo">Geo (140 h/mo)</option>
              <option value="Nearshore">Nearshore (140 h/mo)</option>
              <option value="Offshore">Offshore (180/172.5 h/mo)</option>
              <option value="Landed">Landed India (140 h/mo)</option>
            </select>
            <input type="number" placeholder="Hrs/Resource" value={newRole.hoursPerResource ?? ''}
              onChange={e => setNewRole({...newRole, hoursPerResource:Number(e.target.value)})}
              style={inp} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm rounded-xl text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
            <button onClick={handleAdd}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-white"
              style={{ background:`linear-gradient(135deg, ${INDIGO}, #4F46E5)` }}>Add Role</button>
          </div>
        </div>
      )}

      {/* ══ Role Cards Grid ══════════════════════════════════════ */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Role Details ({filteredRoles.length})
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRoles.map(role => {
            const canon = CANONICAL_ROLES.find(c => c.roleName === role.roleName);
            const livePhasesForCard = result?.projectPlan?.phases ?? [];
            const bm = marketBenchmarks.find(b =>
              b.role.toLowerCase() === role.roleName.toLowerCase() ||
              role.roleName.toLowerCase().includes(b.role.toLowerCase())
            );
            return (
              <RoleCard
                key={role.id}
                role={role}
                canonical={canon}
                projectMonths={projectMonths}
                phases={livePhasesForCard}
                benchmark={bm}
                onRemove={(id) => { if (activeDocumentId) removeStaffingRole(activeDocumentId, id); }}
              />
            );
          })}
        </div>
      </div>

      {/* ══ Team Summary Table ═══════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <button
          onClick={() => setShowSummary(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
        >
          <span className="text-sm font-bold text-slate-900">Team Summary</span>
          {showSummary ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showSummary && (
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Role','Seniority','Count','Allocation','Start','End','Rate'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((role, i) => {
                  const canon    = CANONICAL_ROLES.find(c => c.roleName === role.roleName);
                  const livePhasesForTable = result?.projectPlan?.phases ?? [];
                  const wr       = canon ? resolveWeekRange(canon, livePhasesForTable) : { start: 1, end: livePhasesForTable[livePhasesForTable.length - 1]?.endWeek ?? 72 };
                  const seniority = getSeniority(role.band);
                  const senStyle  = SENIORITY_STYLE[seniority];
                  const allocPct  = getAllocPct(role, projectMonths);
                  return (
                    <tr key={role.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}
                    >
                      <td className="px-5 py-3.5 text-sm text-slate-800 font-medium">{role.roleName}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                          style={{ background: senStyle.bg, color: senStyle.text, border: `1px solid ${senStyle.border}` }}>
                          {seniority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-800">{role.numberOfResources ?? 1}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{allocPct}%</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">Week {wr.start}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">Week {wr.end}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">${role.hourlyRate}/hr</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ Staffing Assumptions ════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-5 shadow-sm">
        <div className="text-sm font-bold text-slate-900 mb-4">Staffing Assumptions</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3">
          {ASSUMPTIONS.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: INDIGO }} />
              {a}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
