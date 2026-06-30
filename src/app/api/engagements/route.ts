// ============================================================
// RFP Analyzer Pro — /api/engagements
// Fetches Closed Won / Closed Lost Opportunities from IBM's
// Salesforce org (ibmsc) via the REST API and maps them to the
// HistoricalEngagement type consumed by the similarity engine.
//
// Authentication: OAuth 2.0 Client Credentials flow
//   SF_INSTANCE_URL  — https://ibmsc.my.salesforce.com
//   SF_CLIENT_ID     — Connected App Consumer Key
//   SF_CLIENT_SECRET — Connected App Consumer Secret
//
// When credentials are absent or the request fails the route
// returns an empty array (200) so the UI falls back to the
// built-in seed dataset — no user-visible error.
// ============================================================

import { NextResponse } from 'next/server';
import type { HistoricalEngagement, LossReason } from '@/types';

// ── Response is cached for 1 hour at the CDN edge ───────────
export const revalidate = 3600;

// ── Salesforce Opportunity field shape returned by SOQL ──────
interface SFOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  /** Custom field — IBM Sales Cloud industry vertical */
  Industry__c: string | null;
  /** Custom field — IBM service line / practice */
  ServiceType__c: string | null;
  /** Custom field — client geography region */
  Geography__c: string | null;
  /** Custom field — onshore / offshore / hybrid */
  DeliveryModel__c: string | null;
  /** Custom field — engagement duration in calendar weeks */
  DurationWeeks__c: number | null;
  /** Custom field — semicolon-separated technology names */
  Technologies__c: string | null;
  /** Custom field — semicolon-separated keyword tokens */
  Keywords__c: string | null;
  /** Custom field — semicolon-separated winning attributes (WON only) */
  WinningAttributes__c: string | null;
  /** Custom field — semicolon-separated loss reasons (LOST only) */
  LossReasons__c: string | null;
  /** Custom field — free-text lessons learned */
  LessonsLearned__c: string | null;
  Account: { Name: string } | null;
}

interface SFQueryResponse {
  totalSize: number;
  done: boolean;
  records: SFOpportunity[];
}

interface SFTokenResponse {
  access_token: string;
  instance_url: string;
  error?: string;
  error_description?: string;
}

// ── SOQL ─────────────────────────────────────────────────────
const SOQL = `
  SELECT
    Id, Name, StageName, Amount, CloseDate,
    Industry__c, ServiceType__c, Geography__c,
    DeliveryModel__c, DurationWeeks__c,
    Technologies__c, Keywords__c,
    WinningAttributes__c, LossReasons__c,
    LessonsLearned__c, Account.Name
  FROM Opportunity
  WHERE StageName IN ('Closed Won', 'Closed Lost')
    AND CloseDate >= LAST_N_YEARS:5
  ORDER BY CloseDate DESC
  LIMIT 200
`.replace(/\s+/g, ' ').trim();

// ── Token acquisition (Client Credentials flow) ──────────────

/**
 * Exchange client credentials for a Salesforce access token.
 * Throws if the response is not OK or token is missing.
 */
async function getAccessToken(instanceUrl: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });

  const json: SFTokenResponse = await res.json();

  if (!res.ok || !json.access_token) {
    throw new Error(
      `Salesforce auth failed: ${json.error ?? res.status} — ${json.error_description ?? ''}`
    );
  }

  return json.access_token;
}

// ── Field helpers ─────────────────────────────────────────────

/** Split a semicolon-delimited SF multi-select picklist string. */
function splitSF(val: string | null, toLower = false): string[] {
  if (!val) return [];
  const parts = val.split(';').map((s) => s.trim()).filter(Boolean);
  return toLower ? parts.map((s) => s.toLowerCase()) : parts;
}

/**
 * Parse LossReasons__c into structured LossReason objects.
 * Expected format: "Category: reason text" per semicolon-delimited segment.
 * Falls back to a single generic entry when the format is free-form.
 */
function parseLossReasons(raw: string | null): LossReason[] {
  if (!raw) return [];
  return raw.split(';').map((segment) => {
    const trimmed = segment.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      return {
        category: trimmed.slice(0, colonIdx).trim(),
        reason:   trimmed.slice(colonIdx + 1).trim(),
        mitigationForCurrentProposal:
          'Review this pattern and address it explicitly in your proposal.',
      };
    }
    return {
      category: 'General',
      reason:   trimmed,
      mitigationForCurrentProposal:
        'Review this pattern and address it explicitly in your proposal.',
    };
  }).filter((lr) => lr.reason.length > 0);
}

// ── Mapping ───────────────────────────────────────────────────

/**
 * Map a Salesforce Opportunity record to the HistoricalEngagement
 * interface expected by the similarity engine.
 */
function mapOpportunity(opp: SFOpportunity): HistoricalEngagement {
  const isWon = opp.StageName === 'Closed Won';

  return {
    id:               opp.Id,
    clientName:       opp.Account?.Name ?? 'Unknown Client',
    projectTitle:     opp.Name,
    industry:         opp.Industry__c ?? '',
    serviceType:      opp.ServiceType__c ?? '',
    geography:        opp.Geography__c ?? '',
    deliveryModel:    opp.DeliveryModel__c ?? 'Hybrid',
    contractValueUSD: opp.Amount ?? 0,
    durationWeeks:    opp.DurationWeeks__c ?? 0,
    technologies:     splitSF(opp.Technologies__c),
    keywords:         splitSF(opp.Keywords__c, true),
    outcome:          isWon ? 'WON' : 'LOST',
    winningAttributes: isWon ? splitSF(opp.WinningAttributes__c) : [],
    lossReasons:      isWon ? [] : parseLossReasons(opp.LossReasons__c),
    lessonsLearned:   opp.LessonsLearned__c ?? '',
    confidenceContrib: isWon ? 0.8 : 0,
    sourceTag:        'Salesforce CRM',
  };
}

// ── Route handler ─────────────────────────────────────────────

export async function GET() {
  // ── Guard: skip entirely if credentials are not configured ──
  const instanceUrl  = process.env.SF_INSTANCE_URL;
  const clientId     = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;

  if (!instanceUrl || !clientId || !clientSecret) {
    // No credentials → return empty; UI falls back to seed data
    return NextResponse.json([] as HistoricalEngagement[], { status: 200 });
  }

  try {
    // 1. Authenticate
    const token = await getAccessToken(instanceUrl, clientId, clientSecret);

    // 2. Query
    const queryUrl = `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(SOQL)}`;
    const queryRes = await fetch(queryUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      // 10-second timeout via AbortController
      signal: AbortSignal.timeout(10_000),
    });

    if (!queryRes.ok) {
      const err = await queryRes.text();
      throw new Error(`Salesforce query failed ${queryRes.status}: ${err.slice(0, 200)}`);
    }

    const data: SFQueryResponse = await queryRes.json();
    const engagements: HistoricalEngagement[] = data.records.map(mapOpportunity);

    return NextResponse.json(engagements, {
      status: 200,
      headers: {
        // CDN-level cache: fresh for 1 h, serve stale up to 24 h while revalidating
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });

  } catch (err) {
    // Log server-side only — never leak credentials or SF details to client
    console.error('[api/engagements] Salesforce fetch error:', err instanceof Error ? err.message : err);

    // Return empty array — UI gracefully falls back to seed dataset
    return NextResponse.json([] as HistoricalEngagement[], { status: 200 });
  }
}
