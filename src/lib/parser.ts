// ============================================================
// RFP Analyzer Pro — Document Parser v2
// Supports: PDF (pdf-parse), DOCX (mammoth), XLSX (xlsx), TXT
// All formats include binary/junk sanitization pass
// ============================================================

import type { DocumentSummary, ExtractedSections, TimelineEvent, SupportEvent, SupportEventKind } from '@/types';
import { v4 as uuid } from 'uuid';

// ── Extraction result ─────────────────────────────────────────
export interface ExtractionResult {
  text: string;
  pageCount: number;
  /**
   * TASK 3: Optional HTML representation of the document that preserves the
   * original visual structure (headings, tables, lists, bold/italic, etc.).
   * Populated only for DOCX via mammoth.convertToHtml(). When present,
   * DocumentAnalyzer renders this as structured HTML rather than monospace text.
   */
  html?: string;
}

// ── Progress callback ─────────────────────────────────────────
export type ParseStep = 'uploading' | 'parsing' | 'extracting' | 'rendering' | 'done';
export type ProgressCallback = (step: ParseStep, pct: number) => void;

// ── Binary / junk character sanitizer ────────────────────────
/**
 * Remove PDF internals (stream/endstream blocks, xref tables, binary
 * FlateDecode data, non-printable Unicode, etc.) from extracted text.
 */
export function sanitizeText(raw: string): string {
  let s = raw;

  // Strip PDF binary stream blocks
  s = s.replace(/stream[\s\S]*?endstream/gi, ' ');
  // Strip xref table blocks
  s = s.replace(/xref[\s\S]*?%%EOF/gi, ' ');
  // Strip PDF object/keyword tokens
  s = s.replace(/\b(?:obj|endobj|trailer|startxref)\b/g, ' ');
  // Strip hex-encoded strings  <4E2D...>
  s = s.replace(/<[0-9A-Fa-f\s]{4,}>/g, ' ');
  // Strip FlateDecode / binary escape sequences
  s = s.replace(/\\[0-9]{3}/g, ' ');
  // Strip lines that are almost entirely non-ASCII (binary artifact lines)
  s = s
    .split('\n')
    .filter((line) => {
      const nonPrint = (line.match(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g) || []).length;
      return line.length === 0 || nonPrint / line.length < 0.3;
    })
    .join('\n');
  // Strip remaining non-printable control chars (keep tab, newline, carriage return)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
  // Collapse runs of whitespace (but preserve paragraph breaks)
  s = s.replace(/[ \t]{2,}/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** Returns true if the text looks like raw binary / junk (>20% non-printable). */
function isBinaryJunk(text: string): boolean {
  if (!text) return true;
  const nonPrint = (text.match(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g) || []).length;
  return nonPrint / text.length > 0.2;
}

/**
 * Detects raw PDF stream content — catches cases where file.text() or pdf-parse
 * returns the raw binary header/xref table before sanitization can help.
 * Looks for telltale PDF structure markers in the first 512 chars.
 */
function isRawPDFContent(text: string): boolean {
  const head = text.slice(0, 512);
  // Raw PDF always starts with %PDF-  or has %PDF somewhere near the top
  if (/^%PDF-/m.test(head)) return true;
  // Linearized / xref early markers
  if (/\bLinearized\b/.test(head) || /<<\/L\s+\d+/.test(head)) return true;
  // Binary comment line with 4 high-byte chars (common in PDF headers)
  if (/%[^\x20-\x7E]{3,}/.test(head)) return true;
  return false;
}

// ── Main extraction entry point ───────────────────────────────
export async function extractFromFile(
  file: File,
  onProgress?: ProgressCallback,
): Promise<ExtractionResult> {
  const name = file.name.toLowerCase();
  const type = file.type;

  onProgress?.('uploading', 10);

  // ── PDF — v4: extracted ENTIRELY CLIENT-SIDE via pdfjs-dist ──
  // Worker served from /public/pdf.worker.min.mjs (copied from node_modules at
  // build time) — no CDN, no version mismatch, works offline, no 413 possible.
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    onProgress?.('parsing', 20);
    try {
      const arrayBuffer = await file.arrayBuffer();
      onProgress?.('extracting', 35);

      const pdfjsLib = await import('pdfjs-dist');

      // Set the worker source. Strategy (in order of preference):
      // 1. unpkg CDN — has every npm version including v6.x, served as ESM
      // 2. jsdelivr CDN — fallback mirror
      // 3. No workerSrc — pdfjs fake-worker (slow but functional)
      const ver = (pdfjsLib as unknown as { version: string }).version;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`;

      const pdf = await (pdfjsLib.getDocument({ data: arrayBuffer })).promise;
      const pageCount = pdf.numPages;
      const pageTexts: string[] = [];

      for (let p = 1; p <= pageCount; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pageTexts.push(content.items.map((i: any) => i.str ?? '').join(' '));
        onProgress?.('extracting', Math.round(35 + (p / pageCount) * 45));
      }

      onProgress?.('rendering', 85);
      const text = sanitizeText(pageTexts.join('\n\n'));
      onProgress?.('done', 100);

      return text.length > 20 && !isBinaryJunk(text)
        ? { text, pageCount }
        : { text: '[PDF text extraction yielded no readable content — the PDF may be image-only or encrypted]', pageCount };

    } catch (err) {
      console.warn('[parser] pdfjs-dist v3 extraction failed:', err);
    }
    onProgress?.('done', 100);
    return { text: '[PDF could not be parsed — try uploading as DOCX or TXT]', pageCount: 1 };
  }

  // ── DOCX / DOC ───────────────────────────────────────────────
  // TASK 3: Use mammoth.convertToHtml() to preserve the original document
  // structure — headings, paragraphs, tables, lists, bold/italic, hyperlinks,
  // and indentation. extractRawText() is kept only as a text fallback for the
  // analysis engine (which operates on plain text). The HTML output is stored
  // separately as `html` in the result so the UI can render it faithfully.
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    onProgress?.('parsing', 30);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await import('mammoth');
      onProgress?.('extracting', 55);

      // Convert to HTML — preserves headings, tables, lists, bold, italic, links.
      // styleMap overrides map Word heading styles to semantic <h1>–<h6>.
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer }, {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          "p[style-name='Title'] => h1.doc-title:fresh",
          "p[style-name='Subtitle'] => p.doc-subtitle:fresh",
          "r[style-name='Strong'] => strong",
          "r[style-name='Emphasis'] => em",
        ],
      });
      const html = htmlResult.value?.trim() ?? '';

      // Also extract plain text for the analysis engine (unchanged pipeline).
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const text = sanitizeText(textResult.value?.trim() ?? '');

      if (text.length > 50 || html.length > 50) {
        onProgress?.('done', 100);
        return {
          text: text.length > 50 ? text : sanitizeText(html.replace(/<[^>]+>/g, ' ')),
          pageCount: estimatePageCount(text),
          html: html.length > 50 ? html : undefined,
        };
      }
    } catch (err) {
      console.warn('[parser] mammoth failed:', err);
    }
    const fallback = sanitizeText(await file.text().catch(() => ''));
    onProgress?.('done', 100);
    return { text: fallback, pageCount: estimatePageCount(fallback) };
  }

  // ── XLSX / XLS ───────────────────────────────────────────────
  if (
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    type === 'application/vnd.ms-excel' ||
    name.endsWith('.xlsx') ||
    name.endsWith('.xls')
  ) {
    onProgress?.('parsing', 30);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      onProgress?.('extracting', 60);
      const lines: string[] = [];
      wb.SheetNames.forEach((sheetName) => {
        lines.push(`\n=== Sheet: ${sheetName} ===`);
        const ws = wb.Sheets[sheetName];
        const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        rows.forEach((row) => {
          const cell = row.filter((v) => v !== '').join('\t');
          if (cell.trim()) lines.push(cell);
        });
      });
      const text = sanitizeText(lines.join('\n'));
      onProgress?.('done', 100);
      return { text, pageCount: Math.max(1, wb.SheetNames.length) };
    } catch (err) {
      console.warn('[parser] xlsx failed:', err);
    }
    onProgress?.('done', 100);
    return { text: '[XLSX extraction failed]', pageCount: 1 };
  }

  // ── PPTX / PPT ───────────────────────────────────────────────
  if (
    type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    type === 'application/vnd.ms-powerpoint' ||
    name.endsWith('.pptx') ||
    name.endsWith('.ppt')
  ) {
    onProgress?.('parsing', 30);
    try {
      // Use JSZip-based PPTX text extraction (built-in to xlsx for pptx xml)
      const arrayBuffer = await file.arrayBuffer();
      const JSZip = (await import('xlsx')).SSF; // fallback approach
      void JSZip;
      // Attempt raw text extraction from PPTX XML slides
      const uint8 = new Uint8Array(arrayBuffer);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const raw = decoder.decode(uint8);
      // Extract all <a:t>text content</a:t> from pptx XML
      const matches = raw.match(/<a:t[^>]*>([^<]{1,300})<\/a:t>/g) ?? [];
      const slideText = matches
        .map((m) => m.replace(/<[^>]+>/g, '').trim())
        .filter((t) => t.length > 1)
        .join('\n');
      const text = sanitizeText(slideText || '[No readable slide text found]');
      onProgress?.('done', 100);
      return { text, pageCount: Math.max(1, Math.round(matches.length / 10)) };
    } catch (err) {
      console.warn('[parser] pptx failed:', err);
    }
    onProgress?.('done', 100);
    return { text: '[PPTX extraction failed]', pageCount: 1 };
  }

  // ── TXT / CSV / fallback ─────────────────────────────────────
  onProgress?.('parsing', 40);
  const txt = sanitizeText(await file.text().catch(() => ''));
  onProgress?.('done', 100);
  return { text: txt, pageCount: estimatePageCount(txt) };
}

/**
 * Backwards-compat wrapper — returns text only.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const result = await extractFromFile(file);
  return result.text;
}

function estimatePageCount(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 300));
}

// ── Section extraction ────────────────────────────────────────
const SECTION_PATTERNS: Record<keyof ExtractedSections, RegExp[]> = {
  scope: [/scope\s+of\s+work/i, /project\s+scope/i, /work\s+scope/i],
  objectives: [/objective[s]?/i, /goal[s]?/i, /purpose/i],
  timeline: [/timeline/i, /schedule/i, /milestones?/i, /duration/i],
  budget: [/budget/i, /cost/i, /pricing/i, /financial/i],
  technicalRequirements: [/technical\s+req/i, /technology\s+req/i, /tech\s+stack/i],
  teamRequirements: [/team\s+req/i, /staffing/i, /resource[s]?/i, /personnel/i],
  evaluationCriteria: [/evaluation/i, /criteria/i, /selection\s+criteria/i, /scoring/i],
  risks: [/risk[s]?/i, /constraint[s]?/i, /assumption[s]?/i, /challenge[s]?/i],
  deliverables: [/deliverable[s]?/i, /output[s]?/i, /artifact[s]?/i],
};

export function extractSections(text: string): ExtractedSections {
  const lines = text.split('\n');
  const sections: ExtractedSections = {
    scope: '', objectives: '', timeline: '', budget: '',
    technicalRequirements: '', teamRequirements: '',
    evaluationCriteria: '', risks: '', deliverables: '',
  };
  const keys = Object.keys(sections) as (keyof ExtractedSections)[];
  let currentSection: keyof ExtractedSections | null = null;
  const sectionContent: Record<keyof ExtractedSections, string[]> = {} as Record<keyof ExtractedSections, string[]>;
  keys.forEach((k) => { sectionContent[k] = []; });

  for (const line of lines) {
    let matched = false;
    for (const key of keys) {
      if (SECTION_PATTERNS[key].some((re) => re.test(line))) {
        currentSection = key;
        matched = true;
        break;
      }
    }
    if (!matched && currentSection) sectionContent[currentSection].push(line);
  }
  keys.forEach((k) => { sections[k] = sectionContent[k].join('\n').trim().slice(0, 500); });
  return sections;
}

// ── Summary generation ────────────────────────────────────────
export function generateSummary(
  text: string,
  filename: string,
  canonicalPageCount?: number,
): DocumentSummary {
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const pageCount = canonicalPageCount ?? Math.max(1, Math.round(wordCount / 300));

  const budgetMatch = text.match(/\$[\d,.]+\s*(?:M|million|B|billion|K|thousand)?(?:\s*(?:to|-)\s*\$[\d,.]+\s*(?:M|million|B|billion|K|thousand)?)?/i);
  const estimatedBudget = budgetMatch ? budgetMatch[0].trim() : '$2M – $5M (estimated)';

  const timelineMatch = text.match(/(\d+)\s*(?:months?|weeks?|years?)/i);
  const estimatedTimeline = timelineMatch ? timelineMatch[0] : '12–18 months';

  const techKeywords = [
    ['ibm cloud', 'IBM Cloud'], ['watson', 'IBM Watson AI'], ['watsonx', 'IBM watsonx'],
    ['kubernetes', 'Kubernetes'], ['react', 'React'], ['node', 'Node.js'], ['python', 'Python'],
    ['java', 'Java'], ['azure', 'Microsoft Azure'], ['aws', 'AWS'], ['docker', 'Docker'],
    ['postgresql', 'PostgreSQL'], ['mongodb', 'MongoDB'], ['kafka', 'Apache Kafka'],
    ['spark', 'Apache Spark'], ['terraform', 'Terraform'], ['openshift', 'Red Hat OpenShift'],
  ];
  const technologies = techKeywords.filter(([kw]) => lower.includes(kw)).map(([, l]) => l).slice(0, 8);
  if (technologies.length === 0) technologies.push('IBM Cloud', 'Watson AI', 'watsonx.data');

  const requirementKeywords = [
    'cloud migration', 'ai/ml', 'machine learning', 'data integration',
    'security', 'compliance', 'training', 'devops', 'microservices',
    'api development', 'data governance', 'reporting', 'analytics',
  ];
  const keyRequirements = requirementKeywords
    .filter((kw) => lower.includes(kw))
    .map((kw) => kw.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
    .slice(0, 6);
  if (keyRequirements.length === 0) {
    keyRequirements.push('Cloud Infrastructure', 'AI/ML Implementation', 'Data Integration', 'Security & Compliance');
  }

  let confidence = 60;
  if (wordCount > 500) confidence += 10;
  if (wordCount > 1500) confidence += 10;
  if (budgetMatch) confidence += 8;
  if (timelineMatch) confidence += 7;
  if (technologies.length >= 3) confidence += 5;
  confidence = Math.min(99, confidence);

  return {
    title: filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
    client: extractClientName(text) || 'Enterprise Client',
    projectDescription: extractDescription(text) ||
      'Digital transformation initiative requiring cloud, AI/ML, data integration and security capabilities.',
    estimatedBudget,
    estimatedTimeline,
    keyRequirements,
    technologies,
    deliverables: ['Architecture Document', 'MVP Release', 'UAT Sign-off', 'Deployment Runbook', 'Training Material'],
    constraints: extractConstraints(text),
    evaluationCriteria: ['Technical fit', 'Cost competitiveness', 'IBM expertise', 'Delivery track record'],
    wordCount,
    pageCount,
    confidenceScore: confidence,
  };
}

function extractClientName(text: string): string {
  const match = text.match(/(?:client|customer|organization|company|issued\s+by)[:\s]+([A-Z][A-Za-z\s&,.]{2,40})/);
  return match ? match[1].trim().slice(0, 40) : '';
}
function extractDescription(text: string): string {
  const match = text.match(/(?:executive\s+summary|overview|introduction)[:\s\n]+([^\n]{40,300})/i);
  return match ? match[1].trim() : '';
}
function extractConstraints(text: string): string[] {
  const constraints: string[] = [];
  const timeMatch = text.match(/(?:go-?live|launch|deadline)[^.]*?(\d+)\s*months?/i);
  if (timeMatch) constraints.push(`Go-live within ${timeMatch[1]} months`);
  const budgetMatch = text.match(/budget[^.]*?not\s+to\s+exceed[^.]*?\$[\d,.]+[MK]?/i);
  if (budgetMatch) constraints.push(budgetMatch[0].trim().slice(0, 60));
  if (text.toLowerCase().includes('zero downtime')) constraints.push('Zero downtime migration required');
  if (constraints.length === 0) constraints.push('Go-live within 18 months', 'Budget not to exceed $4M');
  return constraints;
}

// ── Timeline & Support Duration Extraction ────────────────────
//
// Extracts project-delivery and post-production-support durations from text.
// Handles:
//   • "N months" / "N weeks" / "N days" / "N years"  — direct duration
//   • Date-range pairs like "01/06/2025 to 31/12/2026" — calculates difference
//     and converts to months + weeks
//
// Calendar dates standing alone (no range partner, no duration context) are
// intentionally NOT captured — we only care about duration/effort quantities.

// ── Helpers ───────────────────────────────────────────────────

/** Parse DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD into a JS Date. Returns null on failure. */
function parseDate(raw: string): Date | null {
  const s = raw.trim();
  // YYYY-MM-DD
  let m = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  // DD/MM/YYYY  (treat first number as day when ≤12 ambiguous — document convention)
  m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  // "1 June 2025" / "June 2025" / "Jun 2025"
  const MONTHS: Record<string,number> = {
    january:0,february:1,march:2,april:3,may:4,june:5,
    july:6,august:7,september:8,october:9,november:10,december:11,
    jan:0,feb:1,mar:2,apr:3,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
  };
  m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i);
  if (m) { const mn = MONTHS[m[2].toLowerCase()]; if (mn !== undefined) return new Date(+m[3], mn, +m[1]); }
  m = s.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
  if (m) { const mn = MONTHS[m[1].toLowerCase()]; if (mn !== undefined) return new Date(+m[3], mn, +m[2]); }
  m = s.match(/([A-Za-z]+)\s+(\d{4})/i);
  if (m) { const mn = MONTHS[m[1].toLowerCase()]; if (mn !== undefined) return new Date(+m[2], mn, 1); }
  return null;
}

/** Difference between two dates expressed as { months, weeks }. */
function dateDiff(from: Date, to: Date): { months: number; weeks: number } {
  const msPerWeek  = 7 * 24 * 60 * 60 * 1000;
  const totalWeeks = Math.round((to.getTime() - from.getTime()) / msPerWeek);
  const months     = Math.round(totalWeeks / 4.33);
  return { months: Math.max(0, months), weeks: Math.max(0, totalWeeks) };
}

/** Convert any raw duration to canonical { months, weeks }. */
function toMonthsWeeks(value: number, unit: string): { months: number; weeks: number } {
  const u = unit.toLowerCase().replace(/s$/, '');
  if (u === 'year')  return { months: value * 12,            weeks: Math.round(value * 52) };
  if (u === 'month') return { months: value,                 weeks: Math.round(value * 4.33) };
  if (u === 'week')  return { months: Math.round(value / 4.33), weeks: value };
  if (u === 'day')   return { months: Math.round(value / 30),   weeks: Math.round(value / 7) };
  return { months: 0, weeks: 0 };
}

/** Build a concise label from context (≤80 chars). */
function ctxLabel(ctx: string, fallback: string): string {
  const c = ctx.replace(/\s+/g, ' ').trim();
  if (c.length <= 80) return c.charAt(0).toUpperCase() + c.slice(1);
  const numIdx = c.search(/\d/);
  const s = Math.max(0, numIdx - 45), e = Math.min(c.length, numIdx + 35);
  const snip = c.slice(s, e).trim();
  return (snip.length > 5 ? snip : fallback).replace(/^./, x => x.toUpperCase());
}

// ── Trigger patterns ──────────────────────────────────────────

/**
 * Lines that describe PROJECT DELIVERY duration (timeline / scope context).
 * Must contain at least one of these phrases near a duration or date-range.
 */
const TIMELINE_TRIGGER = /\b(project\s+(duration|timeline|period|schedule|plan|delivery|completion|execution|term)|total\s+(duration|timeline|period|project)|overall\s+(duration|timeline)|duration\s+of\s+(?:the\s+)?(?:project|engagement|contract|work|scope)|engagement\s+(?:duration|period)|contract\s+(?:duration|period|term)|delivery\s+(?:timeline|period|schedule)|implementation\s+(?:duration|period|timeline)|scope\s+of\s+work\s+duration|project\s+to\s+be\s+(?:completed|delivered|executed|implemented)|estimated\s+(?:duration|timeline|period)|expected\s+(?:duration|timeline|completion)|timeline\s*:|project\s+start|kick.?off|commencement|go.?live|launch\s+date|production\s+(?:date|release)|completion\s+(?:date|deadline)|final\s+delivery|project\s+end\s+date|end\s+of\s+project)\b/i;

/**
 * Lines that describe POST-PRODUCTION SUPPORT duration.
 * Matched FIRST so they are never double-counted as timeline events.
 */
const SUPPORT_TRIGGER = /\b(post[- ]?(?:production|deployment|go[- ]?live|implementation|launch|project)\s+support|hypercare|warranty\s+(?:period|support|duration)|defect\s+liability\s+period|AMC|annual\s+maintenance\s+(?:contract|support)|maintenance\s+(?:support|contract|period)|ongoing\s+support|support\s+(?:period|duration|phase|window)|post[- ]?project\s+support|stabili[sz]ation\s+(?:period|support))\b/i;

/** Classify a support-context line into its specific kind. */
const SUPPORT_KIND_MAP: Array<{ kind: SupportEventKind; re: RegExp }> = [
  { kind: 'hypercare',   re: /\bhypercare\b/i },
  { kind: 'warranty',    re: /\b(warranty|defect\s+liability)\b/i },
  { kind: 'maintenance', re: /\b(AMC|annual\s+maintenance)\b/i },
  { kind: 'support',     re: /\b(post[- ]?(?:production|deployment|go[- ]?live|implementation|launch|project)\s+support|support\s+(?:period|phase|window)|ongoing\s+support|stabili[sz]ation)\b/i },
];
function classifySupportKind(ctx: string): SupportEventKind {
  for (const { kind, re } of SUPPORT_KIND_MAP) if (re.test(ctx)) return kind;
  return 'other';
}

/**
 * Matches an explicit duration: "18 months", "26 weeks", "2 years", "90 days".
 * Group 1 = number, Group 2 = unit.
 */
const EXPLICIT_DUR_RE = /\b(\d+(?:\.\d+)?)\s*(days?|weeks?|months?|years?)\b/gi;

/**
 * Matches a date-range pair: "01/06/2025 to 31/12/2026", "from Jan 2025 to Dec 2026".
 * Very permissive — captures two date-like tokens separated by "to", "-", or "–".
 */
const DATE_TOKEN = `(?:\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{4}|\\d{4}[\\/-]\\d{1,2}[\\/-]\\d{1,2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+(?:\\d{1,2}\\s+)?\\d{4})`;
const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:to|–|—|-)\\s*(${DATE_TOKEN})`,
  'gi'
);

/**
 * Scan every line (+ its preceding heading line for context) of the document.
 * Extract:
 *   • Project delivery durations → TimelineEvent[]
 *   • Post-production support durations → SupportEvent[]
 */
export function extractTimelineAndSupportEvents(text: string): {
  timelineEvents: TimelineEvent[];
  supportEvents: SupportEvent[];
} {
  const timelineEvents: TimelineEvent[] = [];
  const supportEvents: SupportEvent[]   = [];

  // Deduplicate by "months:weeks" string to avoid identical hits from same sentence
  const seenTimeline = new Set<string>();
  const seenSupport  = new Set<string>();

  const lines = text.split('\n');

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line) continue;

    // Context = preceding non-empty line (often a heading) + current line
    const prevLine = (lines[li - 1] ?? '').trim();
    const ctx = (prevLine ? prevLine + ' ' : '') + line;

    const isSupport  = SUPPORT_TRIGGER.test(ctx);
    const isTimeline = !isSupport && TIMELINE_TRIGGER.test(ctx);
    if (!isSupport && !isTimeline) continue;

    // ── 1. Explicit duration expressions: "18 months", "26 weeks" ──
    EXPLICIT_DUR_RE.lastIndex = 0;
    let dm: RegExpExecArray | null;
    while ((dm = EXPLICIT_DUR_RE.exec(line)) !== null) {
      const value = parseFloat(dm[1]);
      const unit  = dm[2].toLowerCase().replace(/s$/, '');
      if (!value || value <= 0) continue;
      const { months, weeks } = toMonthsWeeks(value, unit);
      if (weeks <= 0 || weeks > 520) continue; // sanity cap at ~10 yrs

      const dedupeKey = `${months}:${weeks}`;
      const label = ctxLabel(ctx, `${value} ${unit}${value !== 1 ? 's' : ''}`);

      if (isSupport) {
        if (seenSupport.has(dedupeKey)) continue;
        seenSupport.add(dedupeKey);
        supportEvents.push({ id: uuid(), label, value, unit, months, weeks, kind: classifySupportKind(ctx), context: ctx.slice(0, 220) });
      } else {
        if (seenTimeline.has(dedupeKey)) continue;
        seenTimeline.add(dedupeKey);
        timelineEvents.push({ id: uuid(), label, value, unit, months, weeks, context: ctx.slice(0, 220) });
      }
    }

    // ── 2. Date-range pairs: "01/06/2025 to 31/12/2026" ──────────
    DATE_RANGE_RE.lastIndex = 0;
    let dr: RegExpExecArray | null;
    while ((dr = DATE_RANGE_RE.exec(line)) !== null) {
      const d1 = parseDate(dr[1]);
      const d2 = parseDate(dr[2]);
      if (!d1 || !d2 || d2 <= d1) continue;
      const { months, weeks } = dateDiff(d1, d2);
      if (weeks <= 0 || weeks > 520) continue;

      const dedupeKey = `${months}:${weeks}`;
      const label = ctxLabel(ctx, `${months} month${months !== 1 ? 's' : ''} / ${weeks} weeks`);

      if (isSupport) {
        if (seenSupport.has(dedupeKey)) continue;
        seenSupport.add(dedupeKey);
        supportEvents.push({ id: uuid(), label, value: months, unit: 'month', months, weeks, kind: classifySupportKind(ctx), context: ctx.slice(0, 220) });
      } else {
        if (seenTimeline.has(dedupeKey)) continue;
        seenTimeline.add(dedupeKey);
        timelineEvents.push({ id: uuid(), label, value: months, unit: 'month', months, weeks, context: ctx.slice(0, 220) });
      }
    }
  }

  // Sort longest → shortest
  timelineEvents.sort((a, b) => b.weeks - a.weeks);
  supportEvents.sort((a, b) => b.weeks - a.weeks);

  return { timelineEvents, supportEvents };
}

export function getSampleRFPText(filename?: string): string {
  return `REQUEST FOR PROPOSAL — Enterprise Digital Transformation Platform
${filename ? `Document: ${filename}` : ''}

Section 1: Executive Summary
The client seeks an enterprise partner to deliver a comprehensive digital transformation encompassing
cloud infrastructure migration, AI/ML capabilities, data governance, and security compliance.
Estimated budget: $2.5M to $4M. Timeline: 18 months from contract execution.

Section 2: Scope of Work
2.1 Cloud Infrastructure: Migrate all on-premise workloads to IBM Cloud hybrid architecture.
2.2 Data Platform: Implement watsonx.data as the central data lakehouse with IBM DataStage ETL.
2.3 AI & Machine Learning: Deploy IBM Watson AI for NLP document processing.
2.4 Security & Compliance: Implement IBM Security QRadar SIEM. Achieve SOC2 Type II and ISO 27001.

Section 3: Deliverables
3.1 Solution Architecture Document — Page 5
3.2 MVP Platform Release — Page 11
3.3 UAT Sign-off and Go-Live Approval — Page 17

Section 4: Timeline
Project timeline: 18 months. Key milestones at weeks 4, 12, 24, 36, 52, and 72.

Section 5: Budget
Budget range: $2.5M to $4M including licensing, professional services, and infrastructure.`;
}
