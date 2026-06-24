// ============================================================
// Cost Estimation Module — interactive breakdown with editing
// ============================================================
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, Settings,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { calculateCostBreakdown, DEFAULT_HOURLY_RATES } from '@/lib/engines/costEngine';
import { formatCurrency, formatPercent, cn, COLORS } from '@/lib/utils';
import type { CostAssumptions } from '@/types';
import {
  Card, CardHeader, CardBody, MetricCard, Badge, Button,
  SectionHeader, ProgressBar, DataTable, Alert, Divider, EmptyState,
} from '@/components/ui';

function SliderInput({ label, value, min, max, step = 1, format, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  format?: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-indigo-700">{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}

export default function CostEstimation() {
  const { activeDocumentId, analysisResults, setAnalysisResult } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [showSettings, setShowSettings] = useState(false);
  const [localAssumptions, setLocalAssumptions] = useState<CostAssumptions | null>(null);

  const assumptions = localAssumptions || result?.costBreakdown?.assumptions;
  const breakdown = useMemo(() => {
    if (!assumptions) return null;
    return calculateCostBreakdown(assumptions);
  }, [assumptions]);

  const updateAssumption = useCallback(<K extends keyof CostAssumptions>(key: K, value: CostAssumptions[K]) => {
    const base = assumptions || result?.costBreakdown?.assumptions;
    if (!base) return;
    setLocalAssumptions({ ...base, [key]: value });
  }, [assumptions, result]);

  const updateRate = useCallback((role: string, rate: number) => {
    const base = assumptions || result?.costBreakdown?.assumptions;
    if (!base) return;
    setLocalAssumptions({ ...base, hourlyRates: { ...base.hourlyRates, [role]: rate } });
  }, [assumptions]);

  if (!result || !breakdown) {
    return (
      <div className="p-6">
        <EmptyState icon={<DollarSign size={24} />} title="No cost data available" description="Upload and analyze an RFP document to generate cost estimates." />
      </div>
    );
  }

  const pieData = breakdown.byCategory.map((c, i) => ({ name: c.category, value: c.cost, fill: COLORS.chart[i] }));
  const roleBarData = breakdown.byRole.map((r) => ({ name: r.role.split(' ').slice(-1)[0], cost: Math.round(r.cost / 1000), hours: r.hours }));

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Cost Estimation"
        description="Detailed cost breakdown by phase, role, and category"
        icon={<DollarSign size={18} />}
        badge="Live Calculation"
        actions={
          <Button
            variant={showSettings ? 'primary' : 'outline'}
            size="sm"
            leftIcon={<Settings size={14} />}
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? 'Hide' : 'Edit'} Assumptions
          </Button>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Cost', value: formatCurrency(breakdown.totalCost, true), color: 'indigo' as const },
          { label: 'Labor', value: formatCurrency(breakdown.laborCost, true), color: 'violet' as const },
          { label: 'Infrastructure', value: formatCurrency(breakdown.infrastructureCost, true), color: 'sky' as const },
          { label: 'Contingency', value: formatCurrency(breakdown.contingencyCost, true), color: 'amber' as const },
          { label: 'Overhead', value: formatCurrency(breakdown.overheadCost, true), color: 'rose' as const },
          { label: 'Duration', value: `${breakdown.assumptions.projectDurationWeeks}w`, color: 'emerald' as const },
        ].map((m) => <MetricCard key={m.label} {...m} />)}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <Card glow>
            <CardHeader><h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2"><Settings size={14} />Editable Assumptions <Badge variant="info">Live Recalculation</Badge></h3></CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule & Rates</div>
                  <SliderInput label="Project Duration (weeks)" value={breakdown.assumptions.projectDurationWeeks} min={4} max={156} step={4} onChange={(v) => updateAssumption('projectDurationWeeks', v)} />
                  <SliderInput label="Contingency %" value={breakdown.assumptions.contingencyPercent} min={0} max={40} format={(v) => `${v}%`} onChange={(v) => updateAssumption('contingencyPercent', v)} />
                  <SliderInput label="Overhead %" value={breakdown.assumptions.overheadPercent} min={0} max={30} format={(v) => `${v}%`} onChange={(v) => updateAssumption('overheadPercent', v)} />
                  <SliderInput label="Infrastructure / Month" value={breakdown.assumptions.infrastructureMonthlyCost} min={500} max={50000} step={500} format={(v) => formatCurrency(v, true)} onChange={(v) => updateAssumption('infrastructureMonthlyCost', v)} />
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Other Costs</div>
                  <SliderInput label="Licenses & Tools" value={breakdown.assumptions.licensesCost} min={0} max={200000} step={5000} format={(v) => formatCurrency(v, true)} onChange={(v) => updateAssumption('licensesCost', v)} />
                  <SliderInput label="Travel Budget" value={breakdown.assumptions.travelCost} min={0} max={100000} step={2500} format={(v) => formatCurrency(v, true)} onChange={(v) => updateAssumption('travelCost', v)} />
                  <Divider label="Hourly Rates" />
                  {['Project Manager', 'Tech Lead', 'Backend Developer', 'Frontend Developer'].map((role) => (
                    <SliderInput
                      key={role}
                      label={role}
                      value={breakdown.assumptions.hourlyRates[role] ?? DEFAULT_HOURLY_RATES[role]}
                      min={50} max={400} step={5}
                      format={(v) => `$${v}/hr`}
                      onChange={(v) => updateRate(role, v)}
                    />
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">More Hourly Rates</div>
                  {['QA Engineer', 'DevOps Engineer', 'Business Analyst', 'UX Designer', 'Data Engineer', 'Security Engineer'].map((role) => (
                    <SliderInput
                      key={role}
                      label={role}
                      value={breakdown.assumptions.hourlyRates[role] ?? DEFAULT_HOURLY_RATES[role]}
                      min={50} max={400} step={5}
                      format={(v) => `$${v}/hr`}
                      onChange={(v) => updateRate(role, v)}
                    />
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost by Role */}
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Cost by Role ($K)</h3></CardHeader>
          <CardBody className="pt-2">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={roleBarData} layout="vertical" margin={{ left: 80, right: 20, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                <RechartsTooltip formatter={(v: number) => [`${v}K`, 'Cost']} />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                  {roleBarData.map((_, i) => <Cell key={i} fill={COLORS.chart[i % COLORS.chart.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Category Pie */}
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Cost by Category</h3></CardHeader>
          <CardBody className="pt-2">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Phase Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Phase Breakdown</h3>
            <span className="text-xs text-slate-500">Total: {formatCurrency(breakdown.totalCost)}</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={[
              { key: 'name', header: 'Phase' },
              {
                key: 'durationWeeks', header: 'Duration',
                render: (row) => <Badge variant="outline">{row.durationWeeks}w</Badge>
              },
              {
                key: 'cost', header: 'Cost',
                render: (row) => <span className="font-semibold text-slate-900">{formatCurrency(row.cost)}</span>
              },
              {
                key: 'pct', header: '% of Total',
                render: (row) => (
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(row.cost / breakdown.totalCost) * 100}%` }} />
                    </div>
                    <span className="text-xs">{formatPercent((row.cost / breakdown.totalCost) * 100, 0)}</span>
                  </div>
                )
              },
              {
                key: 'roles', header: 'Roles Active',
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(row.roles).slice(0, 3).map(([role]) => (
                      <Badge key={role} variant="default" size="sm">{role.split(' ').slice(-1)[0]}</Badge>
                    ))}
                    {Object.keys(row.roles).length > 3 && <Badge variant="default" size="sm">+{Object.keys(row.roles).length - 3}</Badge>}
                  </div>
                )
              },
            ]}
            data={breakdown.phases}
            rowKey={(r) => r.id}
          />
        </CardBody>
      </Card>

      {/* Role Summary */}
      <Card>
        <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Role Summary</h3></CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={[
              { key: 'role', header: 'Role' },
              { key: 'hours', header: 'Total Hours', render: (r) => r.hours.toLocaleString() },
              { key: 'cost', header: 'Total Cost', render: (r) => <span className="font-semibold">{formatCurrency(r.cost)}</span> },
              { key: 'percentage', header: '% of Labor', render: (r) => <Badge variant="info">{r.percentage}%</Badge> },
            ]}
            data={breakdown.byRole}
            rowKey={(r) => r.role}
          />
        </CardBody>
      </Card>

      <Alert type="info">
        <span className="font-semibold">Assumptions:</span> All estimates are based on extracted RFP scope and editable assumptions above. Actual costs may vary based on team location, contract type, and final scope definition.
      </Alert>
    </div>
  );
}
