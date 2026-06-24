'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useRFPStore } from '@/lib/store';
import { FileText, Users, DollarSign, Clock, TrendingUp, Zap } from 'lucide-react';

const IBM_BLUE = '#0F62FE';
const COLORS = [IBM_BLUE, '#0043CE', '#0050E6', '#4589ff', '#78a9ff', '#a6c8ff'];

function MetricCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? 'border-blue-300' : 'border-gray-200'} bg-white`}
      style={accent ? { borderColor: '#0F62FE', background: '#e8f2ff' } : {}}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0F62FE' }}>
          <span className="text-white">{icon}</span>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  if (!result) return (
    <div className="p-6 text-center text-gray-400 text-sm mt-20">Upload a document to see the dashboard</div>
  );

  const staffing = result.staffingPlan;
  const estimation = result.estimation;
  const testing = result.testingStrategy;
  const aiImpact = result.aiImpact;
  const scope = result.scopeItems ?? [];
  const deliverables = result.deliverableItems ?? [];

  const phaseData = estimation?.phaseSubtotals.map((p) => ({ name: p.phase, Hours: p.hours, Cost: Math.round(p.cost / 1000) })) ?? [];
  const pieData = staffing?.roles.slice(0, 6).map((r) => ({ name: r.roleName, value: r.totalHours })) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Scope Items" value={String(scope.length)} icon={<FileText size={14} />} />
        <MetricCard label="Deliverables" value={String(deliverables.length)} icon={<FileText size={14} />} />
        <MetricCard label="Technologies" value={String(result.offerings?.length ?? 0)} icon={<Zap size={14} />} />
        <MetricCard label="Total Effort" value={`${((estimation?.totalHours ?? 0) / 1000).toFixed(1)}K hrs`} icon={<Clock size={14} />} accent />
        <MetricCard label="Team Size" value={String(staffing?.totalHeadcount ?? 0)} sub="resources" icon={<Users size={14} />} />
        <MetricCard label="AI Productivity" value={`${aiImpact?.overallProductivityGain ?? 0}%`} sub="gain" icon={<TrendingUp size={14} />} accent />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Effort by phase */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Effort & Cost by Phase</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={phaseData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="Hours" fill={IBM_BLUE} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="Cost" fill="#4589ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Staffing pie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Staffing Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name }) => name.split(' ')[0]}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Total Cost</h3>
          <div className="text-3xl font-bold" style={{ color: '#0F62FE' }}>
            ${((estimation?.totalCost ?? 0) / 1_000_000).toFixed(2)}M
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {estimation?.personMonths ?? 0} person-months · {estimation?.personDays ?? 0} person-days
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">QA Effort</h3>
          <div className="text-3xl font-bold text-gray-900">{testing?.totalQAHours ?? 0}h</div>
          <div className="text-xs text-gray-400 mt-1">{testing?.automationCoverage ?? 0}% automation coverage</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5" style={{ background: '#e8f2ff', borderColor: '#0F62FE' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#0F62FE' }}>AI Hours Saved</h3>
          <div className="text-3xl font-bold" style={{ color: '#0F62FE' }}>{aiImpact?.totalHoursSaved.toLocaleString() ?? 0}</div>
          <div className="text-xs mt-1" style={{ color: '#0043CE' }}>
            {aiImpact?.overallProductivityGain ?? 0}% overall productivity gain
          </div>
        </div>
      </div>
    </div>
  );
}
