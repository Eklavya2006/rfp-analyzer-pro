// ============================================================
// RFP Analyzer Pro — /api/engagements
// Fetches Closed Won / Closed Lost Opportunities from IBM's
// Salesforce org (ibmsc) via the REST API and maps them to the
// HistoricalEngagement type consumed by the similarity engine.
//
// ── Mode selection (checked in order) ───────────────────────
// 1. SF_MOCK_MODE=true  → calls internal /api/sf-mock/* routes
//    (demo data, no credentials required — works immediately)
//
// 2. SF_INSTANCE_URL + SF_CLIENT_ID + SF_CLIENT_SECRET set →
//    calls real ibmsc Salesforce REST API (production)
//
// 3. None of the above → returns [] (200); UI falls back to
//    the built-in 20-record seed dataset automatically.
//
// ── Environment variables ────────────────────────────────────
// SF_MOCK_MODE       "true" to enable demo mode
// SF_INSTANCE_URL    https://ibmsc.my.salesforce.com
// SF_CLIENT_ID       Connected App Consumer Key
// SF_CLIENT_SECRET   Connected App Consumer Secret
// NEXT_PUBLIC_BASE_URL  Used by mock to resolve self-calls
//                       (auto-set by Vercel; set to
//                        http://localhost:3000 for local dev)
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
  Industry__c: string | null;
  ServiceType__c: string | null;
  Geography__c: string | null;
  DeliveryModel__c: string | null;
  DurationWeeks__c: number | null;
  Technologies__c: string | null;
  Keywords__c: string | null;
  WinningAttributes__c: string | null;
  LossReasons__c: string | null;
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

async function getAccessToken(
  instanceUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const res = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method:  'POST',
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

function splitSF(val: string | null, toLower = false): string[] {
  if (!val) return [];
  const parts = val.split(';').map((s) => s.trim()).filter(Boolean);
  return toLower ? parts.map((s) => s.toLowerCase()) : parts;
}

function parseLossReasons(raw: string | null): LossReason[] {
  if (!raw) return [];
  return raw.split(';').map((segment) => {
    const trimmed  = segment.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      return {
        category: trimmed.slice(0, colonIdx).trim(),
        reason:   trimmed.slice(colonIdx + 1).trim(),
        mitigationForCurrentProposal:
          'Review this loss pattern and address it explicitly in your proposal strategy.',
      };
    }
    return {
      category: 'General',
      reason:   trimmed,
      mitigationForCurrentProposal:
        'Review this loss pattern and address it explicitly in your proposal strategy.',
    };
  }).filter((lr) => lr.reason.length > 0);
}

// ── Mapping ───────────────────────────────────────────────────

function mapOpportunity(opp: SFOpportunity, sourceTag: string): HistoricalEngagement {
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
    sourceTag,
  };
}

// ── Mock mode fetcher ─────────────────────────────────────────

/**
 * Fetch engagements from the internal mock Salesforce endpoints.
 * Calls /api/sf-mock/token then /api/sf-mock/query — no external
 * network traffic, no credentials required.
 */
async function fetchMockEngagements(baseUrl: string): Promise<HistoricalEngagement[]> {
  // 1. Get mock token
  const tokenRes = await fetch(`${baseUrl}/api/sf-mock/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ grant_type: 'client_credentials', client_id: 'mock', client_secret: 'mock' }),
  });
  const { access_token } = await tokenRes.json() as SFTokenResponse;

  // 2. Query mock data
  const queryRes = await fetch(
    `${baseUrl}/api/sf-mock/query?q=${encodeURIComponent(SOQL)}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const data: SFQueryResponse = await queryRes.json();
  return data.records.map((opp) => mapOpportunity(opp, 'Salesforce CRM'));
}

// ── Real Salesforce fetcher ───────────────────────────────────

async function fetchLiveEngagements(
  instanceUrl: string,
  clientId: string,
  clientSecret: string
): Promise<HistoricalEngagement[]> {
  const token    = await getAccessToken(instanceUrl, clientId, clientSecret);
  const queryUrl = `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(SOQL)}`;
  const queryRes = await fetch(queryUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal:  AbortSignal.timeout(10_000),
  });
  if (!queryRes.ok) {
    const err = await queryRes.text();
    throw new Error(`Salesforce query failed ${queryRes.status}: ${err.slice(0, 200)}`);
  }
  const data: SFQueryResponse = await queryRes.json();
  return data.records.map((opp) => mapOpportunity(opp, 'Salesforce CRM'));
}

// ── Route handler ─────────────────────────────────────────────

export async function GET() {
  const mockMode   = process.env.SF_MOCK_MODE === 'true';
  const instanceUrl  = process.env.SF_INSTANCE_URL;
  const clientId     = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;

  // ── Mock mode: use internal demo endpoints ─────────────────
  if (mockMode) {
    try {
      // Resolve base URL for self-calling internal Next.js routes.
      // Priority: explicit env var → Vercel auto URL → local dev default.
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ??
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000');

      const engagements = await fetchMockEngagements(baseUrl);
      return NextResponse.json(engagements, {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'X-Data-Source': 'mock',
        },
      });
    } catch (err) {
      console.error('[api/engagements] Mock fetch error:', err instanceof Error ? err.message : err);
      return NextResponse.json([] as HistoricalEngagement[], { status: 200 });
    }
  }

  // ── Production mode: real Salesforce ─────────────────────
  if (!instanceUrl || !clientId || !clientSecret) {
    // No credentials — UI falls back to built-in seed data
    return NextResponse.json([] as HistoricalEngagement[], { status: 200 });
  }

  try {
    const engagements = await fetchLiveEngagements(instanceUrl, clientId, clientSecret);
    return NextResponse.json(engagements, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Data-Source': 'salesforce-live',
      },
    });
  } catch (err) {
    console.error('[api/engagements] Salesforce fetch error:', err instanceof Error ? err.message : err);
    return NextResponse.json([] as HistoricalEngagement[], { status: 200 });
  }
}
