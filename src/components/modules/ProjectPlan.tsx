'use client';
// ============================================================
// ProjectPlan — S5: Draggable/resizable Gantt + inline editable phase details
// ============================================================
import React, { useState, useRef, useCallback } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import type { ProjectPhase } from '@/types';

const ACCENT = '#1E3A5F';
const TEAL   = '#0D7377';
const PHASE_COLORS = ['#1E3A5F','#0D7377','#F4A261','#7C3AED','#DC2626','#D97706'];

// ── Inline editable cell ──────────────────────────────────────
function EditCell({ value, onSave, className = '' }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const commit = () => { onSave(val); setEditing(false); };
  if (!editing) return (
    <span className={`cursor-pointer hover:underline decoration-dashed ${className}`} onClick={() => { setVal(value); setEditing(true); }}>
      {value || <span className="text-gray-300 italic">click to edit</span>}
    </span>
  );
  return (
    <span className="flex items-center gap-1">
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="border-b border-teal-400 outline-none text-sm bg-transparent w-full" />
      <button onClick={commit} className="text-green-500 hover:text-green-700"><Check size={12} /></button>
      <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-red-400"><X size={12} /></button>
    </span>
  );
}

// ── Draggable Gantt bar ───────────────────────────────────────
interface GanttBarProps {
  phase: ProjectPhase;
  totalWeeks: number;
  color: string;
  onUpdate: (updates: Partial<ProjectPhase>) => void;
}

function GanttBar({ phase, totalWeeks, color, onUpdate }: GanttBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'move' | 'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startWeek = useRef(0);
  const startDuration = useRef(0);

  const pxPerWeek = useCallback(() => {
    return (containerRef.current?.parentElement?.clientWidth ?? 600) / totalWeeks;
  }, [totalWeeks]);

  const leftPct  = ((phase.startWeek - 1) / totalWeeks) * 100;
  const widthPct = (phase.durationWeeks / totalWeeks) * 100;

  const onMouseDown = (e: React.MouseEvent, type: 'move' | 'left' | 'right') => {
    e.preventDefault();
    dragging.current = type;
    startX.current = e.clientX;
    startWeek.current = phase.startWeek;
    startDuration.current = phase.durationWeeks;

    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX.current;
      const weeksDelta = Math.round(dx / pxPerWeek());
      if (dragging.current === 'move') {
        const newStart = Math.max(1, startWeek.current + weeksDelta);
        onUpdate({ startWeek: newStart, durationWeeks: startDuration.current, endWeek: newStart + startDuration.current - 1 });
      } else if (dragging.current === 'right') {
        const newDur = Math.max(1, startDuration.current + weeksDelta);
        onUpdate({ durationWeeks: newDur, endWeek: startWeek.current + newDur - 1 });
      } else if (dragging.current === 'left') {
        const newStart = Math.max(1, startWeek.current + weeksDelta);
        const newDur = Math.max(1, startDuration.current - weeksDelta);
        onUpdate({ startWeek: newStart, durationWeeks: newDur, endWeek: newStart + newDur - 1 });
      }
    };
    const onUp = () => { dragging.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div ref={containerRef} className="flex-1 relative h-9 bg-gray-100 rounded-lg overflow-visible">
      <div
        className="absolute top-1 h-7 rounded-lg flex items-center select-none shadow-sm"
        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%`, background: color, minWidth: 32, cursor: 'grab' }}
        onMouseDown={(e) => onMouseDown(e, 'move')}
      >
        {/* Left resize handle */}
        <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-lg hover:bg-black/20 z-10"
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'left'); }} />
        <span className="text-[10px] text-white font-semibold px-2 truncate select-none pointer-events-none">
          {phase.durationWeeks}w · W{phase.startWeek}–W{phase.endWeek}
        </span>
        {/* Right resize handle */}
        <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-lg hover:bg-black/20 z-10"
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'right'); }} />
      </div>
    </div>
  );
}

export default function ProjectPlanModule() {
  const { activeDocumentId, analysisResults, updateProjectPhase } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);

  if (!result?.projectPlan) return (
    <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document to see the project plan</div>
  );

  const plan = result.projectPlan;
  const totalWeeks = plan.totalDurationWeeks;

  const update = (phaseId: string, updates: Partial<ProjectPhase>) => {
    if (activeDocumentId) updateProjectPhase(activeDocumentId, phaseId, updates);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Project Name', value: plan.projectName },
          { label: 'Total Duration', value: `${totalWeeks} weeks` },
          { label: 'Phases', value: String(plan.phases.length) },
          { label: 'Last Updated', value: new Date(plan.lastUpdated).toLocaleDateString() },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border p-4" style={{ borderColor: '#E2E8F0' }}>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-sm font-bold" style={{ color: '#1A202C' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Interactive Gantt */}
      <div className="bg-white rounded-2xl border p-5 overflow-x-auto" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: '#1A202C' }}>Gantt Timeline</h3>
          <span className="text-[10px] text-gray-400">Drag bars to move · Drag edges to resize</span>
        </div>
        <div className="min-w-[640px]">
          {/* Week ruler */}
          <div className="flex mb-2">
            <div className="w-44 shrink-0" />
            <div className="flex-1 flex">
              {Array.from({ length: Math.ceil(totalWeeks / 4) + 1 }, (_, i) => (
                <div key={i} className="flex-1 text-[10px] text-gray-400 text-center border-l border-gray-100" style={{ minWidth: 28 }}>
                  W{i * 4 + 1}
                </div>
              ))}
            </div>
          </div>
          {/* Phase rows */}
          {plan.phases.map((phase, idx) => {
            const color = PHASE_COLORS[idx % PHASE_COLORS.length];
            return (
              <div key={phase.id} className="flex items-center mb-2 gap-2 group">
                <div className="w-44 shrink-0 pr-3">
                  <div className="text-xs font-semibold truncate" style={{ color: '#1A202C' }}>{phase.name}</div>
                </div>
                <GanttBar phase={phase} totalWeeks={totalWeeks} color={color}
                  onUpdate={(updates) => update(phase.id, updates)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase Details — real-time sync */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E2E8F0' }}>
          <h3 className="text-sm font-bold" style={{ color: '#1A202C' }}>Phase Details</h3>
          <span className="text-[10px] text-gray-400">Click any cell to edit inline</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ background: '#F8FAFC' }}>
                <th className="px-4 py-3 text-left">Phase</th>
                <th className="px-4 py-3 text-center">Start</th>
                <th className="px-4 py-3 text-center">End</th>
                <th className="px-4 py-3 text-center">Duration</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Responsible Roles</th>
              </tr>
            </thead>
            <tbody>
              {plan.phases.map((phase, idx) => {
                const color = PHASE_COLORS[idx % PHASE_COLORS.length];
                const isExpanded = editingPhaseId === phase.id;
                return (
                  <React.Fragment key={phase.id}>
                    <tr className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                          <EditCell value={phase.name} onSave={(v) => update(phase.id, { name: v })}
                            className="font-semibold text-gray-800" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">
                        <span className="font-medium">W{phase.startWeek}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">
                        <span className="font-medium">W{phase.endWeek}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
                          {phase.durationWeeks}w
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <EditCell value={phase.owner ?? 'Unassigned'} onSave={(v) => update(phase.id, { owner: v })} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px]">
                        <EditCell value={phase.description ?? ''} onSave={(v) => update(phase.id, { description: v })} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {phase.responsibleRoles.slice(0, 2).map((r) => (
                            <span key={r} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{r}</span>
                          ))}
                          {phase.responsibleRoles.length > 2 && (
                            <button onClick={() => setEditingPhaseId(isExpanded ? null : phase.id)}
                              className="text-[10px] text-gray-400 hover:text-teal-600 underline">
                              {isExpanded ? 'less' : `+${phase.responsibleRoles.length - 2} more`}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-dashed border-teal-100">
                        <td colSpan={7} className="px-5 py-3" style={{ background: '#F0FDFA' }}>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="font-semibold text-gray-500 mb-1 uppercase tracking-wide text-[10px]">All Roles</div>
                              <div className="flex flex-wrap gap-1">
                                {phase.responsibleRoles.map((r) => (
                                  <span key={r} className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full text-[10px]">{r}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-500 mb-1 uppercase tracking-wide text-[10px]">Key Deliverables</div>
                              <div className="flex flex-wrap gap-1">
                                {phase.deliverables.map((d) => (
                                  <span key={d} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">{d}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
