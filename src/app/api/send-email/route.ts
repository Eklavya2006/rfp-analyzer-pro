import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// ── Send Email API ─────────────────────────────────────────────
// Two modes:
//   1. SMTP (server-side): set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local
//   2. mailto: fallback: returned when SMTP is not configured — client opens local mail app
//
// Response always contains { sent, method, mailtoUrl } so the UI handles both cases.

export interface EmailPayload {
  to: string;        // comma-separated recipients
  subject: string;
  body: string;      // plain-text body
  htmlBody?: string; // optional rich HTML body
}

function buildMailtoUrl(payload: EmailPayload): string {
  const params = new URLSearchParams({
    subject: payload.subject,
    body:    payload.body,
  });
  return `mailto:${encodeURIComponent(payload.to)}?${params.toString()}`;
}

export async function POST(req: NextRequest) {
  const payload: EmailPayload = await req.json();

  if (!payload.to || !payload.subject) {
    return NextResponse.json({ error: 'to and subject are required' }, { status: 400 });
  }

  const mailtoUrl = buildMailtoUrl(payload);

  // ── SMTP path ────────────────────────────────────────────────
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromAddr = process.env.SMTP_FROM ?? smtpUser ?? 'rfp-analyzer@ibm.com';

  if (smtpHost && smtpUser && smtpPass) {
    try {
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
      // Fall through to mailto fallback
    }
  }

  // No SMTP configured — client opens local mail app via mailto:
  return NextResponse.json({ sent: false, method: 'mailto', mailtoUrl });
}
