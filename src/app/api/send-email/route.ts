import { NextRequest, NextResponse } from 'next/server';

// ── Send Email API ─────────────────────────────────────────────
// Two modes:
//   1. SMTP (server-side): requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
//      Uses nodemailer — install it on the enriched branch if needed.
//   2. mailto: fallback (client-side): returns a mailto: URL the client opens
//      directly — zero config, works everywhere.
//
// The client always gets { sent, mailtoUrl } so it can fall back gracefully.

export interface EmailPayload {
  to: string;          // comma-separated recipients
  subject: string;
  body: string;        // plain-text body
  htmlBody?: string;   // optional HTML body
}

function buildMailtoUrl(payload: EmailPayload): string {
  const params = new URLSearchParams({
    subject: payload.subject,
    body:    payload.body,
  });
  const to = encodeURIComponent(payload.to);
  return `mailto:${to}?${params.toString()}`;
}

export async function POST(req: NextRequest) {
  const payload: EmailPayload = await req.json();

  // Validate minimal fields
  if (!payload.to || !payload.subject) {
    return NextResponse.json({ error: 'to and subject are required' }, { status: 400 });
  }

  // Build mailto fallback URL always — client can use it even if SMTP succeeds
  const mailtoUrl = buildMailtoUrl(payload);

  // ── Attempt SMTP send ────────────────────────────────────────
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromAddr = process.env.SMTP_FROM ?? smtpUser ?? 'rfp-analyzer@ibm.com';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      // Dynamic import via eval — prevents bundler from trying to resolve
      // nodemailer at build time (it's an optional server dependency).
      // eslint-disable-next-line no-eval
      const nodemailer = eval("require")('nodemailer');
      const transporter = nodemailer.createTransport({
        host:   smtpHost,
        port:   smtpPort,
        secure: smtpPort === 465,
        auth:   { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from:    fromAddr,
        to:      payload.to,
        subject: payload.subject,
        text:    payload.body,
        ...(payload.htmlBody ? { html: payload.htmlBody } : {}),
      });
      return NextResponse.json({ sent: true, method: 'smtp', mailtoUrl });
    } catch (err) {
      console.error('[send-email] SMTP error:', err);
      // Fall through to mailto fallback response
    }
  }

  // No SMTP configured — return mailto URL for the client to open
  return NextResponse.json({ sent: false, method: 'mailto', mailtoUrl });
}
