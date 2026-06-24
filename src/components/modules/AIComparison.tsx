// ============================================================
// AI Comparison Module — AI vs traditional delivery analysis
// ============================================================
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, TrendingDown, TrendingUp, Zap, AlertTriangle, CheckCircle2, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend, Cell
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { formatCurrency, formatPercent, cn, COLORS } from '@/lib/utils';
import type { AIUseCase } from '@/types';
import {
  Card, CardHeader, CardBody, Badge, MetricCard,
  SectionHeader, DataTable, EmptyState, Alert, ProgressBar, Divider, Button
} from '@/components/ui';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline';

const MATURITY_COLORS: Record<string, BadgeVariant> = {
  proven: 'success',
  emerging: 'warning',
  experimental: 'danger',
};

const QUALITY_COLORS: Record<string, BadgeVariant> = {
  'high-improvement': 'success',
  'moderate-improvement': 'info',
  neutral: 'default',
  risk: 'warning',
};

function UseCaseCard({ uc, index, showAI }: { uc: AIUseCase; index: number; showAI: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="p-4 h-full">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="font-semibold text-slate-800 text-sm">{uc.area}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant={MATURITY_COLORS[uc.maturityLevel]} size="sm">{uc.maturityLevel}</Badge>
              <Badge variant={uc.automationOpportunity === 'high' ? 'success' : uc.automationOpportunity === 'medium' ? 'warning' : 'default'} size="sm">
                {uc.automationOpportunity} opp.
              </Badge>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{uc.description}</p>

        {showAI && (
          <div className="space-y-2 mb-3">
            <ProgressBar label="Effort Reduction" value={uc.effortReduction} color="bg-emerald-500" />
            <ProgressBar label="Speed Gain" value={uc.speedImprovement} color="bg-sky-500" />
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Cost Impact</span>
              <span className={cn('font-semibold', uc.costImpact < 0 ? 'text-emerald-600' : 'text-rose-500')}>
                {uc.costImpact < 0 ? '↓ ' : '↑ '}{Math.abs(uc.costImpact)}%
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1 mb-2">
          {uc.tools.slice(0, 3).map((t) => <Badge key={t} variant="info" size="sm">{t}</Badge>)}
          {uc.tools.length > 3 && <Badge variant="default" size="sm">+{uc.tools.length - 3}</Badge>}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Quality impact</span>
          <Badge variant={QUALITY_COLORS[uc.qualityImpact]} size="sm">
            {uc.qualityImpact.replace('-', ' ')}
          </Badge>
        </div>
      </Card>
    </motion.div>
  );
}

export default function AIComparison() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const ai = result?.aiComparison;
  const [showAI, setShowAI] = useState(true);

  if (!ai) {
    return (
      <div className="p-6">
        <EmptyState icon={<Bot size={24} />} title="No AI comparison available" description="Upload and analyze an RFP to generate the AI impact analysis." />
      </div>
    );
  }

  const b = ai.baseline;

  // Comparison bar data
  const comparisonData = [
    { metric: 'Total Cost ($K)', baseline: Math.round(b.totalCostBaseline / 1000), ai: Math.round(b.totalCostAIAugmented / 1000) },
    { metric: 'Effort (Khrs)', baseline: Math.round(b.totalEffortBaselineHours / 100) / 10, ai: Math.round(b.totalEffortAIHours / 100) / 10 },
    { metric: 'Timeline (wks)', baseline: b.timelineBaselineWeeks, ai: b.timelineAIWeeks },
    { metric: 'Quality Score', baseline: b.qualityScoreBaseline, ai: b.qualityScoreAI },
  ];

  // Savings summary
  const savingsData = ai.useCases.map((u) => ({
    name: u.area.split(' ')[0],
    effort: u.effortReduction,
    speed: u.speedImprovement,
    cost: Math.abs(u.costImpact),
  }));

  // Radar for AI maturity/impact
  const radarData = ai.useCases.map((u) => ({
    area: u.area.split(' ')[0],
    effort: u.effortReduction,
    speed: u.speedImprovement,
  }));

  const costSavings = b.totalCostBaseline - b.totalCostAIAugmented;
  const effortSavings = b.totalEffortBaselineHours - b.totalEffortAIHours;
  const weeksSaved = b.timelineBaselineWeeks - b.timelineAIWeeks;

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="AI vs Traditional Delivery"
        description="Quantified impact analysis of AI-augmented delivery"
        icon={<Bot size={18} />}
        badge={`${ai.useCases.length} Use Cases`}
        actions={
          <button
            onClick={() => setShowAI(!showAI)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
              showAI
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            {showAI ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            {showAI ? 'AI View' : 'Baseline View'}
          </button>
        }
      />

      {/* Savings Banner */}
      <motion.div
        animate={{ opacity: showAI ? 1 : 0.5 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Cost Savings', value: formatCurrency(costSavings, true), sub: `${b.costSavingsPercent}% reduction`, color: 'emerald' as const },
          { label: 'Effort Savings', value: `${effortSavings.toLocaleString()} hrs`, sub: `${b.effortSavingsPercent}% reduction`, color: 'sky' as const },
          { label: 'Weeks Saved', value: `${weeksSaved}w`, sub: `${b.timelineSavingsPercent}% faster`, color: 'violet' as const },
          { label: 'Quality Uplift', value: `+${b.qualityScoreAI - b.qualityScoreBaseline} pts`, sub: `${b.qualityScoreBaseline} → ${b.qualityScoreAI}`, color: 'amber' as const },
        ].map((m) => <MetricCard key={m.label} {...m} animate={false} />)}
      </motion.div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-slate-600">T</span>
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">Traditional Delivery</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: 'Total Cost', value: formatCurrency(b.totalCostBaseline) },
              { label: 'Total Effort', value: `${b.totalEffortBaselineHours.toLocaleString()} hours` },
              { label: 'Timeline', value: `${b.timelineBaselineWeeks} weeks` },
              { label: 'Quality Score', value: `${b.qualityScoreBaseline}/100` },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <AnimatePresence mode="wait">
          {showAI ? (
            <motion.div key="ai" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <Card className="border-indigo-200 bg-indigo-50/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <Bot size={12} className="text-white" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">AI-Augmented Delivery</h3>
                    <Badge variant="info" size="sm">Recommended</Badge>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  {[
                    { label: 'Total Cost', value: formatCurrency(b.totalCostAIAugmented), delta: -b.costSavingsPercent, better: true },
                    { label: 'Total Effort', value: `${b.totalEffortAIHours.toLocaleString()} hours`, delta: -b.effortSavingsPercent, better: true },
                    { label: 'Timeline', value: `${b.timelineAIWeeks} weeks`, delta: -b.timelineSavingsPercent, better: true },
                    { label: 'Quality Score', value: `${b.qualityScoreAI}/100`, delta: b.qualityScoreAI - b.qualityScoreBaseline, better: true },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-slate-500">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{item.value}</span>
                        <span className={cn('text-xs font-medium', item.better ? 'text-emerald-600' : 'text-rose-500')}>
                          {item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="baseline" initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}>
              <Card className="border-slate-100">
                <CardBody className="flex items-center justify-center h-full min-h-[160px] text-slate-400 text-sm">
                  Toggle AI view to see augmented metrics
                </CardBody>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Grouped comparison bar */}
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Head-to-Head Comparison</h3></CardHeader>
          <CardBody className="pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={comparisonData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="metric" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="baseline" name="Traditional" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                {showAI && <Bar dataKey="ai" name="AI-Augmented" fill="#6366f1" radius={[3, 3, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Impact by area radar */}
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Effort Reduction by Area</h3></CardHeader>
          <CardBody className="pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 9 }} />
                <Radar dataKey="effort" name="Effort %" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                <Radar dataKey="speed" name="Speed %" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Use Cases */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">AI Use Cases</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {ai.useCases.map((uc, i) => (
            <UseCaseCard key={uc.id} uc={uc} index={i} showAI={showAI} />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <Card className="border-indigo-100 bg-indigo-50/20">
        <CardHeader>
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Zap size={13} className="text-indigo-500" /> Strategic Recommendations
          </h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {ai.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-700 p-2 bg-white border border-slate-100 rounded-xl">
                <CheckCircle2 size={12} className="text-indigo-500 mt-0.5 shrink-0" />
                {r}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Limitations */}
      <Alert type="warning" title="Limitations & Caveats">
        <ul className="mt-1 space-y-1">
          {ai.limitations.map((l, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <Info size={11} className="mt-0.5 shrink-0" />{l}
            </li>
          ))}
        </ul>
      </Alert>

      {/* Assumptions */}
      <Card>
        <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Analysis Assumptions</h3></CardHeader>
        <CardBody>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ai.assumptions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0" /> {a}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
