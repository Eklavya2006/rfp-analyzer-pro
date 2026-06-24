'use client';
import React, { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import type { IBMBand, TestSection } from '@/types';

const IBM_BLUE = '#0F62FE';
const TEST_TYPES = ['Unit', 'Integration', 'UAT', 'Performance', 'Security', 'Regression'] as const;
const IBM_BANDS: IBMBand[] = ['6A', '6B', '6G', '7A', '7B', '8', '9', '10', 'Executive', 'D'];

const TYPE_COLORS: Record<string, string> = {
  Unit: '#0F62FE', Integration: '#0043CE', UAT: '#198038',
  Performance: '#b45309', Security: '#da1e28', Regression: '#7c3aed',
};

export default function TestingModule() {
  const { activeDocumentId, analysisResults, toggleTestSection, addTestSection, removeTestSection } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [showAdd, setShowAdd] = useState(false);
  const [newSection, setNewSection] = useState<Partial<TestSection>>({ type: 'Unit', scope: '', estimatedHours: 100, responsibleBand: '7A', enabled: true });

  if (!result?.testingStrategy) return <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document to see the testing strategy</div>;

  const strategy = result.testingStrategy;
  const activesSections = strategy.sections.filter((s) => s.enabled);

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
          { label: 'Active', value: String(activesSections.length) },
          { label: 'Total QA Hours', value: strategy.totalQAHours.toLocaleString() },
          { label: 'Automation Coverage', value: `${strategy.automationCoverage}%` },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-lg font-bold" style={{ color: IBM_BLUE }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white" style={{ background: IBM_BLUE }}>
          <Plus size={14} /> Add Test Type
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: IBM_BLUE }}>
          <div className="text-sm font-bold" style={{ color: IBM_BLUE }}>Add Test Type</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select value={newSection.type} onChange={(e) => setNewSection({ ...newSection, type: e.target.value as TestSection['type'] })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400">
              {TEST_TYPES.map((t) => <option key={t} value={t}>{t} Testing</option>)}
            </select>
            <input placeholder="Scope description" value={newSection.scope ?? ''} onChange={(e) => setNewSection({ ...newSection, scope: e.target.value })}
              className="col-span-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
            <input type="number" placeholder="Estimated Hours" value={newSection.estimatedHours ?? ''} onChange={(e) => setNewSection({ ...newSection, estimatedHours: Number(e.target.value) })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg" style={{ background: IBM_BLUE }}>Add</button>
          </div>
        </div>
      )}

      {/* Test sections */}
      <div className="space-y-4">
        {strategy.sections.map((section) => {
          const color = TYPE_COLORS[section.type] ?? IBM_BLUE;
          return (
            <div key={section.id} className={`bg-white rounded-2xl border p-5 transition-all ${section.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: color }}>{section.type} Testing</div>
                  <span className="text-xs text-gray-400">Band {section.responsibleBand}</span>
                  <span className="text-xs font-semibold" style={{ color: IBM_BLUE }}>{section.estimatedHours}h</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => activeDocumentId && toggleTestSection(activeDocumentId, section.id, !section.enabled)}
                    className="transition-colors" style={{ color: section.enabled ? IBM_BLUE : '#ccc' }}>
                    {section.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button onClick={() => activeDocumentId && removeTestSection(activeDocumentId, section.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{section.scope}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Tools</div>
                  <div className="flex flex-wrap gap-1">
                    {section.tools.map((t) => <span key={t} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{t}</span>)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Entry Criteria</div>
                  <ul className="space-y-1">
                    {section.entryCriteria.map((c) => <li key={c} className="text-xs text-gray-600 flex items-start gap-1"><span className="text-green-500 mt-0.5">✓</span>{c}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Exit Criteria</div>
                  <ul className="space-y-1">
                    {section.exitCriteria.map((c) => <li key={c} className="text-xs text-gray-600 flex items-start gap-1"><span style={{ color: IBM_BLUE }} className="mt-0.5">✓</span>{c}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
