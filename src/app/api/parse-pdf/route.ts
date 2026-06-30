// ============================================================
// /api/parse-pdf  — Server-side PDF text extraction
// Uses pdf-parse v1.1.1 (Node.js only — never runs in browser)
// Client POSTs FormData with a single "file" field (the PDF).
// Returns: { text: string; pageCount: number }
//          or structured error JSON on failure
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

export const runtime         = 'nodejs';
export const maxDuration     = 30;   // Vercel hobby plan limit
// Raise Next.js body-size limit for this route (default is 4 MB).
// experimental.serverActions.bodySizeLimit only covers Server Actions — not Route Handlers.
// This segment config is the correct way to increase the limit for a Route Handler.
export const dynamic         = 'force-dynamic';
export const preferredRegion = 'auto';
// Next.js 15 App Router: set body size limit via route segment config
export const maxRequestBodySize = '30mb';

// ── TASK 4 FIX — root cause of the 500 error ─────────────────────────────────
// pdf-parse/index.js contains a top-level `if (!module.parent)` debug block that
// calls Fs.readFileSync('./test/data/05-versions-space.pdf').  In Node.js ≥14 and
// in Next.js module resolution, `module.parent` is undefined when the module is
// first required as a CJS module from an ESM context, so `!module.parent === true`
// and the readFileSync runs immediately — throwing ENOENT and crashing the route.
//
// Fix: require the inner implementation file directly, bypassing index.js entirely.
// This is the officially recommended workaround for this known pdf-parse issue.

// ── Structured error codes ──────────────────────────────────────
const PDF_ERRORS: Record<string, string> = {
  NO_FILE:         'No file provided in the request body.',
  WRONG_TYPE:      'Uploaded file is not a PDF. Only .pdf files are accepted.',
  EMPTY_FILE:      'Uploaded file is empty (0 bytes). Upload completed unsuccessfully.',
  BUFFER_READ:     'Unable to read the uploaded buffer. The upload may have been interrupted.',
  PDF_ENCRYPTED:   'PDF is password-protected or encrypted. Remove protection and re-upload.',
  PDF_CORRUPTED:   'Invalid or corrupted PDF structure. Try re-saving the file as PDF/A.',
  PDF_VERSION:     'Unsupported PDF version. Ensure the file is PDF 1.4 or later.',
  PDF_EOF:         'Unexpected end-of-file. The PDF upload may have been truncated.',
  PDF_XREF:        'Corrupted cross-reference table detected in PDF.',
  PARSE_TIMEOUT:   'PDF parsing timed out. Try a smaller or simpler PDF.',
  PARSE_GENERIC:   'PDF parsing failed. See "details" and "stack" fields for the full error.',
};

function classifyPDFError(err: unknown): { code: string; message: string } {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  if (msg.includes('encrypt') || msg.includes('password'))
    return { code: 'PDF_ENCRYPTED',  message: PDF_ERRORS.PDF_ENCRYPTED };
  if (msg.includes('invalid pdf') || msg.includes('not a pdf') || msg.includes('bad xref'))
    return { code: 'PDF_CORRUPTED',  message: PDF_ERRORS.PDF_CORRUPTED };
  if (msg.includes('version'))
    return { code: 'PDF_VERSION',    message: PDF_ERRORS.PDF_VERSION };
  if (msg.includes('unexpected end') || msg.includes('eof'))
    return { code: 'PDF_EOF',        message: PDF_ERRORS.PDF_EOF };
  if (msg.includes('xref'))
    return { code: 'PDF_XREF',       message: PDF_ERRORS.PDF_XREF };
  if (msg.includes('timeout'))
    return { code: 'PARSE_TIMEOUT',  message: PDF_ERRORS.PARSE_TIMEOUT };
  return { code: 'PARSE_GENERIC',    message: PDF_ERRORS.PARSE_GENERIC };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ── 1. Parse multipart form data ──────────────────────────────
  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get('file') as File | null;
  } catch (err) {
    console.error('[parse-pdf] FormData parse error:', err);
    return NextResponse.json({
      success: false, error: 'FORM_PARSE_ERROR',
      message: 'Failed to parse multipart form data.',
      details: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      timeTaken: `${Date.now() - startTime}ms`,
    }, { status: 400 });
  }

  // ── 2. Validate file presence ─────────────────────────────────
  if (!file) {
    return NextResponse.json({
      success: false, error: 'NO_FILE',
      message: PDF_ERRORS.NO_FILE,
      timeTaken: `${Date.now() - startTime}ms`,
    }, { status: 400 });
  }

  // ── 3. Validate MIME / extension ─────────────────────────────
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPDF) {
    return NextResponse.json({
      success: false, error: 'WRONG_TYPE',
      message: PDF_ERRORS.WRONG_TYPE,
      fileName: file.name, fileMime: file.type,
      timeTaken: `${Date.now() - startTime}ms`,
    }, { status: 422 });
  }

  // ── 4. Validate file size ─────────────────────────────────────
  if (file.size === 0) {
    return NextResponse.json({
      success: false, error: 'EMPTY_FILE',
      message: PDF_ERRORS.EMPTY_FILE,
      fileName: file.name, fileSize: '0 bytes',
      timeTaken: `${Date.now() - startTime}ms`,
    }, { status: 422 });
  }

  console.log(`[parse-pdf] Request received — file: "${file.name}", size: ${file.size} bytes, mime: "${file.type}"`);

  // ── 5. Read buffer ────────────────────────────────────────────
  let buffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) throw new Error('arrayBuffer is empty after read');
    buffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('[parse-pdf] Buffer read error:', err);
    return NextResponse.json({
      success: false, error: 'BUFFER_READ',
      message: PDF_ERRORS.BUFFER_READ,
      fileName: file.name, fileSize: `${file.size} bytes`,
      details: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      timeTaken: `${Date.now() - startTime}ms`,
    }, { status: 500 });
  }

  // ── 6. Confirm PDF magic bytes ────────────────────────────────
  const magic = buffer.slice(0, 5).toString('ascii');
  if (!magic.startsWith('%PDF')) {
    console.warn(`[parse-pdf] Bad magic bytes: "${magic}" — file: "${file.name}"`);
    return NextResponse.json({
      success: false, error: 'PDF_CORRUPTED',
      message: `${PDF_ERRORS.PDF_CORRUPTED} (Magic bytes: "${magic}")`,
      fileName: file.name, fileSize: `${file.size} bytes`,
      parser: 'pdf-parse@1.1.1',
      timeTaken: `${Date.now() - startTime}ms`,
    }, { status: 422 });
  }

  // ── 7. Parse PDF ──────────────────────────────────────────────
  try {
    // TASK 4 FIX: Require the inner lib directly to avoid the index.js debug block
    // that crashes when module.parent is undefined (Next.js ESM/CJS interop).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
      buf: Buffer,
      opts?: object,
    ) => Promise<{ text: string; numpages: number; info?: Record<string, unknown> }>;

    console.log(`[parse-pdf] Parsing with pdf-parse/lib/pdf-parse.js — ${buffer.length} bytes`);
    const parsed    = await pdfParse(buffer, { max: 0 });
    const text      = parsed.text?.trim() ?? '';
    const pageCount = parsed.numpages > 0
      ? parsed.numpages
      : Math.max(1, Math.round(text.split(/\s+/).length / 300));

    const timeTaken = `${Date.now() - startTime}ms`;
    console.log(`[parse-pdf] Success — pages: ${pageCount}, chars: ${text.length}, time: ${timeTaken}`);

    return NextResponse.json({ success: true, text, pageCount, timeTaken });

  } catch (err) {
    const { code, message } = classifyPDFError(err);
    const timeTaken = `${Date.now() - startTime}ms`;
    console.error(`[parse-pdf] Parse error (${code}):`, err);
    return NextResponse.json({
      success: false, error: code, message,
      details: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      fileName: file.name,
      fileSize: `${file.size} bytes`,
      parser: 'pdf-parse@1.1.1',
      timeTaken,
      suggestions: [
        'Check whether the PDF is corrupted.',
        'Remove password protection if present.',
        'Try saving as PDF/A format.',
        'Ensure the upload completed without interruption.',
        'Try uploading as DOCX or TXT instead.',
      ],
    }, { status: 500 });
  }
}
