import { NextRequest, NextResponse } from 'next/server';

// ── Calendar Export API ────────────────────────────────────────
// Generates a standards-compliant .ics (iCalendar) file from project milestones.
// Works with Google Calendar, Outlook, Apple Calendar — no OAuth needed.
// The client downloads the .ics file and double-clicks to import.

interface MilestonePayload {
  projectName: string;
  startDate: string; // ISO date string e.g. "2024-06-01"
  milestones: Array<{
    phase: string;
    label: string;
    weekOffset: number; // week number from project start (1-based)
  }>;
}

function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function POST(req: NextRequest) {
  const { projectName, startDate, milestones }: MilestonePayload = await req.json();

  const projectStart = new Date(startDate);
  const now          = toICSDate(new Date());

  const events = milestones.map((m, i) => {
    const eventDate = new Date(projectStart);
    eventDate.setDate(eventDate.getDate() + (m.weekOffset - 1) * 7);
    const dtStart = toICSDate(eventDate);
    const dtEnd   = toICSDate(new Date(eventDate.getTime() + 60 * 60 * 1000)); // 1-hour event

    return [
      'BEGIN:VEVENT',
      `UID:rfp-milestone-${i}-${Date.now()}@rfp-analyzer-pro`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICS(`[${m.phase}] ${m.label}`)}`,
      `DESCRIPTION:${escapeICS(`Phase: ${m.phase}\\nMilestone: ${m.label}\\nProject: ${projectName}`)}`,
      'CATEGORIES:Project Milestone',
      'END:VEVENT',
    ].join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RFP Analyzer Pro//Milestone Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(projectName)} Milestones`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${projectName.replace(/\s+/g, '-')}-milestones.ics"`,
    },
  });
}
