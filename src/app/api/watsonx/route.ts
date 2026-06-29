import { NextRequest, NextResponse } from 'next/server';

// ── watsonx.ai API route ───────────────────────────────────────
// Requires env vars: WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_URL (optional, defaults to us-south)
// Falls back gracefully to mockEngine if any env var is missing.
//
// Model used: ibm/granite-13b-instruct-v2 (available on all IBM Cloud regions)

const WATSONX_URL = process.env.WATSONX_URL ?? 'https://us-south.ml.cloud.ibm.com';
const MODEL_ID    = 'ibm/granite-13b-instruct-v2';

async function getIAMToken(apiKey: string): Promise<string> {
  const res = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`,
  });
  if (!res.ok) throw new Error(`IAM token fetch failed: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  const apiKey    = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;

  // ── Guard: fall back to mock if not configured ─────────────
  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: 'watsonx not configured', fallback: true },
      { status: 200 }   // 200 so client knows to use mock, not a hard failure
    );
  }

  try {
    const { prompt } = await req.json() as { prompt: string };
    const token = await getIAMToken(apiKey);

    const body = {
      model_id: MODEL_ID,
      project_id: projectId,
      input: prompt,
      parameters: {
        decoding_method: 'greedy',
        max_new_tokens: 900,
        min_new_tokens: 50,
        stop_sequences: ['###'],
        temperature: 0.3,
      },
    };

    const res = await fetch(`${WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`watsonx returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const generated = data.results?.[0]?.generated_text ?? '';
    return NextResponse.json({ text: generated, source: 'watsonx' });
  } catch (err) {
    console.error('[watsonx]', err);
    return NextResponse.json({ error: String(err), fallback: true }, { status: 200 });
  }
}
