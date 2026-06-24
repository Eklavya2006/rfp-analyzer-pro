// ============================================================
// Dashboard — Summary view of all analysis modules
// ============================================================
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, CalendarDays, Users, TestTube2, Bot,
  TrendingUp, TrendingDown, Upload, Zap, ArrowRight,
  FileText, CheckCircle2, AlertCircle, BarChart3
} from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { formatCurrency, formatWeeks, cn } from '@/lib/utils';
import {
  Card, CardHeader, CardBody, MetricCard, Badge, Button,
  ProgressBar, SectionHeader, EmptyState, AnimatedCounter
} from '@/components/ui';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { COLORS } from '@/lib/utils';

const stagger = {
  container: {
    initial: {},
    animate: { transition: { staggerChildren: 0.07 } },
  },
  item: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } },
};

export default function Dashboard() {
  const { documents, activeDocumentId, analysisResults, setActiveTab } = useRFPStore();
  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  if (!activeDoc || !result) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[80vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg space-y-6"
        >
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-3xl flex items-center justify-center">
            <Zap size={36} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome to RFP Analyzer Pro</h1>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Upload an RFP document to instantly generate cost estimates, project plans, staffing recommendations, testing strategies, and AI impact analysis.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { icon: <DollarSign size={16} />, label: 'Cost Estimation', desc: 'Detailed breakdown by phase and role' },
              { icon: <CalendarDays size={16} />, label: 'Project Plan', desc: 'Gantt-style phases and milestones' },
              { icon: <Users size={16} />, label: 'Staffing Plan', desc: 'Team composition and allocation' },
              { icon: <Bot size={16} />, label: 'AI Comparison', desc: 'AI vs traditional delivery analysis' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">{item.icon}</div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">{item.label}</div>
                  <div className="text-xs text-slate-500">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <Button size="lg" onClick={() => setActiveTab('upload')} leftIcon={<Upload size={16} />}>
            Upload RFP Document
          </Button>
        </motion.div>
      </div>
    );
  }

  const cost = result.costBreakdown!;
  const plan = result.projectPlan!;
  const staffing = result.staffingPlan!;
  const testing = result.testingStrategy!;
  const ai = result.aiComparison!;

  // Cost chart data
  const phaseChartData = cost.phases.map((p) => ({
    name: p.name.replace('Development —', 'Dev'),
    cost: Math.round(p.cost / 1000),
    weeks: p.durationWeeks,
  }));

  // Staffing chart data (sample every 2 weeks)
  const staffingChartData = staffing.weeklyData
    .filter((_, i) => i % 2 === 0)
    .map((w) => ({ week: `W${w.week}`, headcount: w.totalHeadcount }));

  // AI savings
  const aiSavings = ai.baseline.totalCostBaseline - ai.baseline.totalCostAIAugmented;

  const modules = [
    { id: 'cost', label: 'Cost Estimation', icon: <DollarSign size={14} />, value: formatCurrency(cost.totalCost, true), color: 'text-indigo-600' },
    { id: 'plan', label: 'Project Plan', icon: <CalendarDays size={14} />, value: `${plan.totalDurationWeeks}w / ${plan.phases.length} phases`, color: 'text-violet-600' },
    { id: 'staffing', label: 'Staffing', icon: <Users size={14} />, value: `${staffing.totalHeadcount} roles, peak ${staffing.peakHeadcount}`, color: 'text-sky-600' },
    { id: 'testing', label: 'Testing', icon: <TestTube2 size={14} />, value: `${testing.totalQAHours.toLocaleString()} QA hrs`, color: 'text-emerald-600' },
    { id: 'ai-comparison', label: 'AI Impact', icon: <Bot size={14} />, value: `${formatCurrency(aiSavings, true)} potential savings`, color: 'text-amber-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Document Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <FileText size={22} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-lg">{activeDoc.summary?.title || activeDoc.name}</div>
            <div className="text-indigo-200 text-sm mt-0.5">
              {activeDoc.summary?.client} · {activeDoc.summary?.estimatedTimeline}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs font-medium">
            Confidence: {activeDoc.summary?.confidenceScore}%
          </div>
          <Badge variant="success">Analysis Ready</Badge>
        </div>
      </motion.div>

      {/* Key Metrics Row */}
      <motion.div
        variants={stagger.container}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        {[
          { label: 'Total Cost', value: formatCurrency(cost.totalCost, true), sub: 'Estimated', color: 'indigo' as const, icon: <DollarSign size={16} /> },
          { label: 'Timeline', value: formatWeeks(plan.totalDurationWeeks), sub: `${plan.phases.length} phases`, color: 'violet' as const, icon: <CalendarDays size={16} /> },
          { label: 'Team Size', value: `${staffing.totalHeadcount}`, sub: `Peak ${staffing.peakHeadcount}`, color: 'sky' as const, icon: <Users size={16} /> },
          { label: 'QA Hours', value: testing.totalQAHours.toLocaleString(), sub: `${testing.automationCoverage}% automated`, color: 'emerald' as const, icon: <TestTube2 size={16} /> },
          { label: 'AI Savings', value: formatCurrency(aiSavings, true), sub: 'Potential', color: 'amber' as const, icon: <Bot size={16} /> },
          { label: 'Confidence', value: `${activeDoc.summary?.confidenceScore}%`, sub: 'Extraction', color: 'rose' as const, icon: <BarChart3 size={16} /> },
        ].map((m) => (
          <motion.div key={m.label} variants={stagger.item}>
            <MetricCard {...m} animate={false} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost by Phase */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Cost by Phase</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('cost')} rightIcon={<ArrowRight size={12} />}>
                Detail
              </Button>
            </div>
          </CardHeader>
          <CardBody className="pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={phaseChartData} margin={{ top: 4, right: 4, bottom: 40, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}K`} />
                <Tooltip formatter={(v: number) => [`$${v}K`, 'Cost']} />
                <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Staffing Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Team Headcount over Time</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('staffing')} rightIcon={<ArrowRight size={12} />}>
                Detail
              </Button>
            </div>
          </CardHeader>
          <CardBody className="pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={staffingChartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="staffGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} interval={Math.floor(staffingChartData.length / 6)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="headcount" stroke="#8b5cf6" fill="url(#staffGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Module Cards */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">Analysis Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {modules.map((mod, i) => (
            <motion.button
              key={mod.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActiveTab(mod.id as import('@/types').TabId)}
              className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className={cn('text-lg mb-2', mod.color)}>{mod.icon}</div>
              <div className="text-xs font-semibold text-slate-500 mb-0.5">{mod.label}</div>
              <div className="text-sm font-bold text-slate-900">{mod.value}</div>
              <div className="mt-2 text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Open <ArrowRight size={10} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Cost breakdown quick view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-800 text-sm">Cost Distribution</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {cost.byCategory.map((cat) => (
              <ProgressBar
                key={cat.category}
                label={cat.category}
                sublabel={formatCurrency(cat.cost, true)}
                value={cat.percentage}
                color={cat.category === 'Labor' ? 'bg-indigo-500' : cat.category === 'Infrastructure' ? 'bg-violet-500' : cat.category === 'Contingency' ? 'bg-amber-400' : 'bg-sky-400'}
              />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-800 text-sm">AI vs Traditional Summary</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            {[
              { label: 'Cost Savings', value: `${ai.baseline.costSavingsPercent}%`, bar: ai.baseline.costSavingsPercent, color: 'bg-emerald-500' },
              { label: 'Effort Reduction', value: `${ai.baseline.effortSavingsPercent}%`, bar: ai.baseline.effortSavingsPercent, color: 'bg-sky-500' },
              { label: 'Timeline Compression', value: `${ai.baseline.timelineSavingsPercent}%`, bar: ai.baseline.timelineSavingsPercent, color: 'bg-violet-500' },
              { label: 'Quality Score Uplift', value: `${ai.baseline.qualityScoreAI - ai.baseline.qualityScoreBaseline}pts`, bar: ((ai.baseline.qualityScoreAI - ai.baseline.qualityScoreBaseline) / 40) * 100, color: 'bg-amber-400' },
            ].map((item) => (
              <ProgressBar key={item.label} label={item.label} sublabel={item.value} value={Math.min(100, item.bar)} color={item.color} />
            ))}
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('ai-comparison')} className="mt-2 w-full justify-center" rightIcon={<ArrowRight size={12} />}>
              View Full AI Analysis
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
