import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// ── In-memory report store ────────────────────────────────────
// Stores report snapshots keyed by a random token.
// TTL: 7 days. Sufficient for email sharing without a database.
interface ReportEntry {
  payload: unknown;
  createdAt: number;
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const store  = new Map<string, ReportEntry>();

// Purge expired entries on each write
function purge() {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (now - val.createdAt > TTL_MS) store.delete(key);
  }
}

// POST /api/email-report  — store payload, return { token, url }
export async function POST(req: NextRequest) {
  const payload = await req.json();
  purge();
  const token = randomBytes(16).toString('hex');
  store.set(token, { payload, createdAt: Date.now() });
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const basePath = process.env.NODE_ENV === 'development' ? '' : (process.env.NEXT_PUBLIC_BASE_PATH ?? '');
  const url = `${base}${basePath}/report/${token}`;
  return NextResponse.json({ token, url });
}

// GET /api/email-report?token=xxx  — retrieve stored payload
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 });
  const entry = store.get(token);
  if (!entry) return NextResponse.json({ error: 'not found or expired' }, { status: 404 });
  return NextResponse.json(entry.payload);
}
