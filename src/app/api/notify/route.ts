import { NextRequest, NextResponse } from 'next/server';

// ── Slack / Teams Notification API ────────────────────────────
// Sends a change-notification to Slack or Teams webhook.
// Requires env vars (at least one):
//   SLACK_WEBHOOK_URL   — Slack Incoming Webhook URL
//   TEAMS_WEBHOOK_URL   — Microsoft Teams Incoming Webhook URL
// If neither is set, returns { sent: false, reason: 'not configured' } — UI handles gracefully.

interface NotifyPayload {
  sourceModule: string;
  affectedModules: string[];
  message: string;
  documentName?: string;
}

function buildSlackPayload(p: NotifyPayload) {
  return {
    text: `📋 *RFP Analyzer — ${p.sourceModule} Updated*`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📋 ${p.sourceModule} Updated`, emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: p.message },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Document:*\n${p.documentName ?? 'Active RFP'}` },
          { type: 'mrkdwn', text: `*Affected:*\n${p.affectedModules.join(', ')}` },
        ],
      },
      { type: 'divider' },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Sent from RFP Analyzer Pro · ${new Date().toLocaleString()}` }],
      },
    ],
  };
}

function buildTeamsPayload(p: NotifyPayload) {
  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: '6366F1',
    summary: `${p.sourceModule} Updated`,
    sections: [
      {
        activityTitle: `📋 ${p.sourceModule} Updated`,
        activitySubtitle: p.documentName ?? 'Active RFP',
        activityText: p.message,
        facts: p.affectedModules.map((m) => ({ name: 'Affected', value: m })),
      },
    ],
  };
}

export async function POST(req: NextRequest) {
  const payload: NotifyPayload = await req.json();
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  const teamsUrl = process.env.TEAMS_WEBHOOK_URL;

  if (!slackUrl && !teamsUrl) {
    return NextResponse.json({ sent: false, reason: 'not configured' });
  }

  const results: string[] = [];

  if (slackUrl) {
    try {
      const r = await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSlackPayload(payload)),
      });
      results.push(r.ok ? 'slack:ok' : `slack:${r.status}`);
    } catch (e) { results.push(`slack:error:${e}`); }
  }

  if (teamsUrl) {
    try {
      const r = await fetch(teamsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTeamsPayload(payload)),
      });
      results.push(r.ok ? 'teams:ok' : `teams:${r.status}`);
    } catch (e) { results.push(`teams:error:${e}`); }
  }

  return NextResponse.json({ sent: true, results });
}
