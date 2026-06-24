'use client';
// ProjectPlan — fully editable Gantt + Phase Details + Add/Remove phases
import React, { useState, useRef, useCallback } from 'react';
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { T } from '@/lib/theme';
import { v4 as uuid } from 'uuid';
import type { ProjectPhase } from '@/types';

const PHASE_COLORS = [T.navy, T.slate, T.gold, T.chart[4], '#DC2626', '#D97706'];

// ── Inline editable cell ──────────────────────────────────────
function EditCell({ value, onSave, className = '' }: {
  value: string; onSave: (v: string) => void; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value);
  const commit = () => { onSave(val); setEditing(false); };

  if (!editing) return (
    <span
      className={`cursor-pointer hover:underline decoration-dashed inline-flex items-center gap-1 group ${className}`}
      onClick={() => { setVal(value); setEditing(true); }}
    >
      {value || <span style={{ color: T.textMuted }} className="italic">click to edit</span>}
      <Pencil size={9} className="opacity-0 group-hover:opacity-60 flex-shrink-0" style={{ color: T.gold }} />
    </span>
  );

  return (
    <span className="flex items-center gap-1">
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="border-b-2 outline-none text-sm bg-transparent w-full"
        style={{ borderColor: T.gold }} />
      <button onClick={commit} className="text-green-500 hover:text-green-700"><Check size={12} /></button>
      <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-red-400"><X size={12} /></button>
    </span>
  );
}

// ── Editable number cell ──────────────────────────────────────
function NumCell({ value, onSave, label }: { value: number; onSave: (v: number) => void; label: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(String(value));
  const commit = () => { const n = Math.max(1, parseInt(val, 10) || 1); onSave(n); setEditing(false); };

  if (!editing) return (
    <span className="cursor-pointer hover:underline decoration-dashed inline-flex items-center gap-1 group"
      onClick={() => { setVal(String(value)); setEditing(true); }} title={`Edit ${label}`}>
      <span className="font-medium">W{value}</span>
      <Pencil size={9} className="opacity-0 group-hover:opacity-60" style={{ color: T.gold }} />
    </span>
  );

  return (
    <span className="flex items-center gap-1">
      <span className="text-xs" style={{ color: T.textMuted }}>W</span>
      <input autoFocus type="number" min={1} value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-12 text-center border-b-2 outline-none text-sm bg-transparent"
        style={{ borderColor: T.gold }} />
      <button onClick={commit} className="text-green-500 hover:text-green-700"><Check size={12} /></button>
      <button onClick={() => setEditing(false)} className="text-gray-400"><X size={12} /></button>
    </span>
  );
}

// ── Draggable Gantt bar ───────────────────────────────────────
function GanttBar({ phase, totalWeeks, color, onUpdate }: {
  phase: ProjectPhase; totalWeeks: number; color: string;
  onUpdate: (u: Partial<ProjectPhase>) => void;
}) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const dragging       = useRef<'move' | 'left' | 'right' | null>(null);
  const startX         = useRef(0);
  const startWeek      = useRef(0);
  const startDuration  = useRef(0);

  const pxPerWeek = useCallback(() =>
    (containerRef.current?.parentElement?.clientWidth ?? 600) / totalWeeks, [totalWeeks]);

  const leftPct  = ((phase.startWeek - 1) / totalWeeks) * 100;
  const widthPct = (phase.durationWeeks  / totalWeeks) * 100;

  const onMouseDown = (e: React.MouseEvent, type: 'move' | 'left' | 'right') => {
    e.preventDefault();
    dragging.current     = type;
    startX.current       = e.clientX;
    startWeek.current    = phase.startWeek;
    startDuration.current = phase.durationWeeks;

    const onMove = (me: MouseEvent) => {
      const delta = Math.round((me.clientX - startX.current) / pxPerWeek());
      if (dragging.current === 'move') {
        const s = Math.max(1, startWeek.current + delta);
        onUpdate({ startWeek: s, durationWeeks: startDuration.current, endWeek: s + startDuration.current - 1 });
      } else if (dragging.current === 'right') {
        const d = Math.max(1, startDuration.current + delta);
        onUpdate({ durationWeeks: d, endWeek: startWeek.current + d - 1 });
      } else if (dragging.current === 'left') {
        const s = Math.max(1, startWeek.current + delta);
        const d = Math.max(1, startDuration.current - delta);
        onUpdate({ startWeek: s, durationWeeks: d, endWeek: s + d - 1 });
      }
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div ref={containerRef} className="flex-1 relative h-9 rounded-lg overflow-visible" style={{ background: '#EEF2F7' }}>
      <div
        className="absolute top-1 h-7 rounded-lg flex items-center select-none shadow-sm"
        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%`, background: color, minWidth: 32, cursor: 'grab' }}
        onMouseDown={(e) => onMouseDown(e, 'move')}
      >
        <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-lg hover:bg-black/20 z-10"
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'left'); }} />
        <span className="text-[10px] text-white font-semibold px-2 truncate select-none pointer-events-none">
          {phase.durationWeeks}w · W{phase.startWeek}–W{phase.endWeek}
        </span>
        <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-lg hover:bg-black/20 z-10"
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'right'); }} />
      </div>
    </div>
  );
}

// ── Add Phase form ────────────────────────────────────────────
function AddPhaseForm({ onAdd, onCancel }: { onAdd: (p: Omit<ProjectPhase, 'id'>) => void; onCancel: () => void }) {
  const [name, setName]         = useState('New Phase');
  const [duration, setDuration] = useState(4);
  const [owner, setOwner]       = useState('');

  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(), owner: owner || 'TBD',
      description: '', milestones: [],
      startWeek: 1, durationWeeks: duration, endWeek: duration,
      responsibleRoles: [], deliverables: [], status: 'not-started',
    });
  };

  return (
    <div className="bg-white rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: T.gold }}>
      <div className="text-sm font-bold" style={{ color: T.navy }}>Add New Phase</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <input placeholder="Phase name" value={name} onChange={(e) => setName(e.target.value)}
          className="col-span-2 border rounded-lg px-3 py-1.5 text-sm outline-none"
          style={{ borderColor: T.border }} />
        <input type="number" min={1} placeholder="Duration (weeks)" value={duration}
          onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
          className="border rounded-lg px-3 py-1.5 text-sm outline-none"
          style={{ borderColor: T.border }} />
        <input placeholder="Owner (optional)" value={owner} onChange={(e) => setOwner(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm outline-none"
          style={{ borderColor: T.border }} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel}
          className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
          style={{ borderColor: T.border, color: T.textSecondary }}>Cancel</button>
        <button onClick={submit}
          className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg"
          style={{ background: T.navy }}>Add Phase</button>
      </div>
    </div>
  );
}

export default function ProjectPlanModule() {
  const { activeDocumentId, analysisResults, updateProjectPhase, addProjectPhase, removeProjectPhase } = useRFPStore();
  const result     = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm]       = useState(false);

  if (!result?.projectPlan) return (
    <div className="p-6 text-sm text-center mt-20" style={{ color: T.textMuted }}>
      Upload a document to see the project plan
    </div>
  );

  const plan       = result.projectPlan;
  const totalWeeks = plan.totalDurationWeeks;

  const update = (phaseId: string, updates: Partial<ProjectPhase>) => {
    if (activeDocumentId) updateProjectPhase(activeDocumentId, phaseId, updates);
  };

  const handleAddPhase = (partial: Omit<ProjectPhase, 'id'>) => {
    if (!activeDocumentId) return;
    addProjectPhase(activeDocumentId, { id: uuid(), ...partial });
    setShowAddForm(false);
  };

  const handleRemovePhase = (phaseId: string) => {
    if (activeDocumentId) removeProjectPhase(activeDocumentId, phaseId);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Project Name',    value: plan.projectName },
          { label: 'Total Duration',  value: `${totalWeeks} weeks` },
          { label: 'Phases',          value: String(plan.phases.length) },
          { label: 'Last Updated',    value: new Date(plan.lastUpdated).toLocaleDateString() },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border p-4" style={{ borderColor: T.border }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.textMuted }}>{m.label}</div>
            <div className="text-sm font-bold" style={{ color: T.navy }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex justify-end">
        <button onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90"
          style={{ background: T.navy }}>
          <Plus size={14} /> Add Phase
        </button>
      </div>

      {/* Add Phase form */}
      {showAddForm && (
        <AddPhaseForm
          onAdd={handleAddPhase}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Interactive Gantt */}
      <div className="bg-white rounded-2xl border p-5 overflow-x-auto" style={{ borderColor: T.border }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: T.navy }}>Gantt Timeline</h3>
          <span className="text-[10px]" style={{ color: T.textMuted }}>Drag bars to move · Drag edges to resize</span>
        </div>
        <div className="min-w-[640px]">
          {/* Week ruler */}
          <div className="flex mb-2">
            <div className="w-44 shrink-0" />
            <div className="flex-1 flex">
              {Array.from({ length: Math.ceil(totalWeeks / 4) + 1 }, (_, i) => (
                <div key={i} className="flex-1 text-[10px] text-center border-l"
                  style={{ minWidth: 28, color: T.textMuted, borderColor: T.border }}>
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
                <div className="w-44 shrink-0 pr-3 flex items-center justify-between">
                  <div className="text-xs font-semibold truncate" style={{ color: T.navy }}>{phase.name}</div>
                  <button onClick={() => handleRemovePhase(phase.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 ml-1 flex-shrink-0 transition-all">
                    <Trash2 size={11} />
                  </button>
                </div>
                <GanttBar phase={phase} totalWeeks={totalWeeks} color={color}
                  onUpdate={(u) => update(phase.id, u)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase Details — fully editable inline */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: T.border }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: T.border }}>
          <h3 className="text-sm font-bold" style={{ color: T.navy }}>Phase Details</h3>
          <span className="text-[10px]" style={{ color: T.textMuted }}>Click any cell to edit · Pencil icon = editable</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wider"
                style={{ background: T.surface, color: T.textSecondary }}>
                <th className="px-4 py-3 text-left">Phase</th>
                <th className="px-4 py-3 text-center">Start ✎</th>
                <th className="px-4 py-3 text-center">End ✎</th>
                <th className="px-4 py-3 text-center">Duration ✎</th>
                <th className="px-4 py-3 text-left">Owner ✎</th>
                <th className="px-4 py-3 text-left">Description ✎</th>
                <th className="px-4 py-3 text-left">Roles</th>
                <th className="px-4 py-3 text-center">Del</th>
              </tr>
            </thead>
            <tbody>
              {plan.phases.map((phase, idx) => {
                const color      = PHASE_COLORS[idx % PHASE_COLORS.length];
                const isExpanded = editingPhaseId === phase.id;
                return (
                  <React.Fragment key={phase.id}>
                    <tr className="border-t hover:bg-gray-50/50 transition-colors"
                      style={{ borderColor: T.border }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                          <EditCell value={phase.name}
                            onSave={(v) => update(phase.id, { name: v })}
                            className="font-semibold text-gray-800" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        <NumCell value={phase.startWeek} label="start week"
                          onSave={(v) => update(phase.id, { startWeek: v })} />
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        <NumCell value={phase.endWeek} label="end week"
                          onSave={(v) => update(phase.id, { endWeek: v })} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white cursor-pointer"
                          style={{ background: color }}
                          onClick={() => {
                            const n = parseInt(prompt(`New duration for "${phase.name}" (weeks):`, String(phase.durationWeeks)) ?? '', 10);
                            if (!isNaN(n) && n > 0) update(phase.id, { durationWeeks: n });
                          }}>
                          {phase.durationWeeks}w
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: T.textSecondary }}>
                        <EditCell value={phase.owner ?? 'Unassigned'}
                          onSave={(v) => update(phase.id, { owner: v })} />
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[200px]" style={{ color: T.textSecondary }}>
                        <EditCell value={phase.description ?? ''}
                          onSave={(v) => update(phase.id, { description: v })} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {phase.responsibleRoles.slice(0, 2).map((r) => (
                            <span key={r} className="text-[10px] px-2 py-0.5 rounded-full border"
                              style={{ background: `${T.slate}10`, color: T.slate, borderColor: `${T.slate}30` }}>{r}</span>
                          ))}
                          {phase.responsibleRoles.length > 2 && (
                            <button onClick={() => setEditingPhaseId(isExpanded ? null : phase.id)}
                              className="text-[10px] underline hover:opacity-70"
                              style={{ color: T.textMuted }}>
                              {isExpanded ? 'less' : `+${phase.responsibleRoles.length - 2} more`}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemovePhase(phase.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-dashed" style={{ borderColor: `${T.gold}50`, background: `${T.gold}06` }}>
                        <td colSpan={8} className="px-5 py-3">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="font-semibold uppercase tracking-wide text-[10px] mb-1" style={{ color: T.textMuted }}>All Roles</div>
                              <div className="flex flex-wrap gap-1">
                                {phase.responsibleRoles.map((r) => (
                                  <span key={r} className="px-2 py-0.5 rounded-full text-[10px]"
                                    style={{ background: `${T.slate}15`, color: T.slate }}>{r}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold uppercase tracking-wide text-[10px] mb-1" style={{ color: T.textMuted }}>Key Deliverables</div>
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
