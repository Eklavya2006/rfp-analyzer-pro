// ============================================================
// Mock Salesforce OAuth Token Endpoint
// Mimics POST /services/oauth2/token (Client Credentials flow)
// Returns a static demo access token so the engagements route
// can exercise the full fetch → map → engine pipeline without
// real ibmsc credentials.
//
// Active when SF_MOCK_MODE=true.
// In production with real credentials this route is never called.
// ============================================================

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    access_token: 'MOCK_SF_TOKEN_DEMO_2024',
    instance_url: process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000',
    token_type:   'Bearer',
    scope:        'api',
  });
}
