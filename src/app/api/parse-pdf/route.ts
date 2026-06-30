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

// ── This route is DEPRECATED — PDF parsing is now done client-side via pdfjs-dist.
// Any remaining call here is from a stale browser cache. Return a small JSON payload
// (NOT a 413) so old bundles fail gracefully instead of triggering the platform cap.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'DEPRECATED',
      message: 'PDF parsing is now handled client-side. Please hard-refresh the page (Ctrl+Shift+R) to load the latest version.',
    },
    {
      status: 410, // 410 Gone — route intentionally retired
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
