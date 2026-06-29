'use client';
// Scope — Light theme · T&C + Penalties hyperlinks in Description column · indigo/cyan accents
// Deep-link navigation: clicking any Reference/Page link calls setDocScrollTarget on the store,
// switches to the Document tab, and DocumentAnalyzer scrolls + highlights the target section.
// Bidirectional sync: activeScopeItemId (set by DocumentAnalyzer IntersectionObserver) is read
// here to highlight the row for the currently-visible document section.
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Plus, Trash2, Search, FileText, ExternalLink, AlertTriangle, Shield, Navigation } from 'lucide-react';
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

// ── Deep-link helper ───────────────────────────────────────────
/**
 * Navigate to the Document Analyzer tab and schedule a deep-link scroll
 * to the specified section. Uses the Zustand store (not sessionStorage)
 * so the target survives React re-renders and tab switches without a
 * 15-second expiry window.
 *
 * If section and page are both empty/placeholder, show an inline error
 * instead of navigating silently.
 */
function useDeepLink() {
  const setActiveTab = useRFPStore((state) => state.setActiveTab);
  const setDocScrollTarget = useRFPStore((state) => state.setDocScrollTarget);

  return useCallback(
    (section: string, page: string, scopeItemId: string): 'ok' | 'unresolvable' => {
      const PLACEHOLDER = /^(not found|n\/a|placeholder|tbd|–|—|-|\?|null|undefined|none|section tbd|page tbd)$/i;
      const secOk  = section.trim().length > 2 && !PLACEHOLDER.test(section.trim());
      const pageOk = page.trim().length > 0    && !PLACEHOLDER.test(page.trim());

      if (!secOk && !pageOk) return 'unresolvable';

      // Write scroll target to store — DocumentAnalyzer will consume it
      setDocScrollTarget({ section: section.trim(), page: page.trim(), scopeItemId });
      // Switch to Document tab — DocumentAnalyzer useEffect fires on next render
      setActiveTab('document-analyzer');
      return 'ok';
    },
    [setActiveTab, setDocScrollTarget],
  );
}

// ── Ref-link with tooltip ──────────────────────────────────────
function RefLink({
  section, page, scopeItemId, color = CYAN,
  onError,
}: {
  section: string;
  page: string;
  scopeItemId: string;
  color?: string;
  onError: (msg: string) => void;
}) {
  const [show, setShow] = useState(false);
  const navigate = useDeepLink();

  const handleClick = () => {
    const result = navigate(section, page, scopeItemId);
    if (result === 'unresolvable') {
      onError(
        `Cannot navigate to "${section}" — the reference section or page number is a placeholder. ` +
        `Edit the Reference or Page fields in the Scope table to provide a valid section name.`
      );
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
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
          📄 Jump to document:{' '}
          <span style={{ fontWeight: 700, color: '#F1F5F9' }}>{section}</span>{' '}
          — {page || 'no page'}
        </div>
      )}
    </div>
  );
}

// ── T&C clickable link chip ────────────────────────────────────
function TCLink({
  text, page, section, scopeItemId, onError,
}: {
  text: string; page: string; section: string; scopeItemId: string;
  onError: (msg: string) => void;
}) {
  const navigate = useDeepLink();
  if (!text || text.trim().length < 2) return null;
  const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
  return (
    <button
      type="button"
      onClick={() => {
        const result = navigate(text.slice(0, 40), page || section, scopeItemId);
        if (result === 'unresolvable') {
          onError(`Cannot navigate — no valid section reference for this T&C clause.`);
        }
      }}
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
function PenaltyLink({
  text, page, section, scopeItemId, onError,
}: {
  text: string; page: string; section: string; scopeItemId: string;
  onError: (msg: string) => void;
}) {
  const navigate = useDeepLink();
  if (!text || text.trim().length < 2) return null;
  const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
  return (
    <button
      type="button"
      onClick={() => {
        const result = navigate(text.slice(0, 40), page || section, scopeItemId);
        if (result === 'unresolvable') {
          onError(`Cannot navigate — no valid section reference for this penalty clause.`);
        }
      }}
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
  // Select only the scope module slices to avoid rerenders from unrelated analysis modules.
  const activeDocumentId = useRFPStore((state) => state.activeDocumentId);
  const analysisResults = useRFPStore((state) => state.analysisResults);
  const setAnalysisResult = useRFPStore((state) => state.setAnalysisResult);
  const activeScopeItemId = useRFPStore((state) => state.activeScopeItemId);
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [search, setSearch] = useState('');
  const [rowError, setRowError] = useState<{ id: string; msg: string } | null>(null);
  const rowErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const scopeItems = useMemo(
    () => (result.scopeItems ?? []).filter((item) => isValidDesc(item.description)),
    [result]
  );

  const filteredScope = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return scopeItems.filter((item) =>
      cleanDesc(item.description).toLowerCase().includes(normalizedSearch) ||
      item.referenceSection.toLowerCase().includes(normalizedSearch)
    );
  }, [scopeItems, search]);

  const addScope = useCallback(() => {
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
  }, [activeDocumentId, result, scopeItems, setAnalysisResult]);

  const removeScope = useCallback((id: string) => {
    setAnalysisResult(activeDocumentId!, {
      ...result,
      scopeItems: scopeItems.filter((item) => item.id !== id),
    });
  }, [activeDocumentId, result, scopeItems, setAnalysisResult]);

  const updateScope = useCallback((id: string, field: keyof ScopeItem, value: string) => {
    setAnalysisResult(activeDocumentId!, {
      ...result,
      scopeItems: scopeItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    });
  }, [activeDocumentId, result, scopeItems, setAnalysisResult]);

  const tcCount = useMemo(
    () => scopeItems.filter((item) => item.termsAndConditions?.trim()).length,
    [scopeItems]
  );
  const penaltyCount = useMemo(
    () => scopeItems.filter((item) => item.penalties?.trim()).length,
    [scopeItems]
  );

  const handleNavError = useCallback((id: string) => (msg: string) => {
    setRowError({ id, msg });
    if (rowErrorTimerRef.current) {
      clearTimeout(rowErrorTimerRef.current);
    }
    rowErrorTimerRef.current = setTimeout(() => {
      setRowError((prev) => prev?.id === id ? null : prev);
      rowErrorTimerRef.current = null;
    }, 6000);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Scope</h2>
          <p className="text-xs mt-0.5 text-slate-500">
            {scopeItems.length} scope items · click any reference link to jump directly to that section in the document
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
          {/* Sync indicator: shows which section is currently visible in Document viewer */}
          {activeScopeItemId && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Navigation size={9} /> Synced with Document
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
                const colors    = CAT_COLORS[item.category];
                // Row is "active" when the IntersectionObserver in DocumentAnalyzer
                // reports this scope item's mark is currently visible in the viewer.
                const isActive  = activeScopeItemId === item.id;
                const hasError  = rowError?.id === item.id;

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      style={{
                        overflow: 'visible',
                        background: isActive
                          // Active row: amber-tinted to match the document highlight colour
                          ? 'rgba(245,158,11,0.07)'
                          : rowIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                        // Left border strip on active row for immediate visual feedback
                        borderLeft: isActive ? '3px solid #F59E0B' : '3px solid transparent',
                        transition: 'background 0.2s, border-left 0.2s',
                      }}
                    >
                      {/* ── Description (+ preserved T&C and Penalty hyperlink chips) ── */}
                      <td className="px-4 py-3" style={{ color: '#1E293B' }}>
                        <input
                          value={item.description}
                          onChange={(e) => updateScope(item.id, 'description', e.target.value)}
                          className="w-full text-sm outline-none bg-transparent mb-1.5"
                          style={{ color: '#1E293B', borderBottom: '1px dashed rgba(100,116,139,0.3)' }}
                        />
                        {/* T&C chip — amber #F59E0B highlight, deep-link to document */}
                        {item.termsAndConditions?.trim() ? (
                          <TCLink
                            text={item.termsAndConditions}
                            page={item.pageNumber}
                            section={item.referenceSection}
                            scopeItemId={item.id}
                            onError={handleNavError(item.id)}
                          />
                        ) : null}
                        {/* Penalty chip — green #10B981 highlight, deep-link to document */}
                        {item.penalties?.trim() ? (
                          <PenaltyLink
                            text={item.penalties}
                            page={item.pageNumber}
                            section={item.referenceSection}
                            scopeItemId={item.id}
                            onError={handleNavError(item.id)}
                          />
                        ) : null}
                        {/* Active-sync badge */}
                        {isActive && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1"
                            style={{ background: 'rgba(245,158,11,0.15)', color: '#B45309' }}
                          >
                            <Navigation size={8} /> Viewing
                          </span>
                        )}
                      </td>

                      {/* ── Reference Section — deep-link ── */}
                      <td className="px-4 py-3" style={{ overflow: 'visible', position: 'relative' }}>
                        <div className="flex flex-col gap-1" style={{ overflow: 'visible' }}>
                          <RefLink
                            section={item.referenceSection}
                            page={item.pageNumber}
                            scopeItemId={item.id}
                            color={CYAN}
                            onError={handleNavError(item.id)}
                          />
                          <input
                            value={item.referenceSection}
                            onChange={(e) => updateScope(item.id, 'referenceSection', e.target.value)}
                            className="text-[10px] outline-none bg-transparent w-full"
                            style={{ color: '#94A3B8' }}
                            placeholder="Edit section…"
                          />
                        </div>
                      </td>

                      {/* ── Page — deep-link ── */}
                      <td className="px-4 py-3" style={{ overflow: 'visible', position: 'relative' }}>
                        <div className="flex flex-col gap-1" style={{ overflow: 'visible' }}>
                          <RefLink
                            section={item.referenceSection}
                            page={item.pageNumber}
                            scopeItemId={item.id}
                            color={INDIGO}
                            onError={handleNavError(item.id)}
                          />
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

                    {/* ── Inline navigation error row ── */}
                    {hasError && (
                      <tr style={{ background: 'rgba(244,63,94,0.04)' }}>
                        <td colSpan={5} className="px-4 py-2 border-b border-rose-100">
                          <div className="flex items-start gap-2 text-xs text-rose-700">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" style={{ color: '#F43F5E' }} />
                            <span className="flex-1">{rowError!.msg}</span>
                            <button
                              onClick={() => setRowError(null)}
                              className="shrink-0 text-rose-400 hover:text-rose-600"
                            >
                              ✕
                            </button>
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
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid #F59E0B' }} />
          Active row = section currently visible in Document viewer
        </span>
        <span className="flex items-center gap-1.5">
          <ExternalLink size={10} />
          Any link navigates directly to that section inside the Document tab
        </span>
      </div>
    </div>
  );
}
