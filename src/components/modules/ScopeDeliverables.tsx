'use client';
// Scope — Light theme · T&C + Penalties hyperlinks in Description column · indigo/cyan accents
// TASK 2: Removed the inline T&C/Penalties editor expansion row. The two data columns
// (Terms & Conditions, Penalties / SLA) never existed as visible table columns — they
// were only accessible via the "▼ Edit T&C / Penalties" toggle row below each row.
// That toggle and its expanded editor <tr> have been removed. All TCLink and PenaltyLink
// chips that were already inlined inside the Description cell are preserved and remain
// fully functional with their highlighted amber / green colours.
import React, { useState } from 'react';
import { Plus, Trash2, Search, FileText, ExternalLink, AlertTriangle, Shield } from 'lucide-react';
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
 * Navigate to the Document Analyzer tab and store a scroll-hint
 * so the analyzer can highlight + scroll to the referenced content.
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
function RefLink({ section, page, color = CYAN }: { section: string; page: string; color?: string }) {
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
        style={{ color }}
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

// ── T&C clickable link chip ────────────────────────────────────
function TCLink({ text, page, section }: { text: string; page: string; section: string }) {
  const { setActiveTab } = useRFPStore();
  if (!text || text.trim().length < 2) return null;
  const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
  return (
    <button
      type="button"
      onClick={() => navigateToSection(setActiveTab, text.slice(0, 40), page || section)}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-lg border transition-all hover:opacity-80 cursor-pointer text-left mt-1"
      style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B' }}
      title={`View T&C in document: ${text}`}
    >
      <Shield size={10} />
      <span>{preview}</span>
      <ExternalLink size={9} />
    </button>
  );
}

// ── Penalties clickable link chip ──────────────────────────────
function PenaltyLink({ text, page, section }: { text: string; page: string; section: string }) {
  const { setActiveTab } = useRFPStore();
  if (!text || text.trim().length < 2) return null;
  const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
  return (
    <button
      type="button"
      onClick={() => navigateToSection(setActiveTab, text.slice(0, 40), page || section)}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-lg border transition-all hover:opacity-80 cursor-pointer text-left mt-1"
      style={{ background: '#D1FAE5', color: '#065F46', border: '1px solid #10B981' }}
      title={`View penalty clause in document: ${text}`}
    >
      <AlertTriangle size={10} />
      <span>{preview}</span>
      <ExternalLink size={9} />
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function ScopeDeliverables() {
  const { activeDocumentId, analysisResults, setAnalysisResult } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [search, setSearch] = useState('');
  // expandedId removed — inline T&C/Penalties editor rows have been removed (TASK 2).
  // All existing TCLink / PenaltyLink chips in the Description cell are preserved.

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
      termsAndConditions: '',
      penalties: '',
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

  const tcCount      = scopeItems.filter(i => i.termsAndConditions?.trim()).length;
  const penaltyCount = scopeItems.filter(i => i.penalties?.trim()).length;

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
          {/* Summary pills */}
          {tcCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}>
              <Shield size={10} /> {tcCount} T&amp;C
            </span>
          )}
          {penaltyCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
              <AlertTriangle size={10} /> {penaltyCount} Penalty
            </span>
          )}
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
            style={{ background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)`, boxShadow: `0 2px 10px rgba(99,102,241,0.35)` }}
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ minWidth: 280 }}>Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ minWidth: 160 }}>Reference ↗</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ minWidth: 110 }}>Page ↗</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ minWidth: 130 }}>Category</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ minWidth: 60 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScope.map((item, rowIdx) => {
                const colors = CAT_COLORS[item.category];
                return (
                  // TASK 2: Removed expandable T&C/Penalties editor <tr>. Each row is
                  // now a single <tr> with no toggle button. TCLink and PenaltyLink chips
                  // remain in the Description cell with their amber / green highlights.
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    style={{ overflow: 'visible', background: rowIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}
                  >
                    {/* ── Description (+ preserved T&C and Penalty hyperlink chips) ── */}
                    <td className="px-4 py-3" style={{ color: '#1E293B' }}>
                      <input
                        value={item.description}
                        onChange={(e) => updateScope(item.id, 'description', e.target.value)}
                        className="w-full text-sm outline-none bg-transparent mb-1.5"
                        style={{ color: '#1E293B', borderBottom: '1px dashed rgba(100,116,139,0.3)' }}
                      />
                      {/* T&C chip — amber #F59E0B highlight, fully functional hyperlink */}
                      {item.termsAndConditions?.trim() ? (
                        <TCLink text={item.termsAndConditions} page={item.pageNumber} section={item.referenceSection} />
                      ) : null}
                      {/* Penalty chip — green #10B981 highlight, fully functional hyperlink */}
                      {item.penalties?.trim() ? (
                        <PenaltyLink text={item.penalties} page={item.pageNumber} section={item.referenceSection} />
                      ) : null}
                    </td>

                    {/* ── Reference Section ── */}
                    <td className="px-4 py-3" style={{ overflow: 'visible', position: 'relative' }}>
                      <div className="flex flex-col gap-1" style={{ overflow: 'visible' }}>
                        <RefLink section={item.referenceSection} page={item.pageNumber} color={CYAN} />
                        <input
                          value={item.referenceSection}
                          onChange={(e) => updateScope(item.id, 'referenceSection', e.target.value)}
                          className="text-[10px] outline-none bg-transparent w-full"
                          style={{ color: '#94A3B8' }}
                          placeholder="Edit section…"
                        />
                      </div>
                    </td>

                    {/* ── Page ── */}
                    <td className="px-4 py-3" style={{ overflow: 'visible', position: 'relative' }}>
                      <div className="flex flex-col gap-1" style={{ overflow: 'visible' }}>
                        <RefLink section={item.referenceSection} page={item.pageNumber} color={INDIGO} />
                        <input
                          value={item.pageNumber}
                          onChange={(e) => updateScope(item.id, 'pageNumber', e.target.value)}
                          className="text-[10px] outline-none bg-transparent w-full"
                          style={{ color: '#94A3B8' }}
                          placeholder="Edit page…"
                        />
                      </div>
                    </td>

                    {/* ── Category ── */}
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

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 flex-wrap text-[11px] text-slate-400 pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#DCFCE7', border: '1px solid #86EFAC' }} />
          In-Scope items highlighted green in Document
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5' }} />
          T&amp;C phrases highlighted red in Document
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }} />
          Penalty/SLA phrases highlighted amber in Document
        </span>
        <span className="flex items-center gap-1.5">
          <ExternalLink size={10} />
          Any link chip navigates directly to that text in the Document tab
        </span>
      </div>
    </div>
  );
}
