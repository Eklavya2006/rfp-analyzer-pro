'use client';
// StaffingPlan — Interactive KPI Dashboard + role cards + team summary
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
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import type { IBMBand, StaffingRole, DeployCategory } from '@/types';

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

// ── Allocation pct from utilisation (rough: totalHours / available) ──
function getAllocPct(role: StaffingRole, projectMonths: number): number {
  if (!role.totalHours || !projectMonths) return 100;
  const monthlyHrs = (role.deployCategory === 'Offshore CIC') ? 172.5 : 140;
  const available  = monthlyHrs * projectMonths;
  return Math.min(Math.round((role.totalHours / available) * 100), 100);
}

// ── Allocation bar colour ─────────────────────────────────────
function allocColor(pct: number): string {
  if (pct >= 80) return '#6366F1';   // indigo — full
  if (pct >= 50) return '#06B6D4';   // cyan — moderate
  return '#F59E0B';                   // amber — low
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

// ── Week range from phase hours ───────────────────────────────
// Approximate: compute first/last active phase, map to week numbers
const PHASE_START_WEEK: Record<string, number> = {
  Prepare:1, Explore:5, 'Realize-Build':13, 'Realize-Test':42,
  Training:60, Deploy:68, Hypercare:72,
};

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

function getWeekRange(cr: CanonicalRole): { start: number; end: number } {
  const activePhases = IBM_PHASES.filter(p => (cr.phaseHours[p] ?? 0) > 0);
  if (!activePhases.length) return { start: 1, end: 72 };
  const first = activePhases[0];
  const last  = activePhases[activePhases.length - 1];
  const start = PHASE_START_WEEK[first] ?? 1;
  const endBase = PHASE_START_WEEK[last] ?? 68;
  return { start, end: Math.min(endBase + 8, 72) };
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
  // Re-animates whenever targetValue changes (e.g. re-mount / data update)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetValue]);

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
interface RoleCardProps {
  role: StaffingRole;
  canonical: CanonicalRole | undefined;
  projectMonths: number;
  onRemove: (id: string) => void;
}
function RoleCard({ role, canonical, projectMonths, onRemove }: RoleCardProps) {
  const [showAll, setShowAll] = useState(false);
  const seniority = getSeniority(role.band);
  const senStyle  = SENIORITY_STYLE[seniority] ?? SENIORITY_STYLE.mid;
  const allocPct  = getAllocPct(role, projectMonths);
  const barColor  = allocColor(allocPct);
  const skills    = getSkills(role.roleName);
  const wr        = canonical ? getWeekRange(canonical) : { start: 1, end: 72 };
  const totalWeeks = wr.end - wr.start + 1;
  const visibleSkills = showAll ? skills : skills.slice(0, 4);
  const hasMore = skills.length > 4;

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
          <span className="text-xs text-slate-500 font-medium">Allocation</span>
          <span className="text-xs font-bold" style={{ color: barColor }}>{allocPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${allocPct}%`, background: barColor }} />
        </div>
      </div>

      {/* ── Rate + Ramp row ── */}
      <div className="flex items-center justify-between mt-3 mb-3">
        <span className="text-xs font-semibold text-slate-700">${role.hourlyRate}/hr</span>
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
  const {
    activeDocumentId, analysisResults,
    updateStaffingRole, addStaffingRole, removeStaffingRole, setAnalysisResult,
  } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  const [search, setSearch]       = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [newRole, setNewRole]     = useState<Partial<StaffingRole & { _location: LocationType }>>({
    roleName:'', band:'7A', numberOfResources:1, hoursPerResource:640, hourlyRate:65, _location:'Offshore',
  });

  // ── Bootstrap canonical roles ─────────────────────────────────
  const plan = result?.staffingPlan;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocumentId]);

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
  const peakHC         = plan.peakHeadcount || roles.length;

  const filteredRoles = roles.filter(r =>
    r.roleName.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Add handler ───────────────────────────────────────────────
  const handleAdd = () => {
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
  };

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

        // Utilisation rate by role
        const utilByRole = roles.map(r => {
          const pct = getAllocPct(r, projectMonths);
          return {
            name: r.roleName.replace('Developer-', 'Dev-').replace('Consultant', 'Cons.'),
            Utilisation: pct,
            status: pct >= 80 ? 'full' : pct >= 50 ? 'moderate' : 'low',
          };
        }).sort((a, b) => b.Utilisation - a.Utilisation).slice(0, 10);

        // Monthly burn curve (linear ramp over projectMonths)
        const burnCurve = Array.from({ length: Math.min(projectMonths, 18) }, (_, i) => ({
          month: `M${i + 1}`,
          Burn: Math.round(avgMonthlyBurn * (i < 2 ? 0.6 + i * 0.2 : i >= projectMonths - 2 ? 0.9 - (i - (projectMonths - 3)) * 0.2 : 1)),
        }));

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
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,0.05)' }} />
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
                    <Tooltip content={<CustomTooltip />} />
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
            return (
              <RoleCard
                key={role.id}
                role={role}
                canonical={canon}
                projectMonths={projectMonths}
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
                  const wr       = canon ? getWeekRange(canon) : { start:1, end:72 };
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
