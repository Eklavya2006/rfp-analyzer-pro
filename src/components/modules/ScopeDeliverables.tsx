'use client';
// Scope — Light theme · indigo/cyan accents · clickable reference links
import React, { useState } from 'react';
import { Plus, Trash2, Search, FileText } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import type { ScopeItem } from '@/types';

// ── Category badge colours ─────────────────────────────────────
const CAT_COLORS = {
  'in-scope':     { bg: 'rgba(16,185,129,0.1)',  text: '#059669', border: 'rgba(16,185,129,0.25)' },
  'out-of-scope': { bg: 'rgba(244,63,94,0.08)',  text: '#E11D48', border: 'rgba(244,63,94,0.2)'  },
  'assumption':   { bg: 'rgba(245,158,11,0.08)', text: '#B45309', border: 'rgba(245,158,11,0.2)' },
};

const INDIGO = '#6366F1';
const CYAN   = '#06B6D4';

/**
 * Navigates to the Document Analyzer tab and stores a scroll-hint in
 * sessionStorage so the analyzer can highlight + scroll to that section.
 */
function navigateToSection(
  setActiveTab: (t: 'document-analyzer') => void,
  section: string,
  page: string,
) {
  try {
    sessionStorage.setItem('rfp-scroll-hint', JSON.stringify({ section, page, ts: Date.now() }));
  } catch { /* ignore SSR / private-mode */ }
  setActiveTab('document-analyzer');
}

// ── Ref-link with tooltip ──────────────────────────────────────
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
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="inline-flex items-center gap-1 text-xs underline underline-offset-2 font-medium transition-all hover:opacity-70 cursor-pointer"
        style={{ color: CYAN }}
        aria-label={`View source: ${section} — ${page}`}
      >
        {section}
        <FileText size={10} />
      </button>
      {show && (
        <div
          className="absolute left-0 bottom-full mb-2 whitespace-nowrap pointer-events-none z-50"
          style={{
            background: '#1E2436',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 11,
            color: '#F1F5F9',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            lineHeight: 1.5,
          }}
        >
          📄 View in document:{' '}
          <span style={{ fontWeight: 700, color: '#F1F5F9' }}>{section}</span>{' '}
          — {page}
        </div>
      )}
    </div>
  );
}

// ── Page-link with tooltip ─────────────────────────────────────
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
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="inline-flex items-center gap-1 text-xs underline underline-offset-2 font-medium transition-all hover:opacity-70 cursor-pointer"
        style={{ color: INDIGO }}
        aria-label={`View source: ${section} — ${page}`}
      >
        {page}
        <FileText size={10} />
      </button>
      {show && (
        <div
          className="absolute left-0 bottom-full mb-2 whitespace-nowrap pointer-events-none z-50"
          style={{
            background: '#1E2436',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 11,
            color: '#F1F5F9',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            lineHeight: 1.5,
          }}
        >
          📄 View in document:{' '}
          <span style={{ fontWeight: 700, color: '#F1F5F9' }}>{section}</span>{' '}
          — {page}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function ScopeDeliverables() {
  const { activeDocumentId, analysisResults, setAnalysisResult } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [search, setSearch] = useState('');

  if (!result) return (
    <div className="p-6 text-center mt-20 text-slate-400">
      Upload a document to see scope items
    </div>
  );

  const PLACEHOLDERS = /^(not found|n\/a|placeholder|tbd|–|—|-|\?|null|undefined|none)$/i;
  function cleanDesc(d: string): string {
    return d.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim();
  }
  function isValidDesc(d: string): boolean {
    const c = cleanDesc(d);
    return c.length > 5 && !PLACEHOLDERS.test(c);
  }

  const scopeItems = (result.scopeItems ?? []).filter((i) => isValidDesc(i.description));

  const filteredScope = scopeItems.filter((i) =>
    cleanDesc(i.description).toLowerCase().includes(search.toLowerCase()) ||
    i.referenceSection.toLowerCase().includes(search.toLowerCase()),
  );

  const addScope = () => {
    const newItem: ScopeItem = {
      id: uuid(),
      description: 'New scope item',
      referenceSection: 'Section TBD',
      pageNumber: 'Page TBD',
      category: 'in-scope',
    };
    setAnalysisResult(activeDocumentId!, { ...result, scopeItems: [...scopeItems, newItem] });
  };

  const removeScope = (id: string) =>
    setAnalysisResult(activeDocumentId!, {
      ...result,
      scopeItems: scopeItems.filter((i) => i.id !== id),
    });

  const updateScope = (id: string, field: keyof ScopeItem, value: string) =>
    setAnalysisResult(activeDocumentId!, {
      ...result,
      scopeItems: scopeItems.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Scope</h2>
          <p className="text-xs mt-0.5 text-slate-500">
            {scopeItems.length} scope items · click any reference link to jump to the document section
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 bg-white border border-slate-200 shadow-sm">
            <Search size={14} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="text-sm outline-none w-40 bg-transparent text-slate-700 placeholder:text-slate-400"
            />
          </div>
          {/* Add button */}
          <button
            onClick={addScope}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl text-white transition-all duration-200"
            style={{
              background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)`,
              boxShadow: `0 2px 10px rgba(99,102,241,0.35)`,
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* ── Scope table ── */}
      <div className="rounded-2xl overflow-visible bg-white border border-slate-200 shadow-sm">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full border-collapse" style={{ overflow: 'visible' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ minWidth: 260 }}>Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ minWidth: 170 }}>Reference Section ↗</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ minWidth: 130 }}>Page ↗</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ minWidth: 130 }}>Category</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ minWidth: 60 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScope.map((item, rowIdx) => {
                const colors = CAT_COLORS[item.category];
                return (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    style={{ overflow: 'visible', background: rowIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}
                  >
                    {/* ── Description — explicitly dark text ── */}
                    <td className="px-4 py-3" style={{ overflow: 'visible', color: '#1E293B' }}>
                      <input
                        value={item.description}
                        onChange={(e) => updateScope(item.id, 'description', e.target.value)}
                        className="w-full text-sm outline-none bg-transparent transition-colors"
                        style={{
                          color: '#1E293B',
                          borderBottom: '1px dashed rgba(100,116,139,0.3)',
                        }}
                      />
                    </td>

                    {/* ── Reference Section ── */}
                    <td className="px-4 py-3" style={{ overflow: 'visible', position: 'relative' }}>
                      <div className="flex flex-col gap-1" style={{ overflow: 'visible' }}>
                        <RefLink section={item.referenceSection} page={item.pageNumber} />
                        <input
                          value={item.referenceSection}
                          onChange={(e) => updateScope(item.id, 'referenceSection', e.target.value)}
                          className="text-[10px] outline-none bg-transparent w-full"
                          style={{ color: '#94A3B8' }}
                          placeholder="Edit section…"
                        />
                      </div>
                    </td>

                    {/* ── Page Number ── */}
                    <td className="px-4 py-3" style={{ overflow: 'visible', position: 'relative' }}>
                      <div className="flex flex-col gap-1" style={{ overflow: 'visible' }}>
                        <PageLink page={item.pageNumber} section={item.referenceSection} />
                        <input
                          value={item.pageNumber}
                          onChange={(e) => updateScope(item.id, 'pageNumber', e.target.value)}
                          className="text-[10px] outline-none bg-transparent w-full"
                          style={{ color: '#94A3B8' }}
                          placeholder="Edit page…"
                        />
                      </div>
                    </td>

                    {/* ── Category badge ── */}
                    <td className="px-4 py-3">
                      <select
                        value={item.category}
                        onChange={(e) => updateScope(item.id, 'category', e.target.value)}
                        className="text-xs font-semibold px-2 py-0.5 rounded-full border outline-none cursor-pointer"
                        style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                      >
                        <option value="in-scope">In Scope</option>
                        <option value="out-of-scope">Out of Scope</option>
                        <option value="assumption">Assumption</option>
                      </select>
                    </td>

                    {/* ── Remove ── */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeScope(item.id)}
                        className="transition-colors text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredScope.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">
            No scope items found
          </div>
        )}
      </div>
    </div>
  );
}
