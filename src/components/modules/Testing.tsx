'use client';
// Testing — KPI cards + QA Hours bar + coverage gauge
import React, { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil, Check, X } from 'lucide-react';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { T } from '@/lib/theme';
import { v4 as uuid } from 'uuid';
import type { IBMBand, TestSection } from '@/types';

// ── Color constants ───────────────────────────────────────────
const TEST_TYPES = ['Unit', 'Integration', 'UAT', 'Performance', 'Security', 'Regression'] as const;
const IBM_BANDS: IBMBand[] = ['6A', '6B', '6G', '7A', '7B', '8', '9', '10', 'Executive', 'D'];

const TYPE_COLORS: Record<string, string> = {
  Unit: '#0f62fe', Integration: '#08bdba', UAT: '#42be65',
  Performance: '#ff832b', Security: '#da1e28', Regression: '#a56eff',
};

const tooltipStyle = {
  backgroundColor: '#1e2030',
  border: '1px solid #2a2d3e',
  borderRadius: 10,
  color: '#f4f4f4',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
};

// ── Coverage SVG Gauge ────────────────────────────────────────
function CoverageGauge({ pct }: { pct: number }) {
  const r     = 80;
  const cx    = 110;
  const cy    = 110;
  const total = Math.PI * r;                    // half-circle circumference
  const fill  = (pct / 100) * total;
  const color = pct >= 80 ? '#42be65' : pct >= 60 ? '#f1c21b' : '#da1e28';

  return (
    <svg width={220} height={130} viewBox="0 0 220 130">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#E2E8F0" strokeWidth={14} strokeLinecap="round"
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
          style={{ borderColor: T.gold, color: T.navy }} />
        <button onClick={commit}><Check size={11} className="text-green-600" /></button>
        <button onClick={() => setEditing(false)}><X size={11} className="text-gray-400" /></button>
      </span>
    );
  }
  return (
    <button onClick={() => { setDraft(String(hours)); setEditing(true); }}
      className="inline-flex items-center gap-1 group">
      <span className="text-xs font-semibold" style={{ color: T.gold }}>{hours}h</span>
      <Pencil size={9} className="opacity-0 group-hover:opacity-100" style={{ color: T.gold }} />
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
      <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider flex items-center gap-1">
        <span style={{ color: accentColor }}>●</span> {label}
      </div>
      <ul className="space-y-1.5">
        {criteria.map((c, i) => (
          <li key={i} className="flex items-start gap-1.5 group">
            <span className="mt-0.5 shrink-0 text-[11px]" style={{ color: accentColor }}>✓</span>
            <input value={c}
              onChange={(e) => updateTestCriteria(docId, sectionId, type, i, e.target.value)}
              placeholder="Enter criterion…"
              className="flex-1 text-xs text-gray-700 bg-transparent outline-none border-b border-transparent focus:border-gray-300 transition-colors"
            />
            <button onClick={() => removeTestCriterion(docId, sectionId, type, i)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0">
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
    <div className="p-6 text-sm text-center mt-20" style={{ color: T.textMuted }}>
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

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>Testing Strategy</div>
          <div style={{ fontSize: 13, color: T.textMuted }}>
            {strategy.sections.length} test types · {strategy.totalQAHours.toLocaleString()} QA hours
          </div>
        </div>
        <span className="mt-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: '#08bdba' }}>
          {strategy.automationCoverage}% Automation
        </span>
      </div>

      {/* ── KPI Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total QA Hours',     value: strategy.totalQAHours.toLocaleString() + 'h', color: '#0f62fe' },
          { label: 'Automation Coverage',value: `${strategy.automationCoverage}%`,             color: '#42be65' },
          { label: 'QA Cost Estimate',
            value: `$${Math.round(strategy.totalQAHours * 75 / 1000)}K`,                       color: '#a56eff' },
          { label: 'Test Types',         value: String(strategy.sections.length),              color: '#ff832b' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border p-5"
            style={{ borderColor: T.border, borderBottom: `3px solid ${m.color}` }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>{m.label}</div>
            <div className="kpi-value" style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row 1: QA Hours Bar + Coverage Radar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QA Hours by Phase bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 20 }}>QA Hours by Phase</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={strategy.sections.map(s => ({
              name: s.type,
              Hours: s.estimatedHours,
            }))} barSize={36} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f4f4f4' }} />
              <Bar dataKey="Hours" radius={[6, 6, 0, 0]}>
                {strategy.sections.map((s, i) => (
                  <Cell key={s.id} fill={TYPE_COLORS[s.type] ?? T.slate} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Coverage Gauge */}
        <div className="bg-white rounded-2xl border p-5 flex flex-col items-center justify-center" style={{ borderColor: T.border }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 12 }}>Coverage Readiness</h3>
          <CoverageGauge pct={strategy.automationCoverage} />
          <div className="mt-4 w-full space-y-2">
            {activeSections.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[s.type] ?? T.slate }} />
                <span style={{ color: T.textSecondary, flex: 1 }}>{s.type}</span>
                <span className="kpi-value font-semibold" style={{ color: TYPE_COLORS[s.type] ?? T.slate }}>
                  {Math.min(100, Math.round(strategy.automationCoverage + (Math.random() * 10 - 5)))}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Action bar + Add form ───────────────────────── */}
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90"
          style={{ background: T.navy }}>
          <Plus size={14} /> Add Test Type
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: T.gold }}>
          <div className="text-sm font-bold" style={{ color: T.navy }}>Add Test Type</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select value={newSection.type}
              onChange={(e) => setNewSection({ ...newSection, type: e.target.value as TestSection['type'] })}
              className="border rounded-lg px-3 py-1.5 text-sm outline-none" style={{ borderColor: T.border }}>
              {TEST_TYPES.map((t) => <option key={t} value={t}>{t} Testing</option>)}
            </select>
            <input placeholder="Scope description" value={newSection.scope ?? ''}
              onChange={(e) => setNewSection({ ...newSection, scope: e.target.value })}
              className="col-span-2 border rounded-lg px-3 py-1.5 text-sm outline-none" style={{ borderColor: T.border }} />
            <input type="number" placeholder="Est. Hours" value={newSection.estimatedHours ?? ''}
              onChange={(e) => setNewSection({ ...newSection, estimatedHours: Number(e.target.value) })}
              className="border rounded-lg px-3 py-1.5 text-sm outline-none" style={{ borderColor: T.border }} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-sm border rounded-lg" style={{ borderColor: T.border, color: T.textMuted }}>Cancel</button>
            <button onClick={handleAdd}
              className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg" style={{ background: T.navy }}>Add</button>
          </div>
        </div>
      )}

      {/* ── Test sections ───────────────────────────────── */}
      <div className="space-y-4">
        {strategy.sections.map((section) => {
          const color = TYPE_COLORS[section.type] ?? T.slate;
          return (
            <div key={section.id}
              className={`bg-white rounded-2xl border p-5 transition-all ${section.enabled ? '' : 'opacity-60'}`}
              style={{ borderColor: section.enabled ? color + '60' : T.border, borderLeft: `4px solid ${color}` }}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: color }}>
                    {section.type} Testing
                  </div>
                  <span className="text-xs" style={{ color: T.textMuted }}>Band {section.responsibleBand}</span>
                  {activeDocumentId && (
                    <HoursCell sectionId={section.id} docId={activeDocumentId} hours={section.estimatedHours} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => activeDocumentId && toggleTestSection(activeDocumentId, section.id, !section.enabled)}
                    className="transition-colors" style={{ color: section.enabled ? T.gold : '#ccc' }}>
                    {section.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button onClick={() => activeDocumentId && removeTestSection(activeDocumentId, section.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm mb-4" style={{ color: T.textSecondary }}>{section.scope}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Tools</div>
                  <div className="flex flex-wrap gap-1">
                    {section.tools.map((tool) => (
                      <span key={tool} className="text-[10px] px-2 py-0.5 rounded-full border"
                        style={{ background: `${color}15`, color, borderColor: `${color}40` }}>
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
                {activeDocumentId && (
                  <CriteriaList sectionId={section.id} docId={activeDocumentId}
                    type="entry" criteria={section.entryCriteria}
                    label="Entry Criteria" accentColor="#42be65" />
                )}
                {activeDocumentId && (
                  <CriteriaList sectionId={section.id} docId={activeDocumentId}
                    type="exit" criteria={section.exitCriteria}
                    label="Exit Criteria" accentColor={T.slate} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
