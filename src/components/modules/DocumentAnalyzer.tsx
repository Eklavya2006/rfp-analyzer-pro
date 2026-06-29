'use client';
// DocumentAnalyzer — Light theme · HTML-preserved content · T&C/Penalties red · Scope green
// Deep-link navigation: Scope → Document scroll + IntersectionObserver bidirectional sync
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, CheckCircle, AlertCircle, Loader2,
  Zap, Trash2, BookOpen, X, Paperclip,
} from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { runFullAnalysis } from '@/lib/mockEngine';
import { extractFromFile, generateSummary, sanitizeText, type ParseStep } from '@/lib/parser';
import { v4 as uuid } from 'uuid';

// ── Helpers ────────────────────────────────────────────────────
function isRawPDF(text: string): boolean {
  const head = text.slice(0, 256);
  return /^%PDF-/m.test(head) || /\bLinearized\b/.test(head) || /<<\/L\s+\d+/.test(head);
}

function safePreviewText(raw: string | undefined): string {
  if (!raw) return '';
  if (isRawPDF(raw)) return '[Raw PDF content detected — text extraction failed. Try re-uploading as DOCX or TXT.]';
  const cleaned = sanitizeText(raw);
  if (isRawPDF(cleaned)) return '[PDF binary content could not be fully sanitized. Try re-uploading as DOCX or TXT.]';
  return cleaned;
}

const INDIGO = '#6366F1';
const CYAN   = '#06B6D4';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── T&C / Penalties keyword sets ──────────────────────────────
const TC_KEYWORDS = [
  'terms and conditions', 'terms & conditions', 'general terms',
  'intellectual property', 'indemnification', 'indemnity', 'liability',
  'limitation of liability', 'warranty', 'warranties', 'governing law',
  'jurisdiction', 'dispute resolution', 'arbitration', 'termination',
  'confidentiality', 'non-disclosure', 'force majeure', 'compliance',
  'acceptance criteria', 'change order', 'change management',
];

const PENALTY_KEYWORDS = [
  'penalty', 'penalties', 'liquidated damages', 'sla', 'service level',
  'service level agreement', 'breach', 'default', 'late delivery',
  'delay penalty', 'fine', 'deduction', 'withhold', 'forfeiture',
  'performance bond', 'remedies', 'cure period', 'escalation',
];

/**
 * Build a regex that matches any of the given keywords (whole-word, case-insensitive).
 */
function buildKeywordRegex(keywords: string[]): RegExp {
  const escaped = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${escaped.join('|')})`, 'gi');
}

/**
 * Annotate plain text with highlights:
 *  - scope items  → light-green  (bg #DCFCE7, colour #166534)
 *  - T&C phrases  → light-red    (bg #FEE2E2, colour #991B1B)
 *  - Penalty phrases → orange-red (bg #FEF3C7, colour #92400E)
 *  - scrollHint section → amber pulse
 *
 * Each scope item span gets data-scope-item-id so IntersectionObserver can
 * identify which scope item is currently visible and sync the Scope list.
 *
 * Returns an array of React nodes. Pure function — no hooks.
 */
function buildAnnotatedContent(
  rawText: string,
  scrollHintSection: string | null,
  scopeDescriptions: Array<{ text: string; id: string }>,
): React.ReactNode[] {
  const text = safePreviewText(rawText);

  // ── 1. Collect all highlight ranges ──────────────────────────
  type HRange = {
    start: number; end: number;
    type: 'scope' | 'tc' | 'penalty' | 'hint';
    scopeItemId?: string;
  };
  const ranges: HRange[] = [];

  // Scope items (light green) — tagged with their scope item ID
  for (const { text: desc, id: scopeItemId } of scopeDescriptions) {
    const needle = desc.trim().slice(0, 80);
    if (needle.length < 6) continue;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, type: 'scope', scopeItemId });
    }
  }

  // T&C (light red)
  const tcRe = buildKeywordRegex(TC_KEYWORDS);
  let m: RegExpExecArray | null;
  while ((m = tcRe.exec(text)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length, type: 'tc' });
  }

  // Penalties (amber-red)
  const penRe = buildKeywordRegex(PENALTY_KEYWORDS);
  while ((m = penRe.exec(text)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length, type: 'penalty' });
  }

  // Scroll-hint section (amber pulse) — extend to full section for whole-section highlight
  if (scrollHintSection) {
    const needle = scrollHintSection.replace(/^Section\s*/i, '');
    if (needle.length >= 3) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'gi');
      while ((m = re.exec(text)) !== null) {
        // Extend to end of paragraph / next section heading for full-section highlight
        const sectionEnd = Math.min(text.length, m.index + m[0].length + 600);
        ranges.push({ start: m.index, end: sectionEnd, type: 'hint' });
        break; // only first occurrence
      }
    }
  }

  if (ranges.length === 0) return [<span key="all">{text}</span>];

  // ── 2. Sort + de-overlap (priority: hint > scope > tc > penalty) ──
  const priority: Record<string, number> = { hint: 4, scope: 3, tc: 2, penalty: 1 };
  ranges.sort((a, b) => a.start - b.start || priority[b.type] - priority[a.type]);

  // Merge overlapping ranges (keep highest priority + preserve scopeItemId)
  const merged: HRange[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) {
      last.end = Math.max(last.end, r.end);
      if (!last.scopeItemId && r.scopeItemId) last.scopeItemId = r.scopeItemId;
    } else {
      merged.push({ ...r });
    }
  }

  // ── 3. Build React nodes ──────────────────────────────────────
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  const styleMap: Record<string, React.CSSProperties> = {
    scope:   { background: '#DCFCE7', color: '#166534', borderRadius: 3, padding: '0 2px', fontWeight: 600 },
    tc:      { background: '#FEE2E2', color: '#991B1B', borderRadius: 3, padding: '0 2px', fontWeight: 600 },
    penalty: { background: '#FEF3C7', color: '#92400E', borderRadius: 3, padding: '0 2px', fontWeight: 600 },
    hint:    {
      background: 'rgba(245,158,11,0.18)', borderRadius: 4, padding: '2px 3px',
      outline: '2px solid rgba(245,158,11,0.5)', outlineOffset: 1,
      color: '#78350F', fontWeight: 600, display: 'inline',
    },
  };
  const classMap: Record<string, string> = { hint: 'rfp-highlight' };

  for (const r of merged) {
    if (r.start > cursor) nodes.push(<span key={`t${cursor}`}>{text.slice(cursor, r.start)}</span>);
    nodes.push(
      <mark
        key={`h${r.start}`}
        className={[classMap[r.type], r.scopeItemId ? 'rfp-scope-mark' : ''].filter(Boolean).join(' ')}
        // data attribute enables IntersectionObserver to map visible mark → scope item
        data-scope-item-id={r.scopeItemId}
        style={styleMap[r.type]}
      >
        {text.slice(r.start, r.end)}
      </mark>
    );
    cursor = r.end;
  }
  if (cursor < text.length) nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  return nodes;
}

// ── Section resolution for plain-text deep-linking ───────────
/**
 * Given a section label (e.g. "Section 2.1", "2.3", "Cloud Infrastructure"),
 * find the best matching character offset in the plain text.
 * Resolution order:
 *   1. Exact section number match  (e.g. "2.1" → "2.1 Cloud Infrastructure:")
 *   2. Section keyword match       (e.g. "Section 2" at start of line)
 *   3. Partial text phrase match   (first occurrence of the keyword words)
 *   4. Page number fallback        (search for "Page N" or "page N")
 * Returns the character offset or -1 if not found.
 */
function resolveSection(text: string, section: string, page: string): number {
  if (!text) return -1;

  // 1. Exact section number (e.g. "2.1" or "Section 2.1")
  const numMatch = section.match(/(\d[\d.]*)/);
  if (numMatch) {
    const num = numMatch[1].replace(/\./g, '\\.');
    // Match section number at line start or after "Section "
    const re = new RegExp(`(?:^|\\n)\\s*(?:Section\\s+)?${num}[\\s.:)]`, 'i');
    const idx = text.search(re);
    if (idx >= 0) return idx;
  }

  // 2. Keyword phrase from the section label (skip common words)
  const stopWords = new Set(['section', 'the', 'a', 'an', 'of', 'and', 'or', 'for', 'to', 'in', 'on', 'at', 'by', 'page']);
  const words = section.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  for (const word of words) {
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const idx = text.search(re);
    if (idx >= 0) return idx;
  }

  // 3. Page number fallback
  if (page) {
    const pageNum = page.match(/\d+/)?.[0];
    if (pageNum) {
      const re = new RegExp(`(?:page|pg\\.?)\\s*${pageNum}\\b`, 'i');
      const idx = text.search(re);
      if (idx >= 0) return idx;
    }
  }

  return -1;
}

// ── HTML view deep-link: find target heading element ──────────
/**
 * For DOCX HTML view: find the heading element that best matches `section`.
 * Returns the matching element or null.
 * Resolution order: section number in text → keyword phrase match.
 */
function resolveHtmlHeading(container: HTMLElement, section: string): HTMLElement | null {
  const headings = Array.from(container.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,p'));

  // 1. Section number match
  const numMatch = section.match(/(\d[\d.]*)/);
  if (numMatch) {
    const num = numMatch[1];
    for (const el of headings) {
      const t = el.textContent?.trim() ?? '';
      if (t.startsWith(num) || new RegExp(`^Section\\s+${num.replace(/\./g, '\\.')}\\b`, 'i').test(t)) {
        return el;
      }
    }
  }

  // 2. Keyword match against heading text
  const stopWords = new Set(['section', 'the', 'a', 'an', 'of', 'and', 'or', 'for', 'to', 'in', 'on', 'at', 'by']);
  const words = section.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  let bestEl: HTMLElement | null = null;
  let bestScore = 0;
  for (const el of headings) {
    const t = (el.textContent ?? '').toLowerCase();
    const score = words.filter(w => t.includes(w)).length;
    if (score > bestScore) { bestScore = score; bestEl = el; }
  }
  return bestScore > 0 ? bestEl : null;
}

// ── Processing step indicator ─────────────────────────────────
const STEPS: { key: ParseStep; label: string; pct: number }[] = [
  { key: 'uploading',  label: 'Uploading',  pct: 10 },
  { key: 'parsing',    label: 'Parsing',    pct: 30 },
  { key: 'extracting', label: 'Extracting', pct: 60 },
  { key: 'rendering',  label: 'Rendering',  pct: 85 },
  { key: 'done',       label: 'Complete',   pct: 100 },
];

function ProcessingSteps({ step, pct }: { step: ParseStep; pct: number }) {
  const stepIdx = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="mt-3 space-y-2">
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.15)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${INDIGO}, ${CYAN})` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: i <= stepIdx ? INDIGO : '#E2E8F0',
                transform: i === stepIdx ? 'scale(1.4)' : 'scale(1)',
                boxShadow: i === stepIdx ? `0 0 6px ${INDIGO}` : 'none',
              }}
            />
            <span className="text-[10px] font-medium" style={{ color: i <= stepIdx ? '#6366F1' : '#94A3B8' }}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-[10px] mx-0.5 text-slate-300">›</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Legend pill ───────────────────────────────────────────────
function LegendPill({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: bg, color: text, border: `1px solid ${text}33` }}
    >
      <span className="w-2 h-2 rounded-full inline-block" style={{ background: text }} />
      {label}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function DocumentAnalyzer() {
  // Select only the slices this screen uses so unrelated store writes do not rerender the full document viewer.
  const documents = useRFPStore((state) => state.documents);
  const activeDocumentId = useRFPStore((state) => state.activeDocumentId);
  const activeTab = useRFPStore((state) => state.activeTab);
  const analysisResults = useRFPStore((state) => state.analysisResults);
  const docScrollTarget = useRFPStore((state) => state.docScrollTarget);
  const addDocument = useRFPStore((state) => state.addDocument);
  const updateDocument = useRFPStore((state) => state.updateDocument);
  const setActiveDocument = useRFPStore((state) => state.setActiveDocument);
  const setAnalysisResult = useRFPStore((state) => state.setAnalysisResult);
  const setActiveTab = useRFPStore((state) => state.setActiveTab);
  const reset = useRFPStore((state) => state.reset);
  const setDocScrollTarget = useRFPStore((state) => state.setDocScrollTarget);
  const setActiveScopeItemId = useRFPStore((state) => state.setActiveScopeItemId);
  const [dragActive, setDragActive]         = useState(false);
  const [parseStep, setParseStep]           = useState<ParseStep>('uploading');
  const [parsePct,  setParsePct]            = useState(0);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  // Inline nav-error shown when a section cannot be resolved
  const [navError, setNavError]             = useState<string | null>(null);

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === activeDocumentId),
    [documents, activeDocumentId]
  );
  const activeResult = activeDocumentId ? analysisResults[activeDocumentId] : null;

  const scopeDescriptions = useMemo(
    () => (activeResult?.scopeItems ?? [])
      .filter((scopeItem) => scopeItem.category === 'in-scope')
      .map((scopeItem) => ({ text: scopeItem.description.trim(), id: scopeItem.id }))
      .filter((scopeItem) => scopeItem.text.length >= 6),
    [activeResult]
  );

  // ── Scroll-hint banner (legacy sessionStorage path — kept for compatibility) ──
  const [scrollHint, setScrollHint] = useState<{ section: string; page: string } | null>(null);
  const textPreviewRef = useRef<HTMLDivElement>(null);

  // ── Consume docScrollTarget from store (Scope → Document deep-link) ──────────
  useEffect(() => {
    if (!docScrollTarget) return;
    if (activeTab !== 'document-analyzer') return;

    const { section, page, scopeItemId } = docScrollTarget;
    // Clear the target immediately so it doesn't re-fire
    setDocScrollTarget(null);
    setNavError(null);

    // Show the scroll-hint banner
    setScrollHint({ section, page });

    // Allow the DOM to update (re-render with new scrollHint) then scroll
    const timer = setTimeout(() => {
      const container = textPreviewRef.current;
      if (!container) return;

      // ── HTML view (DOCX) ──────────────────────────────────────────────────────
      if (activeDoc?.rawHtml) {
        const heading = resolveHtmlHeading(container, section);
        if (heading) {
          // Remove previous active-section highlights
          container.querySelectorAll<HTMLElement>('.doc-section-active').forEach(el => {
            el.classList.remove('doc-section-active');
          });
          // Highlight the heading and all following sibling content until next heading
          heading.classList.add('doc-section-active');
          let sib = heading.nextElementSibling as HTMLElement | null;
          while (sib && !['H1','H2','H3','H4','H5','H6'].includes(sib.tagName)) {
            sib.classList.add('doc-section-active');
            sib = sib.nextElementSibling as HTMLElement | null;
          }
          // Scroll heading to top of viewer
          heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveScopeItemId(scopeItemId);
        } else {
          setNavError(
            `Section "${section}" could not be found in the document. ` +
            `Try scrolling manually or check the reference in the Scope table.`
          );
        }
        return;
      }

      // ── Plain-text view ───────────────────────────────────────────────────────
      const rawText = activeDoc?.rawText ?? '';
      const offset = resolveSection(rawText, section, page);

      if (offset >= 0) {
        // Find the DOM <mark> whose text content covers this offset, or use rfp-highlight
        const marks = container.querySelectorAll<HTMLElement>('.rfp-highlight, .rfp-scope-mark');
        if (marks.length > 0) {
          marks[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
          marks[0].classList.remove('rfp-pulse');
          void marks[0].offsetWidth; // reflow to restart animation
          marks[0].classList.add('rfp-pulse');
          setActiveScopeItemId(scopeItemId);
        } else {
          // Fallback: scroll proportionally to offset in text
          const ratio = offset / Math.max(1, rawText.length);
          container.scrollTop = ratio * container.scrollHeight;
          setActiveScopeItemId(scopeItemId);
        }
      } else {
        setNavError(
          `Section "${section}" (${page || 'no page'}) could not be located in the document. ` +
          `Check that the document is fully uploaded, or edit the reference in the Scope table.`
        );
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [docScrollTarget, activeTab, activeDoc, setDocScrollTarget, setActiveScopeItemId]);

  // ── Legacy sessionStorage scroll-hint (kept for backwards compat) ──────────
  useEffect(() => {
    if (activeTab !== 'document-analyzer') return;
    try {
      const raw = sessionStorage.getItem('rfp-scroll-hint');
      if (raw) {
        const hint = JSON.parse(raw) as { section: string; page: string; ts: number };
        if (Date.now() - hint.ts < 15000) setScrollHint({ section: hint.section, page: hint.page });
        sessionStorage.removeItem('rfp-scroll-hint');
      }
    } catch {}
  }, [activeTab]);

  // ── Plain-text: scroll to rfp-highlight mark when scrollHint changes ───────
  useEffect(() => {
    if (!scrollHint || !textPreviewRef.current || activeDoc?.rawHtml) return;
    const timer = setTimeout(() => {
      if (!textPreviewRef.current) return;
      const marks = textPreviewRef.current.querySelectorAll<HTMLElement>('.rfp-highlight');
      if (marks.length > 0) {
        marks[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
        marks[0].classList.remove('rfp-pulse');
        void marks[0].offsetWidth;
        marks[0].classList.add('rfp-pulse');
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [scrollHint, activeDoc?.rawHtml]);

  // ── IntersectionObserver: as user scrolls, update activeScopeItemId ─────────
  // Works for both plain-text (<mark data-scope-item-id>) and HTML (headings with
  // data-scope-item-id injected after render).
  useEffect(() => {
    const container = textPreviewRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost intersecting scope mark
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const el = visible[0].target as HTMLElement;
          const id = el.dataset.scopeItemId;
          if (id) setActiveScopeItemId(id);
        }
      },
      { root: container, threshold: 0.1 }
    );

    // Observe all scope marks (plain text)
    const marks = container.querySelectorAll<HTMLElement>('[data-scope-item-id]');
    marks.forEach(m => observer.observe(m));

    return () => observer.disconnect();
  // Re-run when the document or scrollHint changes (new marks may appear)
  }, [activeDoc?.rawText, activeDoc?.rawHtml, scrollHint, setActiveScopeItemId]);

  // ── File processing ───────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    const docId = uuid();
    setProcessingDocId(docId);
    setParseStep('uploading');
    setParsePct(5);
    addDocument({
      id: docId, name: file.name, size: file.size,
      type: file.type, status: 'processing', uploadedAt: new Date().toISOString(),
    });
    setActiveDocument(docId);
    try {
      // extractFromFile returns an optional `html` field for DOCX.
      // We store it as rawHtml so the preview can render it faithfully.
      const { text: rawText, pageCount, html: rawHtml } = await extractFromFile(file, (step, pct) => {
        setParseStep(step);
        setParsePct(pct);
      });
      const summary = generateSummary(rawText, file.name, pageCount);
      updateDocument(docId, {
        status: 'ready', rawText, rawHtml,
        processedAt: new Date().toISOString(), summary,
      });
      const result = runFullAnalysis(docId, rawText);
      setAnalysisResult(docId, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      updateDocument(docId, { status: 'error', errorMessage: msg });
    } finally {
      setProcessingDocId(null);
    }
  }, [addDocument, setActiveDocument, updateDocument, setAnalysisResult]);

  const onDrop = useCallback(
    (accepted: File[]) => { setDragActive(false); if (accepted[0]) processFile(accepted[0]); },
    [processFile],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const loadDemo = useCallback(async () => {
    const demoText = `REQUEST FOR PROPOSAL — Enterprise Digital Transformation Platform

Section 1: Executive Summary
The client seeks an enterprise partner to deliver a comprehensive digital transformation encompassing cloud infrastructure migration, AI/ML capabilities, data governance, and security compliance.
Estimated budget: $2.5M to $4M. Timeline: 18 months from contract execution.

Section 2: Scope of Work
2.1 Cloud Infrastructure: Migrate all on-premise workloads to IBM Cloud hybrid architecture.
2.2 Data Platform: Implement watsonx.data as the central data lakehouse.
2.3 AI & Machine Learning: Deploy IBM Watson AI for NLP document processing.
2.4 Security & Compliance: Implement IBM Security QRadar SIEM.

Section 3: Terms and Conditions
Governing law: State of New York. All disputes subject to binding arbitration. Liability is limited to total contract value. Non-disclosure and confidentiality apply for 5 years post-project. Intellectual property developed during this engagement shall vest in the client.

Section 4: Penalties and SLA
Service Level Agreement: 99.9% uptime required. Late delivery penalty: 0.5% of milestone value per day of delay, up to 10%. Liquidated damages apply for critical path delays exceeding 30 days. Performance bond of 5% required prior to kick-off.

Section 5: Deliverables
5.1 Solution Architecture Document — Page 5
5.2 MVP Platform Release — Page 11
5.3 UAT Sign-off — Page 17

Section 6: Timeline
Project timeline: 18 months.

Section 7: Budget
Budget range: $2.5M to $4M including licensing, professional services, and infrastructure.`;
    await processFile(new File([demoText], 'Demo_Enterprise_RFP.txt', { type: 'text/plain' }));
  }, [processFile]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Keyframes */}
      <style>{`
        @keyframes rfpPulse {
          0%   { box-shadow: 0 0 0 0 rgba(245,158,11,0.7); background: rgba(245,158,11,0.35); }
          40%  { box-shadow: 0 0 0 8px rgba(245,158,11,0.2); background: rgba(245,158,11,0.5); }
          100% { box-shadow: 0 0 0 14px rgba(245,158,11,0); background: rgba(245,158,11,0.25); }
        }
        .rfp-pulse { animation: rfpPulse 1.2s ease-out 2; }
        .doc-content-table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12px; }
        .doc-content-table th,
        .doc-content-table td { border: 1px solid #CBD5E1; padding: 6px 10px; text-align: left; color: #1E293B; }
        .doc-content-table thead tr { background: #F1F5F9; font-weight: 600; color: #374151; }
        .doc-content-table tbody tr:nth-child(even) { background: #F8FAFC; }
        /* Active section highlight for HTML (DOCX) view */
        .doc-section-active {
          background: rgba(245,158,11,0.12) !important;
          outline: 2px solid rgba(245,158,11,0.45);
          outline-offset: 2px;
          border-radius: 3px;
        }
      `}</style>

      {/* ── Navigation error banner ────────────────────────────── */}
      <AnimatePresence>
        {navError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.25)' }}
          >
            <AlertCircle size={16} style={{ color: '#F43F5E', flexShrink: 0, marginTop: 1 }} />
            <span className="text-slate-700 flex-1">{navError}</span>
            <button onClick={() => setNavError(null)} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scroll-hint banner ─────────────────────────────────── */}
      <AnimatePresence>
        {scrollHint && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <BookOpen size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <span className="text-slate-700">
              Navigated from scope reference — look for{' '}
              <strong style={{ color: '#D97706' }}>{scrollHint.section}</strong>
              {scrollHint.page ? `, ${scrollHint.page}` : ''} highlighted below.
            </span>
            <button onClick={() => setScrollHint(null)} className="ml-auto text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1 text-slate-900">Document Analyzer</h2>
          <p className="text-sm text-slate-500">
            Upload PDF, DOCX, XLSX, PPTX, or TXT — text extracted automatically
          </p>
        </div>
        {documents.length > 0 && (
          <button
            onClick={() => reset()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#64748B' }}
          >
            <Trash2 size={12} /> Clear All
          </button>
        )}
      </div>

      {/* ── Upload zone ──────────────────────────────────────────── */}
      <div
        {...getRootProps()}
        className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200"
        style={dragActive
          ? { borderColor: INDIGO, background: 'rgba(99,102,241,0.04)', boxShadow: `0 0 0 4px rgba(99,102,241,0.07)` }
          : { borderColor: '#CBD5E1', background: '#F8FAFC' }
        }
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: dragActive ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
              border: `1px solid rgba(99,102,241,0.2)`,
              boxShadow: dragActive ? `0 0 20px rgba(99,102,241,0.2)` : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Upload size={24} style={{ color: INDIGO }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Drag & drop or click to upload</p>
            <p className="text-xs mt-1 text-slate-400">PDF · DOCX · XLSX · PPTX · TXT — max 25 MB</p>
          </div>
        </div>
      </div>

      {/* ── Demo button ──────────────────────────────────────────── */}
      <div className="text-center mt-4">
        <button
          onClick={loadDemo}
          className="inline-flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 transition-all duration-200"
          style={{ color: CYAN, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.18)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(6,182,212,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(6,182,212,0.08)')}
        >
          <Zap size={14} /> Load Demo RFP
        </button>
      </div>

      {/* ── Document list ─────────────────────────────────────────── */}
      {documents.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Documents ({documents.length})
          </h3>
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 cursor-pointer transition-all duration-200"
              style={doc.id === activeDocumentId
                ? { border: `1px solid rgba(99,102,241,0.4)`, background: 'rgba(99,102,241,0.04)', boxShadow: '0 0 0 1px rgba(99,102,241,0.1)' }
                : { border: '1px solid #E2E8F0', background: '#FFFFFF' }
              }
              onClick={() => setActiveDocument(doc.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${INDIGO}28, ${CYAN}1A)`, border: `1px solid rgba(99,102,241,0.25)` }}
                  >
                    <FileText size={18} style={{ color: INDIGO }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate text-slate-900">{doc.name}</div>
                    <div className="text-xs flex items-center gap-2 mt-0.5 text-slate-500">
                      <span>{formatBytes(doc.size)}</span>
                      {doc.type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#64748B' }}>
                          {doc.type.includes('pdf') ? 'PDF'
                            : doc.type.includes('word') || doc.name.endsWith('.docx') ? 'DOCX'
                            : doc.type.includes('sheet') || doc.name.endsWith('.xlsx') ? 'XLSX'
                            : doc.type.includes('presentation') || doc.name.endsWith('.pptx') ? 'PPTX'
                            : 'TXT'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  {doc.status === 'processing' && <Loader2 size={18} className="animate-spin" style={{ color: INDIGO }} />}
                  {doc.status === 'ready'      && <CheckCircle size={18} style={{ color: '#10B981' }} />}
                  {doc.status === 'error'      && <AlertCircle size={18} style={{ color: '#F43F5E' }} />}
                </div>
              </div>

              {doc.status === 'processing' && doc.id === processingDocId && (
                <ProcessingSteps step={parseStep} pct={parsePct} />
              )}
              {doc.status === 'processing' && doc.id !== processingDocId && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${INDIGO}, ${CYAN})` }}
                      animate={{ width: ['5%', '95%'] }} transition={{ duration: 2.5, ease: 'easeInOut' }}
                    />
                  </div>
                  <p className="text-xs mt-1 text-indigo-500">Processing document…</p>
                </div>
              )}

              {doc.status === 'error' && doc.errorMessage && (
                <div className="mt-3 rounded-lg px-3 py-2.5 space-y-1.5"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <div className="text-xs font-semibold" style={{ color: '#991B1B' }}>
                    ❌ Unable to process the uploaded file
                  </div>
                  <div className="text-xs" style={{ color: '#7F1D1D' }}>
                    {doc.errorMessage.split('\n')[0]}
                  </div>
                  <div className="text-xs" style={{ color: '#9B1C1C', opacity: 0.8 }}>
                    Suggestions: Remove password protection · Save as PDF/A · Try DOCX or TXT instead
                  </div>
                </div>
              )}
              {doc.status === 'ready' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <Paperclip size={11} /> Attached
                  </span>
                  {doc.summary && (
                    <span className="text-xs text-slate-500">
                      {doc.summary.title && doc.summary.title !== 'Unknown Document' ? doc.summary.title : doc.name}
                    </span>
                  )}
                </div>
              )}
              {doc.status === 'ready' && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveTab('dashboard'); }}
                    className="text-xs font-semibold px-4 py-1.5 rounded-xl text-white transition-all duration-200"
                    style={{ background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)`, boxShadow: `0 2px 12px rgba(99,102,241,0.3)` }}
                  >
                    View Analysis →
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Document content preview ───────────────────────────── */}
      {activeDoc?.rawText && (
        <div className="mt-8">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Document Content
                {activeDoc.rawHtml && (
                  <span className="ml-2 font-normal normal-case text-indigo-400">
                    · Structured HTML view (original layout preserved)
                  </span>
                )}
                {scrollHint && (
                  <span className="ml-2 font-normal normal-case" style={{ color: CYAN }}>
                    ↳ Showing: {scrollHint.section}{scrollHint.page ? `, ${scrollHint.page}` : ''}
                  </span>
                )}
              </h3>
              {/* Highlight legend — shown only in plain-text mode */}
              {!activeDoc.rawHtml && (
                <div className="flex items-center gap-2 flex-wrap">
                  <LegendPill bg="#DCFCE7" text="#166534" label="In-Scope item" />
                  <LegendPill bg="#FEE2E2" text="#991B1B" label="Terms & Conditions" />
                  <LegendPill bg="#FEF3C7" text="#92400E" label="Penalties / SLA" />
                  {scrollHint && <LegendPill bg="rgba(245,158,11,0.2)" text="#92400E" label="Scroll target" />}
                </div>
              )}
            </div>
            {scrollHint && (
              <button
                onClick={() => setScrollHint(null)}
                className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={12} /> Clear highlight
              </button>
            )}
          </div>

          {/* HTML view (DOCX) — preserves original document structure */}
          {activeDoc.rawHtml ? (
            <div
              ref={textPreviewRef}
              className="rounded-2xl p-6 overflow-y-auto"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                maxHeight: 600,
                fontSize: 13,
                lineHeight: 1.7,
                color: '#1E293B',
              }}
            >
              <style>{`
                .doc-html-view h1 { font-size: 1.4em; font-weight: 700; margin: 1em 0 0.4em; color: #0F172A; }
                .doc-html-view h2 { font-size: 1.2em; font-weight: 700; margin: 0.9em 0 0.35em; color: #1E293B; }
                .doc-html-view h3 { font-size: 1.05em; font-weight: 600; margin: 0.8em 0 0.3em; color: #334155; }
                .doc-html-view h4, .doc-html-view h5, .doc-html-view h6 { font-size: 0.95em; font-weight: 600; margin: 0.7em 0 0.25em; color: #475569; }
                .doc-html-view p { margin: 0.35em 0; }
                .doc-html-view ul, .doc-html-view ol { margin: 0.4em 0 0.4em 1.5em; padding: 0; }
                .doc-html-view li { margin: 0.2em 0; }
                .doc-html-view table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 12px; }
                .doc-html-view th, .doc-html-view td { border: 1px solid #CBD5E1; padding: 6px 10px; text-align: left; vertical-align: top; color: #1E293B; }
                .doc-html-view thead tr { background: #F1F5F9; font-weight: 600; }
                .doc-html-view tbody tr:nth-child(even) { background: #F8FAFC; }
                .doc-html-view strong, .doc-html-view b { font-weight: 700; color: #0F172A; }
                .doc-html-view em, .doc-html-view i { font-style: italic; }
                .doc-html-view a { color: #4F46E5; text-decoration: underline; }
                .doc-html-view a:hover { color: #3730A3; }
                .doc-html-view img { max-width: 100%; height: auto; border-radius: 6px; margin: 0.5em 0; }
                .doc-html-view hr { border: none; border-top: 1px solid #E2E8F0; margin: 1em 0; }
                .doc-html-view .doc-title { font-size: 1.6em; font-weight: 800; color: #0F172A; }
                .doc-html-view .doc-subtitle { font-size: 1em; color: #64748B; margin-top: -0.2em; }
              `}</style>
              <div
                className="doc-html-view"
                dangerouslySetInnerHTML={{ __html: activeDoc.rawHtml }}
              />
            </div>
          ) : (
            /* Plain-text annotated view for PDF / TXT / XLSX / PPTX */
            <div
              ref={textPreviewRef}
              className="rounded-2xl p-5 overflow-y-auto"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                maxHeight: 500,
                fontSize: 12,
                lineHeight: 1.85,
                color: '#1E293B',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {buildAnnotatedContent(
                activeDoc.rawText ?? '',
                scrollHint?.section ?? null,
                scopeDescriptions,
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
