// ============================================================
// Staffing Plan Module — team composition with timeline charts
// ============================================================
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Clock, DollarSign, Info } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { formatCurrency, cn, COLORS, ROLE_COLORS } from '@/lib/utils';
import type { StaffingRole } from '@/types';
import {
  Card, CardHeader, CardBody, Badge, MetricCard,
  SectionHeader, DataTable, EmptyState, Alert, ProgressBar
} from '@/components/ui';

const SENIORITY_COLORS: Record<string, string> = {
  junior: 'bg-slate-200 text-slate-700',
  mid: 'bg-sky-100 text-sky-700',
  senior: 'bg-indigo-100 text-indigo-700',
  lead: 'bg-violet-100 text-violet-700',
  principal: 'bg-amber-100 text-amber-700',
};

function RoleCard({ role }: { role: StaffingRole }) {
  const durationWeeks = role.endWeek - role.startWeek + 1;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-semibold text-slate-800 text-sm">{role.title}</div>
          <div className="text-xs text-slate-400 mt-0.5">Weeks {role.startWeek}–{role.endWeek} · {durationWeeks}w</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline">{role.headcount}x</Badge>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', SENIORITY_COLORS[role.seniority] || SENIORITY_COLORS.mid)}>
            {role.seniority}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <ProgressBar label="Allocation" value={role.allocationPercent} showValue={true} color="bg-indigo-500" />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{formatCurrency(role.hourlyRate)}/hr</span>
        <span className="text-slate-500">Ramp: {role.rampUpWeeks}w up / {role.rampDownWeeks}w down</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {role.skills.slice(0, 4).map((s) => <Badge key={s} variant="default" size="sm">{s}</Badge>)}
        {role.skills.length > 4 && <Badge variant="default" size="sm">+{role.skills.length - 4} more</Badge>}
      </div>
    </Card>
  );
}

export default function StaffingPlan() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const staffing = result?.staffingPlan;

  if (!staffing) {
    return (
      <div className="p-6">
        <EmptyState icon={<Users size={24} />} title="No staffing plan available" description="Upload and analyze an RFP to generate staffing recommendations." />
      </div>
    );
  }

  // Sample every N weeks for chart clarity
  const stride = Math.max(1, Math.floor(staffing.weeklyData.length / 30));
  const timelineData = staffing.weeklyData
    .filter((_, i) => i % stride === 0)
    .map((w) => {
      const point: Record<string, unknown> = { week: `W${w.week}`, total: w.totalHeadcount };
      for (const role of staffing.roles) {
        point[role.title.split(' ').slice(-1)[0]] = w.byRole[role.title] ?? 0;
      }
      return point;
    });

  // Radar data for role allocation
  const radarData = staffing.roles.map((r) => ({
    role: r.title.split(' ').slice(-1)[0],
    allocation: r.allocationPercent,
    coverage: Math.round(((r.endWeek - r.startWeek + 1) / staffing.weeklyData.length) * 100),
  }));

  const totalMonthlyBurn = staffing.roles.reduce((sum, r) => {
    return sum + r.headcount * r.hourlyRate * 160 * (r.allocationPercent / 100);
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Staffing Plan"
        description={`${staffing.roles.length} roles · peak ${staffing.peakHeadcount} headcount`}
        icon={<Users size={18} />}
        badge={`${staffing.totalHeadcount} Total Roles`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Roles" value={String(staffing.totalHeadcount)} color="indigo" icon={<Users size={16} />} />
        <MetricCard label="Peak Headcount" value={String(staffing.peakHeadcount)} color="violet" icon={<TrendingUp size={16} />} />
        <MetricCard label="Total Labor Cost" value={formatCurrency(staffing.totalLaborCost, true)} color="emerald" icon={<DollarSign size={16} />} />
        <MetricCard label="Avg Monthly Burn" value={formatCurrency(totalMonthlyBurn, true)} color="amber" icon={<Clock size={16} />} />
      </div>

      {/* Headcount Timeline Chart */}
      <Card>
        <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Headcount Over Time</h3></CardHeader>
        <CardBody className="pt-2">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timelineData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <defs>
                {staffing.roles.map((r, i) => (
                  <linearGradient key={r.id} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.chart[i % COLORS.chart.length]} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={COLORS.chart[i % COLORS.chart.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 9 }} interval={Math.floor(timelineData.length / 8)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {staffing.roles.slice(0, 5).map((r, i) => (
                <Area
                  key={r.id}
                  type="monotone"
                  dataKey={r.title.split(' ').slice(-1)[0]}
                  stackId="1"
                  stroke={COLORS.chart[i % COLORS.chart.length]}
                  fill={`url(#grad${i})`}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Role Cards Grid */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">Role Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {staffing.roles.map((role) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: staffing.roles.indexOf(role) * 0.04 }}
            >
              <RoleCard role={role} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Team Summary</h3></CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={[
              { key: 'title', header: 'Role' },
              { key: 'seniority', header: 'Seniority', render: (r) => <Badge variant="info" className="capitalize">{r.seniority}</Badge> },
              { key: 'headcount', header: 'Count', render: (r) => <span className="font-bold">{r.headcount}</span> },
              { key: 'allocationPercent', header: 'Allocation', render: (r) => `${r.allocationPercent}%` },
              { key: 'startWeek', header: 'Start', render: (r) => `Week ${r.startWeek}` },
              { key: 'endWeek', header: 'End', render: (r) => `Week ${r.endWeek}` },
              { key: 'hourlyRate', header: 'Rate', render: (r) => formatCurrency(r.hourlyRate) + '/hr' },
            ]}
            data={staffing.roles}
            rowKey={(r) => r.id}
          />
        </CardBody>
      </Card>

      {/* Assumptions */}
      <Card>
        <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Staffing Assumptions</h3></CardHeader>
        <CardBody>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {staffing.assumptions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
