// ============================================================
// Project Plan Module — Gantt-style timeline visualization
// ============================================================
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, AlertTriangle, ChevronDown, ChevronRight, Edit2, Flag, CheckSquare } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { formatWeeks, cn, COLORS } from '@/lib/utils';
import type { ProjectPhase } from '@/types';
import {
  Card, CardHeader, CardBody, Badge, Button, SectionHeader,
  Alert, EmptyState, MetricCard, Divider
} from '@/components/ui';
// recharts not used in this module — Gantt uses CSS flexbox bars

const PHASE_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899',
];

function GanttBar({ phase, totalWeeks, index }: { phase: ProjectPhase; totalWeeks: number; index: number }) {
  const left = ((phase.startWeek - 1) / totalWeeks) * 100;
  const width = (phase.durationWeeks / totalWeeks) * 100;
  const color = PHASE_COLORS[index % PHASE_COLORS.length];

  return (
    <div className="relative h-8 mb-1">
      <div className="absolute inset-y-0 flex items-center" style={{ left: `${left}%`, width: `${width}%`, minWidth: 4 }}>
        <div
          className="w-full h-6 rounded-md flex items-center px-2 text-white text-xs font-medium overflow-hidden whitespace-nowrap"
          style={{ backgroundColor: color, opacity: 0.9 }}
        >
          {width > 8 && <span className="truncate">{phase.name}</span>}
        </div>
        {/* Milestone markers */}
        {phase.milestones.map((m) => {
          const markerLeft = ((m.dueWeek - phase.startWeek) / totalWeeks) * 100;
          return (
            <div
              key={m.id}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white',
                m.isCritical ? 'bg-rose-500' : 'bg-white'
              )}
              style={{ left: `${markerLeft}%` }}
              title={m.name}
            />
          );
        })}
      </div>
    </div>
  );
}

function PhaseCard({ phase, index }: { phase: ProjectPhase; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const color = PHASE_COLORS[index % PHASE_COLORS.length];

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-50/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm">{phase.name}</span>
            <Badge variant="outline">W{phase.startWeek}–W{phase.startWeek + phase.durationWeeks - 1}</Badge>
            <Badge variant="default">{phase.durationWeeks}w</Badge>
            {phase.milestones.some((m) => m.isCritical) && (
              <Badge variant="danger">Critical Path</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{phase.description}</p>
        </div>
        <div className="text-slate-400 shrink-0">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-slate-100">
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Milestones */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Milestones</div>
              <div className="space-y-2">
                {phase.milestones.map((m) => (
                  <div key={m.id} className="flex items-start gap-2">
                    <Flag size={12} className={cn('mt-0.5 shrink-0', m.isCritical ? 'text-rose-500' : 'text-slate-400')} />
                    <div>
                      <div className="text-xs font-medium text-slate-700">{m.name}</div>
                      <div className="text-[10px] text-slate-400">Week {m.dueWeek}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deliverables</div>
              <ul className="space-y-1">
                {phase.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <CheckSquare size={10} className="text-emerald-500 mt-0.5 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            {/* Team */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Team</div>
              <div className="flex flex-wrap gap-1.5">
                {phase.team.map((t) => <Badge key={t} variant="info" size="sm">{t}</Badge>)}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </Card>
  );
}

export default function ProjectPlan() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const plan = result?.projectPlan;

  if (!plan) {
    return (
      <div className="p-6">
        <EmptyState icon={<CalendarDays size={24} />} title="No project plan available" description="Upload and analyze an RFP document to generate a project plan." />
      </div>
    );
  }

  const totalMilestones = plan.phases.reduce((sum, p) => sum + p.milestones.length, 0);
  const criticalMilestones = plan.phases.reduce((sum, p) => sum + p.milestones.filter((m) => m.isCritical).length, 0);

  // Timeline bar chart data
  const timelineData = plan.phases.map((p, i) => ({
    phase: p.name.replace(/—.*/, '').trim().replace('Development', 'Dev'),
    start: p.startWeek - 1,
    duration: p.durationWeeks,
    fill: PHASE_COLORS[i % PHASE_COLORS.length],
  }));

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Project Plan"
        description={`${plan.phases.length} phases · ${totalWeeks(plan.phases)} total weeks · ${totalMilestones} milestones`}
        icon={<CalendarDays size={18} />}
        badge={plan.projectName}
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Duration" value={formatWeeks(plan.totalDurationWeeks)} color="indigo" />
        <MetricCard label="Total Phases" value={String(plan.phases.length)} color="violet" />
        <MetricCard label="Total Milestones" value={String(totalMilestones)} color="sky" />
        <MetricCard label="Critical Milestones" value={String(criticalMilestones)} color="rose" />
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Timeline Overview</h3>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Critical Milestone</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white border border-slate-300" /> Milestone</div>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {/* Week markers */}
          <div className="relative">
            <div className="flex mb-2">
              {[0, 25, 50, 75, 100].map((pct) => (
                <div key={pct} className="absolute text-[10px] text-slate-400" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}>
                  W{Math.round((pct / 100) * plan.totalDurationWeeks)}
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-0.5">
              {plan.phases.map((phase, i) => (
                <div key={phase.id} className="flex items-center gap-2">
                  <div className="w-28 shrink-0 text-xs text-slate-500 text-right truncate">{phase.name.split('—')[0].trim()}</div>
                  <div className="flex-1 relative h-8">
                    <div className="absolute inset-0">
                      <GanttBar phase={phase} totalWeeks={plan.totalDurationWeeks} index={i} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Phase Details */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">Phase Details</h3>
        <div className="space-y-2">
          {plan.phases.map((phase, i) => (
            <PhaseCard key={phase.id} phase={phase} index={i} />
          ))}
        </div>
      </div>

      {/* Assumptions & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-800 text-sm">Planning Assumptions</h3></CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {plan.assumptions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2"><AlertTriangle size={13} className="text-amber-500" /> Schedule Risks</h3></CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {plan.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function totalWeeks(phases: ProjectPhase[]): number {
  const last = phases.reduce((max, p) => Math.max(max, p.startWeek + p.durationWeeks - 1), 0);
  return last;
}
