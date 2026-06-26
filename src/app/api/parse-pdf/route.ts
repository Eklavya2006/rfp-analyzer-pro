// ============================================================
// /api/parse-pdf  — Server-side PDF text extraction
// Uses pdf-parse v1.1.1 (Node.js only — never runs in browser)
// Client POSTs FormData with a single "file" field (the PDF).
// Returns: { text: string; pageCount: number }
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

export const runtime    = 'nodejs';
export const maxDuration = 30; // Vercel hobby plan limit

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate it is actually a PDF
    const isPDF =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    if (!isPDF) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 422 });
    }

    // Read into a Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Import pdf-parse v1.1.1 — module.exports IS the function directly
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (
      buf: Buffer,
      opts?: object,
    ) => Promise<{ text: string; numpages: number }>;

    const parsed    = await pdfParse(buffer, { max: 0 });
    const text      = parsed.text?.trim() ?? '';
    const pageCount = parsed.numpages > 0
      ? parsed.numpages
      : Math.max(1, Math.round(text.split(/\s+/).length / 300));

    return NextResponse.json({ text, pageCount });

  } catch (err) {
    console.error('[parse-pdf] Error:', err);
    return NextResponse.json(
      { error: 'PDF parsing failed', detail: String(err) },
      { status: 500 },
    );
  }
}
