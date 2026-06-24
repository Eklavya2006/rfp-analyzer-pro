'use client';
import React from 'react';
import { useRFPStore } from '@/lib/store';

const IBM_BLUE = '#0F62FE';
const PHASE_COLORS = ['#0F62FE', '#0043CE', '#0050E6', '#4589ff', '#78a9ff', '#a6c8ff'];

export default function ProjectPlanModule() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  if (!result?.projectPlan) return <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document to see the project plan</div>;

  const plan = result.projectPlan;
  const totalWeeks = plan.totalDurationWeeks;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Project Name', value: plan.projectName },
          { label: 'Total Duration', value: `${totalWeeks} weeks` },
          { label: 'Phases', value: String(plan.phases.length) },
          { label: 'Last Updated', value: new Date(plan.lastUpdated).toLocaleDateString() },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-sm font-bold text-gray-900">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Gantt chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 overflow-x-auto">
        <h3 className="text-sm font-bold text-gray-700 mb-5">Gantt Timeline</h3>
        <div className="min-w-[600px]">
          {/* Week ruler */}
          <div className="flex mb-3">
            <div className="w-40 shrink-0" />
            <div className="flex-1 flex relative">
              {Array.from({ length: Math.ceil(totalWeeks / 4) + 1 }, (_, i) => (
                <div key={i} className="flex-1 text-[10px] text-gray-400 text-center border-l border-gray-100" style={{ minWidth: 28 }}>
                  W{i * 4 + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Phase rows */}
          {plan.phases.map((phase, idx) => {
            const leftPct = ((phase.startWeek - 1) / totalWeeks) * 100;
            const widthPct = (phase.durationWeeks / totalWeeks) * 100;
            const color = PHASE_COLORS[idx % PHASE_COLORS.length];
            return (
              <div key={phase.id} className="flex items-center mb-3 group">
                <div className="w-40 shrink-0 pr-3 text-xs font-semibold text-gray-700 truncate">{phase.name}</div>
                <div className="flex-1 relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="absolute top-0 h-full rounded-lg flex items-center px-2 transition-all"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: color, minWidth: 24 }}
                  >
                    <span className="text-[10px] text-white font-semibold truncate">{phase.durationWeeks}w</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase detail table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <h3 className="text-sm font-bold text-gray-700 p-5 pb-0 mb-4">Phase Details</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ background: '#f4f8ff' }}>
              <th className="px-4 py-3 text-left">Phase</th>
              <th className="px-4 py-3 text-left">Start Week</th>
              <th className="px-4 py-3 text-left">End Week</th>
              <th className="px-4 py-3 text-left">Duration</th>
              <th className="px-4 py-3 text-left">Responsible Roles</th>
              <th className="px-4 py-3 text-left">Key Deliverables</th>
            </tr>
          </thead>
          <tbody>
            {plan.phases.map((phase, idx) => (
              <tr key={phase.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PHASE_COLORS[idx % PHASE_COLORS.length] }} />
                    <span className="text-sm font-semibold text-gray-800">{phase.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">Week {phase.startWeek}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">Week {phase.endWeek}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: IBM_BLUE }}>
                    {phase.durationWeeks}w
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {phase.responsibleRoles.slice(0, 3).map((r) => (
                      <span key={r} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{r}</span>
                    ))}
                    {phase.responsibleRoles.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{phase.responsibleRoles.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {phase.deliverables.slice(0, 2).map((d) => (
                      <span key={d} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{d}</span>
                    ))}
                    {phase.deliverables.length > 2 && <span className="text-[10px] text-gray-400">+{phase.deliverables.length - 2}</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
