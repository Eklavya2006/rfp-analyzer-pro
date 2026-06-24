'use client';
// ============================================================
// Testing — S6: Fully editable Entry/Exit criteria with add/delete
// ============================================================
import React, { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import type { IBMBand, TestSection } from '@/types';

const ACCENT = '#1E3A5F';
const TEAL   = '#0D7377';

const TEST_TYPES = ['Unit', 'Integration', 'UAT', 'Performance', 'Security', 'Regression'] as const;
const IBM_BANDS: IBMBand[] = ['6A', '6B', '6G', '7A', '7B', '8', '9', '10', 'Executive', 'D'];

const TYPE_COLORS: Record<string, string> = {
  Unit: ACCENT, Integration: TEAL, UAT: '#198038',
  Performance: '#b45309', Security: '#da1e28', Regression: '#7c3aed',
};

// ── Editable criteria list ────────────────────────────────────
interface CriteriaListProps {
  sectionId: string;
  docId: string;
  type: 'entry' | 'exit';
  criteria: string[];
  label: string;
  accentColor: string;
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
            <input
              value={c}
              onChange={(e) => updateTestCriteria(docId, sectionId, type, i, e.target.value)}
              placeholder="Enter criterion…"
              className="flex-1 text-xs text-gray-700 bg-transparent outline-none border-b border-transparent focus:border-gray-300 transition-colors"
            />
            <button
              onClick={() => removeTestCriterion(docId, sectionId, type, i)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0"
            >
              <Trash2 size={11} />
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => addTestCriterion(docId, sectionId, type)}
        className="mt-2 flex items-center gap-1 text-[10px] font-semibold transition-colors hover:opacity-80"
        style={{ color: accentColor }}
      >
        <Plus size={10} /> Add Criterion
      </button>
    </div>
  );
}

export default function TestingModule() {
  const { activeDocumentId, analysisResults, toggleTestSection, addTestSection, removeTestSection } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [showAdd, setShowAdd] = useState(false);
  const [newSection, setNewSection] = useState<Partial<TestSection>>({
    type: 'Unit', scope: '', estimatedHours: 100, responsibleBand: '7A', enabled: true,
  });

  if (!result?.testingStrategy) return (
    <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document to see the testing strategy</div>
  );

  const strategy = result.testingStrategy;
  const activeSections = strategy.sections.filter((s) => s.enabled);

  const handleAdd = () => {
    if (!activeDocumentId) return;
    const section: TestSection = {
      id: uuid(),
      type: (newSection.type ?? 'Unit') as TestSection['type'],
      scope: newSection.scope ?? 'New test scope',
      entryCriteria: ['Stable build available'],
      exitCriteria: ['All test cases executed'],
      tools: ['TBD'],
      estimatedHours: newSection.estimatedHours ?? 100,
      responsibleBand: newSection.responsibleBand ?? '7A',
      enabled: true,
    };
    addTestSection(activeDocumentId, section);
    setShowAdd(false);
    setNewSection({ type: 'Unit', scope: '', estimatedHours: 100, responsibleBand: '7A', enabled: true });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Test Types', value: String(strategy.sections.length) },
          { label: 'Active', value: String(activeSections.length) },
          { label: 'Total QA Hours', value: strategy.totalQAHours.toLocaleString() },
          { label: 'Automation Coverage', value: `${strategy.automationCoverage}%` },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border p-4" style={{ borderColor: '#E2E8F0' }}>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-lg font-bold" style={{ color: ACCENT }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
          style={{ background: ACCENT }}>
          <Plus size={14} /> Add Test Type
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: TEAL }}>
          <div className="text-sm font-bold" style={{ color: TEAL }}>Add Test Type</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select value={newSection.type}
              onChange={(e) => setNewSection({ ...newSection, type: e.target.value as TestSection['type'] })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-teal-400">
              {TEST_TYPES.map((t) => <option key={t} value={t}>{t} Testing</option>)}
            </select>
            <input placeholder="Scope description" value={newSection.scope ?? ''}
              onChange={(e) => setNewSection({ ...newSection, scope: e.target.value })}
              className="col-span-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-teal-400" />
            <input type="number" placeholder="Est. Hours" value={newSection.estimatedHours ?? ''}
              onChange={(e) => setNewSection({ ...newSection, estimatedHours: Number(e.target.value) })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-teal-400" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleAdd}
              className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg" style={{ background: TEAL }}>Add</button>
          </div>
        </div>
      )}

      {/* Test sections */}
      <div className="space-y-4">
        {strategy.sections.map((section) => {
          const color = TYPE_COLORS[section.type] ?? ACCENT;
          return (
            <div key={section.id}
              className={`bg-white rounded-2xl border p-5 transition-all ${section.enabled ? '' : 'opacity-60'}`}
              style={{ borderColor: section.enabled ? '#E2E8F0' : '#F1F5F9' }}>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: color }}>
                    {section.type} Testing
                  </div>
                  <span className="text-xs text-gray-400">Band {section.responsibleBand}</span>
                  <span className="text-xs font-semibold" style={{ color: TEAL }}>{section.estimatedHours}h</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => activeDocumentId && toggleTestSection(activeDocumentId, section.id, !section.enabled)}
                    className="transition-colors" style={{ color: section.enabled ? TEAL : '#ccc' }}>
                    {section.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button
                    onClick={() => activeDocumentId && removeTestSection(activeDocumentId, section.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{section.scope}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Tools */}
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Tools</div>
                  <div className="flex flex-wrap gap-1">
                    {section.tools.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border"
                        style={{ background: '#EFF6F6', color: TEAL, borderColor: `${TEAL}40` }}>{t}</span>
                    ))}
                  </div>
                </div>
                {/* Entry Criteria — fully editable */}
                {activeDocumentId && (
                  <CriteriaList
                    sectionId={section.id}
                    docId={activeDocumentId}
                    type="entry"
                    criteria={section.entryCriteria}
                    label="Entry Criteria"
                    accentColor="#198038"
                  />
                )}
                {/* Exit Criteria — fully editable */}
                {activeDocumentId && (
                  <CriteriaList
                    sectionId={section.id}
                    docId={activeDocumentId}
                    type="exit"
                    criteria={section.exitCriteria}
                    label="Exit Criteria"
                    accentColor={ACCENT}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
