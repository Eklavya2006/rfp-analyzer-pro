'use client';
// Scope — Light theme · T&C + Penalties hyperlinks in Description column · indigo/cyan accents
// Deep-link navigation: clicking any Reference/Page link calls setDocScrollTarget on the store,
// switches to the Document tab, and DocumentAnalyzer scrolls + highlights the target section.
// Bidirectional sync: activeScopeItemId (set by DocumentAnalyzer IntersectionObserver) is read
// here to highlight the row for the currently-visible document section.
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Plus, Trash2, Search, FileText, ExternalLink, AlertTriangle, Shield, Navigation, Calendar, Clock } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import type { ScopeItem, TimelineEvent, SupportEvent } from '@/types';

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
    (section: string, page: string, scopeItemId: string, highlightColor?: string): 'ok' | 'unresolvable' => {
      const PLACEHOLDER = /^(not found|n\/a|placeholder|tbd|–|—|-|\?|null|undefined|none|section tbd|page tbd)$/i;
      const secOk  = section.trim().length > 2 && !PLACEHOLDER.test(section.trim());
      const pageOk = page.trim().length > 0    && !PLACEHOLDER.test(page.trim());

      if (!secOk && !pageOk) return 'unresolvable';

      // Write scroll target to store — DocumentAnalyzer will consume it
      setDocScrollTarget({ section: section.trim(), page: page.trim(), scopeItemId, highlightColor });
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
    // Pass the link colour so DocumentAnalyzer highlights the section in the same colour
    const result = navigate(section, page, scopeItemId, color);
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

// Chip colours — must match DocumentAnalyzer highlight colours exactly
const TC_CHIP_COLOR      = '#991B1B'; // same as DocumentAnalyzer tc style
const TC_CHIP_BG         = '#FEE2E2';
const TC_CHIP_BORDER     = '#FECACA';
const PENALTY_CHIP_COLOR = '#92400E'; // same as DocumentAnalyzer penalty style
const PENALTY_CHIP_BG    = '#FEF3C7';
const PENALTY_CHIP_BORDER= '#FDE68A';

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
        // Pass TC_CHIP_COLOR → DocumentAnalyzer will highlight that section in red (#FEE2E2 / #991B1B)
        const result = navigate(text.slice(0, 40), page || section, scopeItemId, TC_CHIP_COLOR);
        if (result === 'unresolvable') {
          onError(`Cannot navigate — no valid section reference for this T&C clause.`);
        }
      }}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-lg border transition-all hover:opacity-80 cursor-pointer text-left mt-1"
      style={{ background: TC_CHIP_BG, color: TC_CHIP_COLOR, border: `1px solid ${TC_CHIP_BORDER}` }}
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
        // Pass PENALTY_CHIP_COLOR → DocumentAnalyzer will highlight that section in amber (#FEF3C7 / #92400E)
        const result = navigate(text.slice(0, 40), page || section, scopeItemId, PENALTY_CHIP_COLOR);
        if (result === 'unresolvable') {
          onError(`Cannot navigate — no valid section reference for this penalty clause.`);
        }
      }}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-lg border transition-all hover:opacity-80 cursor-pointer text-left mt-1"
      style={{ background: PENALTY_CHIP_BG, color: PENALTY_CHIP_COLOR, border: `1px solid ${PENALTY_CHIP_BORDER}` }}
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
  // Deep-link function wired to the Dates & Timelines section — must be before early return
  const deepLink = useDeepLink();
  const deepLinkFn = useCallback((section: string, page: string, id: string, color?: string) => {
    deepLink(section, page, id, color);
  }, [deepLink]);

  const PLACEHOLDERS = /^(not found|n\/a|placeholder|tbd|–|—|-|\?|null|undefined|none)$/i;
  function cleanDesc(d: string): string {
    return d.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim();
  }
  function isValidDesc(d: string): boolean {
    const c = cleanDesc(d);
    return c.length > 5 && !PLACEHOLDERS.test(c);
  }

  const scopeItems = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => (result?.scopeItems ?? []).filter((item) => isValidDesc(item.description)),
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
    if (!result) return;
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
    if (!result) return;
    setAnalysisResult(activeDocumentId!, {
      ...result,
      scopeItems: scopeItems.filter((item) => item.id !== id),
    });
  }, [activeDocumentId, result, scopeItems, setAnalysisResult]);

  const updateScope = useCallback((id: string, field: keyof ScopeItem, value: string) => {
    if (!result) return;
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

  // ── Early return — after ALL hooks ────────────────────────────
  if (!result) return (
    <div className="p-6 text-center mt-20 text-slate-400">
      Upload a document to see scope items
    </div>
  );

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

      {/* ── Dates & Timelines Extracted from Document ── */}
      <DatesTimelinesSection
        timelineEvents={result.timelineEvents ?? []}
        supportEvents={result.supportEvents ?? []}
        onDeepLink={deepLinkFn}
      />

    </div>
  );
}

// ── Dates & Timelines section (deep-linked to document) ────────
const SUPPORT_KIND_COLORS: Record<string, string> = {
  hypercare:   '#8B5CF6',
  support:     '#3B82F6',
  warranty:    '#10B981',
  maintenance: '#F59E0B',
  other:       '#94A3B8',
};
const SUPPORT_KIND_LABELS: Record<string, string> = {
  hypercare:   'Hypercare',
  support:     'Support',
  warranty:    'Warranty',
  maintenance: 'Maintenance',
  other:       'Other',
};
const TL_COLORS = ['#3B82F6', '#6366F1', '#06B6D4', '#10B981', '#8B5CF6', '#F59E0B'];

function fmtDur(ev: { value: number; unit: string; months: number; weeks: number }): string {
  const primary   = `${ev.value} ${ev.unit}${ev.value !== 1 ? 's' : ''}`;
  const secondary = ev.unit === 'week'
    ? `${ev.months} month${ev.months !== 1 ? 's' : ''}`
    : `${ev.weeks} week${ev.weeks !== 1 ? 's' : ''}`;
  return `${primary} · ${secondary}`;
}

/** A clickable chip that deep-links into the document viewer at the relevant context snippet.
 *  The `color` is both the chip foreground AND the highlight colour in DocumentAnalyzer. */
function DocChip({ context, onDeepLink, color }: { context: string; onDeepLink: (section: string, page: string, id: string, color?: string) => void; color: string }) {
  const snippet = context.length > 60 ? context.slice(0, 60) + '…' : context;
  return (
    <button
      type="button"
      onClick={() => onDeepLink(context.slice(0, 60), '', 'duration-event', color)}
      title={`View in document: "${context}"`}
      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg border transition-all hover:opacity-80 cursor-pointer text-left mt-1 max-w-full"
      style={{ background: `${color}12`, color, border: `1px solid ${color}40`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
    >
      <FileText size={9} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{snippet}</span>
      <ExternalLink size={8} style={{ flexShrink: 0 }} />
    </button>
  );
}

function DatesTimelinesSection({
  timelineEvents,
  supportEvents,
  onDeepLink,
}: {
  timelineEvents: TimelineEvent[];
  supportEvents: SupportEvent[];
  onDeepLink: (section: string, page: string, id: string, color?: string) => void;
}) {
  const hasAny = timelineEvents.length > 0 || supportEvents.length > 0;
  const maxTlWeeks  = timelineEvents[0]?.weeks  ?? 1;
  const maxSupWeeks = supportEvents[0]?.weeks   ?? 1;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 mt-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock size={14} className="text-slate-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Dates &amp; Timelines Extracted from Document
        </span>
      </div>

      {!hasAny && (
        <p className="text-sm text-slate-400 text-center py-4">
          No project duration or support period found in this document.
          Durations like <strong>&ldquo;18 months&rdquo;</strong> or <strong>&ldquo;26 weeks&rdquo;</strong> near
          timeline/support keywords will appear here with clickable links back to their source.
        </p>
      )}

      {hasAny && (
        <div className="grid grid-cols-1 gap-6" style={{ gridTemplateColumns: timelineEvents.length > 0 && supportEvents.length > 0 ? '1fr 1fr' : '1fr' }}>

          {/* ── Timeline durations ── */}
          {timelineEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Calendar size={12} style={{ color: '#3B82F6' }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#3B82F6' }}>Timeline</span>
              </div>
              <div className="flex flex-col gap-3">
                {timelineEvents.map((ev, i) => {
                  const color = TL_COLORS[i % TL_COLORS.length];
                  const pct   = Math.max(5, Math.round((ev.weeks / maxTlWeeks) * 100));
                  return (
                    <div key={ev.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-semibold text-slate-700" style={{ maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.label.length > 55 ? ev.label.slice(0, 55) + '…' : ev.label}
                        </span>
                        <span className="text-[11px] font-bold" style={{ color, background: `${color}12`, border: `1px solid ${color}35`, borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap' }}>
                          {ev.months}m · {ev.weeks}w
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-1">
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                      </div>
                      <div className="text-[10px] text-slate-400 mb-0.5">{fmtDur(ev)}</div>
                      <DocChip context={ev.context} onDeepLink={onDeepLink} color={color} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Support / Hypercare / Warranty durations ── */}
          {supportEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Shield size={12} style={{ color: '#8B5CF6' }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#8B5CF6' }}>Support &amp; Hypercare</span>
              </div>
              <div className="flex flex-col gap-3">
                {supportEvents.map((ev) => {
                  const color = SUPPORT_KIND_COLORS[ev.kind] ?? SUPPORT_KIND_COLORS.other;
                  const pct   = Math.max(5, Math.round((ev.weeks / maxSupWeeks) * 100));
                  return (
                    <div key={ev.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-slate-700" style={{ maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.label.length > 45 ? ev.label.slice(0, 45) + '…' : ev.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold" style={{ color, background: `${color}12`, border: `1px solid ${color}35`, borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap' }}>
                            {ev.months}m · {ev.weeks}w
                          </span>
                          <span className="text-[9px] font-bold text-white rounded px-1.5 py-0.5 uppercase" style={{ background: color, letterSpacing: '0.05em' }}>
                            {SUPPORT_KIND_LABELS[ev.kind] ?? ev.kind}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-1">
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                      </div>
                      <div className="text-[10px] text-slate-400 mb-0.5">{fmtDur(ev)}</div>
                      <DocChip context={ev.context} onDeepLink={onDeepLink} color={color} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
