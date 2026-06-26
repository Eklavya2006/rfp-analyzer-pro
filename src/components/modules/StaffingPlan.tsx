'use client';
// StaffingPlan — Full IBM rate-card staffing with animated avatars,
//               25-role dataset, AI phase suggestions, FTE matrix,
//               Phase Summary tables, WCAG-AA form contrast, real-time recalculation
import React, { useState, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Trash2, Search, Info, ChevronDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import type { IBMBand, StaffingRole, DeployCategory } from '@/types';

// ── Palette ───────────────────────────────────────────────────
const INDIGO  = '#6366F1';
const CYAN    = '#06B6D4';
const GLASS   = 'rgba(255,255,255,0.04)';
const BORDER  = 'rgba(255,255,255,0.08)';
const TEXT    = '#F1F5F9';
const MUTED   = '#94A3B8';

const ROLE_COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6',
                     '#f97316','#84cc16','#a78bfa','#fb923c','#34d399','#60a5fa','#e879f9'];

const IBM_BANDS: IBMBand[] = ['6A','6B','6G','7A','7B','8','9','10','Executive','D'];
const BAND_RATES: Record<IBMBand, number> = {
  '6A': 45,'6B': 48,'6G': 50,'7A': 65,'7B': 70,
  '8': 90,'9': 100,'10': 120,'Executive': 150,'D': 200,
};
const BAND_DESC: Record<IBMBand, string> = {
  '6A': 'Entry Level','6B': 'Entry Level','6G': 'Entry Level',
  '7A': 'Middle Level','7B': 'Middle Level',
  '8': 'Senior Middle','9': 'Senior Middle',
  '10': 'Senior','Executive': 'Sr. Executive','D': 'Distinguished',
};

// ── IBM Phase names (canonical 7-phase model) ──────────────────
const IBM_PHASES = ['Prepare','Explore','Realize-Build','Realize-Test','Training','Deploy','Hypercare'] as const;
type IBMPhase = typeof IBM_PHASES[number];

const PHASE_COLORS: Record<IBMPhase, string> = {
  'Prepare':       '#6366f1',
  'Explore':       '#06b6d4',
  'Realize-Build': '#10b981',
  'Realize-Test':  '#f59e0b',
  'Training':      '#f97316',
  'Deploy':        '#ef4444',
  'Hypercare':     '#8b5cf6',
};

// ── Location / monthly hours (IBM rate-card) ──────────────────
// Mainline Geo-Primary / Nearshore / Landed-India → 140 h/mo always
// Offshore CIC India ≤12 months → 180 h/mo  |  >12 months → 172.5 h/mo
type LocationType = 'Geo' | 'Nearshore' | 'Offshore' | 'Landed';
function getMonthlyHrs(location: LocationType, months: number): number {
  if (location === 'Offshore') return months <= 12 ? 180 : 172.5;
  return 140; // Geo, Nearshore, Landed all = 140
}
function getWeeklyHrs(location: LocationType): number {
  if (location === 'Offshore' || location === 'Nearshore') return 45;
  return 40; // Geo, Landed
}

// ── Location → DeployCategory mapping ────────────────────────
const LOCATION_CATEGORY: Record<LocationType, DeployCategory> = {
  Geo:      'Mainline Domestic',
  Nearshore:'Nearshore',
  Offshore: 'Offshore CIC',
  Landed:   'Landed India',
};

// Legacy mapping for reading existing roles
function deployToLocation(dc: DeployCategory | undefined): LocationType {
  if (dc === 'Offshore CIC') return 'Offshore';
  if (dc === 'Nearshore')    return 'Nearshore';
  if (dc === 'Landed India') return 'Landed';
  return 'Geo';
}

// ── Tooltip style (recharts) ─────────────────────────────────
const tooltipStyle = {
  backgroundColor: '#1E2436',
  border: '1px solid rgba(99,102,241,0.3)',
  borderRadius: 10, color: '#F1F5F9', fontSize: 13,
  padding: '8px 12px', zIndex: 10000,
  boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
};
const tooltipWrapperStyle = { zIndex: 10000, outline: 'none' };
const tooltipLabelStyle   = { color: '#F1F5F9', fontWeight: 700, marginBottom: 4 };

// ── Utilization color ──────────────────────────────────────────
function utilColor(pct: number): string {
  if (pct > 100) return '#ef4444';
  if (pct < 50)  return '#f59e0b';
  return '#10b981';
}

// ── Format helpers ────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
}

// ══════════════════════════════════════════════════════════════
// HOVER TOOLTIP — portal-rendered so it escapes any overflow/z-index context
// ══════════════════════════════════════════════════════════════
function HoverTip({ text, children, width = 260 }: { text: React.ReactNode; children: React.ReactNode; width?: number }) {
  const [vis, setVis] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
    setVis(true);
  };

  const portal = vis && typeof window !== 'undefined'
    ? ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
          background: '#1E2436',
          color: '#F1F5F9',
          fontSize: 12,
          padding: '8px 12px',
          borderRadius: 8,
          zIndex: 2147483647,
          width,
          boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
          border: '1px solid rgba(99,102,241,0.4)',
          lineHeight: 1.55,
          pointerEvents: 'none',
          whiteSpace: 'normal',
          textAlign: 'left',
        }}>
          {text}
          <span style={{
            position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: '6px solid #1E2436',
          }} />
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex items-center gap-1 cursor-help"
        onMouseEnter={show}
        onMouseLeave={() => setVis(false)}
        onFocus={show}
        onBlur={() => setVis(false)}
      >
        {children}
      </span>
      {portal}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// ANIMATED AVATARS — deterministic by role name seed
// ══════════════════════════════════════════════════════════════
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function RoleAvatar({ roleName, size = 36 }: { roleName: string; size?: number }) {
  const seed   = hashStr(roleName);
  const hue    = seed % 360;
  const skin   = `hsl(${(seed * 37) % 360},35%,70%)`;
  const hair   = `hsl(${hue},60%,30%)`;
  const shirt  = `hsl(${hue},65%,50%)`;
  const eyeClr = `hsl(${(seed * 73) % 360},60%,35%)`;
  const animDur = 1.5 + (seed % 8) * 0.3;

  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none"
      style={{ borderRadius:'50%', flexShrink:0, willChange:'transform', display:'block' }}
      aria-label={roleName}>
      <circle cx="18" cy="18" r="17" fill={`hsl(${hue},50%,18%)`} stroke={`hsl(${hue},60%,50%)`} strokeWidth="1.5" />
      <ellipse cx="18" cy="9" rx="8.5" ry="6" fill={hair} />
      <rect x="9.5" y="9" width="17" height="5" fill={hair} />
      <ellipse cx="18" cy="18.5" rx="7.5" ry="8" fill={skin} />
      <ellipse cx="15.2" cy="17" rx="1.3" ry="1.3" fill={eyeClr}>
        <animate attributeName="ry" values="1.3;0.1;1.3" dur={`${animDur}s`} repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="20.8" cy="17" rx="1.3" ry="1.3" fill={eyeClr}>
        <animate attributeName="ry" values="1.3;0.1;1.3" dur={`${animDur}s`} repeatCount="indefinite" />
      </ellipse>
      <circle cx="15.8" cy="16.5" r="0.38" fill="white" />
      <circle cx="21.4" cy="16.5" r="0.38" fill="white" />
      <path d="M15.5 21 Q18 23.2 20.5 21" stroke="#A07040" strokeWidth="0.9" fill="none" strokeLinecap="round">
        <animate attributeName="d" values="M15.5 21 Q18 23.2 20.5 21;M15.5 21.2 Q18 23.5 20.5 21.2;M15.5 21 Q18 23.2 20.5 21"
          dur={`${animDur * 1.5}s`} repeatCount="indefinite" />
      </path>
      <path d="M11 30 L14.5 24 L18 26 L21.5 24 L25 30" fill={shirt} />
      <animateTransform attributeName="transform" type="scale"
        values="1;1.015;1" dur={`${animDur * 1.2}s`} repeatCount="indefinite" additive="sum" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// AI PHASE SUGGESTIONS — role-aware recommended phases + hrs/wk
// ══════════════════════════════════════════════════════════════
interface PhaseRec { phase: IBMPhase; hrsPerWeek: number; }
const AI_PHASE_SUGGESTIONS: Record<string, { phases: PhaseRec[]; rationale: string }> = {
  'Client Partner':     { rationale:'Executive sponsor — present across all phases for stakeholder alignment and governance.', phases:[{phase:'Prepare',hrsPerWeek:5},{phase:'Explore',hrsPerWeek:8},{phase:'Realize-Build',hrsPerWeek:12},{phase:'Realize-Test',hrsPerWeek:10},{phase:'Deploy',hrsPerWeek:5}] },
  'DPE':                { rationale:'Delivery Program Executive — owns delivery accountability across full lifecycle.', phases:[{phase:'Prepare',hrsPerWeek:5},{phase:'Explore',hrsPerWeek:8},{phase:'Realize-Build',hrsPerWeek:12},{phase:'Realize-Test',hrsPerWeek:10},{phase:'Deploy',hrsPerWeek:5},{phase:'Hypercare',hrsPerWeek:10}] },
  'Sector Partner':     { rationale:'Industry subject-matter expertise needed primarily in early phases to shape solution.', phases:[{phase:'Prepare',hrsPerWeek:10},{phase:'Explore',hrsPerWeek:15}] },
  'Program Manager':    { rationale:'Overall program coordination — present end-to-end including hypercare handoff.', phases:[{phase:'Prepare',hrsPerWeek:10},{phase:'Explore',hrsPerWeek:18},{phase:'Realize-Build',hrsPerWeek:25},{phase:'Realize-Test',hrsPerWeek:20},{phase:'Deploy',hrsPerWeek:10},{phase:'Hypercare',hrsPerWeek:18}] },
  'Project Manager':    { rationale:'Execution-level PM — peak in build/test phases; tapers at go-live.', phases:[{phase:'Realize-Build',hrsPerWeek:38},{phase:'Realize-Test',hrsPerWeek:38},{phase:'Deploy',hrsPerWeek:30}] },
  'PMO':                { rationale:'PMO support spans all delivery phases for governance and reporting.', phases:[{phase:'Prepare',hrsPerWeek:8},{phase:'Explore',hrsPerWeek:12},{phase:'Realize-Build',hrsPerWeek:18},{phase:'Realize-Test',hrsPerWeek:12},{phase:'Deploy',hrsPerWeek:8}] },
  'DS&P':               { rationale:'Data Security & Privacy review checkpoints in each phase, peak at build & test.', phases:[{phase:'Prepare',hrsPerWeek:5},{phase:'Explore',hrsPerWeek:8},{phase:'Realize-Build',hrsPerWeek:12},{phase:'Realize-Test',hrsPerWeek:10},{phase:'Deploy',hrsPerWeek:5}] },
  'Lead Architect':     { rationale:'Solution architecture drives Prepare → Realize-Build; validation support through Test; reduced Deploy.', phases:[{phase:'Prepare',hrsPerWeek:30},{phase:'Explore',hrsPerWeek:40},{phase:'Realize-Build',hrsPerWeek:40},{phase:'Realize-Test',hrsPerWeek:30},{phase:'Deploy',hrsPerWeek:15}] },
  'Architect Manage':   { rationale:'Platform architecture — Explore and Build phases only.', phases:[{phase:'Explore',hrsPerWeek:40},{phase:'Realize-Build',hrsPerWeek:40}] },
  'Architect Mobile':   { rationale:'Mobile architecture — design in Explore, optional test validation.', phases:[{phase:'Explore',hrsPerWeek:35},{phase:'Realize-Test',hrsPerWeek:20}] },
  'Functional Consultant':{ rationale:'Functional config spans full delivery; reduced at deploy.', phases:[{phase:'Prepare',hrsPerWeek:30},{phase:'Explore',hrsPerWeek:40},{phase:'Realize-Build',hrsPerWeek:40},{phase:'Realize-Test',hrsPerWeek:35},{phase:'Deploy',hrsPerWeek:20}] },
  'Business Analyst':   { rationale:'Requirements drive Prepare → Realize-Test; wrap up before deploy.', phases:[{phase:'Prepare',hrsPerWeek:30},{phase:'Explore',hrsPerWeek:40},{phase:'Realize-Build',hrsPerWeek:40},{phase:'Realize-Test',hrsPerWeek:38}] },
  'Developer-Mobile':   { rationale:'Mobile development — Realize-Build is primary phase.', phases:[{phase:'Realize-Build',hrsPerWeek:40},{phase:'Realize-Test',hrsPerWeek:30}] },
  'Red Hat OpenShift Consultant':{ rationale:'Cloud-native platform: Explore → Deploy; hypercare support.', phases:[{phase:'Explore',hrsPerWeek:30},{phase:'Realize-Build',hrsPerWeek:38},{phase:'Realize-Test',hrsPerWeek:35},{phase:'Deploy',hrsPerWeek:38},{phase:'Hypercare',hrsPerWeek:38}] },
  'Integration Developer-Manage':{ rationale:'Integration dev spans Explore through Hypercare for stability.', phases:[{phase:'Explore',hrsPerWeek:30},{phase:'Realize-Build',hrsPerWeek:38},{phase:'Realize-Test',hrsPerWeek:35},{phase:'Deploy',hrsPerWeek:30},{phase:'Hypercare',hrsPerWeek:38}] },
  'Developer-Migration':{ rationale:'Migration effort peaks in build; validation in test; brief deploy support.', phases:[{phase:'Explore',hrsPerWeek:25},{phase:'Realize-Build',hrsPerWeek:40},{phase:'Realize-Test',hrsPerWeek:35},{phase:'Deploy',hrsPerWeek:15}] },
  'Developer-Application':{ rationale:'Full application development lifecycle with hypercare support.', phases:[{phase:'Explore',hrsPerWeek:25},{phase:'Realize-Build',hrsPerWeek:40},{phase:'Realize-Test',hrsPerWeek:35},{phase:'Deploy',hrsPerWeek:30},{phase:'Hypercare',hrsPerWeek:38}] },
  'Developer-Workflow': { rationale:'Workflow automation — Build and Deploy phases.', phases:[{phase:'Realize-Build',hrsPerWeek:40},{phase:'Deploy',hrsPerWeek:30}] },
  'Developer-Report':   { rationale:'Reporting development — Build and Test; deploy for cutover.', phases:[{phase:'Realize-Build',hrsPerWeek:40},{phase:'Realize-Test',hrsPerWeek:35},{phase:'Deploy',hrsPerWeek:25}] },
  'Test Lead':          { rationale:'Test leadership concentrated in Realize-Test phase.', phases:[{phase:'Realize-Test',hrsPerWeek:45}] },
  'Testing Consultant': { rationale:'QA execution in Realize-Test; UAT support.', phases:[{phase:'Realize-Test',hrsPerWeek:45}] },
  'Training Lead':      { rationale:'Training design and delivery — Training phase only.', phases:[{phase:'Training',hrsPerWeek:40}] },
  'Training Consultant':{ rationale:'Training content and delivery support — Training phase.', phases:[{phase:'Training',hrsPerWeek:45}] },
  'Change Lead':        { rationale:'Change management spans Explore through Deploy for adoption.', phases:[{phase:'Explore',hrsPerWeek:20},{phase:'Realize-Build',hrsPerWeek:25},{phase:'Realize-Test',hrsPerWeek:20},{phase:'Training',hrsPerWeek:30},{phase:'Deploy',hrsPerWeek:25}] },
  'Change Consultant':  { rationale:'Change execution support — Realize-Build through Deploy.', phases:[{phase:'Realize-Build',hrsPerWeek:20},{phase:'Realize-Test',hrsPerWeek:20},{phase:'Training',hrsPerWeek:35},{phase:'Deploy',hrsPerWeek:25}] },
};

function getAISuggestion(roleName: string): { phases: PhaseRec[]; rationale: string } {
  if (AI_PHASE_SUGGESTIONS[roleName]) return AI_PHASE_SUGGESTIONS[roleName];
  // Fallback heuristic
  if (roleName.toLowerCase().includes('test') || roleName.toLowerCase().includes('qa'))
    return { rationale:'QA roles are primarily engaged in Realize-Test and Hypercare phases.', phases:[{phase:'Realize-Test',hrsPerWeek:40},{phase:'Hypercare',hrsPerWeek:20}] };
  if (roleName.toLowerCase().includes('architect'))
    return { rationale:'Architects are engaged from Prepare through Realize-Build.', phases:[{phase:'Prepare',hrsPerWeek:20},{phase:'Explore',hrsPerWeek:35},{phase:'Realize-Build',hrsPerWeek:40}] };
  if (roleName.toLowerCase().includes('train'))
    return { rationale:'Training roles engage during the Training phase.', phases:[{phase:'Training',hrsPerWeek:40}] };
  return { rationale:'General delivery roles typically span Explore through Deploy.', phases:[{phase:'Explore',hrsPerWeek:20},{phase:'Realize-Build',hrsPerWeek:35},{phase:'Realize-Test',hrsPerWeek:30},{phase:'Deploy',hrsPerWeek:20}] };
}

// ══════════════════════════════════════════════════════════════
// CANONICAL 25-ROLE DATASET
// ══════════════════════════════════════════════════════════════
interface CanonicalRole {
  roleName: string;
  location: LocationType;
  band: IBMBand;
  totalHours: number;
  phaseHours: Record<IBMPhase, number>;
  phaseFTE:   Record<IBMPhase, number>;
}

const ZERO_PHASE_HOURS: Record<IBMPhase, number> = { Prepare:0, Explore:0, 'Realize-Build':0, 'Realize-Test':0, Training:0, Deploy:0, Hypercare:0 };
const ZERO_PHASE_FTE:   Record<IBMPhase, number> = { Prepare:0, Explore:0, 'Realize-Build':0, 'Realize-Test':0, Training:0, Deploy:0, Hypercare:0 };

const CANONICAL_ROLES: CanonicalRole[] = [
  { roleName:'Client Partner',     location:'Geo',      band:'D',
    totalHours:302, phaseHours:{...ZERO_PHASE_HOURS, Prepare:25, Explore:50, 'Realize-Build':126, 'Realize-Test':76, Deploy:25},
    phaseFTE:{...ZERO_PHASE_FTE, Prepare:0.18, Explore:0.18, 'Realize-Build':0.18, 'Realize-Test':0.18, Deploy:0.18} },
  { roleName:'DPE',                location:'Geo',      band:'10',
    totalHours:378, phaseHours:{...ZERO_PHASE_HOURS, Prepare:25, Explore:50, 'Realize-Build':126, 'Realize-Test':76, Deploy:25, Hypercare:76},
    phaseFTE:{...ZERO_PHASE_FTE, Prepare:0.18, Explore:0.18, 'Realize-Build':0.18, 'Realize-Test':0.18, Deploy:0.18, Hypercare:0.18} },
  { roleName:'Sector Partner',     location:'Offshore', band:'10',
    totalHours:93,  phaseHours:{...ZERO_PHASE_HOURS, Prepare:31, Explore:62},
    phaseFTE:{...ZERO_PHASE_FTE, Prepare:0.18, Explore:0.18} },
  { roleName:'Program Manager',    location:'Geo',      band:'8',
    totalHours:756, phaseHours:{...ZERO_PHASE_HOURS, Prepare:50, Explore:101, 'Realize-Build':252, 'Realize-Test':151, Deploy:50, Hypercare:151},
    phaseFTE:{...ZERO_PHASE_FTE, Prepare:0.36, Explore:0.36, 'Realize-Build':0.36, 'Realize-Test':0.36, Deploy:0.36, Hypercare:0.36} },
  { roleName:'Project Manager',    location:'Offshore', band:'8',
    totalHours:1397, phaseHours:{...ZERO_PHASE_HOURS, 'Realize-Build':776, 'Realize-Test':466, Deploy:155},
    phaseFTE:{...ZERO_PHASE_FTE, 'Realize-Build':0.90, 'Realize-Test':0.90, Deploy:0.90} },
  { roleName:'PMO',                location:'Offshore', band:'6B',
    totalHours:373, phaseHours:{...ZERO_PHASE_HOURS, Prepare:31, Explore:62, 'Realize-Build':155, 'Realize-Test':93, Deploy:31},
    phaseFTE:{...ZERO_PHASE_FTE, Prepare:0.18, Explore:0.18, 'Realize-Build':0.18, 'Realize-Test':0.18, Deploy:0.18} },
  { roleName:'DS&P',               location:'Offshore', band:'7A',
    totalHours:207, phaseHours:{...ZERO_PHASE_HOURS, Prepare:17, Explore:35, 'Realize-Build':86, 'Realize-Test':52, Deploy:17},
    phaseFTE:{...ZERO_PHASE_FTE, Prepare:0.10, Explore:0.10, 'Realize-Build':0.10, 'Realize-Test':0.10, Deploy:0.10} },
  { roleName:'Lead Architect',     location:'Geo',      band:'8',
    totalHours:1610, phaseHours:{...ZERO_PHASE_HOURS, Prepare:140, Explore:280, 'Realize-Build':700, 'Realize-Test':420, Deploy:70},
    phaseFTE:{...ZERO_PHASE_FTE, Prepare:1.00, Explore:1.00, 'Realize-Build':1.00, 'Realize-Test':1.00, Deploy:0.50} },
  { roleName:'Architect Manage',   location:'Offshore', band:'8',
    totalHours:2415, phaseHours:{...ZERO_PHASE_HOURS, Explore:690, 'Realize-Build':1725},
    phaseFTE:{...ZERO_PHASE_FTE, Explore:2.00, 'Realize-Build':2.00} },
  { roleName:'Architect Mobile',   location:'Offshore', band:'7B',
    totalHours:0, phaseHours:{...ZERO_PHASE_HOURS}, phaseFTE:{...ZERO_PHASE_FTE} },
  { roleName:'Functional Consultant', location:'Offshore', band:'7B',
    totalHours:1984, phaseHours:{...ZERO_PHASE_HOURS, Prepare:173, Explore:345, 'Realize-Build':863, 'Realize-Test':518, Deploy:86},
    phaseFTE:{...ZERO_PHASE_FTE, Prepare:1.00, Explore:1.00, 'Realize-Build':1.00, 'Realize-Test':1.00, Deploy:0.50} },
  { roleName:'Business Analyst',   location:'Offshore', band:'6B',
    totalHours:1898, phaseHours:{...ZERO_PHASE_HOURS, Prepare:173, Explore:345, 'Realize-Build':863, 'Realize-Test':518},
    phaseFTE:{...ZERO_PHASE_FTE, Prepare:1.00, Explore:1.00, 'Realize-Build':1.00, 'Realize-Test':1.00} },
  { roleName:'Developer-Mobile',   location:'Offshore', band:'7B',
    totalHours:0, phaseHours:{...ZERO_PHASE_HOURS}, phaseFTE:{...ZERO_PHASE_FTE} },
  { roleName:'Red Hat OpenShift Consultant', location:'Offshore', band:'7B',
    totalHours:1909, phaseHours:{...ZERO_PHASE_HOURS, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:136, Hypercare:409},
    phaseFTE:{...ZERO_PHASE_FTE, Explore:0.79, 'Realize-Build':0.79, 'Realize-Test':0.79, Deploy:0.79, Hypercare:0.79} },
  { roleName:'Integration Developer-Manage', location:'Offshore', band:'7B',
    totalHours:1909, phaseHours:{...ZERO_PHASE_HOURS, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:136, Hypercare:409},
    phaseFTE:{...ZERO_PHASE_FTE, Explore:0.79, 'Realize-Build':0.79, 'Realize-Test':0.79, Deploy:0.79, Hypercare:0.79} },
  { roleName:'Developer-Migration', location:'Offshore', band:'6B',
    totalHours:1432, phaseHours:{...ZERO_PHASE_HOURS, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:68},
    phaseFTE:{...ZERO_PHASE_FTE, Explore:0.79, 'Realize-Build':0.79, 'Realize-Test':0.79, Deploy:0.40} },
  { roleName:'Developer-Application', location:'Offshore', band:'7B',
    totalHours:1909, phaseHours:{...ZERO_PHASE_HOURS, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:136, Hypercare:409},
    phaseFTE:{...ZERO_PHASE_FTE, Explore:0.79, 'Realize-Build':0.79, 'Realize-Test':0.79, Deploy:0.79, Hypercare:0.79} },
  { roleName:'Developer-Workflow',  location:'Offshore', band:'6B',
    totalHours:818, phaseHours:{...ZERO_PHASE_HOURS, 'Realize-Build':682, Deploy:136},
    phaseFTE:{...ZERO_PHASE_FTE, 'Realize-Build':0.79, Deploy:0.79} },
  { roleName:'Developer-Report',    location:'Offshore', band:'6B',
    totalHours:1228, phaseHours:{...ZERO_PHASE_HOURS, 'Realize-Build':682, 'Realize-Test':409, Deploy:136},
    phaseFTE:{...ZERO_PHASE_FTE, 'Realize-Build':0.79, 'Realize-Test':0.79, Deploy:0.79} },
  { roleName:'Test Lead',           location:'Offshore', band:'7B',
    totalHours:868, phaseHours:{...ZERO_PHASE_HOURS, 'Realize-Test':868},
    phaseFTE:{...ZERO_PHASE_FTE, 'Realize-Test':1.68} },
  { roleName:'Testing Consultant',  location:'Offshore', band:'6B',
    totalHours:1302, phaseHours:{...ZERO_PHASE_HOURS, 'Realize-Test':1302},
    phaseFTE:{...ZERO_PHASE_FTE, 'Realize-Test':2.52} },
  { roleName:'Training Lead',       location:'Geo',      band:'7B',
    totalHours:205, phaseHours:{...ZERO_PHASE_HOURS, Training:205},
    phaseFTE:{...ZERO_PHASE_FTE, Training:1.47} },
  { roleName:'Training Consultant', location:'Offshore', band:'6B',
    totalHours:479, phaseHours:{...ZERO_PHASE_HOURS, Training:479},
    phaseFTE:{...ZERO_PHASE_FTE, Training:2.78} },
  { roleName:'Change Lead',         location:'Geo',      band:'7B',
    totalHours:0, phaseHours:{...ZERO_PHASE_HOURS}, phaseFTE:{...ZERO_PHASE_FTE} },
  { roleName:'Change Consultant',   location:'Offshore', band:'6B',
    totalHours:0, phaseHours:{...ZERO_PHASE_HOURS}, phaseFTE:{...ZERO_PHASE_FTE} },
];

// ── Phase FTE Matrix (canonical) ─────────────────────────────
const FTE_MATRIX: Record<string, Record<IBMPhase, number>> = {
  'Client Partner':              {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':1.0,Training:1.0,Deploy:0.0,Hypercare:0.0},
  'DPE':                         {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':1.0,Training:1.0,Deploy:1.0,Hypercare:0.0},
  'Sector Partner':              {Prepare:1.0,Explore:0.0,'Realize-Build':0.0,'Realize-Test':0.0,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'Program Manager':             {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':1.0,Training:1.0,Deploy:1.0,Hypercare:0.0},
  'Project Manager':             {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':0.0,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'PMO':                         {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':1.0,Training:1.0,Deploy:0.0,Hypercare:0.0},
  'DS&P':                        {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':1.0,Training:1.0,Deploy:0.0,Hypercare:0.0},
  'Lead Architect':              {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':1.0,Training:0.0,Deploy:0.5,Hypercare:0.0},
  'Architect Manage':            {Prepare:1.0,Explore:1.0,'Realize-Build':0.0,'Realize-Test':0.0,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'Architect Mobile':            {Prepare:1.0,Explore:1.0,'Realize-Build':0.0,'Realize-Test':0.5,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'Functional Consultant':       {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':1.0,Training:0.0,Deploy:0.5,Hypercare:0.0},
  'Business Analyst':            {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':1.0,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'Developer-Mobile':            {Prepare:0.0,Explore:0.0,'Realize-Build':0.0,'Realize-Test':0.0,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'Red Hat OpenShift Consultant':{Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':1.0,Training:1.0,Deploy:0.0,Hypercare:0.0},
  'Integration Developer-Manage':{Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':1.0,Training:1.0,Deploy:0.0,Hypercare:0.0},
  'Developer-Migration':         {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':0.5,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'Developer-Application':       {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':1.0,Training:1.0,Deploy:0.0,Hypercare:0.0},
  'Developer-Workflow':          {Prepare:1.0,Explore:1.0,'Realize-Build':0.0,'Realize-Test':0.0,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'Developer-Report':            {Prepare:1.0,Explore:1.0,'Realize-Build':1.0,'Realize-Test':0.0,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'Test Lead':                   {Prepare:0.0,Explore:0.0,'Realize-Build':0.0,'Realize-Test':1.0,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'Testing Consultant':          {Prepare:0.0,Explore:0.0,'Realize-Build':0.0,'Realize-Test':1.0,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'Training Lead':               {Prepare:0.0,Explore:0.0,'Realize-Build':0.0,'Realize-Test':0.0,Training:1.0,Deploy:0.0,Hypercare:0.0},
  'Training Consultant':         {Prepare:0.0,Explore:0.0,'Realize-Build':0.0,'Realize-Test':0.0,Training:1.0,Deploy:0.0,Hypercare:0.0},
  'Change Lead':                 {Prepare:0.0,Explore:0.0,'Realize-Build':0.0,'Realize-Test':0.0,Training:0.0,Deploy:0.0,Hypercare:0.0},
  'Change Consultant':           {Prepare:0.0,Explore:0.0,'Realize-Build':0.0,'Realize-Test':0.0,Training:0.0,Deploy:0.0,Hypercare:0.0},
};

// ── Editable FTE matrix state per role/phase ──────────────────
// Keys: `${roleName}__${phase}`
type FTEOverrides = Record<string, number>;

// ── Phase Total FTE (spec) ─────────────────────────────────────
const PHASE_TOTAL_FTE: Record<IBMPhase, number> = {
  Prepare:18.0, Explore:17.0, 'Realize-Build':13.0, 'Realize-Test':11.0,
  Training:8.0, Deploy:2.0, Hypercare:0.0,
};

interface PhaseSummaryRow {
  phase: IBMPhase;
  onshore: number;
  offshore: number;
  total: number;
  totalHrsMo: number;
}
const PHASE_SUMMARY: PhaseSummaryRow[] = [
  { phase:'Prepare',       onshore:5.0,  offshore:13.0, total:18.0, totalHrsMo:2942.5  },
  { phase:'Explore',       onshore:4.0,  offshore:13.0, total:17.0, totalHrsMo:2802.5  },
  { phase:'Realize-Build', onshore:4.0,  offshore:9.0,  total:13.0, totalHrsMo:2112.5  },
  { phase:'Realize-Test',  onshore:3.5,  offshore:7.5,  total:11.0, totalHrsMo:1783.75 },
  { phase:'Training',      onshore:4.0,  offshore:4.0,  total:8.0,  totalHrsMo:1250.0  },
  { phase:'Deploy',        onshore:2.0,  offshore:0.0,  total:2.0,  totalHrsMo:280.0   },
  { phase:'Hypercare',     onshore:0.0,  offshore:0.0,  total:0.0,  totalHrsMo:0.0     },
];

// ── Build StaffingRole[] from canonical data ───────────────────
function buildRolesFromCanonical(): StaffingRole[] {
  return CANONICAL_ROLES.map((cr) => {
    const rate     = BAND_RATES[cr.band];
    const totalHrs = cr.totalHours;
    return {
      id: uuid(), roleName: cr.roleName, band: cr.band,
      levelDescription: BAND_DESC[cr.band],
      numberOfResources: 1, hoursPerResource: totalHrs,
      totalHours: totalHrs, hourlyRate: rate,
      totalCost: totalHrs * rate,
      deployCategory: LOCATION_CATEGORY[cr.location],
    } as StaffingRole;
  });
}

// ── Custom XAxis tick for Phase Allocation chart ──────────────
function PhaseTick({
  x, y, payload, activeIdx, phaseColors,
}: {
  x?: number; y?: number;
  payload?: { value: string; index: number };
  activeIdx: number;
  phaseColors: Record<string, string>;
}) {
  if (!payload) return null;
  const idx   = payload.index;
  const color = activeIdx === idx ? (phaseColors[payload.value] ?? INDIGO) : '#64748B';
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0} y={0} dy={4}
        textAnchor="end"
        transform="rotate(-20)"
        fontSize={10}
        fill={color}
        style={{ transition: 'fill 0.2s' }}
      >
        {payload.value}
      </text>
    </g>
  );
}

// ══════════════════════════════════════════════════════════════
// PHASE ALLOCATION CHART
// ══════════════════════════════════════════════════════════════
function PhaseAllocationChart({ roles }: { roles: StaffingRole[] }) {
  const [activeBarIdx, setActiveBarIdx] = useState(-1);

  const phaseHours = useMemo(() => {
    const totals: Record<IBMPhase, number> = { Prepare:0, Explore:0, 'Realize-Build':0, 'Realize-Test':0, Training:0, Deploy:0, Hypercare:0 };
    roles.forEach((r) => {
      const canon = CANONICAL_ROLES.find(c => c.roleName === r.roleName);
      if (!canon) return;
      IBM_PHASES.forEach((ph) => { totals[ph] += canon.phaseHours[ph]; });
    });
    return IBM_PHASES.map((ph) => ({ phase: ph, hours: Math.round(totals[ph]), color: PHASE_COLORS[ph] }));
  }, [roles]);

  const handleMouseEnter = useCallback((_: unknown, index: number) => setActiveBarIdx(index), []);
  const handleMouseLeave = useCallback(() => setActiveBarIdx(-1), []);

  return (
    <div className="rounded-2xl p-5" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: TEXT }}>Phase Allocation (Hours)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={phaseHours} margin={{ left: -10, right: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="phase"
            axisLine={false} tickLine={false}
            interval={0} height={55}
            tick={(props) => (
              <PhaseTick
                {...props}
                activeIdx={activeBarIdx}
                phaseColors={PHASE_COLORS}
              />
            )}
          />
          <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} labelStyle={tooltipLabelStyle}
            formatter={(v: number) => [v.toLocaleString(), 'Hours']} />
          <Bar dataKey="hours" name="Hours" radius={[5,5,0,0]}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {phaseHours.map((e, i) => <Cell key={i} fill={e.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PHASE MULTI-SELECT DROPDOWN
// ══════════════════════════════════════════════════════════════
function PhaseMultiSelect({
  selected, onToggle,
}: { selected: IBMPhase[]; onToggle: (ph: IBMPhase) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" style={{ minWidth: 180 }}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg w-full justify-between"
        style={{ background:'rgba(255,255,255,0.07)', border:`1px solid ${BORDER}`, color: TEXT }}>
        <span className="truncate">
          {selected.length === 0 ? 'Select phases…' : selected.join(', ')}
        </span>
        <ChevronDown size={10} style={{ flexShrink:0, color: MUTED }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{ background:'#1E2436', border:`1px solid ${BORDER}`, minWidth:180 }}>
          {IBM_PHASES.map(ph => (
            <button key={ph} onClick={() => onToggle(ph)}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-[11px] hover:bg-white/10 transition-colors"
              style={{ color: selected.includes(ph) ? PHASE_COLORS[ph] : MUTED }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background: selected.includes(ph) ? PHASE_COLORS[ph] : 'transparent',
                border:`1px solid ${PHASE_COLORS[ph]}`, flexShrink:0 }} />
              {ph}
            </button>
          ))}
          <button onClick={() => setOpen(false)}
            className="w-full py-1.5 text-center text-[10px] font-bold border-t hover:bg-white/5"
            style={{ borderColor: BORDER, color: MUTED }}>Done</button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// FTE MATRIX TABLE (editable cells + tooltips)
// ══════════════════════════════════════════════════════════════
function FTEMatrixTable({ roles, overrides, onOverride }: {
  roles: StaffingRole[];
  overrides: FTEOverrides;
  onOverride: (key: string, val: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editKey, setEditKey]   = useState<string | null>(null);
  const [editVal, setEditVal]   = useState('');
  const visRoles = expanded ? roles : roles.slice(0, 8);

  const commitEdit = (key: string) => {
    const n = parseFloat(editVal);
    if (!isNaN(n)) onOverride(key, Math.max(0, n));
    setEditKey(null);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold" style={{ color: TEXT }}>Role-wise FTE by Phase Matrix</h3>
          <HoverTip text="FTE values are auto-calculated from Role Details. Click any cell to override. FTE = Total Hrs for this Phase / Standard Phase Hours." width={280}>
            <Info size={13} style={{ color: MUTED }} />
          </HoverTip>
        </div>
        <button onClick={() => setExpanded(e => !e)}
          className="text-xs px-3 py-1 rounded-lg transition-colors"
          style={{ color: CYAN, background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.2)' }}>
          {expanded ? 'Collapse' : `Show all ${roles.length} roles`}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table style={{ fontSize:11, minWidth:720, width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'rgba(255,255,255,0.04)' }}>
              <th className="px-3 py-2 text-left" style={{ color:MUTED, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', minWidth:160 }}>Role</th>
              {IBM_PHASES.map(ph => (
                <th key={ph} className="px-2 py-2 text-center" style={{ color:PHASE_COLORS[ph], fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em', fontSize:10 }}>
                  {ph.replace('-',' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visRoles.map((role, idx) => {
              const matrix = FTE_MATRIX[role.roleName] ?? ZERO_PHASE_FTE;
              return (
                <tr key={role.id} style={{ borderTop:`1px solid ${BORDER}`, background: idx%2===0?'transparent':'rgba(255,255,255,0.015)' }}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <RoleAvatar roleName={role.roleName} size={22} />
                      <span style={{ color:TEXT, fontSize:11, fontWeight:500 }}>{role.roleName}</span>
                    </div>
                  </td>
                  {IBM_PHASES.map(ph => {
                    const key = `${role.roleName}__${ph}`;
                    const base = matrix[ph] ?? 0;
                    const val  = overrides[key] !== undefined ? overrides[key] : base;
                    const isEditing = editKey === key;
                    return (
                      <td key={ph} className="px-2 py-2 text-center" style={{ cursor:'pointer' }}
                        title={`FTE = Total Hrs for this Phase / Standard Phase Hours. Click to override the calculated value.`}>
                        {isEditing ? (
                          <input autoFocus type="number" step="0.1" value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onBlur={() => commitEdit(key)}
                            onKeyDown={e => { if (e.key==='Enter') commitEdit(key); if (e.key==='Escape') setEditKey(null); }}
                            style={{ width:52, background:'rgba(255,255,255,0.1)', border:`1px solid ${PHASE_COLORS[ph]}`,
                              color:TEXT, borderRadius:4, textAlign:'center', fontSize:11, outline:'none', padding:'2px 4px' }} />
                        ) : (
                          <span
                            onClick={() => { setEditKey(key); setEditVal(String(val)); }}
                            style={{ color: val>0 ? PHASE_COLORS[ph] : 'rgba(255,255,255,0.2)',
                              fontWeight: val>0?700:400, fontSize:11,
                              borderBottom: overrides[key]!==undefined ? `1px dashed ${PHASE_COLORS[ph]}` : 'none' }}>
                            {val>0 ? val.toFixed(2) : '–'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr style={{ borderTop:`2px solid ${BORDER}`, background:'rgba(99,102,241,0.08)' }}>
              <td className="px-3 py-2 font-bold text-xs" style={{ color:INDIGO }}>Phase Total FTE</td>
              {IBM_PHASES.map(ph => (
                <td key={ph} className="px-2 py-2 text-center font-bold" style={{ color:PHASE_COLORS[ph], fontSize:12 }}>
                  {PHASE_TOTAL_FTE[ph].toFixed(1)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PHASE SUMMARY TABLE — editable, derived from roles, with tooltips
// ══════════════════════════════════════════════════════════════
function PhaseSummaryTable({
  roles, projectMonths, summaryOverrides, onSummaryOverride,
}: {
  roles: StaffingRole[];
  projectMonths: number;
  summaryOverrides: Record<string, string>;
  onSummaryOverride: (key: string, val: string) => void;
}) {
  // Derive from roles
  const derived = useMemo((): PhaseSummaryRow[] => {
    return IBM_PHASES.map(ph => {
      let onshoreTotal = 0, offshoreTotal = 0;
      roles.forEach(r => {
        const canon = CANONICAL_ROLES.find(c => c.roleName === r.roleName);
        if (!canon) return;
        const fte = (FTE_MATRIX[r.roleName]?.[ph] ?? 0);
        if (fte === 0) return;
        const loc = deployToLocation(r.deployCategory);
        if (loc === 'Offshore') offshoreTotal += fte;
        else onshoreTotal += fte;
      });
      const onshore  = parseFloat(onshoreTotal.toFixed(2));
      const offshore = parseFloat(offshoreTotal.toFixed(2));
      const total    = parseFloat((onshore + offshore).toFixed(2));
      const hrsOnshore  = onshore  * getMonthlyHrs('Geo',      projectMonths);
      const hrsOffshore = offshore * getMonthlyHrs('Offshore', projectMonths);
      return { phase:ph, onshore, offshore, total, totalHrsMo: parseFloat((hrsOnshore + hrsOffshore).toFixed(2)) };
    });
  }, [roles, projectMonths]);

  const [editing, setEditing] = useState<string | null>(null);

  const getVal = (key: string, fallback: number) =>
    summaryOverrides[key] !== undefined ? summaryOverrides[key] : fallback.toFixed(2);

  const fieldMeta: Record<string, { label: string; tip: string }> = {
    onshore:    { label:'Onshore FTE',  tip:'Number of full-time-equivalent onshore resources (Mainline Geo / Nearshore / Landed India) in this phase. Derived from Role Details FTE matrix — edit to override.' },
    offshore:   { label:'Offshore FTE', tip:'Number of full-time-equivalent offshore CIC (India) resources in this phase. Derived from Role Details — edit to override.' },
    total:      { label:'Total FTE',    tip:'Total FTE = Onshore FTE + Offshore FTE. Represents total parallel workforce in this phase.' },
    totalHrsMo: { label:'Hrs / Month',  tip:'Total hours per month = (Onshore FTE × 140) + (Offshore FTE × 180 if ≤12mo, 172.5 if >12mo). Auto-calculated — edit to override.' },
  };

  const fields = ['onshore','offshore','total','totalHrsMo'] as const;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
      <div className="px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold" style={{ color: TEXT }}>Phase Summary — FTE &amp; Hours</h3>
          <HoverTip text="Derived from Role Details. Updates in real-time as roles/phases change. Click any cell to override." width={280}>
            <Info size={13} style={{ color: MUTED }} />
          </HoverTip>
        </div>
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>
          Geo/Nearshore/Landed = 140 h/mo · Offshore CIC ≤12mo = 180 h/mo · &gt;12mo = 172.5 h/mo
          &nbsp;· Click any cell to edit
        </p>
      </div>
      <div className="overflow-x-auto">
        <table style={{ fontSize:12, width:'100%', borderCollapse:'collapse', minWidth:560 }}>
          <thead>
            <tr style={{ background:'rgba(255,255,255,0.04)' }}>
              <th className="px-4 py-2 text-left" style={{ color:MUTED, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', fontSize:10 }}>Phase</th>
              {fields.map(f => (
                <th key={f} className="px-4 py-2 text-left" style={{ color:MUTED, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', fontSize:10 }}>
                  <HoverTip text={fieldMeta[f].tip} width={260}>
                    <span className="inline-flex items-center gap-1">
                      {fieldMeta[f].label}
                      <Info size={10} style={{ color:MUTED }} />
                    </span>
                  </HoverTip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {derived.map((row, idx) => (
              <tr key={row.phase} style={{ borderTop:`1px solid ${BORDER}`, background: idx%2===0?'transparent':'rgba(255,255,255,0.015)' }}>
                <td className="px-4 py-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:`${PHASE_COLORS[row.phase]}20`, color:PHASE_COLORS[row.phase] }}>
                    {row.phase}
                  </span>
                </td>
                {fields.map(f => {
                  const key = `${row.phase}__${f}`;
                  const raw = f==='onshore'?row.onshore:f==='offshore'?row.offshore:f==='total'?row.total:row.totalHrsMo;
                  const displayVal = getVal(key, raw);
                  const isEd = editing === key;
                  const fColor = f==='onshore'?CYAN:f==='offshore'?INDIGO:f==='total'?TEXT:'#F59E0B';
                  return (
                    <td key={f} className="px-4 py-2 text-center" style={{ cursor:'pointer' }}>
                      {isEd ? (
                        <input autoFocus value={displayVal}
                          onChange={e => onSummaryOverride(key, e.target.value)}
                          onBlur={() => setEditing(null)}
                          onKeyDown={e => { if (e.key==='Enter'||e.key==='Escape') setEditing(null); }}
                          style={{ width:72, background:'rgba(255,255,255,0.08)', border:`1px solid ${fColor}`,
                            color:fColor, borderRadius:4, textAlign:'center', fontSize:12, outline:'none', padding:'2px 6px' }} />
                      ) : (
                        <span className="font-semibold tabular-nums" style={{ color:fColor,
                          borderBottom: summaryOverrides[key]!==undefined ? `1px dashed ${fColor}` : 'none',
                          paddingBottom:1 }}
                          onClick={() => setEditing(key)}>
                          {parseFloat(displayVal) > 0
                            ? (f==='totalHrsMo' ? parseFloat(displayVal).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1}) : parseFloat(displayVal).toFixed(1))
                            : '—'}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:`2px solid ${BORDER}`, background:'rgba(99,102,241,0.08)' }}>
              <td className="px-4 py-2 font-bold text-xs" style={{ color:INDIGO }}>TOTAL</td>
              {fields.map(f => {
                const sum = derived.reduce((a,r) => {
                  const raw = f==='onshore'?r.onshore:f==='offshore'?r.offshore:f==='total'?r.total:r.totalHrsMo;
                  const key = `${r.phase}__${f}`;
                  return a + (summaryOverrides[key] !== undefined ? parseFloat(summaryOverrides[key]||'0') : raw);
                }, 0);
                const fColor = f==='onshore'?CYAN:f==='offshore'?INDIGO:f==='total'?TEXT:'#F59E0B';
                return (
                  <td key={f} className="px-4 py-2 text-center font-bold tabular-nums" style={{ color:fColor }}>
                    {f==='totalHrsMo' ? sum.toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1}) : sum.toFixed(1)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// STAFFING TABLE ROW — extracted so useState is legal (Rules of Hooks)
// ══════════════════════════════════════════════════════════════
interface StaffingTableRowProps {
  role: StaffingRole;
  idx: number;
  projectMonths: number;
  activeDocumentId: string | null;
  editingRoleId: string | null;
  editingRoleName: string;
  editingBandId: string | null;
  activePhs: IBMPhase[];
  aiSug: ReturnType<typeof getAISuggestion>;
  onEditRoleStart: (id: string, name: string) => void;
  onEditRoleNameChange: (v: string) => void;
  onEditRoleCommit: (id: string) => void;
  onEditRoleCancel: () => void;
  onBandEditStart: (id: string) => void;
  onBandChange: (role: StaffingRole, band: IBMBand) => void;
  onLocationChange: (role: StaffingRole, loc: LocationType) => void;
  onTogglePhase: (roleId: string, ph: IBMPhase) => void;
  onRemove: (id: string) => void;
  updateStaffingRole: (docId: string, roleId: string, updates: Partial<StaffingRole>) => void;
}

function StaffingTableRow({
  role, idx, projectMonths, activeDocumentId,
  editingRoleId, editingRoleName, editingBandId,
  activePhs, aiSug,
  onEditRoleStart, onEditRoleNameChange, onEditRoleCommit, onEditRoleCancel,
  onBandEditStart, onBandChange, onLocationChange, onTogglePhase, onRemove,
  updateStaffingRole,
}: StaffingTableRowProps) {
  // ✅ useState called at component top level — Rules of Hooks satisfied
  const [showPhaseEdit, setShowPhaseEdit] = useState(false);
  const [showLocEdit,   setShowLocEdit]   = useState(false);

  const loc        = deployToLocation(role.deployCategory);
  const monthlyHrs = getMonthlyHrs(loc, projectMonths);
  const weeklyHrs  = getWeeklyHrs(loc);
  const availHrs   = monthlyHrs * projectMonths;
  const utilPct    = availHrs > 0 && role.totalHours > 0
    ? +((role.totalHours / availHrs) * 100).toFixed(1) : 0;
  const roleColor  = ROLE_COLORS[idx % ROLE_COLORS.length];
  const locColor   = loc==='Offshore'?INDIGO:loc==='Nearshore'?'#10b981':loc==='Landed'?'#f59e0b':CYAN;
  const locLabel   = loc==='Offshore'?'Offshore':loc==='Nearshore'?'Nearshore':loc==='Landed'?'Landed India':'Geo';

  const changeLocation = (newLoc: LocationType) => {
    if (!activeDocumentId) return;
    const newDeploy  = LOCATION_CATEGORY[newLoc];
    const newMonthly = getMonthlyHrs(newLoc, projectMonths);
    const newAvail   = newMonthly * projectMonths;
    const newWeekly  = getWeeklyHrs(newLoc);
    const weeks      = Math.round(projectMonths * 4.33);
    const newTotal   = Math.round(newWeekly * weeks * (utilPct / 100));
    const safeTot    = newTotal > 0 ? newTotal : role.totalHours;
    updateStaffingRole(activeDocumentId, role.id, {
      ...role,
      deployCategory: newDeploy,
      hoursPerResource: safeTot,
      totalHours: safeTot,
      totalCost: safeTot * role.hourlyRate,
    });
    setShowLocEdit(false);
    onLocationChange(role, newLoc);
  };

  // suppress unused warning — roleColor used for future avatar border extension
  void roleColor;

  return (
    <tr key={role.id}
      style={{ borderTop:`1px solid ${BORDER}`, background: idx%2===0?'transparent':'rgba(255,255,255,0.015)' }}>

      {/* Role — inline editable text */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <RoleAvatar roleName={role.roleName} size={30} />
          <div style={{ flex:1, minWidth:0 }}>
            {editingRoleId === role.id ? (
              <input autoFocus value={editingRoleName}
                onChange={e => onEditRoleNameChange(e.target.value)}
                onBlur={() => onEditRoleCommit(role.id)}
                onKeyDown={e => { if (e.key==='Enter') onEditRoleCommit(role.id); if (e.key==='Escape') onEditRoleCancel(); }}
                style={{ background:'rgba(255,255,255,0.1)', border:`1px solid ${INDIGO}`, color:TEXT,
                  borderRadius:4, fontSize:12, outline:'none', padding:'2px 6px', width:'100%' }} />
            ) : (
              <div className="font-semibold cursor-pointer hover:opacity-80 group flex items-center gap-1"
                style={{ color:TEXT, fontSize:12 }}
                onClick={() => onEditRoleStart(role.id, role.roleName)}
                title="Click to edit role name">
                {role.roleName}
                <span className="opacity-0 group-hover:opacity-60 text-[9px]" style={{ color: '#F59E0B' }}>✎</span>
              </div>
            )}
            <div style={{ color:MUTED, fontSize:10 }}>{BAND_DESC[role.band]}</div>
          </div>
        </div>
      </td>

      {/* Location — clickable selection dropdown */}
      <td className="px-3 py-2" style={{ position:'relative' }}>
        {showLocEdit ? (
          <div style={{ position:'absolute', top:'100%', left:0, zIndex:9999,
            background:'#1A2035', border:`1px solid ${BORDER}`, borderRadius:10,
            boxShadow:'0 8px 32px rgba(0,0,0,0.7)', minWidth:180, overflow:'hidden' }}>
            {(['Geo','Nearshore','Offshore','Landed'] as LocationType[]).map(lt => {
              const ltCol = lt==='Offshore'?INDIGO:lt==='Nearshore'?'#10b981':lt==='Landed'?'#f59e0b':CYAN;
              const ltLbl = lt==='Offshore'?'Offshore':lt==='Nearshore'?'Nearshore':lt==='Landed'?'Landed India':'Geo';
              const ltHrs = `${getWeeklyHrs(lt)}h/wk · ${getMonthlyHrs(lt, projectMonths)}h/mo`;
              return (
                <button key={lt} onClick={() => changeLocation(lt)}
                  className="flex items-center justify-between w-full px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors"
                  style={{ borderBottom:`1px solid ${BORDER}`, color: lt===loc ? ltCol : TEXT,
                    background: lt===loc ? `${ltCol}15` : 'transparent' }}>
                  <span className="font-semibold">{ltLbl}</span>
                  <span style={{ fontSize:10, color:MUTED }}>{ltHrs}</span>
                </button>
              );
            })}
            <button onClick={() => setShowLocEdit(false)}
              className="w-full py-1.5 text-center text-[10px] font-bold hover:bg-white/5 transition-colors"
              style={{ color:MUTED }}>Close</button>
          </div>
        ) : (
          <button onClick={() => setShowLocEdit(true)}
            className="flex flex-col items-start gap-0.5 group"
            title="Click to change location">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full group-hover:opacity-80 transition-opacity"
              style={{ background:`${locColor}20`, color:locColor, border:`1px solid ${locColor}40` }}>
              {locLabel} ✎
            </span>
            <span className="text-[9px]" style={{ color:MUTED }}>
              {weeklyHrs}h/wk · {monthlyHrs}h/mo
            </span>
          </button>
        )}
      </td>

      {/* Band — dropdown */}
      <td className="px-3 py-2 text-center">
        {editingBandId === role.id ? (
          <select autoFocus value={role.band}
            onBlur={() => onBandEditStart('')}
            onChange={e => { const b = e.target.value as IBMBand; onBandChange(role, b); }}
            style={{ background:'#1E2436', border:`1px solid ${INDIGO}`, color:TEXT, borderRadius:4, fontSize:11, outline:'none', padding:'2px 4px' }}>
            {IBM_BANDS.map(b => <option key={b} value={b} style={{ background:'#1E2436' }}>{b}</option>)}
          </select>
        ) : (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white cursor-pointer hover:opacity-80"
            style={{ background:`linear-gradient(135deg, ${INDIGO}, #4F46E5)` }}
            onClick={() => onBandEditStart(role.id)}
            title="Click to change band">
            {role.band}
          </span>
        )}
      </td>

      {/* Total Hours */}
      <td className="px-3 py-2 text-right tabular-nums" style={{ color:TEXT, fontWeight:600 }}>
        <HoverTip text={`Total Hrs = Hrs/Week × Duration × UTIL%\n= ${weeklyHrs} × ${Math.round(projectMonths*4.33)} wks × ${utilPct}%\n≈ ${role.totalHours.toLocaleString()} hrs`} width={240}>
          <span>{role.totalHours > 0 ? role.totalHours.toLocaleString() : <span style={{ color:MUTED }}>—</span>}</span>
        </HoverTip>
      </td>

      {/* Util% */}
      <td className="px-3 py-2 text-center">
        <HoverTip text={`UTIL% = Assigned Hrs / Available Hrs × 100\n= ${role.totalHours} / ${Math.round(availHrs)} × 100\n= ${utilPct}%`} width={240}>
          {role.totalHours > 0 ? (
            <div className="inline-flex flex-col items-center gap-0.5">
              <span className="text-xs font-bold tabular-nums" style={{ color:utilColor(utilPct) }}>{utilPct.toFixed(1)}%</span>
              {utilPct > 100 && <span className="text-[9px]" style={{ color:'#ef4444' }}>Over</span>}
              {utilPct > 0 && utilPct < 50 && <span className="text-[9px]" style={{ color:'#f59e0b' }}>Low</span>}
            </div>
          ) : <span style={{ color:MUTED, fontSize:10 }}>—</span>}
        </HoverTip>
      </td>

      {/* Cost */}
      <td className="px-3 py-2 text-right font-bold tabular-nums" style={{ color:'#F59E0B', fontSize:12 }}>
        {role.totalHours > 0 ? fmt(role.totalCost) : <span style={{ color:MUTED }}>—</span>}
      </td>

      {/* Phases — AI suggested, editable multi-select */}
      <td className="px-3 py-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] font-bold uppercase" style={{ color:'#F59E0B' }}>AI Suggested</span>
            <HoverTip text={
              <span>
                <strong style={{ color:'#F59E0B' }}>Rationale:</strong> {aiSug.rationale}
                <br /><br />
                <strong>Recommended hrs/wk:</strong><br />
                {aiSug.phases.map(p => `${p.phase}: ${p.hrsPerWeek} hrs/wk`).join(' · ')}
              </span>
            } width={300}>
              <Info size={10} style={{ color:'#F59E0B' }} />
            </HoverTip>
          </div>
          <div className="flex flex-wrap gap-1">
            {activePhs.length > 0 ? activePhs.map(ph => (
              <span key={ph} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background:`${PHASE_COLORS[ph]}20`, color:PHASE_COLORS[ph] }}>
                {ph}
              </span>
            )) : <span style={{ color:MUTED, fontSize:10 }}>None</span>}
            <button onClick={() => setShowPhaseEdit(!showPhaseEdit)}
              className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background:'rgba(255,255,255,0.08)', color:MUTED, border:`1px solid ${BORDER}` }}>
              ✎ Edit
            </button>
          </div>
          {showPhaseEdit && (
            <PhaseMultiSelect
              selected={activePhs}
              onToggle={(ph) => onTogglePhase(role.id, ph)}
            />
          )}
        </div>
      </td>

      {/* Delete */}
      <td className="px-3 py-2 text-center">
        <button onClick={() => onRemove(role.id)}
          className="transition-colors" style={{ color:'#475569' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F43F5E')}
          onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function StaffingPlanModule() {
  const { activeDocumentId, analysisResults, updateStaffingRole, addStaffingRole, removeStaffingRole, setAnalysisResult } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  const [search, setSearch]           = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRole, setNewRole]         = useState<Partial<StaffingRole & { _location: LocationType }>>({
    roleName:'', band:'7A', numberOfResources:1, hoursPerResource:640, hourlyRate:65, _location:'Offshore',
  });

  // Per-role phase overrides (edited via multi-select)
  const [rolePhaseOverrides, setRolePhaseOverrides] = useState<Record<string, IBMPhase[]>>({});
  // FTE matrix overrides
  const [fteOverrides, setFteOverrides] = useState<FTEOverrides>({});
  // Phase Summary overrides
  const [summaryOverrides, setSummaryOverrides] = useState<Record<string, string>>({});

  // ── Initialise plan from canonical data if empty ─────────────
  const plan = result?.staffingPlan;

  React.useEffect(() => {
    if (!activeDocumentId || !result) return;
    const currentPlan = result.staffingPlan;
    if (!currentPlan || currentPlan.roles.length === 0) {
      const canonRoles    = buildRolesFromCanonical();
      const totalHours    = canonRoles.reduce((a, r) => a + r.totalHours, 0);
      const totalLaborCost = canonRoles.reduce((a, r) => a + r.totalCost, 0);
      const totalHeadcount = canonRoles.length;
      const newPlan = {
        id: uuid(), documentId: activeDocumentId, roles: canonRoles,
        totalHeadcount, peakHeadcount: totalHeadcount,
        totalLaborCost, totalHours, lastUpdated: new Date().toISOString(),
      };
      setAnalysisResult(activeDocumentId, { ...result, staffingPlan: newPlan });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocumentId]);

  if (!plan) return (
    <div className="flex items-center justify-center mt-20" style={{ color:MUTED, fontSize:14 }}>
      Upload a document to see the staffing plan
    </div>
  );

  const roles = plan.roles;

  // ── Project months for utilisation calc ─────────────────────
  const projectMonths = useMemo(() => {
    const weeks = result?.projectPlan?.totalDurationWeeks ?? 0;
    return weeks > 0 ? Math.round(weeks / 4.33) : 12;
  }, [result?.projectPlan?.totalDurationWeeks]);

  const filteredRoles = useMemo(() =>
    roles.filter(r => r.roleName.toLowerCase().includes(search.toLowerCase())),
    [roles, search]);

  const totalLaborCost = roles.reduce((a, r) => a + r.totalCost, 0);
  const totalHours     = roles.reduce((a, r) => a + r.totalHours, 0);

  // ── Handlers ─────────────────────────────────────────────────
  const handleAdd = () => {
    if (!activeDocumentId || !newRole.roleName) return;
    const band  = (newRole.band ?? '7A') as IBMBand;
    const nr    = newRole.numberOfResources ?? 1;
    const hpr   = newRole.hoursPerResource ?? 640;
    const rate  = newRole.hourlyRate ?? BAND_RATES[band];
    const loc   = (newRole._location ?? 'Offshore') as LocationType;
    const role: StaffingRole = {
      id: uuid(), roleName: newRole.roleName!, band,
      levelDescription: BAND_DESC[band], numberOfResources: nr,
      hoursPerResource: hpr, totalHours: nr * hpr,
      hourlyRate: rate, totalCost: nr * hpr * rate,
      deployCategory: LOCATION_CATEGORY[loc],
    };
    addStaffingRole(activeDocumentId, role);
    setShowAddForm(false);
    setNewRole({ roleName:'', band:'7A', numberOfResources:1, hoursPerResource:640, hourlyRate:65, _location:'Offshore' });
  };

  const togglePhase = (roleId: string, ph: IBMPhase) => {
    setRolePhaseOverrides(prev => {
      const role  = roles.find(r => r.id === roleId);
      if (!role) return prev;
      const canon = CANONICAL_ROLES.find(c => c.roleName === role.roleName);
      const current = prev[roleId] ?? (canon ? IBM_PHASES.filter(p => canon.phaseHours[p] > 0) : []);
      const next    = current.includes(ph) ? current.filter(p => p !== ph) : [...current, ph];
      return { ...prev, [roleId]: next };
    });
  };

  const getActivePhases = (role: StaffingRole): IBMPhase[] => {
    if (rolePhaseOverrides[role.id]) return rolePhaseOverrides[role.id];
    const canon = CANONICAL_ROLES.find(c => c.roleName === role.roleName);
    return canon ? IBM_PHASES.filter(ph => canon.phaseHours[ph] > 0) : [];
  };

  // Inline role-name edit
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');

  const commitRoleName = (roleId: string) => {
    if (activeDocumentId && editingRoleName.trim()) {
      const role = roles.find(r => r.id === roleId);
      if (role) updateStaffingRole(activeDocumentId, roleId, { ...role, roleName: editingRoleName.trim() });
    }
    setEditingRoleId(null);
  };

  // Band dropdown edit per row
  const [editingBandId, setEditingBandId] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    background:'rgba(255,255,255,0.08)', border:`1px solid ${BORDER}`, borderRadius:8,
    padding:'6px 12px', color:'#F1F5F9', fontSize:13, outline:'none', width:'100%',
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor:'pointer', appearance:'auto' };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" style={{ background:'#F8FAFC', minHeight:'100%' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Staffing Plan</h2>
          <p className="text-xs mt-0.5 text-slate-500">
            {roles.length} roles · {roles.filter(r=>r.totalHours>0).length} active ·
            Geo/Nearshore/Landed 140 h/mo · Offshore ≤12mo 180 h/mo / &gt;12mo 172.5 h/mo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 bg-white border border-slate-200 shadow-sm">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search roles…"
              className="text-sm outline-none bg-transparent w-36 text-slate-700 placeholder:text-slate-400" />
          </div>
          <button onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background:`linear-gradient(135deg, ${INDIGO}, #4F46E5)`, boxShadow:'0 2px 10px rgba(99,102,241,0.4)' }}>
            <Plus size={14} /> Add Role
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total Roles',       value: String(roles.length),                           color: INDIGO },
          { label:'Active Roles',      value: String(roles.filter(r=>r.totalHours>0).length), color: CYAN },
          { label:'Total Labor Cost',  value: fmt(totalLaborCost),                            color:'#F59E0B' },
          { label:'Total Hours',       value: totalHours.toLocaleString(),                    color:'#10B981' },
        ].map(m => (
          <div key={m.label} className="rounded-2xl p-4 bg-white" style={{ border:'1px solid #E2E8F0', borderBottom:`3px solid ${m.color}` }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-slate-500">{m.label}</div>
            <div className="text-2xl font-bold" style={{ color:m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Phase Allocation Chart ── */}
      <PhaseAllocationChart roles={roles} />

      {/* ── Add Role Form ── */}
      {showAddForm && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background:'rgba(99,102,241,0.06)', border:`1px solid rgba(99,102,241,0.3)` }}>
          <div className="text-sm font-bold" style={{ color:TEXT }}>Add New Role</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <input placeholder="Role Name" value={newRole.roleName ?? ''}
              onChange={e => setNewRole({...newRole, roleName:e.target.value})}
              className="col-span-2" style={inputStyle} />
            <select value={newRole.band}
              onChange={e => { const b = e.target.value as IBMBand; setNewRole({...newRole, band:b, hourlyRate:BAND_RATES[b]}); }}
              style={selectStyle}>
              {IBM_BANDS.map(b => <option key={b} value={b} style={{ background:'#1E2436', color:'#F1F5F9' }}>{b} — {BAND_DESC[b]}</option>)}
            </select>
            {/* Location now has 4 options matching IBM rate-card */}
            <select value={newRole._location ?? 'Offshore'}
              onChange={e => setNewRole({...newRole, _location: e.target.value as LocationType})}
              style={selectStyle}>
              <option value="Geo"      style={{ background:'#1E2436', color:'#F1F5F9' }}>Geo (140 h/mo · 40 h/wk)</option>
              <option value="Nearshore"style={{ background:'#1E2436', color:'#F1F5F9' }}>Nearshore (140 h/mo · 45 h/wk)</option>
              <option value="Offshore" style={{ background:'#1E2436', color:'#F1F5F9' }}>Offshore (180/172.5 h/mo · 45 h/wk)</option>
              <option value="Landed"   style={{ background:'#1E2436', color:'#F1F5F9' }}>Landed India (140 h/mo · 40 h/wk)</option>
            </select>
            <input type="number" placeholder="Hrs/Resource" value={newRole.hoursPerResource ?? ''}
              onChange={e => setNewRole({...newRole, hoursPerResource:Number(e.target.value)})}
              style={inputStyle} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm rounded-xl"
              style={{ background:'rgba(255,255,255,0.06)', color:'#94A3B8', border:`1px solid ${BORDER}` }}>Cancel</button>
            <button onClick={handleAdd}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-white"
              style={{ background:`linear-gradient(135deg, ${INDIGO}, #4F46E5)` }}>Add Role</button>
          </div>
        </div>
      )}

      {/* ── Main Staffing Table (Role Details) ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background:GLASS, border:`1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom:`1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold" style={{ color:TEXT }}>Role Details</h3>
          <div className="flex items-center gap-3 text-xs" style={{ color:MUTED }}>
            <span>● Green ≥50% util &nbsp;● Amber &lt;50% &nbsp;● Red &gt;100%</span>
          </div>
        </div>

        {/* Location hours legend */}
        <div className="px-5 py-2 flex flex-wrap gap-4 text-[10px]" style={{ borderBottom:`1px solid ${BORDER}`, color:MUTED }}>
          <span><strong style={{ color:CYAN }}>Geo (Mainline)</strong> 140 h/mo · 40 h/wk</span>
          <span><strong style={{ color:'#10b981' }}>Nearshore</strong> 140 h/mo · 45 h/wk</span>
          <span><strong style={{ color:INDIGO }}>Offshore CIC</strong> ≤12mo: 180 h/mo · &gt;12mo: 172.5 h/mo · 45 h/wk</span>
          <span><strong style={{ color:'#f59e0b' }}>Landed India</strong> 140 h/mo · 40 h/wk</span>
        </div>

        <div className="overflow-x-auto">
          <table style={{ fontSize:12, minWidth:1040, width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'rgba(255,255,255,0.04)', color:MUTED, fontSize:10 }}>
                {/* Role — inline editable */}
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider" style={{ minWidth:200 }}>Role</th>
                {/* Location */}
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider" style={{ minWidth:120 }}>Location</th>
                {/* Band — dropdown */}
                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider" style={{ minWidth:90 }}>Band</th>
                {/* Total Hrs */}
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider" style={{ minWidth:90 }}>
                  <HoverTip text={'Total Hrs = Hrs/Week × Duration (weeks) × UTIL%\ne.g., 40 hrs/wk × 12 weeks × 90% = 432 hrs'} width={260}>
                    <span className="inline-flex items-center gap-1">Total Hrs<Info size={9} style={{ color:MUTED }} /></span>
                  </HoverTip>
                </th>
                {/* Util% */}
                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider" style={{ minWidth:80 }}>
                  <HoverTip text={'UTIL% = Assigned Hours / Available Hours × 100\ne.g., 432 / 480 × 100 = 90%'} width={260}>
                    <span className="inline-flex items-center gap-1">UTIL%<Info size={9} style={{ color:MUTED }} /></span>
                  </HoverTip>
                </th>
                {/* Cost */}
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider" style={{ minWidth:100 }}>Cost</th>
                {/* Active Phases — AI suggested, editable */}
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider" style={{ minWidth:220 }}>
                  <HoverTip text="AI-suggested phases for this role. Click the phase chips to open a multi-select editor. Suggestions are role-aware." width={260}>
                    <span className="inline-flex items-center gap-1">Phases (AI)<Info size={9} style={{ color:MUTED }} /></span>
                  </HoverTip>
                </th>
                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider" style={{ minWidth:36 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role, idx) => (
                <StaffingTableRow
                  key={role.id}
                  role={role}
                  idx={idx}
                  projectMonths={projectMonths}
                  activeDocumentId={activeDocumentId}
                  editingRoleId={editingRoleId}
                  editingRoleName={editingRoleName}
                  editingBandId={editingBandId}
                  activePhs={getActivePhases(role)}
                  aiSug={getAISuggestion(role.roleName)}
                  onEditRoleStart={(id, name) => { setEditingRoleId(id); setEditingRoleName(name); }}
                  onEditRoleNameChange={setEditingRoleName}
                  onEditRoleCommit={commitRoleName}
                  onEditRoleCancel={() => setEditingRoleId(null)}
                  onBandEditStart={(id) => setEditingBandId(id || null)}
                  onBandChange={(r, b) => {
                    if (activeDocumentId) updateStaffingRole(activeDocumentId, r.id, { ...r, band:b, levelDescription:BAND_DESC[b], hourlyRate:BAND_RATES[b], totalCost:r.totalHours*BAND_RATES[b] });
                    setEditingBandId(null);
                  }}
                  onLocationChange={() => {/* location change handled inside row */ }}
                  onTogglePhase={togglePhase}
                  onRemove={(id) => { if (activeDocumentId) removeStaffingRole(activeDocumentId, id); }}
                  updateStaffingRole={updateStaffingRole}
                />
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:`2px solid ${BORDER}`, background:'rgba(99,102,241,0.08)' }}>
                <td colSpan={3} className="px-3 py-3 font-bold text-xs" style={{ color:INDIGO }}>Totals ({roles.length} roles)</td>
                <td className="px-3 py-3 text-right font-bold tabular-nums" style={{ color:TEXT }}>{totalHours.toLocaleString()}</td>
                <td colSpan={1} />
                <td className="px-3 py-3 text-right font-bold tabular-nums" style={{ color:'#F59E0B' }}>{fmt(totalLaborCost)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Phase Total FTE Summary chips ── */}
      <div className="rounded-2xl p-5" style={{ background:GLASS, border:`1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-bold" style={{ color:TEXT }}>Phase-wise Total FTE</h3>
          <HoverTip width={340} text={
            <span>
              <strong style={{ color:'#F1F5F9' }}>Phase Total FTE Calculation</strong>
              <br /><br />
              <strong style={{ color: CYAN }}>Formula:</strong> Sum of all role FTE values active in this phase.<br />
              <em>FTE per role = (Role&apos;s phase hours) / (Standard monthly hours for their location) × months in phase.</em>
              <br /><br />
              <strong style={{ color: '#10b981' }}>Location monthly hours:</strong><br />
              • Geo / Nearshore / Landed India: <strong>140 h/mo</strong><br />
              • Offshore CIC ≤ 12 months: <strong>180 h/mo</strong><br />
              • Offshore CIC &gt; 12 months: <strong>172.5 h/mo</strong>
              <br /><br />
              <strong style={{ color:'#F59E0B' }}>Example (Prepare phase):</strong><br />
              Lead Architect (Geo, 140 h/mo) = 140 h ÷ 140 = 1.0 FTE<br />
              5 Onshore + 13 Offshore roles → Total 18.0 FTE
            </span>
          }>
            <Info size={14} style={{ color:MUTED }} />
          </HoverTip>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {IBM_PHASES.map(ph => {
            // Compute live total from current roles
            let onshFTE = 0, offFTE = 0;
            roles.forEach(r => {
              const ft = FTE_MATRIX[r.roleName]?.[ph] ?? 0;
              if (ft === 0) return;
              const l = deployToLocation(r.deployCategory);
              if (l === 'Offshore') offFTE += ft; else onshFTE += ft;
            });
            const liveFTE = parseFloat((onshFTE + offFTE).toFixed(2));
            return (
              <div key={ph} className="rounded-xl p-3 text-center" style={{ background:`${PHASE_COLORS[ph]}12`, border:`1px solid ${PHASE_COLORS[ph]}30` }}>
                <div className="text-[10px] font-bold uppercase mb-1" style={{ color:PHASE_COLORS[ph] }}>{ph.replace('-',' ')}</div>
                <div className="text-xl font-black" style={{ color:PHASE_COLORS[ph] }}>{liveFTE > 0 ? liveFTE.toFixed(1) : PHASE_TOTAL_FTE[ph].toFixed(1)}</div>
                <div style={{ fontSize:9, color:MUTED }}>FTE</div>
                {liveFTE > 0 && (
                  <div style={{ fontSize:8, color:MUTED, marginTop:2 }}>
                    {onshFTE > 0 && <span style={{ color:CYAN }}>{onshFTE.toFixed(1)}↑</span>}
                    {onshFTE > 0 && offFTE > 0 && ' + '}
                    {offFTE > 0 && <span style={{ color:INDIGO }}>{offFTE.toFixed(1)}⬇</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Phase Summary Table ── */}
      <PhaseSummaryTable
        roles={roles}
        projectMonths={projectMonths}
        summaryOverrides={summaryOverrides}
        onSummaryOverride={(k,v) => setSummaryOverrides(prev => ({ ...prev, [k]:v }))}
      />

      {/* ── FTE Matrix ── */}
      <FTEMatrixTable
        roles={roles}
        overrides={fteOverrides}
        onOverride={(k,v) => setFteOverrides(prev => ({ ...prev, [k]:v }))}
      />

    </div>
  );
}
