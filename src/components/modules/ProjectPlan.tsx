'use client';
// ProjectPlan — Dark Gantt-style redesign with status pills, progress bars, resource chart
import React, { useState, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Pencil, Check, X, Plus, Trash2, Info, Flag, Minus } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, ReferenceDot,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { T } from '@/lib/theme';
import { v4 as uuid } from 'uuid';
import type { ProjectPhase } from '@/types';

// ── Color constants ───────────────────────────────────────────
const PC = {
  bg:        '#F8FAFC',
  card:      '#FFFFFF',
  border:    '#E2E8F0',
  completed: '#238636',
  inprog:    '#1f6feb',
  delayed:   '#f78166',
  notstart:  '#94A3B8',
  text:      '#0A1628',
  muted:     '#94A3B8',
  phases:    ['#1f6feb','#238636','#a56eff','#f1c21b','#f78166','#08bdba','#ff832b','#0f62fe'],
} as const;

const tooltipStyle = {
  backgroundColor: '#1E2436',
  border: '1px solid rgba(99,102,241,0.3)',
  borderRadius: 10,
  color: '#F1F5F9',
  fontSize: 13,
  padding: '8px 12px',
  zIndex: 10000,
  boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
};
const tooltipWrapperStyle = { zIndex: 10000, outline: 'none' };
const tooltipLabelStyle   = { color: '#F1F5F9', fontWeight: 700, marginBottom: 4 };

// ── CustomTooltip — WCAG-AA, #F8F9FA bg, dynamic border/title colour ──
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color?: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const color = payload[0].color ?? '#1f6feb';
  return (
    <div style={{
      backgroundColor: '#F8F9FA',
      border: `2px solid ${color}`,
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: 140,
    }}>
      <div style={{ color, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.name} style={{ color: '#1F2937', fontSize: 13 }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </div>
      ))}
    </div>
  );
}

// ── Status helpers ────────────────────────────────────────────
type PhaseStatus = 'not-started' | 'in-progress' | 'completed';
function statusColor(s: PhaseStatus): string {
  if (s === 'completed')   return PC.completed;
  if (s === 'in-progress') return PC.inprog;
  return PC.notstart;
}
function statusLabel(s: PhaseStatus): string {
  if (s === 'completed')   return 'Completed';
  if (s === 'in-progress') return 'In Progress';
  return 'Not Started';
}
function statusPct(s: PhaseStatus): number {
  if (s === 'completed')   return 100;
  if (s === 'in-progress') return 50;
  return 0;
}

// ── Hover tooltip component — portal-based for z-index safety ──
function HoverTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = React.useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
    setVisible(true);
  };

  return (
    <>
      <span
        ref={ref}
        className="relative inline-flex items-center gap-1"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setVisible(false)}
        onFocus={handleMouseEnter}
        onBlur={() => setVisible(false)}
      >
        {children}
      </span>
      {visible && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y - 8,
            transform: 'translate(-50%, -100%)',
            background: '#1E2436',
            color: '#F1F5F9',
            fontSize: 12,
            padding: '8px 12px',
            borderRadius: 8,
            zIndex: 2147483647,
            width: 300,
            boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
            border: '1px solid rgba(99,102,241,0.4)',
            lineHeight: 1.5,
            pointerEvents: 'none',
            whiteSpace: 'normal',
            textAlign: 'left',
          }}
        >
          {text}
          <span style={{
            position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: '6px solid #1E2436',
          }} />
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Inline editable cell ──────────────────────────────────────
function EditCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value);
  const commit = () => { onSave(val); setEditing(false); };

  if (!editing) return (
    <span className="cursor-pointer inline-flex items-center gap-1 group"
      onClick={() => { setVal(value); setEditing(true); }}>
      {value || <span style={{ color: PC.muted }} className="italic text-xs">click to edit</span>}
      <Pencil size={9} className="opacity-0 group-hover:opacity-60 flex-shrink-0" style={{ color: T.gold }} />
    </span>
  );
  return (
    <span className="flex items-center gap-1">
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="border-b-2 outline-none text-sm bg-transparent w-full"
        style={{ borderColor: T.gold, color: PC.text }} />
      <button onClick={commit}><Check size={12} className="text-green-500" /></button>
      <button onClick={() => setEditing(false)}><X size={12} className="text-gray-400" /></button>
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
    dragging.current      = type;
    startX.current        = e.clientX;
    startWeek.current     = phase.startWeek;
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
    const onUp = () => { dragging.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div ref={containerRef} className="flex-1 relative h-9" style={{ background: '#EEF2F7', borderRadius: 6 }}>
      <div
        className="absolute top-1 h-7 flex items-center select-none"
        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%`, background: color, minWidth: 32, cursor: 'grab', borderRadius: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
        onMouseDown={(e) => onMouseDown(e, 'move')}
      >
        <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize hover:bg-black/20 z-10" style={{ borderRadius: '6px 0 0 6px' }}
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'left'); }} />
        <span className="text-[10px] text-white font-semibold px-2 truncate select-none pointer-events-none">
          {phase.name.length > 14 ? phase.name.slice(0, 14) + '…' : phase.name} · {phase.durationWeeks}w
        </span>
        <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize hover:bg-black/20 z-10" style={{ borderRadius: '0 6px 6px 0' }}
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
    onAdd({ name: name.trim(), owner: owner || 'TBD', description: '', milestones: [],
      startWeek: 1, durationWeeks: duration, endWeek: duration,
      responsibleRoles: [], deliverables: [], status: 'not-started' });
  };

  return (
    <div className="rounded-2xl border-2 p-4 space-y-3 bg-white" style={{ borderColor: T.gold }}>
      <div className="text-sm font-bold" style={{ color: PC.text }}>Add New Phase</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <input placeholder="Phase name" value={name} onChange={(e) => setName(e.target.value)}
          className="col-span-2 border rounded-lg px-3 py-1.5 text-sm outline-none" style={{ borderColor: PC.border }} />
        <input type="number" min={1} placeholder="Duration (wks)" value={duration}
          onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
          className="border rounded-lg px-3 py-1.5 text-sm outline-none" style={{ borderColor: PC.border }} />
        <input placeholder="Owner (optional)" value={owner} onChange={(e) => setOwner(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm outline-none" style={{ borderColor: PC.border }} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm border rounded-lg" style={{ borderColor: PC.border, color: PC.muted }}>Cancel</button>
        <button onClick={submit} className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg" style={{ background: PC.inprog }}>Add Phase</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function ProjectPlanModule() {
  // Subscribe only to project-plan related store slices so chart and table rerenders stay local to this module.
  const activeDocumentId = useRFPStore((state) => state.activeDocumentId);
  const analysisResults  = useRFPStore((state) => state.analysisResults);
  const updateProjectPhase = useRFPStore((state) => state.updateProjectPhase);
  const addProjectPhase    = useRFPStore((state) => state.addProjectPhase);
  const removeProjectPhase = useRFPStore((state) => state.removeProjectPhase);
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm]       = useState(false);

  // All hooks must be above the early return to satisfy Rules of Hooks
  const update = useCallback((phaseId: string, updates: Partial<ProjectPhase>) => {
    if (activeDocumentId) updateProjectPhase(activeDocumentId, phaseId, updates);
  }, [activeDocumentId, updateProjectPhase]);

  const handleAddPhase = useCallback((partial: Omit<ProjectPhase, 'id'>) => {
    if (!activeDocumentId) return;
    addProjectPhase(activeDocumentId, { id: uuid(), ...partial });
    setShowAddForm(false);
  }, [activeDocumentId, addProjectPhase]);

  const handleRemovePhase = useCallback((phaseId: string) => {
    if (activeDocumentId) removeProjectPhase(activeDocumentId, phaseId);
  }, [activeDocumentId, removeProjectPhase]);

  const plan       = result?.projectPlan ?? null;
  const totalWeeks = plan?.totalDurationWeeks ?? 0;

  interface PhaseBarData { phase: string; roles: number; duration: number; status: string }
  const resData: PhaseBarData[] = useMemo(() => (plan?.phases ?? []).map((phase) => ({
    phase: phase.name.length > 12 ? phase.name.slice(0, 12) + '…' : phase.name,
    roles: phase.responsibleRoles.length > 0 ? phase.responsibleRoles.length : Math.max(2, Math.round(phase.durationWeeks / 2)),
    duration: phase.durationWeeks,
    status: phase.status,
  })), [plan?.phases]);

  const criticalCount = useMemo(
    () => (plan?.phases ?? []).filter((phase) => phase.durationWeeks >= 4).length,
    [plan?.phases]
  );
  const milestoneCount = useMemo(
    () => (plan?.phases ?? []).reduce((sum, phase) => sum + (phase.milestones?.length ?? 0), 0),
    [plan?.phases]
  );
  const completedCount = useMemo(
    () => (plan?.phases ?? []).filter((phase) => phase.status === 'completed').length,
    [plan?.phases]
  );
  if (!result?.projectPlan) return (
    <div className="p-6 text-sm text-center mt-20" style={{ color: PC.muted }}>
      Upload a document to see the project plan
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" style={{ background: PC.bg }}>

      {/* ── KPI Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Duration',   value: `${totalWeeks}w`,              color: PC.inprog },
          { label: 'Total Phases',     value: String(plan!.phases.length),   color: PC.completed },
          { label: 'Total Milestones', value: String(milestoneCount),        color: '#a56eff' },
          { label: 'Critical Phases',  value: String(criticalCount),         color: PC.delayed },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border p-5"
            style={{ borderColor: PC.border, borderBottom: `3px solid ${m.color}` }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: PC.muted }}>{m.label}</div>
            <div className="kpi-value" style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Milestone KPI Graph ─────────────────────────── */}
      {(() => {
        interface MilestoneLineDatum {
          phase:      string;     // short X-axis label
          fullName:   string;     // full phase name for tooltip
          count:      number;     // milestone count (Y value)
          weeks:      string;     // "W1–W3"
          color:      string;     // phase colour
          milestones: string[];   // full list for tooltip
          status:     string;
        }

        const lineData: MilestoneLineDatum[] = plan!.phases.map((phase, idx) => ({
          phase:      phase.name.length > 11 ? phase.name.slice(0, 11) + '…' : phase.name,
          fullName:   phase.name,
          count:      (phase.milestones ?? []).length,
          weeks:      `W${phase.startWeek}–W${phase.endWeek}`,
          color:      PC.phases[idx % PC.phases.length],
          milestones: phase.milestones ?? [],
          status:     phase.status,
        }));

        const yMax = Math.max(...lineData.map(d => d.count), 2);

        // Custom tooltip — rich card showing each milestone name (unchanged)
        const MilestoneTooltip = ({ active, payload }: {
          active?: boolean;
          payload?: Array<{ payload: MilestoneLineDatum }>;
        }) => {
          if (!active || !payload?.length) return null;
          const d = payload[0].payload;
          return (
            <div style={{
              background: '#fff',
              border: `2px solid ${d.color}`,
              borderRadius: 10,
              padding: '12px 16px',
              boxShadow: '0 6px 24px rgba(0,0,0,0.13)',
              minWidth: 220,
              maxWidth: 300,
            }}>
              {/* Phase header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: PC.text }}>{d.fullName}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: d.color, fontWeight: 600 }}>{d.weeks}</span>
              </div>
              {/* Summary row */}
              <div style={{
                display: 'flex', gap: 8, marginBottom: 10,
                paddingBottom: 8, borderBottom: `1px solid ${PC.border}`,
              }}>
                <span style={{
                  background: `${d.color}18`, color: d.color,
                  borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                }}>
                  {d.count} milestone{d.count !== 1 ? 's' : ''}
                </span>
                <span style={{
                  background: d.status === 'completed' ? `${PC.completed}18`
                    : d.status === 'in-progress' ? `${PC.inprog}18` : `${PC.notstart}18`,
                  color: d.status === 'completed' ? PC.completed
                    : d.status === 'in-progress' ? PC.inprog : PC.notstart,
                  borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                }}>
                  {d.status === 'completed' ? 'Completed' : d.status === 'in-progress' ? 'In Progress' : 'Not Started'}
                </span>
              </div>
              {/* Milestone list */}
              {d.milestones.length === 0
                ? <div style={{ fontSize: 12, color: PC.muted, fontStyle: 'italic' }}>No milestones defined</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {d.milestones.map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12 }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%',
                          background: d.color, flexShrink: 0, marginTop: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Check size={9} color="#fff" strokeWidth={3} />
                        </div>
                        <span style={{ color: PC.text, lineHeight: 1.4 }}>{m}</span>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          );
        };

        return (
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: PC.border }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Flag size={15} style={{ color: '#a56eff' }} />
                <span className="font-semibold" style={{ fontSize: 15, color: PC.text }}>Milestone KPI</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: '#a56eff18', color: '#a56eff' }}>
                  {milestoneCount} total
                </span>
              </div>
              <span className="text-[11px]" style={{ color: PC.muted }}>
                Hover a point to see each milestone · use +/− to adjust count
              </span>
            </div>
            <p className="text-[11px] mb-4" style={{ color: PC.muted }}>
              Each point = milestone count for that phase. Tooltip lists every milestone name and phase status.
            </p>

            {/* Line chart */}
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData} margin={{ left: -10, right: 24, bottom: 10, top: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={PC.border} vertical={false} />
                <XAxis
                  dataKey="phase"
                  tick={{ fontSize: 11, fill: PC.muted }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, yMax + 1]}
                  tick={{ fontSize: 10, fill: PC.muted }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Milestones', angle: -90, position: 'insideLeft', style: { fill: PC.muted, fontSize: 10 } }}
                />
                <Tooltip content={<MilestoneTooltip />} cursor={{ stroke: '#a56eff', strokeWidth: 1, strokeDasharray: '4 3' }} />
                {/* Single gradient line */}
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#a56eff"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={false}
                />
                {/* One coloured dot + count label per phase point */}
                {lineData.map((d, i) => (
                  <ReferenceDot
                    key={i}
                    x={d.phase}
                    y={d.count}
                    r={7}
                    fill={d.color}
                    stroke="#fff"
                    strokeWidth={2}
                    label={{
                      value: String(d.count),
                      position: 'top',
                      style: { fontSize: 11, fontWeight: 700, fill: d.color },
                      offset: 8,
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {/* Phase chips with +/− add-remove controls */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: PC.border }}>
              {lineData.map((d, idx) => {
                const phase = plan!.phases[idx];
                return (
                  <div key={idx} className="flex items-center gap-1 text-[11px] font-medium"
                    style={{
                      background: `${d.color}12`,
                      border: `1px solid ${d.color}30`,
                      borderRadius: 999,
                      padding: '3px 4px 3px 10px',
                      color: PC.text,
                    }}>
                    {/* Colour dot */}
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    {/* Phase name */}
                    <span className="mx-1">{d.fullName}</span>
                    {/* Count badge */}
                    <span style={{ fontWeight: 700, color: d.color }}>{d.count}</span>
                    {/* Remove last milestone */}
                    <button
                      title="Remove last milestone"
                      disabled={d.count === 0}
                      onClick={() => {
                        const updated = (phase.milestones ?? []).slice(0, -1);
                        update(phase.id, { milestones: updated });
                      }}
                      style={{
                        marginLeft: 4,
                        width: 18, height: 18, borderRadius: '50%',
                        background: d.count === 0 ? '#F1F5F9' : `${d.color}20`,
                        color: d.count === 0 ? PC.notstart : d.color,
                        border: `1px solid ${d.count === 0 ? PC.border : d.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: d.count === 0 ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <Minus size={9} strokeWidth={2.5} />
                    </button>
                    {/* Add new milestone */}
                    <button
                      title={`Add milestone to ${d.fullName}`}
                      onClick={() => {
                        const label = `Milestone ${d.count + 1}`;
                        update(phase.id, { milestones: [...(phase.milestones ?? []), label] });
                      }}
                      style={{
                        marginLeft: 2,
                        width: 18, height: 18, borderRadius: '50%',
                        background: `${d.color}20`,
                        color: d.color,
                        border: `1px solid ${d.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <Plus size={9} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Action bar */}
      <div className="flex justify-end">
        <button onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
          style={{ background: PC.inprog }}>
          <Plus size={14} /> Add Phase
        </button>
      </div>

      {showAddForm && <AddPhaseForm onAdd={handleAddPhase} onCancel={() => setShowAddForm(false)} />}

      {/* ── Gantt Timeline ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border p-5 overflow-x-auto" style={{ borderColor: PC.border }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold" style={{ fontSize: 16, color: PC.text }}>Timeline Overview</h3>
          <div className="flex items-center gap-4 text-xs" style={{ color: PC.muted }}>
            <span style={{ color: PC.delayed }}>● Critical Milestone</span>
            <span style={{ color: PC.inprog }}>◆ Milestone</span>
            <span>Drag bars · Drag edges to resize</span>
          </div>
        </div>
        <div className="min-w-[700px]">
          {/* Ruler */}
          <div className="flex mb-3">
            <div className="w-48 shrink-0" />
            <div className="flex-1 flex">
              {Array.from({ length: Math.ceil(totalWeeks / 4) + 1 }, (_, i) => (
                <div key={i} className="flex-1 text-[10px] text-center border-l"
                  style={{ minWidth: 28, color: PC.muted, borderColor: PC.border }}>
                  W{i * 4 + 1}
                </div>
              ))}
            </div>
          </div>
          {/* Phase rows */}
          {plan!.phases.map((phase, idx) => {
            const color = PC.phases[idx % PC.phases.length];
            return (
              <div key={phase.id} className="flex items-center mb-2 gap-2 group">
                <div className="w-48 shrink-0 pr-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 rounded-sm flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs font-semibold truncate" style={{ color: PC.text }}>{phase.name}</span>
                  </div>
                  <button onClick={() => handleRemovePhase(phase.id)}
                    className="opacity-0 group-hover:opacity-100 transition-all ml-1 flex-shrink-0">
                    <Trash2 size={11} style={{ color: PC.delayed }} />
                  </button>
                </div>
                <GanttBar phase={phase} totalWeeks={totalWeeks} color={color}
                  onUpdate={(u) => update(phase.id, u)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Phase Details with status pills ────────────── */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: PC.border }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: PC.border }}>
          <div>
            <h3 className="font-semibold" style={{ fontSize: 16, color: PC.text }}>Phase Details</h3>
            <p className="text-xs mt-0.5" style={{ color: PC.muted }}>
              Click the <strong style={{ color: PC.inprog }}>Status</strong> pill on any row to cycle:
              <span style={{ color: PC.notstart }}> Not Started</span> →
              <span style={{ color: PC.inprog }}> In Progress</span> →
              <span style={{ color: PC.completed }}> Completed</span>.
              Progress % and the count above update immediately.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: `${PC.completed}15`, color: PC.completed }}>
            {completedCount}/{plan!.phases.length} completed
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', color: PC.muted, fontSize: 11 }}>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider" style={{ color: PC.muted }}>Phase</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: PC.muted }}>Weeks</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: PC.muted }}>Duration</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider" style={{ color: PC.muted }}>Owner</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: PC.muted }}>Status</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider" style={{ color: PC.muted }}>Progress</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider" style={{ color: PC.muted }}>
                  <HoverTooltip text="Enter a clear, concise description of the task or deliverable. Include scope boundaries, key actions, and expected output to help stakeholders understand the work involved.">
                    <span>Description</span>
                    <Info size={11} style={{ color: PC.muted, flexShrink: 0 }} />
                  </HoverTooltip>
                </th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ color: PC.muted }}>Del</th>
              </tr>
            </thead>
            <tbody>
              {plan!.phases.map((phase, idx) => {
                const color      = PC.phases[idx % PC.phases.length];
                const isExpanded = editingPhaseId === phase.id;
                const pct        = statusPct(phase.status as PhaseStatus);
                const sColor     = statusColor(phase.status as PhaseStatus);
                return (
                  <React.Fragment key={phase.id}>
                    <tr className="border-t hover:bg-gray-50/40 transition-colors" style={{ borderColor: PC.border }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
                          {/* Phase name — explicit dark text to ensure visibility */}
                          <span style={{ color: PC.text, fontSize: 13, fontWeight: 600 }}>
                            <EditCell value={phase.name} onSave={(v) => update(phase.id, { name: v })} />
                          </span>
                          {(phase.milestones?.length ?? 0) > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded text-white ml-1" style={{ background: PC.inprog }}>
                              {phase.milestones?.length}ms
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="kpi-value" style={{ fontSize: 12, color: color }}>W{phase.startWeek}–W{phase.endWeek}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-xs px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
                          {phase.durationWeeks}w
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: PC.muted }}>
                        <EditCell value={phase.owner ?? 'Unassigned'} onSave={(v) => update(phase.id, { owner: v })} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {/* Clickable status pill — cycles Not Started → In Progress → Completed */}
                        <button
                          title="Click to change status: Not Started → In Progress → Completed"
                          onClick={() => {
                            const next: PhaseStatus =
                              phase.status === 'not-started' ? 'in-progress'
                              : phase.status === 'in-progress' ? 'completed'
                              : 'not-started';
                            update(phase.id, { status: next });
                          }}
                          className="text-[11px] font-semibold px-2 py-1 rounded-full transition-all hover:opacity-80 cursor-pointer"
                          style={{ background: `${sColor}22`, color: sColor, border: `1px solid ${sColor}44` }}>
                          {statusLabel(phase.status as PhaseStatus)}
                        </button>
                      </td>
                      <td className="px-4 py-3" style={{ minWidth: 120 }}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: PC.border }}>
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: sColor }} />
                          </div>
                          <span className="kpi-value text-xs" style={{ color: sColor }}>{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[180px] truncate" style={{ color: PC.muted }}>
                        <EditCell value={phase.description ?? ''} onSave={(v) => update(phase.id, { description: v })} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {phase.responsibleRoles.length > 0 && (
                            <button onClick={() => setEditingPhaseId(isExpanded ? null : phase.id)}
                              className="text-xs underline" style={{ color: PC.muted }}>
                              {isExpanded ? '▲' : `▼ ${phase.responsibleRoles.length}`}
                            </button>
                          )}
                          <button onClick={() => handleRemovePhase(phase.id)}>
                            <Trash2 size={13} style={{ color: PC.delayed }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-dashed" style={{ borderColor: `${T.gold}50`, background: `${T.gold}06` }}>
                        <td colSpan={8} className="px-5 py-3">
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <div className="font-bold uppercase tracking-wider text-[10px] mb-1" style={{ color: PC.muted }}>Roles</div>
                              <div className="flex flex-wrap gap-1">
                                {phase.responsibleRoles.map((r) => (
                                  <span key={r} className="px-2 py-0.5 rounded-full text-[10px]"
                                    style={{ background: `${PC.inprog}18`, color: PC.inprog }}>{r}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="font-bold uppercase tracking-wider text-[10px] mb-1" style={{ color: PC.muted }}>Deliverables</div>
                              <div className="flex flex-wrap gap-1">
                                {phase.deliverables.map((d) => (
                                  <span key={d} className="px-2 py-0.5 rounded-full text-[10px]"
                                    style={{ background: '#F1F5F9', color: PC.muted }}>{d}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="font-bold uppercase tracking-wider text-[10px] mb-1" style={{ color: PC.muted }}>Milestones</div>
                              <div className="flex flex-wrap gap-1">
                                {(phase.milestones ?? []).map((m) => (
                                  <span key={m} className="px-2 py-0.5 rounded-full text-[10px]"
                                    style={{ background: `${PC.completed}18`, color: PC.completed }}>✓ {m}</span>
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

      {/* ── Resource Allocation Chart — per phase, from Phase Details ──── */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: PC.border }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold" style={{ fontSize: 16, color: PC.text }}>Resource Allocation by Phase</h3>
          <span className="text-xs" style={{ color: PC.muted }}>
            Reads from Phase Details above — add/edit phases to update this chart
          </span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={resData} margin={{ left: -10, right: 10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={PC.border} vertical={false} />
            <XAxis dataKey="phase" tick={{ fontSize: 10, fill: PC.muted }} axisLine={false} tickLine={false}
              interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11, fill: PC.muted }} axisLine={false} tickLine={false}
              label={{ value: 'Resources', angle: -90, position: 'insideLeft', style: { fill: PC.muted, fontSize: 10 }, offset: 10 }} />
            <Tooltip content={<CustomTooltip />} wrapperStyle={tooltipWrapperStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="roles" name="Allocated Resources" radius={[5, 5, 0, 0]}>
              {resData.map((entry, i) => (
                <Cell key={i} fill={
                  entry.status === 'completed'   ? PC.completed :
                  entry.status === 'in-progress' ? PC.inprog    : PC.phases[i % PC.phases.length]
                } />
              ))}
            </Bar>
            <Bar dataKey="duration" name="Duration (weeks)" fill={`${PC.phases[2]}55`} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
