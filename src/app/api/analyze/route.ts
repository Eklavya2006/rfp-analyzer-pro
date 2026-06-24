import { NextRequest, NextResponse } from 'next/server';
import { runFullAnalysis } from '@/lib/orchestrator';
import { getSampleRFPText } from '@/lib/parser';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, filename, rawText } = body;

    if (!documentId || !filename) {
      return NextResponse.json({ error: 'documentId and filename are required' }, { status: 400 });
    }

    // Use provided rawText or fall back to sample
    const text = rawText || getSampleRFPText(filename);

    // Simulate processing delay for UX
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const result = await runFullAnalysis(documentId, text, filename);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error('[analyze] Error:', error);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
