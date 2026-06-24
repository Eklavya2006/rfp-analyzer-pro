// ============================================================
// Testing Strategy Module — comprehensive QA plan
// ============================================================
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TestTube2, Shield, AlertTriangle, CheckCircle2, Clock, Zap } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { formatCurrency, cn, COLORS } from '@/lib/utils';
import type { TestType } from '@/types';
import {
  Card, CardHeader, CardBody, Badge, MetricCard,
  SectionHeader, DataTable, EmptyState, Alert, ProgressBar, Divider
} from '@/components/ui';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline';

const PRIORITY_COLORS: Record<string, BadgeVariant> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const AUTOMATION_COLORS: Record<string, BadgeVariant> = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
};

const CATEGORY_LABELS: Record<string, string> = {
  functional: 'Functional',
  'non-functional': 'Non-Functional',
  automation: 'Automation',
  security: 'Security',
  performance: 'Performance',
};

function TestTypeCard({ test, index }: { test: TestType; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card className="p-4 h-full">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="font-semibold text-slate-800 text-sm">{test.name}</div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant={PRIORITY_COLORS[test.priority]} size="sm">
                {test.priority}
              </Badge>
              <Badge variant="outline" size="sm">{CATEGORY_LABELS[test.category]}</Badge>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-slate-900">{test.estimatedHours.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400">hours</div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{test.scope}</p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Automation</span>
            <Badge variant={AUTOMATION_COLORS[test.automationFeasibility]} size="sm">
              {test.automationFeasibility} feasibility
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {test.tools.slice(0, 3).map((t) => (
              <Badge key={t} variant="default" size="sm">{t}</Badge>
            ))}
            {test.tools.length > 3 && <Badge variant="default" size="sm">+{test.tools.length - 3}</Badge>}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function TestingStrategy() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const testing = result?.testingStrategy;

  if (!testing) {
    return (
      <div className="p-6">
        <EmptyState icon={<TestTube2 size={24} />} title="No testing strategy available" description="Upload and analyze an RFP to generate a testing strategy." />
      </div>
    );
  }

  // Phase distribution chart
  const phaseData = testing.phaseDistribution.map((p, i) => ({
    name: p.phase.replace('(', '').replace(')', ''),
    hours: p.hours,
    fill: COLORS.chart[i % COLORS.chart.length],
  }));

  // Category breakdown for pie
  const categoryMap: Record<string, number> = {};
  testing.testTypes.forEach((t) => {
    categoryMap[CATEGORY_LABELS[t.category]] = (categoryMap[CATEGORY_LABELS[t.category]] || 0) + t.estimatedHours;
  });
  const categoryData = Object.entries(categoryMap).map(([name, value], i) => ({ name, value, fill: COLORS.chart[i] }));

  // Radar data for quality metrics readiness
  const radarData = [
    { metric: 'Unit', value: 90 },
    { metric: 'Integration', value: 80 },
    { metric: 'E2E', value: 75 },
    { metric: 'Performance', value: 70 },
    { metric: 'Security', value: 85 },
    { metric: 'Accessibility', value: 78 },
  ];

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Testing Strategy"
        description={`${testing.testTypes.length} test types · ${testing.totalQAHours.toLocaleString()} QA hours`}
        icon={<TestTube2 size={18} />}
        badge={`${testing.automationCoverage}% Automation`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total QA Hours" value={testing.totalQAHours.toLocaleString()} color="indigo" icon={<Clock size={16} />} />
        <MetricCard label="Automation Coverage" value={`${testing.automationCoverage}%`} color="emerald" icon={<Zap size={16} />} />
        <MetricCard label="QA Cost Estimate" value={formatCurrency(testing.qaCostEstimate, true)} color="violet" icon={<TestTube2 size={16} />} />
        <MetricCard label="Test Types" value={String(testing.testTypes.length)} color="amber" icon={<Shield size={16} />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hours by phase */}
        <Card className="lg:col-span-2">
          <CardHeader><h3 className="font-semibold text-slate-800 text-sm">QA Hours by Phase</h3></CardHeader>
          <CardBody className="pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={phaseData} margin={{ top: 4, right: 4, bottom: 50, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {phaseData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Radar coverage */}
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Coverage Readiness</h3></CardHeader>
          <CardBody className="pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Test Types Grid */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">Test Coverage Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {testing.testTypes.map((test, i) => (
            <TestTypeCard key={test.id} test={test} index={i} />
          ))}
        </div>
      </div>

      {/* Entry / Exit Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500" /> Entry Criteria
            </h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {testing.entryCriteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" /> {c}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <CheckCircle2 size={13} className="text-indigo-500" /> Exit Criteria
            </h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {testing.exitCriteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0" /> {c}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Environments */}
      <Card>
        <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Test Environments</h3></CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={[
              { key: 'name', header: 'Environment', render: (e) => <span className="font-semibold">{e.name}</span> },
              { key: 'purpose', header: 'Purpose' },
              { key: 'infrastructure', header: 'Infrastructure' },
              { key: 'dataSets', header: 'Data Sets', render: (e) => (
                <div className="flex flex-wrap gap-1">
                  {e.dataSets.map((d: string) => <Badge key={d} variant="default" size="sm">{d}</Badge>)}
                </div>
              )},
            ]}
            data={testing.environments}
            rowKey={(e) => e.name}
          />
        </CardBody>
      </Card>

      {/* Quality Metrics */}
      <Card>
        <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Quality Targets</h3></CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={[
              { key: 'metric', header: 'Metric', render: (m) => <span className="font-medium">{m.metric}</span> },
              { key: 'target', header: 'Target', render: (m) => <Badge variant="success">{m.target}</Badge> },
              { key: 'current', header: 'Baseline', render: (m) => <span className="text-slate-500">{m.current}</span> },
            ]}
            data={testing.qualityMetrics}
            rowKey={(m) => m.metric}
          />
        </CardBody>
      </Card>

      {/* Risks */}
      <Alert type="warning" title="Testing Risks">
        <ul className="mt-1 space-y-1">
          {testing.risks.map((r, i) => <li key={i} className="flex items-start gap-2"><AlertTriangle size={11} className="mt-0.5 shrink-0" />{r}</li>)}
        </ul>
      </Alert>
    </div>
  );
}
