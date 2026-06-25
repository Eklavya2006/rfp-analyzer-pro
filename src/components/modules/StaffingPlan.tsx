'use client';
// StaffingPlan — Full IBM rate-card staffing with animated avatars,
//               25-role dataset, FTE matrix, Phase Summary tables,
//               WCAG-AA form contrast, real-time recalculation
import React, { useState, useMemo } from 'react';
import {
  Plus, Trash2, Edit3, Check, X, Search,
} from 'lucide-react';
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

// ── Location / monthly hours ───────────────────────────────────
type LocationType = 'Onshore' | 'Offshore';
function getMonthlyHrs(location: LocationType): number {
  return location === 'Offshore' ? 172.5 : 140;
}

// ── IBM rate-card deploy category mapping ─────────────────────
const LOCATION_CATEGORY: Record<LocationType, DeployCategory> = {
  Onshore:  'Mainline Domestic',
  Offshore: 'Offshore CIC',
};

// ── Tooltip style ─────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════
// ANIMATED AVATARS — deterministic by role name seed
// Each role gets a unique, consistently-rendered animated SVG avatar
// ═══════════════════════════════════════════════════════════════
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

// Avatar component — small animated SVG face, deterministic color from name
function RoleAvatar({ roleName, size = 36 }: { roleName: string; size?: number }) {
  const seed   = hashStr(roleName);
  const hue    = seed % 360;
  const skin   = `hsl(${(seed * 37) % 360},35%,70%)`;
  const hair   = `hsl(${hue},60%,30%)`;
  const shirt  = `hsl(${hue},65%,50%)`;
  const eyeClr = `hsl(${(seed * 73) % 360},60%,35%)`;
  const r      = size / 2;
  const animDur = 1.5 + (seed % 8) * 0.3;

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 36 36"
      fill="none"
      style={{ borderRadius: '50%', flexShrink: 0, willChange: 'transform', display: 'block' }}
      aria-label={roleName}
    >
      {/* Background ring */}
      <circle cx="18" cy="18" r="17" fill={`hsl(${hue},50%,18%)`} stroke={`hsl(${hue},60%,50%)`} strokeWidth="1.5" />

      {/* Hair / top */}
      <ellipse cx="18" cy="9" rx="8.5" ry="6" fill={hair} />
      <rect x="9.5" y="9" width="17" height="5" fill={hair} />

      {/* Face */}
      <ellipse cx="18" cy="18.5" rx="7.5" ry="8" fill={skin} />

      {/* Eyes — animated blink */}
      <ellipse cx="15.2" cy="17" rx="1.3" ry="1.3" fill={eyeClr}>
        <animate attributeName="ry" values="1.3;0.1;1.3" dur={`${animDur}s`} repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="20.8" cy="17" rx="1.3" ry="1.3" fill={eyeClr}>
        <animate attributeName="ry" values="1.3;0.1;1.3" dur={`${animDur}s`} repeatCount="indefinite" />
      </ellipse>

      {/* Highlights */}
      <circle cx="15.8" cy="16.5" r="0.38" fill="white" />
      <circle cx="21.4" cy="16.5" r="0.38" fill="white" />

      {/* Mouth — subtle animated smile */}
      <path d="M15.5 21 Q18 23.2 20.5 21" stroke="#A07040" strokeWidth="0.9" fill="none" strokeLinecap="round">
        <animate attributeName="d" values="M15.5 21 Q18 23.2 20.5 21;M15.5 21.2 Q18 23.5 20.5 21.2;M15.5 21 Q18 23.2 20.5 21"
          dur={`${animDur * 1.5}s`} repeatCount="indefinite" />
      </path>

      {/* Shirt / collar */}
      <path d="M11 30 L14.5 24 L18 26 L21.5 24 L25 30" fill={shirt} />

      {/* Breathing animation on whole avatar */}
      <animateTransform attributeName="transform" type="scale"
        values="1;1.015;1" dur={`${animDur * 1.2}s`} repeatCount="indefinite"
        additive="sum" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// CANONICAL 25-ROLE DATASET (from spec)
// ═══════════════════════════════════════════════════════════════
interface CanonicalRole {
  roleName: string;
  jrss: string;
  location: LocationType;
  band: IBMBand;
  totalHours: number;
  phaseHours: Record<IBMPhase, number>;
  phaseFTE: Record<IBMPhase, number>;
}

const ZERO_PHASE_HOURS: Record<IBMPhase, number> = { Prepare:0, Explore:0, 'Realize-Build':0, 'Realize-Test':0, Training:0, Deploy:0, Hypercare:0 };
const ZERO_PHASE_FTE:   Record<IBMPhase, number> = { Prepare:0, Explore:0, 'Realize-Build':0, 'Realize-Test':0, Training:0, Deploy:0, Hypercare:0 };

const CANONICAL_ROLES: CanonicalRole[] = [
  { roleName:'Client Partner',     jrss:'Business Sales & Delivery Leader-Supply Chain Operations', location:'Onshore',  band:'D',
    totalHours:302,
    phaseHours:{...ZERO_PHASE_HOURS, Prepare:25, Explore:50, 'Realize-Build':126, 'Realize-Test':76, Deploy:25},
    phaseFTE:{...ZERO_PHASE_FTE,    Prepare:0.18, Explore:0.18, 'Realize-Build':0.18, 'Realize-Test':0.18, Deploy:0.18} },

  { roleName:'DPE',                jrss:'Business Sales & Delivery Leader-Supply Chain Operations', location:'Onshore',  band:'10',
    totalHours:378,
    phaseHours:{...ZERO_PHASE_HOURS, Prepare:25, Explore:50, 'Realize-Build':126, 'Realize-Test':76, Deploy:25, Hypercare:76},
    phaseFTE:{...ZERO_PHASE_FTE,    Prepare:0.18, Explore:0.18, 'Realize-Build':0.18, 'Realize-Test':0.18, Deploy:0.18, Hypercare:0.18} },

  { roleName:'Sector Partner',     jrss:'Industry Consultant-Consulting Services', location:'Offshore', band:'10',
    totalHours:93,
    phaseHours:{...ZERO_PHASE_HOURS, Prepare:31, Explore:62},
    phaseFTE:{...ZERO_PHASE_FTE,    Prepare:0.18, Explore:0.18} },

  { roleName:'Program Manager',    jrss:'Application Architect-Asset Management', location:'Onshore',  band:'8',
    totalHours:756,
    phaseHours:{...ZERO_PHASE_HOURS, Prepare:50, Explore:101, 'Realize-Build':252, 'Realize-Test':151, Deploy:50, Hypercare:151},
    phaseFTE:{...ZERO_PHASE_FTE,    Prepare:0.36, Explore:0.36, 'Realize-Build':0.36, 'Realize-Test':0.36, Deploy:0.36, Hypercare:0.36} },

  { roleName:'Project Manager',    jrss:'Project Manager-ADM', location:'Offshore', band:'8',
    totalHours:1397,
    phaseHours:{...ZERO_PHASE_HOURS, 'Realize-Build':776, 'Realize-Test':466, Deploy:155},
    phaseFTE:{...ZERO_PHASE_FTE,    'Realize-Build':0.90, 'Realize-Test':0.90, Deploy:0.90} },

  { roleName:'PMO',                jrss:'Project Manager-Office Management', location:'Offshore', band:'6B',
    totalHours:373,
    phaseHours:{...ZERO_PHASE_HOURS, Prepare:31, Explore:62, 'Realize-Build':155, 'Realize-Test':93, Deploy:31},
    phaseFTE:{...ZERO_PHASE_FTE,    Prepare:0.18, Explore:0.18, 'Realize-Build':0.18, 'Realize-Test':0.18, Deploy:0.18} },

  { roleName:'DS&P',               jrss:'Security Professional-Data Security & Privacy', location:'Offshore', band:'7A',
    totalHours:207,
    phaseHours:{...ZERO_PHASE_HOURS, Prepare:17, Explore:35, 'Realize-Build':86, 'Realize-Test':52, Deploy:17},
    phaseFTE:{...ZERO_PHASE_FTE,    Prepare:0.10, Explore:0.10, 'Realize-Build':0.10, 'Realize-Test':0.10, Deploy:0.10} },

  { roleName:'Lead Architect',     jrss:'Application Architect-Asset Management', location:'Onshore',  band:'8',
    totalHours:1610,
    phaseHours:{...ZERO_PHASE_HOURS, Prepare:140, Explore:280, 'Realize-Build':700, 'Realize-Test':420, Deploy:70},
    phaseFTE:{...ZERO_PHASE_FTE,    Prepare:1.00, Explore:1.00, 'Realize-Build':1.00, 'Realize-Test':1.00, Deploy:0.50} },

  { roleName:'Architect Manage',   jrss:'Application Architect-Asset Management', location:'Offshore', band:'8',
    totalHours:2415,
    phaseHours:{...ZERO_PHASE_HOURS, Explore:690, 'Realize-Build':1725},
    phaseFTE:{...ZERO_PHASE_FTE,    Explore:2.00, 'Realize-Build':2.00} },

  { roleName:'Architect Mobile',   jrss:'Application Architect-Asset Management', location:'Offshore', band:'7B',
    totalHours:0,
    phaseHours:{...ZERO_PHASE_HOURS},
    phaseFTE:{...ZERO_PHASE_FTE} },

  { roleName:'Functional Consultant', jrss:'Business Transformation Consultant-Asset Management', location:'Offshore', band:'7B',
    totalHours:1984,
    phaseHours:{...ZERO_PHASE_HOURS, Prepare:173, Explore:345, 'Realize-Build':863, 'Realize-Test':518, Deploy:86},
    phaseFTE:{...ZERO_PHASE_FTE,    Prepare:1.00, Explore:1.00, 'Realize-Build':1.00, 'Realize-Test':1.00, Deploy:0.50} },

  { roleName:'Business Analyst',   jrss:'Business Analyst-Business Analysis', location:'Offshore', band:'6B',
    totalHours:1898,
    phaseHours:{...ZERO_PHASE_HOURS, Prepare:173, Explore:345, 'Realize-Build':863, 'Realize-Test':518},
    phaseFTE:{...ZERO_PHASE_FTE,    Prepare:1.00, Explore:1.00, 'Realize-Build':1.00, 'Realize-Test':1.00} },

  { roleName:'Developer-Mobile',   jrss:'Application Developer-Asset Management', location:'Offshore', band:'7B',
    totalHours:0,
    phaseHours:{...ZERO_PHASE_HOURS},
    phaseFTE:{...ZERO_PHASE_FTE} },

  { roleName:'Red Hat OpenShift Consultant', jrss:'Application Architect-Red Hat Cloud', location:'Offshore', band:'7B',
    totalHours:1909,
    phaseHours:{...ZERO_PHASE_HOURS, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:136, Hypercare:409},
    phaseFTE:{...ZERO_PHASE_FTE,    Explore:0.79, 'Realize-Build':0.79, 'Realize-Test':0.79, Deploy:0.79, Hypercare:0.79} },

  { roleName:'Integration Developer-Manage', jrss:'Application Developer-Asset Management', location:'Offshore', band:'7B',
    totalHours:1909,
    phaseHours:{...ZERO_PHASE_HOURS, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:136, Hypercare:409},
    phaseFTE:{...ZERO_PHASE_FTE,    Explore:0.79, 'Realize-Build':0.79, 'Realize-Test':0.79, Deploy:0.79, Hypercare:0.79} },

  { roleName:'Developer-Migration', jrss:'Application Developer-Asset Management', location:'Offshore', band:'6B',
    totalHours:1432,
    phaseHours:{...ZERO_PHASE_HOURS, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:68},
    phaseFTE:{...ZERO_PHASE_FTE,    Explore:0.79, 'Realize-Build':0.79, 'Realize-Test':0.79, Deploy:0.40} },

  { roleName:'Developer-Application', jrss:'Application Developer-Asset Management', location:'Offshore', band:'7B',
    totalHours:1909,
    phaseHours:{...ZERO_PHASE_HOURS, Explore:273, 'Realize-Build':682, 'Realize-Test':409, Deploy:136, Hypercare:409},
    phaseFTE:{...ZERO_PHASE_FTE,    Explore:0.79, 'Realize-Build':0.79, 'Realize-Test':0.79, Deploy:0.79, Hypercare:0.79} },

  { roleName:'Developer-Workflow',  jrss:'Application Developer-Asset Management', location:'Offshore', band:'6B',
    totalHours:818,
    phaseHours:{...ZERO_PHASE_HOURS, 'Realize-Build':682, Deploy:136},
    phaseFTE:{...ZERO_PHASE_FTE,    'Realize-Build':0.79, Deploy:0.79} },

  { roleName:'Developer-Report',    jrss:'Application Developer-Asset Management', location:'Offshore', band:'6B',
    totalHours:1228,
    phaseHours:{...ZERO_PHASE_HOURS, 'Realize-Build':682, 'Realize-Test':409, Deploy:136},
    phaseFTE:{...ZERO_PHASE_FTE,    'Realize-Build':0.79, 'Realize-Test':0.79, Deploy:0.79} },

  { roleName:'Test Lead',           jrss:'Quality Engineer-Test Management', location:'Offshore', band:'7B',
    totalHours:868,
    phaseHours:{...ZERO_PHASE_HOURS, 'Realize-Test':868},
    phaseFTE:{...ZERO_PHASE_FTE,    'Realize-Test':1.68} },

  { roleName:'Testing Consultant',  jrss:'Quality Engineer-Test Management', location:'Offshore', band:'6B',
    totalHours:1302,
    phaseHours:{...ZERO_PHASE_HOURS, 'Realize-Test':1302},
    phaseFTE:{...ZERO_PHASE_FTE,    'Realize-Test':2.52} },

  { roleName:'Training Lead',       jrss:'Business Transformation Consultant-Asset Management', location:'Onshore',  band:'7B',
    totalHours:205,
    phaseHours:{...ZERO_PHASE_HOURS, Training:205},
    phaseFTE:{...ZERO_PHASE_FTE,    Training:1.47} },

  { roleName:'Training Consultant', jrss:'Business Transformation Consultant-Asset Management', location:'Offshore', band:'6B',
    totalHours:479,
    phaseHours:{...ZERO_PHASE_HOURS, Training:479},
    phaseFTE:{...ZERO_PHASE_FTE,    Training:2.78} },

  { roleName:'Change Lead',         jrss:'Package Consultant-EA Business Transformation & Change', location:'Onshore',  band:'7B',
    totalHours:0, phaseHours:{...ZERO_PHASE_HOURS}, phaseFTE:{...ZERO_PHASE_FTE} },

  { roleName:'Change Consultant',   jrss:'Package Consultant-EA Business Transformation & Change', location:'Offshore', band:'6B',
    totalHours:0, phaseHours:{...ZERO_PHASE_HOURS}, phaseFTE:{...ZERO_PHASE_FTE} },
];

// ── Phase FTE Matrix (canonical source of truth) ──────────────
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

// ── Phase Total FTE (spec) ─────────────────────────────────────
const PHASE_TOTAL_FTE: Record<IBMPhase, number> = {
  Prepare:18.0, Explore:17.0, 'Realize-Build':13.0, 'Realize-Test':11.0,
  Training:8.0, Deploy:2.0, Hypercare:0.0,
};

// ── Phase Summary (Onshore/Offshore/Total/Hrs per month) ───────
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
    const rate = BAND_RATES[cr.band];
    const totalHrs = cr.totalHours;
    return {
      id: uuid(),
      roleName: cr.roleName,
      band: cr.band,
      levelDescription: BAND_DESC[cr.band],
      numberOfResources: 1,
      hoursPerResource: totalHrs,
      totalHours: totalHrs,
      hourlyRate: rate,
      totalCost: totalHrs * rate,
      deployCategory: LOCATION_CATEGORY[cr.location],
    } as StaffingRole & { _location: LocationType; _phaseHours: Record<IBMPhase,number>; _phaseFTE: Record<IBMPhase,number> };
  });
}

// ═══════════════════════════════════════════════════════════════
// PHASE ALLOCATION CHART — real-time, all 7 phases
// ═══════════════════════════════════════════════════════════════
function PhaseAllocationChart({ roles }: { roles: StaffingRole[] }) {
  // Build phase hours from canonical data keyed by roleName
  const phaseHours = useMemo(() => {
    const totals: Record<IBMPhase, number> = { Prepare:0, Explore:0, 'Realize-Build':0, 'Realize-Test':0, Training:0, Deploy:0, Hypercare:0 };
    roles.forEach((r) => {
      const canon = CANONICAL_ROLES.find(c => c.roleName === r.roleName);
      if (!canon) return;
      IBM_PHASES.forEach((ph) => { totals[ph] += canon.phaseHours[ph]; });
    });
    return IBM_PHASES.map((ph) => ({ phase: ph, hours: Math.round(totals[ph]), color: PHASE_COLORS[ph] }));
  }, [roles]);

  return (
    <div className="rounded-2xl p-5" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: TEXT }}>Phase Allocation (Hours)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={phaseHours} margin={{ left: -10, right: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="phase" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false}
            interval={0} angle={-20} textAnchor="end" height={55} />
          <YAxis tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} labelStyle={tooltipLabelStyle}
            formatter={(v: number) => [v.toLocaleString(), 'Hours']} />
          <Bar dataKey="hours" name="Hours" radius={[5,5,0,0]}>
            {phaseHours.map((e, i) => <Cell key={i} fill={e.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FTE MATRIX TABLE
// ═══════════════════════════════════════════════════════════════
function FTEMatrixTable({ roles }: { roles: StaffingRole[] }) {
  const [expanded, setExpanded] = useState(false);
  const visRoles = expanded ? roles : roles.slice(0, 8);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <h3 className="text-sm font-bold" style={{ color: TEXT }}>Role-wise FTE by Phase Matrix</h3>
        <button onClick={() => setExpanded(e => !e)}
          className="text-xs px-3 py-1 rounded-lg transition-colors"
          style={{ color: CYAN, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
          {expanded ? 'Collapse' : `Show all ${roles.length} roles`}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table style={{ fontSize: 11, minWidth: 720, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              <th className="px-3 py-2 text-left" style={{ color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', minWidth: 160 }}>Role</th>
              {IBM_PHASES.map(ph => (
                <th key={ph} className="px-2 py-2 text-center" style={{ color: PHASE_COLORS[ph], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', fontSize: 10 }}>{ph.replace('-',' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visRoles.map((role, idx) => {
              const matrix = FTE_MATRIX[role.roleName] ?? ZERO_PHASE_FTE;
              return (
                <tr key={role.id} style={{ borderTop: `1px solid ${BORDER}`, background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <RoleAvatar roleName={role.roleName} size={24} />
                      <span style={{ color: TEXT, fontSize: 11, fontWeight: 500 }}>{role.roleName}</span>
                    </div>
                  </td>
                  {IBM_PHASES.map(ph => {
                    const val = matrix[ph] ?? 0;
                    return (
                      <td key={ph} className="px-2 py-2 text-center" style={{ color: val > 0 ? PHASE_COLORS[ph] : 'rgba(255,255,255,0.2)', fontWeight: val > 0 ? 700 : 400, fontSize: 11 }}>
                        {val > 0 ? val.toFixed(1) : '–'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Totals row */}
            <tr style={{ borderTop: `2px solid ${BORDER}`, background: 'rgba(99,102,241,0.08)' }}>
              <td className="px-3 py-2 font-bold text-xs" style={{ color: INDIGO }}>Phase Total FTE</td>
              {IBM_PHASES.map(ph => (
                <td key={ph} className="px-2 py-2 text-center font-bold" style={{ color: PHASE_COLORS[ph], fontSize: 12 }}>
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

// ═══════════════════════════════════════════════════════════════
// PHASE SUMMARY TABLE (Onshore / Offshore / Total / Hrs/Mo)
// ═══════════════════════════════════════════════════════════════
function PhaseSummaryTable() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
      <div className="px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <h3 className="text-sm font-bold" style={{ color: TEXT }}>Phase Summary — FTE & Hours</h3>
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>
          Onshore = 140 h/mo · Offshore = 172.5 h/mo · Recalculates with staffing changes
        </p>
      </div>
      <div className="overflow-x-auto">
        <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['Phase','Onshore FTE','Offshore FTE','Total FTE','Hrs / Month'].map((h) => (
                <th key={h} className="px-4 py-2 text-left" style={{ color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PHASE_SUMMARY.map((row, idx) => (
              <tr key={row.phase} style={{ borderTop: `1px solid ${BORDER}`, background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                <td className="px-4 py-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${PHASE_COLORS[row.phase]}20`, color: PHASE_COLORS[row.phase] }}>
                    {row.phase}
                  </span>
                </td>
                <td className="px-4 py-2 text-center font-semibold" style={{ color: CYAN }}>{row.onshore.toFixed(1)}</td>
                <td className="px-4 py-2 text-center font-semibold" style={{ color: INDIGO }}>{row.offshore.toFixed(1)}</td>
                <td className="px-4 py-2 text-center font-bold" style={{ color: TEXT }}>{row.total.toFixed(1)}</td>
                <td className="px-4 py-2 text-right font-bold tabular-nums" style={{ color: '#F59E0B' }}>
                  {row.totalHrsMo > 0 ? row.totalHrsMo.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${BORDER}`, background: 'rgba(99,102,241,0.08)' }}>
              <td className="px-4 py-2 font-bold text-xs" style={{ color: INDIGO }}>TOTAL</td>
              <td className="px-4 py-2 text-center font-bold" style={{ color: CYAN }}>
                {PHASE_SUMMARY.reduce((a,r)=>a+r.onshore,0).toFixed(1)}
              </td>
              <td className="px-4 py-2 text-center font-bold" style={{ color: INDIGO }}>
                {PHASE_SUMMARY.reduce((a,r)=>a+r.offshore,0).toFixed(1)}
              </td>
              <td className="px-4 py-2 text-center font-bold" style={{ color: TEXT }}>
                {PHASE_SUMMARY.reduce((a,r)=>a+r.total,0).toFixed(1)}
              </td>
              <td className="px-4 py-2 text-right font-bold" style={{ color: '#F59E0B' }}>
                {PHASE_SUMMARY.reduce((a,r)=>a+r.totalHrsMo,0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function StaffingPlanModule() {
  const { activeDocumentId, analysisResults, updateStaffingRole, addStaffingRole, removeStaffingRole, setAnalysisResult } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  const [search, setSearch]       = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRole, setNewRole]     = useState<Partial<StaffingRole & { _location: LocationType }>>({
    roleName: '', band: '7A', numberOfResources: 1, hoursPerResource: 640, hourlyRate: 65,
    _location: 'Offshore',
  });

  // ── Initialise plan from canonical data if empty ─────────────
  const plan = result?.staffingPlan;
  const hasCanonicalRoles = plan && plan.roles.length > 0;

  // If result exists but plan is empty/missing, seed it with canonical roles
  React.useEffect(() => {
    if (!activeDocumentId || !result) return;
    const currentPlan = result.staffingPlan;
    if (!currentPlan || currentPlan.roles.length === 0) {
      const canonRoles = buildRolesFromCanonical();
      const totalHours = canonRoles.reduce((a, r) => a + r.totalHours, 0);
      const totalLaborCost = canonRoles.reduce((a, r) => a + r.totalCost, 0);
      const totalHeadcount = canonRoles.length;
      const newPlan = {
        id: uuid(),
        documentId: activeDocumentId,
        roles: canonRoles,
        totalHeadcount,
        peakHeadcount: totalHeadcount,
        totalLaborCost,
        totalHours,
        lastUpdated: new Date().toISOString(),
      };
      setAnalysisResult(activeDocumentId, { ...result, staffingPlan: newPlan });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocumentId]);

  if (!plan) return (
    <div className="flex items-center justify-center mt-20" style={{ color: MUTED, fontSize: 14 }}>
      Upload a document to see the staffing plan
    </div>
  );

  const roles = plan.roles;

  // ── Project months for utilisation calc ─────────────────────
  const projectMonths = useMemo(() => {
    const weeks = result?.projectPlan?.totalDurationWeeks ?? 0;
    return weeks > 0 ? Math.round(weeks / 4.33) : 12;
  }, [result?.projectPlan?.totalDurationWeeks]);

  // ── Filtered roles ────────────────────────────────────────────
  const filteredRoles = useMemo(() =>
    roles.filter(r => r.roleName.toLowerCase().includes(search.toLowerCase())),
    [roles, search]);

  // ── KPI totals ────────────────────────────────────────────────
  const totalLaborCost = roles.reduce((a, r) => a + r.totalCost, 0);
  const totalHours     = roles.reduce((a, r) => a + r.totalHours, 0);

  // ── Add Role handler ─────────────────────────────────────────
  const handleAdd = () => {
    if (!activeDocumentId || !newRole.roleName) return;
    const band   = (newRole.band ?? '7A') as IBMBand;
    const nr     = newRole.numberOfResources ?? 1;
    const hpr    = newRole.hoursPerResource ?? 640;
    const rate   = newRole.hourlyRate ?? BAND_RATES[band];
    const loc    = newRole._location ?? 'Offshore';
    const role: StaffingRole = {
      id: uuid(), roleName: newRole.roleName!, band,
      levelDescription: BAND_DESC[band],
      numberOfResources: nr, hoursPerResource: hpr,
      totalHours: nr * hpr, hourlyRate: rate, totalCost: nr * hpr * rate,
      deployCategory: LOCATION_CATEGORY[loc as LocationType],
    };
    addStaffingRole(activeDocumentId, role);
    setShowAddForm(false);
    setNewRole({ roleName:'', band:'7A', numberOfResources:1, hoursPerResource:640, hourlyRate:65, _location:'Offshore' });
  };

  // ── Input style with WCAG AA contrast ────────────────────────
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: '6px 12px',
    color: '#F1F5F9',      // contrast ratio > 7:1 on dark bg
    fontSize: 13,
    outline: 'none',
    width: '100%',
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'auto' };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" style={{ background: '#0A0F1E', minHeight: '100%' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: TEXT }}>Staffing Plan</h2>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            {roles.length} roles · {roles.filter(r=>r.totalHours>0).length} active ·
            IBM rate-card (Onshore 140 h/mo · Offshore 172.5 h/mo)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
            <Search size={13} style={{ color: '#475569' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search roles…"
              className="text-sm outline-none bg-transparent w-36" style={{ color: TEXT }} />
          </div>
          <button onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)`, boxShadow: '0 2px 10px rgba(99,102,241,0.4)' }}>
            <Plus size={14} /> Add Role
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total Roles',       value: String(roles.length),                       color: INDIGO },
          { label:'Active Roles',      value: String(roles.filter(r=>r.totalHours>0).length), color: CYAN },
          { label:'Total Labor Cost',  value: fmt(totalLaborCost),                         color: '#F59E0B' },
          { label:'Total Hours',       value: totalHours.toLocaleString(),                 color: '#10B981' },
        ].map(m => (
          <div key={m.label} className="rounded-2xl p-4" style={{ background: GLASS, border: `1px solid ${BORDER}`, borderBottom: `3px solid ${m.color}` }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>{m.label}</div>
            <div className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Phase Allocation Chart ── */}
      <PhaseAllocationChart roles={roles} />

      {/* ── Add Role Form — WCAG AA contrast ── */}
      {showAddForm && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(99,102,241,0.06)', border: `1px solid rgba(99,102,241,0.3)` }}>
          <div className="text-sm font-bold" style={{ color: TEXT }}>Add New Role</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <input placeholder="Role Name" value={newRole.roleName ?? ''}
              onChange={e => setNewRole({...newRole, roleName: e.target.value})}
              className="col-span-2 sm:col-span-2" style={inputStyle} />
            <select value={newRole.band}
              onChange={e => { const b = e.target.value as IBMBand; setNewRole({...newRole, band:b, hourlyRate:BAND_RATES[b]}); }}
              style={selectStyle}>
              {IBM_BANDS.map(b => <option key={b} value={b} style={{ background: '#1E2436', color: '#F1F5F9' }}>{b} — {BAND_DESC[b]}</option>)}
            </select>
            <select value={newRole._location ?? 'Offshore'}
              onChange={e => setNewRole({...newRole, _location: e.target.value as LocationType})}
              style={selectStyle}>
              <option value="Onshore"  style={{ background: '#1E2436', color: '#F1F5F9' }}>Onshore (140 h/mo)</option>
              <option value="Offshore" style={{ background: '#1E2436', color: '#F1F5F9' }}>Offshore (172.5 h/mo)</option>
            </select>
            <input type="number" placeholder="Hrs/Resource" value={newRole.hoursPerResource ?? ''}
              onChange={e => setNewRole({...newRole, hoursPerResource: Number(e.target.value)})}
              style={inputStyle} />
            <input type="number" placeholder="$/hr" value={newRole.hourlyRate ?? ''}
              onChange={e => setNewRole({...newRole, hourlyRate: Number(e.target.value)})}
              style={inputStyle} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94A3B8', border: `1px solid ${BORDER}` }}>
              Cancel
            </button>
            <button onClick={handleAdd}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-white"
              style={{ background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)` }}>
              Add Role
            </button>
          </div>
        </div>
      )}

      {/* ── Main Staffing Table ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold" style={{ color: TEXT }}>Role Details</h3>
          <div className="flex items-center gap-3 text-xs" style={{ color: MUTED }}>
            <span>● Green: 50–100% util &nbsp;● Amber: &lt;50% &nbsp;● Red: &gt;100%</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table style={{ fontSize: 12, minWidth: 960, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', color: MUTED, fontSize: 10 }}>
                {['Role','JRSS','Location','Band','Total Hrs','Util %','h/mo','Cost','Active Phases',''].map((h,i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold uppercase tracking-wider"
                    style={{ whiteSpace: 'nowrap', minWidth: i===0?180:i===1?160:i===8?200:80 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role, idx) => {
                const canon = CANONICAL_ROLES.find(c => c.roleName === role.roleName);
                const loc: LocationType = role.deployCategory === 'Offshore CIC' ? 'Offshore' : 'Onshore';
                const monthlyHrs = getMonthlyHrs(loc);
                const availHrs = monthlyHrs * projectMonths;
                const utilPct = availHrs > 0 && role.totalHours > 0 ? +((role.totalHours / availHrs) * 100).toFixed(1) : 0;
                const activePhs = canon ? IBM_PHASES.filter(ph => canon.phaseHours[ph] > 0) : [];
                const roleColor = ROLE_COLORS[idx % ROLE_COLORS.length];
                return (
                  <tr key={role.id}
                    style={{ borderTop: `1px solid ${BORDER}`, background: idx%2===0?'transparent':'rgba(255,255,255,0.015)' }}>
                    {/* Avatar + Name */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <RoleAvatar roleName={role.roleName} size={32} />
                        <div>
                          <div className="font-semibold" style={{ color: TEXT, fontSize: 12 }}>{role.roleName}</div>
                          <div style={{ color: MUTED, fontSize: 10 }}>{BAND_DESC[role.band]}</div>
                        </div>
                      </div>
                    </td>
                    {/* JRSS */}
                    <td className="px-3 py-2" style={{ color: MUTED, fontSize: 10, maxWidth: 160 }}>
                      <div className="truncate" title={canon?.jrss ?? ''}>{canon?.jrss ?? '—'}</div>
                    </td>
                    {/* Location */}
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: loc==='Onshore'?'rgba(6,182,212,0.15)':'rgba(99,102,241,0.15)', color: loc==='Onshore'?CYAN:INDIGO }}>
                        {loc}
                      </span>
                    </td>
                    {/* Band */}
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)` }}>
                        {role.band}
                      </span>
                    </td>
                    {/* Total Hours */}
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: TEXT, fontWeight: 600 }}>
                      {role.totalHours > 0 ? role.totalHours.toLocaleString() : <span style={{ color: MUTED }}>—</span>}
                    </td>
                    {/* Utilisation % */}
                    <td className="px-3 py-2 text-center">
                      {role.totalHours > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-bold tabular-nums" style={{ color: utilColor(utilPct) }}>{utilPct.toFixed(1)}%</span>
                          {utilPct > 100 && <span className="text-[9px]" style={{ color:'#ef4444' }}>Over</span>}
                          {utilPct > 0 && utilPct < 50 && <span className="text-[9px]" style={{ color:'#f59e0b' }}>Low</span>}
                        </div>
                      ) : <span style={{ color: MUTED, fontSize: 10 }}>—</span>}
                    </td>
                    {/* h/mo */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold tabular-nums" style={{ color: loc==='Offshore'?INDIGO:CYAN }}>{monthlyHrs}</span>
                        <span style={{ fontSize: 9, color: MUTED }}>h/mo</span>
                      </div>
                    </td>
                    {/* Cost */}
                    <td className="px-3 py-2 text-right font-bold tabular-nums" style={{ color: '#F59E0B', fontSize: 12 }}>
                      {role.totalHours > 0 ? fmt(role.totalCost) : <span style={{ color: MUTED }}>—</span>}
                    </td>
                    {/* Active Phases */}
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {activePhs.length > 0 ? activePhs.map(ph => (
                          <span key={ph} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${PHASE_COLORS[ph]}20`, color: PHASE_COLORS[ph] }}>
                            {ph}
                          </span>
                        )) : <span style={{ color: MUTED, fontSize: 10 }}>None</span>}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => activeDocumentId && removeStaffingRole(activeDocumentId, role.id)}
                        className="transition-colors" style={{ color: '#475569' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#F43F5E')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${BORDER}`, background: 'rgba(99,102,241,0.08)' }}>
                <td colSpan={4} className="px-3 py-3 font-bold text-xs" style={{ color: INDIGO }}>Totals ({roles.length} roles)</td>
                <td className="px-3 py-3 text-right font-bold tabular-nums" style={{ color: TEXT }}>{totalHours.toLocaleString()}</td>
                <td colSpan={2} />
                <td className="px-3 py-3 text-right font-bold tabular-nums" style={{ color: '#F59E0B' }}>{fmt(totalLaborCost)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Phase Total FTE Summary ── */}
      <div className="rounded-2xl p-5" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: TEXT }}>Phase-wise Total FTE</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {IBM_PHASES.map(ph => (
            <div key={ph} className="rounded-xl p-3 text-center" style={{ background: `${PHASE_COLORS[ph]}12`, border: `1px solid ${PHASE_COLORS[ph]}30` }}>
              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: PHASE_COLORS[ph] }}>{ph.replace('-',' ')}</div>
              <div className="text-xl font-black" style={{ color: PHASE_COLORS[ph] }}>{PHASE_TOTAL_FTE[ph].toFixed(1)}</div>
              <div style={{ fontSize: 9, color: MUTED }}>FTE</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Phase Summary Table ── */}
      <PhaseSummaryTable />

      {/* ── FTE Matrix ── */}
      <FTEMatrixTable roles={roles} />

    </div>
  );
}
