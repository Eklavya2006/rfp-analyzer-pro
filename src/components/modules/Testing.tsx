'use client';
// Testing — Dark glassmorphism · KPI cards + QA Hours bar + coverage gauge
import React, { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil, Check, X } from 'lucide-react';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import type { IBMBand, TestSection } from '@/types';

// ── Dark palette ──────────────────────────────────────────────
const GLASS  = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';
const INDIGO = '#6366F1';

const TEST_TYPES = ['Unit', 'Integration', 'UAT', 'Performance', 'Security', 'Regression'] as const;
const IBM_BANDS: IBMBand[] = ['6A', '6B', '6G', '7A', '7B', '8', '9', '10', 'Executive', 'D'];

const TYPE_COLORS: Record<string, string> = {
  Unit: '#6366F1', Integration: '#06B6D4', UAT: '#10B981',
  Performance: '#F59E0B', Security: '#F43F5E', Regression: '#8B5CF6',
};

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
const tooltipLabelStyle   = { color: '#F1F5F9', fontWeight: 700, marginBottom: 4, fontSize: 13 };
const tooltipItemStyle    = { color: '#F1F5F9', fontSize: 13 };

// ── Coverage SVG Gauge ────────────────────────────────────────
function CoverageGauge({ pct }: { pct: number }) {
  const r     = 80;
  const cx    = 110;
  const cy    = 110;
  const total = Math.PI * r;                    // half-circle circumference
  const fill  = (pct / 100) * total;
  const color = pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#F43F5E';

  return (
    <svg width={220} height={130} viewBox="0 0 220 130">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={14} strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth={14} strokeLinecap="round"
        strokeDasharray={`${fill} ${total}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      {/* Center text */}
      <text x={cx} y={cy - 10} textAnchor="middle" className="kpi-value"
        style={{ fontSize: 28, fontWeight: 700, fill: color, fontFamily: 'var(--font-mono)' }}>
        {pct}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle"
        style={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'var(--font-sans)' }}>
        Coverage
      </text>
    </svg>
  );
}

// ── Editable hours cell ───────────────────────────────────────
function HoursCell({ sectionId, docId, hours }: { sectionId: string; docId: string; hours: number }) {
  const { updateTestHours } = useRFPStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(hours));
  const commit = () => { const n = Math.max(0, parseInt(draft, 10) || 0); updateTestHours(docId, sectionId, n); setEditing(false); };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input autoFocus type="number" min={0} value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-20 text-center text-xs border-b-2 outline-none bg-transparent font-semibold"
          style={{ borderColor: '#F59E0B', color: '#F1F5F9' }} />
        <button onClick={commit}><Check size={11} style={{ color: '#10B981' }} /></button>
        <button onClick={() => setEditing(false)}><X size={11} style={{ color: '#94A3B8' }} /></button>
      </span>
    );
  }
  return (
    <button onClick={() => { setDraft(String(hours)); setEditing(true); }}
      className="inline-flex items-center gap-1 group">
      <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>{hours}h</span>
      <Pencil size={9} className="opacity-0 group-hover:opacity-100" style={{ color: '#F59E0B' }} />
    </button>
  );
}

// ── Criteria List ─────────────────────────────────────────────
interface CriteriaListProps {
  sectionId: string; docId: string; type: 'entry' | 'exit';
  criteria: string[]; label: string; accentColor: string;
}
function CriteriaList({ sectionId, docId, type, criteria, label, accentColor }: CriteriaListProps) {
  const { updateTestCriteria, addTestCriterion, removeTestCriterion } = useRFPStore();
  return (
    <div>
      <div className="text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-1" style={{ color: '#475569' }}>
        <span style={{ color: accentColor }}>●</span> {label}
      </div>
      <ul className="space-y-1.5">
        {criteria.map((c, i) => (
          <li key={i} className="flex items-start gap-1.5 group">
            <span className="mt-0.5 shrink-0 text-[11px]" style={{ color: accentColor }}>✓</span>
            <input value={c}
              onChange={(e) => updateTestCriteria(docId, sectionId, type, i, e.target.value)}
              placeholder="Enter criterion…"
              className="flex-1 text-xs bg-transparent outline-none transition-colors"
              style={{ color: '#94A3B8', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}
            />
            <button onClick={() => removeTestCriterion(docId, sectionId, type, i)}
              className="opacity-0 group-hover:opacity-100 transition-all shrink-0"
              style={{ color: '#475569' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F43F5E')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}>
              <Trash2 size={11} />
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => addTestCriterion(docId, sectionId, type)}
        className="mt-2 flex items-center gap-1 text-[10px] font-semibold hover:opacity-80"
        style={{ color: accentColor }}>
        <Plus size={10} /> Add Criterion
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function TestingModule() {
  const { activeDocumentId, analysisResults, toggleTestSection, addTestSection, removeTestSection } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [showAdd, setShowAdd] = useState(false);
  const [newSection, setNewSection] = useState<Partial<TestSection>>({
    type: 'Unit', scope: '', estimatedHours: 100, responsibleBand: '7A', enabled: true,
  });

  if (!result?.testingStrategy) return (
    <div className="p-6 text-sm text-center mt-20" style={{ color: '#475569' }}>
      Upload a document to see the testing strategy
    </div>
  );

  const strategy       = result.testingStrategy;
  const activeSections = strategy.sections.filter((s) => s.enabled);

  const handleAdd = () => {
    if (!activeDocumentId) return;
    const section: TestSection = {
      id: uuid(),
      type: (newSection.type ?? 'Unit') as TestSection['type'],
      scope: newSection.scope ?? 'New test scope',
      entryCriteria: ['Stable build available'],
      exitCriteria:  ['All test cases executed'],
      tools: ['TBD'],
      estimatedHours:  newSection.estimatedHours ?? 100,
      responsibleBand: newSection.responsibleBand ?? '7A',
      enabled: true,
    };
    addTestSection(activeDocumentId, section);
    setShowAdd(false);
    setNewSection({ type: 'Unit', scope: '', estimatedHours: 100, responsibleBand: '7A', enabled: true });
  };

  // ── Chart data ───────────────────────────────────────────────
  const totalCases    = strategy.sections.reduce((s, sec) => s + Math.round(sec.estimatedHours * 1.2), 0);
  const passRate      = Math.min(99, Math.round(strategy.automationCoverage * 0.95));
  const failedTests   = Math.max(1, Math.round(totalCases * (1 - passRate / 100) * 0.6));
  const pendingReview = Math.max(1, Math.round(totalCases * 0.05));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>Testing Strategy</div>
          <div style={{ fontSize: 13, color: '#64748B' }}>
            {strategy.sections.length} test types · {strategy.totalQAHours.toLocaleString()} QA hours
          </div>
        </div>
        <span className="mt-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
          style={{ background: 'rgba(6,182,212,0.2)', color: '#22D3EE', border: '1px solid rgba(6,182,212,0.3)' }}>
          {strategy.automationCoverage}% Automation
        </span>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total QA Hours',      value: strategy.totalQAHours.toLocaleString() + 'h', color: '#6366F1' },
          { label: 'Automation Coverage', value: `${strategy.automationCoverage}%`,             color: '#10B981' },
          { label: 'QA Cost Estimate',    value: `$${Math.round(strategy.totalQAHours * 75 / 1000)}K`, color: '#8B5CF6' },
          { label: 'Test Types',          value: String(strategy.sections.length),              color: '#F59E0B' },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl p-5"
            style={{ background: GLASS, border: `1px solid ${BORDER}`, borderBottom: `3px solid ${m.color}` }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>{m.label}</div>
            <div className="kpi-value" style={{ fontSize: 26, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F1F5F9', marginBottom: 18 }}>QA Hours by Phase</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={strategy.sections.map(s => ({ name: s.type, Hours: s.estimatedHours }))}
              barSize={36} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle}
                labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              <Bar dataKey="Hours" radius={[6, 6, 0, 0]}>
                {strategy.sections.map((s) => (
                  <Cell key={s.id} fill={TYPE_COLORS[s.type] ?? INDIGO} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5 flex flex-col items-center justify-center" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F1F5F9', marginBottom: 12 }}>Coverage Readiness</h3>
          <CoverageGauge pct={strategy.automationCoverage} />
          <div className="mt-4 w-full space-y-2">
            {activeSections.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[s.type] ?? INDIGO }} />
                <span style={{ color: '#94A3B8', flex: 1 }}>{s.type}</span>
                <span className="kpi-value font-semibold" style={{ color: TYPE_COLORS[s.type] ?? INDIGO }}>
                  {Math.min(100, Math.round(strategy.automationCoverage + (Math.random() * 10 - 5)))}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Action bar + Add form ── */}
      <div className="flex items-center justify-between gap-3">
        <div style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>Test Types & Criteria</div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all duration-200"
          style={{ background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)`, boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}>
          <Plus size={14} /> Add Test Criteria
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: GLASS, border: '2px solid rgba(245,158,11,0.35)' }}>
          <div className="text-sm font-bold" style={{ color: '#F1F5F9' }}>Add Test Type</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select value={newSection.type}
              onChange={(e) => setNewSection({ ...newSection, type: e.target.value as TestSection['type'] })}
              className="rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`, color: '#F1F5F9' }}>
              {TEST_TYPES.map((t) => <option key={t} value={t}>{t} Testing</option>)}
            </select>
            <input placeholder="Scope description" value={newSection.scope ?? ''}
              onChange={(e) => setNewSection({ ...newSection, scope: e.target.value })}
              className="col-span-2 rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`, color: '#F1F5F9' }} />
            <input type="number" placeholder="Est. Hours" value={newSection.estimatedHours ?? ''}
              onChange={(e) => setNewSection({ ...newSection, estimatedHours: Number(e.target.value) })}
              className="rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`, color: '#F1F5F9' }} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-sm rounded-lg"
              style={{ border: `1px solid ${BORDER}`, color: '#94A3B8' }}>Cancel</button>
            <button onClick={handleAdd}
              className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg"
              style={{ background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)` }}>Add</button>
          </div>
        </div>
      )}

      {/* ── Test sections ── */}
      {strategy.sections.length === 0 && (
        <div className="rounded-2xl p-10 text-center" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧪</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#F1F5F9', marginBottom: 6 }}>No test criteria added yet</div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>Click "Add Test Criteria" above to define your first test type and entry/exit criteria.</div>
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)` }}>
            <Plus size={14} /> Add Test Criteria
          </button>
        </div>
      )}
      <div className="space-y-4">
        {strategy.sections.map((section) => {
          const color = TYPE_COLORS[section.type] ?? INDIGO;
          return (
            <div key={section.id}
              className={`rounded-2xl p-5 transition-all ${section.enabled ? '' : 'opacity-60'}`}
              style={{
                background: GLASS,
                border: `1px solid ${section.enabled ? color + '50' : BORDER}`,
                borderLeft: `4px solid ${color}`,
              }}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: color }}>
                    {section.type} Testing
                  </div>
                  <span className="text-xs" style={{ color: '#64748B' }}>Band {section.responsibleBand}</span>
                  {activeDocumentId && (
                    <HoursCell sectionId={section.id} docId={activeDocumentId} hours={section.estimatedHours} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => activeDocumentId && toggleTestSection(activeDocumentId, section.id, !section.enabled)}
                    className="transition-colors"
                    style={{ color: section.enabled ? '#F59E0B' : '#475569' }}>
                    {section.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button onClick={() => activeDocumentId && removeTestSection(activeDocumentId, section.id)}
                    title="Remove Test Criteria"
                    className="flex items-center gap-1 text-xs transition-colors"
                    style={{ color: '#475569' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#F43F5E')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}>
                    <Trash2 size={14} />
                    <span className="hidden sm:inline" style={{ color: 'inherit', fontSize: 10 }}>Remove</span>
                  </button>
                </div>
              </div>
              <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>{section.scope}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#475569' }}>Tools</div>
                  <div className="flex flex-wrap gap-1">
                    {section.tools.map((tool) => (
                      <span key={tool} className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
                {activeDocumentId && (
                  <CriteriaList sectionId={section.id} docId={activeDocumentId}
                    type="entry" criteria={section.entryCriteria}
                    label="Entry Criteria" accentColor="#10B981" />
                )}
                {activeDocumentId && (
                  <CriteriaList sectionId={section.id} docId={activeDocumentId}
                    type="exit" criteria={section.exitCriteria}
                    label="Exit Criteria" accentColor={INDIGO} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
