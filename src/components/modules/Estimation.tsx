'use client';
// ============================================================
// Cost Estimation — Live Calculation · Full reference-design implementation
// Phase breakdown, role summary, bar chart, donut chart, editable assumptions
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRFPStore } from '@/lib/store';

// ── Palette ───────────────────────────────────────────────────
const INDIGO  = '#6366F1';
const COLORS  = ['#6366F1', '#06B6D4', '#8B5CF6', '#F59E0B', '#10B981', '#F43F5E'];
const CAT_COLORS: Record<string, string> = {
  'Labor':            '#6366F1',
  'Infrastructure':   '#06B6D4',
  'Licenses & Tools': '#8B5CF6',
  'Overhead':         '#F59E0B',
  'Contingency':      '#10B981',
  'Travel':           '#F43F5E',
};

// ── Formatters ────────────────────────────────────────────────
function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}
function fmtFull(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
function fmtHrs(n: number): string {
  return n.toLocaleString();
}

// ── Default assumptions ────────────────────────────────────────
const DEFAULT_ASSUMPTIONS = {
  projectDurationWeeks: 72,
  contingencyPct:       15,
  overheadPct:          12,
  infrastructurePerMonth: 9000,
  licensesTools:        45000,
  travelBudget:         20000,
};

const DEFAULT_RATES: Record<string, number> = {
  'Project Manager':      160,
  'Tech Lead':            210,
  'Backend Developer':    175,
  'Frontend Developer':   160,
  'QA Engineer':          130,
  'DevOps Engineer':      185,
  'Business Analyst':     145,
  'UX Designer':          155,
  'Data Engineer':        190,
  'Security Engineer':    200,
};

// ── Role hours (fixed — represent total project allocation) ───
const ROLE_HOURS: Record<string, number> = {
  'Backend Developer':  3384,
  'Tech Lead':          2060,
  'Frontend Developer': 2504,
  'Project Manager':    1840,
  'DevOps Engineer':    1508,
  'QA Engineer':        1656,
  'Business Analyst':    672,
  'UX Designer':         224,
  'Data Engineer':         0,
  'Security Engineer':     0,
};

// ── Phase definitions (base ratios of labor) ──────────────────
const PHASE_DEFS = [
  { name: 'Discovery & Architecture',       durationWeeks: 7,  laborRatio: 0.050, roles: ['Manager', 'Lead', 'Analyst', '+1'] },
  { name: 'Core Development Sprint 1',      durationWeeks: 14, laborRatio: 0.182, roles: ['Manager', 'Lead', 'Developer', '+2'] },
  { name: 'Core Development Sprint 2',      durationWeeks: 14, laborRatio: 0.182, roles: ['Manager', 'Lead', 'Developer', '+2'] },
  { name: 'Integration & API Development',  durationWeeks: 11, laborRatio: 0.117, roles: ['Manager', 'Lead', 'Developer', '+2'] },
  { name: 'Testing & QA',                   durationWeeks: 11, laborRatio: 0.082, roles: ['Manager', 'Developer', 'Developer', '+2'] },
  { name: 'UAT & Deployment',               durationWeeks: 7,  laborRatio: 0.056, roles: ['Manager', 'Lead', 'Engineer', '+2'] },
  { name: 'Stabilization & Handover',       durationWeeks: 7,  laborRatio: 0.042, roles: ['Manager', 'Lead', 'Engineer', '+1'] },
];

// ── Badge color map ───────────────────────────────────────────
const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  Manager:   { bg: '#EDE9FE', text: '#7C3AED' },
  Lead:      { bg: '#DBEAFE', text: '#1D4ED8' },
  Developer: { bg: '#D1FAE5', text: '#065F46' },
  Analyst:   { bg: '#FEF3C7', text: '#92400E' },
  Engineer:  { bg: '#FCE7F3', text: '#9D174D' },
  Designer:  { bg: '#E0F2FE', text: '#0369A1' },
};
function badgeColor(role: string) {
  for (const [key, val] of Object.entries(BADGE_COLORS)) {
    if (role.startsWith('+') || role === key) return val;
  }
  return { bg: '#F1F5F9', text: '#475569' };
}

// ── Tooltip styles ────────────────────────────────────────────
const TT_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  color: '#0F172A',
  fontSize: 12,
  padding: '6px 10px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
};

// ── Slider row ────────────────────────────────────────────────
function SliderRow({
  label, value, min, max, step, display, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3 py-1.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <span className="text-xs text-slate-500 flex-shrink-0" style={{ width: 160 }}>{label}</span>
      <div className="flex-1 relative h-4 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ zIndex: 1 }}
        />
      </div>
      <span className="text-xs font-semibold text-indigo-600 tabular-nums flex-shrink-0" style={{ width: 60, textAlign: 'right' }}>
        {display}
      </span>
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────
function SummaryCard({
  label, value, accent = false,
}: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-xl p-4 flex-1 min-w-0"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div
        className="text-xl font-bold tabular-nums"
        style={{ color: accent ? INDIGO : '#0F172A' }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Custom bar chart label ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarLabel(props: any) {
  const { x, y, width, value } = props;
  return (
    <text x={x + width + 6} y={y + 11} fontSize={10} fill="#64748B" textAnchor="start">
      {fmtUSD(value * 1000)}
    </text>
  );
}

// ── Custom donut legend ───────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutLegend({ payload }: { payload?: any[] }) {
  if (!payload) return null;
  return (
    <div className="flex flex-col gap-1.5 text-xs">
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-slate-600">{entry.name}</span>
          <span className="font-semibold text-slate-800 ml-auto pl-4">{entry.payload.pct}%</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function EstimationModule() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const hasDoc = !!(activeDocumentId && analysisResults[activeDocumentId]);

  // ── Assumptions state ─────────────────────────────────────
  const [assump, setAssump] = useState(DEFAULT_ASSUMPTIONS);
  const [rates,  setRates]  = useState(DEFAULT_RATES);
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [moreRatesOpen, setMoreRatesOpen] = useState(false);

  const updateAssump = useCallback((key: keyof typeof DEFAULT_ASSUMPTIONS, val: number) => {
    setAssump((a) => ({ ...a, [key]: val }));
  }, []);
  const updateRate = useCallback((role: string, val: number) => {
    setRates((r) => ({ ...r, [role]: val }));
  }, []);

  // ── Core calculations ─────────────────────────────────────
  const calc = useMemo(() => {
    // Labor
    const laborCost = Object.entries(ROLE_HOURS).reduce(
      (sum, [role, hrs]) => sum + hrs * (rates[role] ?? 0),
      0,
    );

    // Infrastructure: ($/month / 4.33) × weeks
    const infraCost = (assump.infrastructurePerMonth / 4.33) * assump.projectDurationWeeks;

    // Contingency on (labor + infra + licenses + travel)
    const base = laborCost + infraCost + assump.licensesTools + assump.travelBudget;
    const contingencyAmt = base * (assump.contingencyPct / 100);

    // Overhead on labor only
    const overheadAmt = laborCost * (assump.overheadPct / 100);

    const totalCost = laborCost + infraCost + assump.licensesTools + assump.travelBudget + contingencyAmt + overheadAmt;

    // Per-role cost
    const roleCosts = Object.entries(ROLE_HOURS)
      .filter(([, hrs]) => hrs > 0)
      .map(([role, hrs]) => ({
        role,
        hours: hrs,
        cost: hrs * rates[role],
      }))
      .sort((a, b) => b.cost - a.cost);

    // Phase costs — scale proportionally
    const phaseRows = PHASE_DEFS.map((p) => {
      const cost = p.laborRatio * laborCost;
      const pct  = totalCost > 0 ? (cost / totalCost) * 100 : 0;
      return { ...p, cost, pct };
    });

    // Category donut
    const catData = [
      { name: 'Labor',            value: laborCost,              pct: totalCost > 0 ? Math.round((laborCost / totalCost) * 100) : 0 },
      { name: 'Infrastructure',   value: infraCost,              pct: totalCost > 0 ? Math.round((infraCost / totalCost) * 100) : 0 },
      { name: 'Licenses & Tools', value: assump.licensesTools,   pct: totalCost > 0 ? Math.round((assump.licensesTools / totalCost) * 100) : 0 },
      { name: 'Overhead',         value: overheadAmt,            pct: totalCost > 0 ? Math.round((overheadAmt / totalCost) * 100) : 0 },
      { name: 'Contingency',      value: contingencyAmt,         pct: totalCost > 0 ? Math.round((contingencyAmt / totalCost) * 100) : 0 },
      { name: 'Travel',           value: assump.travelBudget,    pct: totalCost > 0 ? Math.round((assump.travelBudget / totalCost) * 100) : 0 },
    ];

    return { laborCost, infraCost, contingencyAmt, overheadAmt, totalCost, roleCosts, phaseRows, catData };
  }, [assump, rates]);

  // ── Bar chart data (in $K) ────────────────────────────────
  const barData = calc.roleCosts.map((r) => ({
    role: r.role.replace(' Developer', ' Dev').replace(' Engineer', ' Eng').replace(' Manager', ' Mgr').replace('Business Analyst', 'BA').replace('UX Designer', 'UX Des'),
    costK: Math.round(r.cost / 1000),
    fullName: r.role,
  }));

  // ── Role summary table ────────────────────────────────────
  const roleSummary = calc.roleCosts.map((r) => ({
    role:    r.role,
    hours:   r.hours,
    cost:    r.cost,
    pctLabor: calc.laborCost > 0 ? (r.cost / calc.laborCost) * 100 : 0,
  }));

  if (!hasDoc) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <p className="text-sm text-slate-400">Upload a document to see cost estimation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="text-base font-bold text-slate-900">Cost Estimation</h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
              Live Calculation
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Detailed cost breakdown by phase, role, and category
          </p>
        </div>
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors"
          style={{
            borderColor: panelOpen ? INDIGO : '#E2E8F0',
            color:       panelOpen ? INDIGO : '#475569',
            background:  panelOpen ? 'rgba(99,102,241,0.06)' : '#FFFFFF',
          }}
        >
          {panelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {panelOpen ? 'Hide Assumptions' : 'Edit Assumptions'}
        </button>
      </div>

      {/* ── 6 Summary Cards ── */}
      <div className="flex gap-3 flex-wrap">
        <SummaryCard label="Total Cost"      value={fmtUSD(calc.totalCost)}    accent />
        <SummaryCard label="Labor"           value={fmtUSD(calc.laborCost)} />
        <SummaryCard label="Infrastructure"  value={fmtUSD(calc.infraCost)} />
        <SummaryCard label="Contingency"     value={fmtUSD(calc.contingencyAmt)} />
        <SummaryCard label="Overhead"        value={fmtUSD(calc.overheadAmt)} />
        <SummaryCard label="Duration"        value={`${assump.projectDurationWeeks}w`} />
      </div>

      {/* ── Editable Assumptions Panel ── */}
      {panelOpen && (
        <div
          className="rounded-xl border border-slate-200 bg-white overflow-hidden"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-semibold text-slate-700">Editable Assumptions</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-semibold ml-1">
              Live Recalculation
            </span>
          </div>

          <div className="p-5 grid grid-cols-3 gap-8">

            {/* Column 1: Schedule & Rates */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Schedule &amp; Rates
              </div>
              <SliderRow label="Project Duration (weeks)" value={assump.projectDurationWeeks} min={4} max={156} step={1}
                display={`${assump.projectDurationWeeks}w`}
                onChange={(v) => updateAssump('projectDurationWeeks', v)} />
              <SliderRow label="Contingency %" value={assump.contingencyPct} min={0} max={40} step={1}
                display={`${assump.contingencyPct}%`}
                onChange={(v) => updateAssump('contingencyPct', v)} />
              <SliderRow label="Overhead %" value={assump.overheadPct} min={0} max={30} step={1}
                display={`${assump.overheadPct}%`}
                onChange={(v) => updateAssump('overheadPct', v)} />
              <SliderRow label="Infrastructure / Month" value={assump.infrastructurePerMonth} min={500} max={50000} step={500}
                display={fmtUSD(assump.infrastructurePerMonth)}
                onChange={(v) => updateAssump('infrastructurePerMonth', v)} />
              <SliderRow label="Licenses &amp; Tools" value={assump.licensesTools} min={0} max={200000} step={1000}
                display={fmtUSD(assump.licensesTools)}
                onChange={(v) => updateAssump('licensesTools', v)} />
              <SliderRow label="Travel Budget" value={assump.travelBudget} min={0} max={100000} step={1000}
                display={fmtUSD(assump.travelBudget)}
                onChange={(v) => updateAssump('travelBudget', v)} />
            </div>

            {/* Column 2: Main Hourly Rates */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Hourly Rates
              </div>
              {['Project Manager', 'Tech Lead', 'Backend Developer', 'Frontend Developer'].map((role) => (
                <SliderRow key={role} label={role} value={rates[role]} min={50} max={400} step={5}
                  display={`$${rates[role]}/hr`}
                  onChange={(v) => updateRate(role, v)} />
              ))}
            </div>

            {/* Column 3: More Hourly Rates */}
            <div>
              <button
                onClick={() => setMoreRatesOpen((o) => !o)}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 hover:text-slate-600 transition-colors"
              >
                More Hourly Rates
                {moreRatesOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {['QA Engineer', 'DevOps Engineer', 'Business Analyst', 'UX Designer', 'Data Engineer', 'Security Engineer'].map((role) => (
                <SliderRow key={role} label={role} value={rates[role]} min={50} max={400} step={5}
                  display={`$${rates[role]}/hr`}
                  onChange={(v) => updateRate(role, v)} />
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Bar chart — Cost by Role */}
        <div className="rounded-xl border border-slate-200 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="text-xs font-semibold text-slate-700 mb-4">Cost by Role ($K)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              layout="vertical"
              data={barData}
              margin={{ left: 8, right: 64, top: 0, bottom: 0 }}
              barSize={14}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${v}K`}
              />
              <YAxis
                type="category"
                dataKey="role"
                tick={{ fontSize: 10, fill: '#64748B' }}
                axisLine={false} tickLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={TT_STYLE}
                cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                formatter={(v: number, _name, props) => [fmtFull(props.payload.costK * 1000), props.payload.fullName]}
              />
              <Bar dataKey="costK" radius={[0, 4, 4, 0]} label={<BarLabel />}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart — Cost by Category */}
        <div className="rounded-xl border border-slate-200 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="text-xs font-semibold text-slate-700 mb-4">Cost by Category</div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={calc.catData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={54} outerRadius={90}
                  paddingAngle={2}
                >
                  {calc.catData.map((entry) => (
                    <Cell key={entry.name} fill={CAT_COLORS[entry.name] ?? INDIGO} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TT_STYLE}
                  formatter={(v: number, name) => [fmtFull(v), name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1">
              <DonutLegend
                payload={calc.catData.map((d) => ({
                  name: d.name,
                  color: CAT_COLORS[d.name] ?? INDIGO,
                  payload: d,
                }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Phase Breakdown Table ── */}
      <div
        className="rounded-xl border border-slate-200 bg-white overflow-hidden"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-700">Phase Breakdown</span>
          <span className="text-xs text-slate-400">Total: {fmtFull(calc.totalCost)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Phase</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Duration</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Cost</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]" style={{ minWidth: 180 }}>% of Total</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Roles Active</th>
              </tr>
            </thead>
            <tbody>
              {calc.phaseRows.map((phase, i) => (
                <tr
                  key={phase.name}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}
                >
                  <td className="px-5 py-3 font-medium text-slate-800">{phase.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px]">
                      {phase.durationWeeks}w
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 tabular-nums">{fmtFull(phase.cost)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" style={{ minWidth: 80, maxWidth: 140 }}>
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${Math.min(phase.pct * 5, 100)}%` }}
                        />
                      </div>
                      <span className="text-slate-500 tabular-nums w-8">{Math.round(phase.pct)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {phase.roles.map((role) => {
                        const isOverflow = role.startsWith('+');
                        const bc = isOverflow
                          ? { bg: '#F1F5F9', text: '#64748B' }
                          : badgeColor(role);
                        return (
                          <span
                            key={role}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ background: bc.bg, color: bc.text }}
                          >
                            {role}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Role Summary Table ── */}
      <div
        className="rounded-xl border border-slate-200 bg-white overflow-hidden"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="px-5 py-3.5 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-700">Role Summary</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Role</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Total Hours</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Total Cost</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">% of Labor</th>
              </tr>
            </thead>
            <tbody>
              {roleSummary.map((r, i) => (
                <tr
                  key={r.role}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}
                >
                  <td className="px-5 py-3 font-medium text-slate-800">{r.role}</td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">{fmtHrs(r.hours)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 tabular-nums">{fmtFull(r.cost)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{
                        background: i === 0 ? '#EDE9FE' : i === 1 ? '#DBEAFE' : '#F0FDF4',
                        color:      i === 0 ? '#7C3AED' : i === 1 ? '#1D4ED8' : '#15803D',
                      }}
                    >
                      {r.pctLabor.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer disclaimer ── */}
      <div className="pb-2">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-500">Assumptions: </span>
          All estimates are based on extracted RFP scope and editable assumptions above.
          Actual costs may vary based on team location, contract type, and final scope definition.
        </p>
      </div>

    </div>
  );
}

// Named export alias
export { EstimationModule as CostEstimation };
