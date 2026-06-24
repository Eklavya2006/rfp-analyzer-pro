'use client';
// Dashboard — Enterprise palette: navy/slate/gold (no IBM Blue)
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useRFPStore } from '@/lib/store';
import { T } from '@/lib/theme';
import { FileText, Users, DollarSign, Clock, TrendingUp, Zap } from 'lucide-react';

const CHART_COLORS = T.chart;

function MetricCard({ label, value, sub, icon, highlight }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl p-4 border bg-white transition-shadow hover:shadow-md"
      style={highlight
        ? { borderColor: T.gold, background: `${T.navy}08` }
        : { borderColor: T.border }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.textMuted }}>{label}</div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: highlight ? T.gold : T.slate }}>
          <span className="text-white">{icon}</span>
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ color: T.navy }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: T.textMuted }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  if (!result) return (
    <div className="p-6 text-center text-sm mt-20" style={{ color: T.textMuted }}>
      Upload a document to see the dashboard
    </div>
  );

  const staffing   = result.staffingPlan;
  const estimation = result.estimation;
  const testing    = result.testingStrategy;
  const aiImpact   = result.aiImpact;
  const scope      = result.scopeItems ?? [];
  const deliverables = result.deliverableItems ?? [];

  const phaseData = estimation?.phaseSubtotals.map((p) => ({
    name: p.phase.length > 10 ? p.phase.slice(0, 10) + '…' : p.phase,
    Hours: p.hours,
    'Cost ($K)': Math.round(p.cost / 1000),
  })) ?? [];

  const pieData = staffing?.roles.slice(0, 6).map((r) => ({
    name: r.roleName,
    value: r.totalHours,
  })) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Scope Items"     value={String(scope.length)}                       icon={<FileText size={14} />} />
        <MetricCard label="Deliverables"    value={String(deliverables.length)}                icon={<FileText size={14} />} />
        <MetricCard label="Technologies"    value={String(result.offerings?.length ?? 0)}      icon={<Zap size={14} />} />
        <MetricCard label="Total Effort"    value={`${((estimation?.totalHours ?? 0) / 1000).toFixed(1)}K hrs`} icon={<Clock size={14} />} highlight />
        <MetricCard label="Team Size"       value={String(staffing?.totalHeadcount ?? 0)}      sub="resources" icon={<Users size={14} />} />
        <MetricCard label="AI Productivity" value={`${aiImpact?.overallProductivityGain ?? 0}%`} sub="gain"   icon={<TrendingUp size={14} />} highlight />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Effort by phase */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: T.navy }}>Effort &amp; Cost by Phase</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={phaseData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left"  tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar yAxisId="left"  dataKey="Hours"     fill={T.navy}  radius={[4,4,0,0]} />
              <Bar yAxisId="right" dataKey="Cost ($K)" fill={T.gold}  radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Staffing pie */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: T.navy }}>Staffing Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                label={({ name }: { name: string }) => name.split(' ')[0]}>
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: T.textMuted }}>Total Cost</h3>
          <div className="text-3xl font-bold" style={{ color: T.navy }}>
            ${((estimation?.totalCost ?? 0) / 1_000_000).toFixed(2)}M
          </div>
          <div className="text-xs mt-1" style={{ color: T.textMuted }}>
            {estimation?.personMonths ?? 0} person-months · {estimation?.personDays ?? 0} person-days
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: T.textMuted }}>QA Effort</h3>
          <div className="text-3xl font-bold" style={{ color: T.slate }}>{testing?.totalQAHours ?? 0}h</div>
          <div className="text-xs mt-1" style={{ color: T.textMuted }}>{testing?.automationCoverage ?? 0}% automation coverage</div>
        </div>

        <div className="bg-white rounded-2xl border-2 p-5"
          style={{ borderColor: T.gold, background: `${T.gold}12` }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: T.gold }}>AI Hours Saved</h3>
          <div className="text-3xl font-bold" style={{ color: T.navy }}>
            {aiImpact?.totalHoursSaved.toLocaleString() ?? 0}
          </div>
          <div className="text-xs mt-1" style={{ color: T.slate }}>
            {aiImpact?.overallProductivityGain ?? 0}% overall productivity gain
          </div>
        </div>
      </div>
    </div>
  );
}
