import { NextRequest, NextResponse } from 'next/server';

// ── FX Rate API ────────────────────────────────────────────────
// Uses exchangerate-api.com open endpoint — no API key required for USD base.
// Falls back to hardcoded rates if the external call fails so the UI is never broken.

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  AUD: 1.53,
  CAD: 1.36,
  SGD: 1.34,
  AED: 3.67,
};

let cache: { rates: Record<string, number>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(_req: NextRequest) {
  try {
    // Return cached rates if fresh
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json({ rates: cache.rates, source: 'cache' });
    }

    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`FX API returned ${res.status}`);
    const data = await res.json();

    // Filter to currencies we surface in the UI
    const keys = Object.keys(FALLBACK_RATES);
    const rates: Record<string, number> = {};
    keys.forEach(k => { rates[k] = data.rates?.[k] ?? FALLBACK_RATES[k]; });

    cache = { rates, fetchedAt: Date.now() };
    return NextResponse.json({ rates, source: 'live' });
  } catch {
    // Silently fall back — UI still works with approximate rates
    return NextResponse.json({ rates: FALLBACK_RATES, source: 'fallback' });
  }
}
