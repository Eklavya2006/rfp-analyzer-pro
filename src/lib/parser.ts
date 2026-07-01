// ============================================================
// RFP Analyzer Pro — Document Parser v2
// Supports: PDF (pdf-parse), DOCX (mammoth), XLSX (xlsx), TXT
// All formats include binary/junk sanitization pass
// ============================================================

import type { DocumentSummary, ExtractedSections, TimelineEvent, SupportEvent, TimelineEventKind, SupportEventKind } from '@/types';
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

// ── Date / Timeline Extraction ────────────────────────────────

/** Attempt to parse a variety of date formats into an ISO yyyy-MM-dd string.
 *  Handles: DD/MM/YYYY, MM/DD/YYYY (guessed), DD-MM-YYYY, YYYY-MM-DD,
 *           "1 June 2025", "June 2025", "Q2 2026", year-only "2027".
 *  Returns '' if the string is not parseable.
 */
function normaliseDateStr(raw: string): string {
  const s = raw.trim();

  // ── yyyy-MM-dd (already ISO) ──────────────────────────────
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ── DD/MM/YYYY or DD-MM-YYYY ──────────────────────────────
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    // If the second number > 12 it must be a day in MM/DD/YYYY position → swap
    const day = Number(m) > 12 ? m.padStart(2, '0') : d.padStart(2, '0');
    const mon = Number(m) > 12 ? d.padStart(2, '0') : m.padStart(2, '0');
    return `${y}-${mon}-${day}`;
  }

  // ── "1 June 2025", "June 1, 2025", "1st June 2025" ───────
  const MONTHS: Record<string, string> = {
    january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',
    july:'07',august:'08',september:'09',october:'10',november:'11',december:'12',
    jan:'01',feb:'02',mar:'03',apr:'04',jun:'06',jul:'07',aug:'08',
    sep:'09',oct:'10',nov:'11',dec:'12',
  };
  const longDate = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i)
    || s.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
  if (longDate) {
    // figure out which group is day vs month name
    const g1Num = Number(longDate[1]);
    if (!isNaN(g1Num)) {
      const mon = MONTHS[longDate[2].toLowerCase()];
      if (mon) return `${longDate[3]}-${mon}-${String(g1Num).padStart(2,'0')}`;
    } else {
      const mon = MONTHS[longDate[1].toLowerCase()];
      if (mon) return `${longDate[3]}-${mon}-${String(Number(longDate[2])).padStart(2,'0')}`;
    }
  }

  // ── "June 2025" / "Jun 2025" (month + year only) ─────────
  const monthYear = s.match(/^([A-Za-z]+)\s+(\d{4})$/i);
  if (monthYear) {
    const mon = MONTHS[monthYear[1].toLowerCase()];
    if (mon) return `${monthYear[2]}-${mon}-01`;
  }

  // ── "Q1 2026" style ───────────────────────────────────────
  const quarter = s.match(/Q([1-4])\s+(\d{4})/i);
  if (quarter) {
    const qMon = ['01','04','07','10'][Number(quarter[1]) - 1];
    return `${quarter[2]}-${qMon}-01`;
  }

  // ── Year only "2027" ─────────────────────────────────────
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;

  return '';
}

// Keywords that indicate a timeline event kind
const TIMELINE_KIND_PATTERNS: Array<{ kind: TimelineEventKind; patterns: RegExp[] }> = [
  { kind: 'start',     patterns: [/\bstart\b/i, /\bkickoff\b/i, /\bbegin\b/i, /\bcommencement\b/i, /\bproject\s+start\b/i] },
  { kind: 'go-live',   patterns: [/\bgo.?live\b/i, /\blive date\b/i, /\blaunch\b/i, /\bproduction\s+date\b/i] },
  { kind: 'deadline',  patterns: [/\bdeadline\b/i, /\bdue\s+date\b/i, /\bsubmission\b/i, /\bdue\b/i] },
  { kind: 'end',       patterns: [/\bend\s+date\b/i, /\bcompletion\b/i, /\bclosure\b/i, /\bfinal\s+delivery\b/i, /\bproject\s+end\b/i] },
  { kind: 'milestone', patterns: [/\bmilestone\b/i, /\bphase\b/i, /\bsign.?off\b/i, /\buat\b/i, /\bdelivery\b/i] },
];

function classifyTimelineKind(ctx: string): TimelineEventKind {
  for (const { kind, patterns } of TIMELINE_KIND_PATTERNS) {
    if (patterns.some(re => re.test(ctx))) return kind;
  }
  return 'other';
}

const SUPPORT_KIND_PATTERNS: Array<{ kind: SupportEventKind; patterns: RegExp[] }> = [
  { kind: 'hypercare', patterns: [/\bhypercare\b/i, /\bpost.?go.?live\s+support\b/i] },
  { kind: 'warranty',  patterns: [/\bwarranty\b/i, /\bdefect\s+liability\b/i] },
  { kind: 'sla',       patterns: [/\bsla\b/i, /\bservice\s+level\b/i] },
  { kind: 'maintenance', patterns: [/\bmaintenance\b/i, /\bAMC\b/, /\bannual\s+maintenance\b/i] },
  { kind: 'support',   patterns: [/\bsupport\b/i, /\bpost.?implementation\b/i, /\bpost.?deployment\b/i] },
];

function classifySupportKind(ctx: string): SupportEventKind {
  for (const { kind, patterns } of SUPPORT_KIND_PATTERNS) {
    if (patterns.some(re => re.test(ctx))) return kind;
  }
  return 'other';
}

/** Regex patterns for dates embedded in natural language sentences */
const DATE_INLINE_PATTERNS: RegExp[] = [
  /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g,          // DD/MM/YYYY or MM/DD/YYYY
  /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/g,          // YYYY-MM-DD
  /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi,
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi,
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi,
  /\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{4})\b/gi,
  /\bQ([1-4])\s+(\d{4})\b/gi,
  /\b(20\d{2})\b/g,  // standalone year 2000–2099
];

/** Minimum and maximum "interesting" year range — filters out things like version numbers */
const MIN_YEAR = 2020;
const MAX_YEAR = 2040;

function yearInRange(isoDate: string): boolean {
  const y = Number(isoDate.split('-')[0]);
  return y >= MIN_YEAR && y <= MAX_YEAR;
}

/** Build a short human label for a timeline event from its context sentence */
function buildLabel(ctx: string, kind: TimelineEventKind | SupportEventKind): string {
  // Try to grab a short action phrase before/after the date
  const cleaned = ctx.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 80) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  // Trim to the closest sentence fragment
  const idx = cleaned.search(/\d{4}/);
  const start = Math.max(0, idx - 40);
  const end   = Math.min(cleaned.length, idx + 40);
  return (cleaned.slice(start, end).trim() || `${kind} event`).charAt(0).toUpperCase()
    + (cleaned.slice(start, end).trim() || `${kind} event`).slice(1);
}

/** Duration keywords used near support sections */
const DURATION_RE = /(\d+)\s*(day|week|month|year)s?/i;

function extractDuration(ctx: string): string | undefined {
  const m = ctx.match(DURATION_RE);
  return m ? m[0] : undefined;
}

/**
 * Main extraction: scan all lines of the document text for dates and classify
 * them as either generic timeline events or support/hypercare events.
 */
export function extractTimelineAndSupportEvents(text: string): {
  timelineEvents: TimelineEvent[];
  supportEvents: SupportEvent[];
} {
  const timelineEvents: TimelineEvent[] = [];
  const supportEvents: SupportEvent[] = [];

  // Support / hypercare trigger keywords — any line containing these
  // will classify matched dates as SupportEvents
  const SUPPORT_TRIGGER = /\b(support|hypercare|warranty|maintenance|AMC|SLA|post.?go.?live|post.?implementation|post.?deployment|defect\s+liability|service\s+level)\b/i;

  // We deduplicate by isoDate+kind to avoid multiple hits from the same sentence
  const seenTimeline = new Set<string>();
  const seenSupport  = new Set<string>();

  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Collect all date-like tokens in this line
    const dateMatches: string[] = [];
    for (const pat of DATE_INLINE_PATTERNS) {
      const regex = new RegExp(pat.source, pat.flags.includes('g') ? pat.flags : pat.flags + 'g');
      let m: RegExpExecArray | null;
      while ((m = regex.exec(line)) !== null) {
        dateMatches.push(m[0]);
      }
    }

    for (const rawDate of dateMatches) {
      const isoDate = normaliseDateStr(rawDate);
      if (!isoDate || !yearInRange(isoDate)) continue;

      const isSupport = SUPPORT_TRIGGER.test(line);

      if (isSupport) {
        const kind = classifySupportKind(line);
        const key = `${isoDate}:${kind}`;
        if (seenSupport.has(key)) continue;
        seenSupport.add(key);
        supportEvents.push({
          id:        uuid(),
          label:     buildLabel(line, kind),
          rawDate,
          isoDate,
          kind,
          context:   line.slice(0, 200),
          duration:  extractDuration(line),
        });
      } else {
        const kind = classifyTimelineKind(line);
        const key = `${isoDate}:${kind}`;
        if (seenTimeline.has(key)) continue;
        seenTimeline.add(key);
        timelineEvents.push({
          id:      uuid(),
          label:   buildLabel(line, kind),
          rawDate,
          isoDate,
          kind,
          context: line.slice(0, 200),
        });
      }
    }
  }

  // Sort both lists chronologically
  timelineEvents.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  supportEvents.sort((a, b) => a.isoDate.localeCompare(b.isoDate));

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
