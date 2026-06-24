import { NextRequest, NextResponse } from 'next/server';
import { generateId } from '@/lib/utils';
import { extractTextFromFile, generateSummary, extractSections } from '@/lib/parser';
import type { RFPDocument } from '@/types';

// Accepted file types
const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
]);
const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.has(file.type) && !file.name.match(/\.(pdf|docx|doc|txt)$/i)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Accepted: PDF, DOCX, TXT` },
        { status: 422 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE_MB}MB` },
        { status: 422 }
      );
    }

    const documentId = generateId();

    // In production: persist file to storage (S3, etc.)
    // For demo: extract text immediately
    const rawText = await file.text().catch(() => '');

    // Generate summary synchronously (fast)
    const summary = generateSummary(rawText || '', file.name);
    const sections = extractSections(rawText || '');

    const document: RFPDocument = {
      id: documentId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing',
      uploadedAt: new Date().toISOString(),
      summary,
      extractedSections: sections,
    };

    return NextResponse.json({ document, documentId }, { status: 201 });
  } catch (error) {
    console.error('[upload] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during upload' },
      { status: 500 }
    );
  }
}
