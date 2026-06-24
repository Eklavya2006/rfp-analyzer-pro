'use client';
// ScopeDeliverables — S3: Hyperlinks fixed (navigate within app, not broken anchors)
import React, { useState } from 'react';
import { Plus, Trash2, Search, FileText } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { T } from '@/lib/theme';
import { v4 as uuid } from 'uuid';
import type { ScopeItem, DeliverableItem } from '@/types';

const ACCENT = T.slate;
const TEAL   = T.chart[5];

const CAT_COLORS = {
  'in-scope':     { bg: '#defbe6', text: '#0e6027', border: '#a7f0ba' },
  'out-of-scope': { bg: '#fff1f1', text: '#a2191f', border: '#ffb3b8' },
  'assumption':   { bg: '#fdf6dd', text: '#8a3800', border: '#f8d671' },
};

const PRIO_COLORS = {
  high:   { bg: '#fff1f1', text: '#a2191f' },
  medium: { bg: '#fdf6dd', text: '#8a3800' },
  low:    { bg: '#defbe6', text: '#0e6027' },
};

// ── Scope & Deliverable reference links ──────────────────────
// Clicking navigates to the Document Analyzer tab (where the raw
// document text and metadata live). A brief flash banner on the
// Document Analyzer page (via sessionStorage key) guides the user
// to the referenced section/page.
function navigateToSection(setActiveTab: (t: 'document-analyzer') => void, section: string, page: string) {
  // Write hint into sessionStorage so DocumentAnalyzer can surface it
  try {
    sessionStorage.setItem('rfp-scroll-hint', JSON.stringify({ section, page, ts: Date.now() }));
  } catch {}
  setActiveTab('document-analyzer');
}

function RefLink({ section, page }: { section: string; page: string }) {
  const [show, setShow] = useState(false);
  const { setActiveTab } = useRFPStore();

  return (
    <div className="relative inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => navigateToSection(setActiveTab, section, page)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center gap-1 text-xs underline underline-offset-2 font-medium transition-all hover:opacity-70 cursor-pointer"
        style={{ color: TEAL }}
        title={`View source: ${section} — ${page}`}
      >
        {section}
        <FileText size={10} />
      </button>
      {show && (
        <div className="absolute left-0 bottom-full mb-1 z-20 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl pointer-events-none"
          style={{ background: T.navy }}>
          📄 View in document: <span className="font-semibold">{section}</span> — {page}
        </div>
      )}
    </div>
  );
}

function PageLink({ page, section }: { page: string; section: string }) {
  const [show, setShow] = useState(false);
  const { setActiveTab } = useRFPStore();

  return (
    <div className="relative inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => navigateToSection(setActiveTab, section, page)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center gap-1 text-xs underline underline-offset-2 font-medium transition-all hover:opacity-70 cursor-pointer"
        style={{ color: ACCENT }}
        title={`View source: ${section} — ${page}`}
      >
        {page}
        <FileText size={10} />
      </button>
      {show && (
        <div className="absolute left-0 bottom-full mb-1 z-20 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl pointer-events-none"
          style={{ background: T.navy }}>
          📄 View in document: <span className="font-semibold">{section}</span> — {page}
        </div>
      )}
    </div>
  );
}

export default function ScopeDeliverables() {
  const { activeDocumentId, analysisResults, setAnalysisResult } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [tab, setTab] = useState<'scope' | 'deliverables'>('scope');
  const [search, setSearch] = useState('');

  if (!result) return <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document to see scope items</div>;

  const scopeItems = result.scopeItems ?? [];
  const deliverableItems = result.deliverableItems ?? [];

  const filteredScope = scopeItems.filter((i) =>
    i.description.toLowerCase().includes(search.toLowerCase()) || i.referenceSection.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDel = deliverableItems.filter((i) =>
    i.description.toLowerCase().includes(search.toLowerCase()) || i.phase.toLowerCase().includes(search.toLowerCase())
  );

  const addScope = () => {
    const newItem: ScopeItem = { id: uuid(), description: 'New scope item', referenceSection: 'Section TBD', pageNumber: 'Page TBD', category: 'in-scope' };
    setAnalysisResult(activeDocumentId!, { ...result, scopeItems: [...scopeItems, newItem] });
  };
  const removeScope = (id: string) =>
    setAnalysisResult(activeDocumentId!, { ...result, scopeItems: scopeItems.filter((i) => i.id !== id) });
  const addDeliverable = () => {
    const newItem: DeliverableItem = { id: uuid(), description: 'New deliverable', referenceSection: 'Section TBD', pageNumber: 'Page TBD', phase: 'Development', priority: 'medium' };
    setAnalysisResult(activeDocumentId!, { ...result, deliverableItems: [...deliverableItems, newItem] });
  };
  const removeDeliverable = (id: string) =>
    setAnalysisResult(activeDocumentId!, { ...result, deliverableItems: deliverableItems.filter((i) => i.id !== id) });
  const updateScope = (id: string, field: keyof ScopeItem, value: string) =>
    setAnalysisResult(activeDocumentId!, { ...result, scopeItems: scopeItems.map((i) => i.id === id ? { ...i, [field]: value } : i) });
  const updateDeliverable = (id: string, field: keyof DeliverableItem, value: string) =>
    setAnalysisResult(activeDocumentId!, { ...result, deliverableItems: deliverableItems.map((i) => i.id === id ? { ...i, [field]: value } : i) });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {(['scope', 'deliverables'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={tab === t ? { background: ACCENT, color: '#fff' } : { color: '#555' }}>
              {t === 'scope' ? `Scope Items (${scopeItems.length})` : `Deliverables (${deliverableItems.length})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              className="text-sm outline-none w-40 bg-transparent" />
          </div>
          <button onClick={tab === 'scope' ? addScope : addDeliverable}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl text-white transition-colors"
            style={{ background: ACCENT }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Scope table */}
      {tab === 'scope' ? (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ background: '#F8FAFC' }}>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Reference Section ↗</th>
                <th className="px-4 py-3 text-left">Page ↗</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScope.map((item, idx) => {
                const colors = CAT_COLORS[item.category];
                return (
                  <tr key={item.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3">
                      <input value={item.description} onChange={(e) => updateScope(item.id, 'description', e.target.value)}
                        className="w-full text-sm outline-none bg-transparent border-b border-transparent focus:border-teal-400 transition-colors" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <RefLink section={item.referenceSection} page={item.pageNumber} />
                        <input value={item.referenceSection} onChange={(e) => updateScope(item.id, 'referenceSection', e.target.value)}
                          className="text-[10px] outline-none bg-transparent text-gray-400 w-full" placeholder="Edit section…" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <PageLink page={item.pageNumber} section={item.referenceSection} />
                        <input value={item.pageNumber} onChange={(e) => updateScope(item.id, 'pageNumber', e.target.value)}
                          className="text-[10px] outline-none bg-transparent text-gray-400 w-full" placeholder="Edit page…" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select value={item.category} onChange={(e) => updateScope(item.id, 'category', e.target.value)}
                        className="text-xs font-semibold px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer"
                        style={{ background: colors.bg, color: colors.text }}>
                        <option value="in-scope">In Scope</option>
                        <option value="out-of-scope">Out of Scope</option>
                        <option value="assumption">Assumption</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => removeScope(item.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredScope.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No scope items found</div>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ background: '#F8FAFC' }}>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Reference Section ↗</th>
                <th className="px-4 py-3 text-left">Page ↗</th>
                <th className="px-4 py-3 text-left">Phase</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDel.map((item, idx) => {
                const prio = PRIO_COLORS[item.priority];
                return (
                  <tr key={item.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3">
                      <input value={item.description} onChange={(e) => updateDeliverable(item.id, 'description', e.target.value)}
                        className="w-full text-sm outline-none bg-transparent border-b border-transparent focus:border-teal-400 transition-colors" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <RefLink section={item.referenceSection} page={item.pageNumber} />
                        <input value={item.referenceSection} onChange={(e) => updateDeliverable(item.id, 'referenceSection', e.target.value)}
                          className="text-[10px] outline-none bg-transparent text-gray-400 w-full" placeholder="Edit section…" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <PageLink page={item.pageNumber} section={item.referenceSection} />
                        <input value={item.pageNumber} onChange={(e) => updateDeliverable(item.id, 'pageNumber', e.target.value)}
                          className="text-[10px] outline-none bg-transparent text-gray-400 w-full" placeholder="Edit page…" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <input value={item.phase} onChange={(e) => updateDeliverable(item.id, 'phase', e.target.value)}
                        className="w-full text-xs outline-none bg-transparent" />
                    </td>
                    <td className="px-4 py-3">
                      <select value={item.priority} onChange={(e) => updateDeliverable(item.id, 'priority', e.target.value)}
                        className="text-xs font-semibold px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer"
                        style={{ background: prio.bg, color: prio.text }}>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => removeDeliverable(item.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredDel.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No deliverables found</div>}
        </div>
      )}
    </div>
  );
}
