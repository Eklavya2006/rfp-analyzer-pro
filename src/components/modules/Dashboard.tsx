'use client';
// Dashboard — Redesigned Enterprise Dashboard matching reference screenshot
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { T } from '@/lib/theme';
import {
  DollarSign, Users, CheckSquare, Zap, TrendingUp,
  BarChart2, CalendarDays, UserCheck, FlaskConical, BrainCircuit,
} from 'lucide-react';

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  chipColor: string;
  accent?: boolean;
}

function KpiCard({ label, value, sub, icon, chipColor, accent }: KpiCardProps) {
  return (
    <div
      className="rounded-2xl p-5 border bg-white flex flex-col gap-3 hover:shadow-md transition-shadow"
      style={{ borderColor: accent ? chipColor : T.border, minWidth: 0 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: T.textMuted }}>
          {label}
        </span>
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ background: chipColor }}
        >
          {icon}
        </span>
      </div>
      <div className="text-[1.65rem] font-extrabold leading-none" style={{ color: T.navy }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: T.textMuted }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Section Heading ─────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold mb-4" style={{ color: T.navy }}>
      {children}
    </h3>
  );
}

// ─── Horizontal Progress Bar ──────────────────────────────────────────────────
function HBar({ label, pct, color, value }: { label: string; pct: number; color: string; value: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1" style={{ color: T.textSecondary }}>
        <span>{label}</span>
        <span className="font-semibold" style={{ color: T.navy }}>{value}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: T.border }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Analysis Module Mini-Card ────────────────────────────────────────────────
function ModuleCard({
  label, icon, color, count, unit,
}: {
  label: string; icon: React.ReactNode; color: string; count: number | string; unit?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-white py-4 px-3 text-center hover:shadow transition-shadow" style={{ borderColor: T.border }}>
      <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </span>
      <div className="text-xl font-extrabold" style={{ color: T.navy }}>{count}</div>
      {unit && <div className="text-[10px] uppercase tracking-wider" style={{ color: T.textMuted }}>{unit}</div>}
      <div className="text-[11px] font-semibold leading-tight" style={{ color: T.textSecondary }}>{label}</div>
    </div>
  );
}

// ─── AI vs Traditional Row ────────────────────────────────────────────────────
function AiVsRow({ label, traditional, ai }: { label: string; traditional: number; ai: number }) {
  const maxVal = Math.max(traditional, ai, 1);
  return (
    <div className="mb-4 last:mb-0">
      <div className="text-xs font-semibold mb-1 truncate" style={{ color: T.textSecondary }}>{label}</div>
      <div className="flex items-center gap-2 text-xs mb-1">
        <span style={{ color: T.textMuted, width: 70, flexShrink: 0 }}>Traditional</span>
        <div className="flex-1 h-2 rounded-full" style={{ background: T.border }}>
          <div className="h-2 rounded-full" style={{ width: `${(traditional / maxVal) * 100}%`, background: T.slate }} />
        </div>
        <span className="font-semibold w-10 text-right" style={{ color: T.navy }}>{traditional}h</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span style={{ color: T.textMuted, width: 70, flexShrink: 0 }}>AI-Assisted</span>
        <div className="flex-1 h-2 rounded-full" style={{ background: T.border }}>
          <div className="h-2 rounded-full" style={{ width: `${(ai / maxVal) * 100}%`, background: T.chart[4] }} />
        </div>
        <span className="font-semibold w-10 text-right" style={{ color: T.chart[4] }}>{ai}h</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  if (!result) {
    return (
      <div className="p-10 flex flex-col items-center justify-center text-center gap-4 mt-20">
        <BarChart2 size={48} style={{ color: T.textMuted }} />
        <p className="text-sm" style={{ color: T.textMuted }}>
          Upload and analyse a document to see the dashboard.
        </p>
      </div>
    );
  }

  const staffing    = result.staffingPlan;
  const estimation  = result.estimation;
  const testing     = result.testingStrategy;
  const aiImpact    = result.aiImpact;
  const scope       = result.scopeItems ?? [];
  const plan        = result.projectPlan;
  const doc         = useRFPStore.getState().documents.find(d => d.id === activeDocumentId);
  const summary     = doc?.summary;

  // ── KPI values ──────────────────────────────────────────────
  const totalCost   = estimation?.adjustedTotalCost ?? estimation?.totalCost ?? 0;
  const totalWeeks  = plan?.totalDurationWeeks ?? 0;
  const teamSize    = staffing?.totalHeadcount ?? 0;
  const qaHours     = testing?.totalQAHours ?? 0;
  const aiSavings   = aiImpact?.totalHoursSaved ?? 0;
  const confidence  = summary?.confidenceScore ?? 0;

  // ── Cost-by-phase bar chart ──────────────────────────────────
  const phaseData = (estimation?.phaseSubtotals ?? []).map(p => ({
    name: p.phase.length > 12 ? p.phase.slice(0, 12) + '…' : p.phase,
    'Cost $K': Math.round(p.cost / 1000),
  }));

  // ── Team Headcount area chart ────────────────────────────────
  // Build a weekly headcount curve: ramp up in first 20% of project, peak, taper last 20%
  const headcountData: { week: string; headcount: number }[] = React.useMemo(() => {
    if (!totalWeeks || !teamSize) return [];
    const weeks = Math.max(totalWeeks, 4);
    return Array.from({ length: weeks }, (_, i) => {
      const t = i / (weeks - 1);
      // smooth bell-ish ramp
      const hc = t < 0.15
        ? Math.round(teamSize * (t / 0.15) * 0.6)
        : t < 0.7
        ? Math.round(teamSize * (0.6 + 0.4 * ((t - 0.15) / 0.55)))
        : Math.round(teamSize * (1 - 0.7 * ((t - 0.7) / 0.3)));
      return { week: `W${i + 1}`, headcount: Math.max(1, hc) };
    });
  }, [totalWeeks, teamSize]);

  // ── Cost distribution (breakdown) horizontal bars ────────────
  const breakdown = estimation?.costBreakdown;
  const distItems: { label: string; value: number; color: string }[] = breakdown
    ? [
        { label: 'Base Labor',      value: breakdown.baseLaborCost,       color: T.navy   },
        { label: 'Overhead',        value: breakdown.overheadAmount,       color: T.slate  },
        { label: 'Infrastructure',  value: breakdown.infrastructureAmount, color: T.chart[3] },
        { label: 'Contingency',     value: breakdown.contingencyAmount,    color: T.gold   },
        { label: 'Travel',          value: breakdown.travelAmount,         color: T.chart[5] },
        { label: 'Licensing',       value: breakdown.licensingAmount,      color: T.chart[4] },
      ].filter(d => d.value > 0)
    : [];
  const maxDist = distItems.reduce((m, d) => Math.max(m, d.value), 1);

  // ── AI vs Traditional rows ────────────────────────────────────
  const aiRows = (aiImpact?.phaseRows ?? []).slice(0, 4);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" style={{ background: T.surface, minHeight: '100%' }}>

      {/* ── Row 1: 6 KPI Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Total Cost"
          value={`$${(totalCost / 1_000_000).toFixed(2)}M`}
          sub={`${estimation?.personMonths ?? 0} person-months`}
          icon={<DollarSign size={16} />}
          chipColor={T.navy}
          accent
        />
        <KpiCard
          label="Timeline"
          value={`${totalWeeks}w`}
          sub={plan ? `${plan.phases.length} phases` : undefined}
          icon={<CalendarDays size={16} />}
          chipColor={T.slate}
        />
        <KpiCard
          label="Team Size"
          value={String(teamSize)}
          sub="peak headcount"
          icon={<Users size={16} />}
          chipColor={T.chart[3]}
        />
        <KpiCard
          label="QA Hours"
          value={`${qaHours.toLocaleString()}h`}
          sub={`${testing?.automationCoverage ?? 0}% automation`}
          icon={<CheckSquare size={16} />}
          chipColor={T.chart[5]}
        />
        <KpiCard
          label="AI Savings"
          value={`${aiSavings.toLocaleString()}h`}
          sub={`${aiImpact?.overallProductivityGain ?? 0}% gain`}
          icon={<Zap size={16} />}
          chipColor={T.gold}
          accent
        />
        <KpiCard
          label="Confidence"
          value={`${confidence}%`}
          sub={scope.length ? `${scope.length} scope items` : undefined}
          icon={<TrendingUp size={16} />}
          chipColor={T.chart[4]}
        />
      </div>

      {/* ── Row 2: Cost by Phase  |  Team Headcount Over Time ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Phase */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <SectionTitle>Cost by Phase</SectionTitle>
          {phaseData.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: T.textMuted }}>No phase data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={phaseData} barSize={28} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}K`} />
                <Tooltip
                  formatter={(v: number) => [`$${v}K`, 'Cost']}
                  contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12 }}
                />
                <Bar dataKey="Cost $K" radius={[6, 6, 0, 0]}>
                  {phaseData.map((_, i) => (
                    <Cell key={i} fill={T.chart[i % T.chart.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Team Headcount Over Time */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <SectionTitle>Team Headcount Over Time</SectionTitle>
          {headcountData.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: T.textMuted }}>No headcount data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={headcountData} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.chart[4]} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={T.chart[4]} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: T.textMuted }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(headcountData.length / 8) - 1)} />
                <YAxis tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(v: number) => [v, 'Headcount']}
                  contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12 }}
                />
                <Area
                  type="monotone" dataKey="headcount"
                  stroke={T.chart[4]} strokeWidth={2.5}
                  fill="url(#hcGrad)"
                  dot={false} activeDot={{ r: 5, fill: T.chart[4] }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 3: Analysis Modules mini-cards ─────────────── */}
      <div>
        <SectionTitle>Analysis Modules</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <ModuleCard label="Cost Estimation"  icon={<DollarSign  size={18} />} color={T.navy}      count={estimation ? `$${(totalCost/1e6).toFixed(1)}M` : '—'} unit="total" />
          <ModuleCard label="Project Plan"     icon={<CalendarDays size={18} />} color={T.slate}     count={plan?.phases.length ?? '—'} unit="phases" />
          <ModuleCard label="Staffing Plan"    icon={<UserCheck    size={18} />} color={T.chart[3]}  count={staffing?.roles.length ?? '—'} unit="roles" />
          <ModuleCard label="Testing Strategy" icon={<FlaskConical size={18} />} color={T.chart[5]}  count={testing?.sections.filter(s => s.enabled).length ?? '—'} unit="active tests" />
          <ModuleCard label="AI Impact"        icon={<BrainCircuit size={18} />} color={T.chart[4]}  count={aiImpact ? `${aiImpact.overallProductivityGain}%` : '—'} unit="productivity gain" />
        </div>
      </div>

      {/* ── Row 4: Cost Distribution  |  AI vs Traditional ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Distribution horizontal bars */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <SectionTitle>Cost Distribution</SectionTitle>
          {distItems.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: T.textMuted }}>No cost breakdown available</p>
          ) : (
            distItems.map(d => (
              <HBar
                key={d.label}
                label={d.label}
                pct={(d.value / maxDist) * 100}
                color={d.color}
                value={`$${(d.value / 1000).toFixed(0)}K`}
              />
            ))
          )}
        </div>

        {/* AI vs Traditional Summary */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <SectionTitle>AI vs Traditional Summary</SectionTitle>
          {aiRows.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: T.textMuted }}>No AI impact data available</p>
          ) : (
            <>
              {aiRows.map(row => (
                <AiVsRow
                  key={row.id}
                  label={`${row.phase} — ${row.activity}`}
                  traditional={row.traditionalHours}
                  ai={row.aiAssistedHours}
                />
              ))}
              <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: T.border }}>
                <span style={{ color: T.textMuted }}>Total Hours Saved</span>
                <span className="font-bold text-sm" style={{ color: T.chart[4] }}>
                  {aiImpact?.totalHoursSaved.toLocaleString()} hrs ({aiImpact?.overallProductivityGain}% gain)
                </span>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
