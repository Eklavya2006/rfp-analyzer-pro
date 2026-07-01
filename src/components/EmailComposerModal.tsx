'use client';
// ── EmailComposerModal ─────────────────────────────────────────
// Shared animated email composer used by AI Impact and Proposal tabs.
// Opens Outlook via mailto: (IBM SMTP is tenant-disabled).
// Shows avatar, animated send button, table rows + narrative text.
import React, { useState, useEffect } from 'react';
import { Mail, X, Send, User, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
export interface EmailTableRow {
  label: string;
  value: string | number;
  highlight?: boolean;   // bold accent colour
  badge?: string;        // small coloured pill beside value
  badgeColor?: string;
}

export interface EmailSection {
  title: string;
  type: 'table' | 'text';
  rows?: EmailTableRow[];   // used when type === 'table'
  text?: string;            // used when type === 'text'
  collapsible?: boolean;
}

export interface EmailComposerProps {
  open: boolean;
  onClose: () => void;
  defaultTo?: string;
  subject: string;
  /** Preview card title shown in composer */
  reportTitle: string;
  /** Short subtitle / document name */
  subtitle: string;
  /** Avatar initials (2 chars) */
  avatarInitials?: string;
  /** Avatar background colour */
  avatarColor?: string;
  sections: EmailSection[];
}

const ACCENT = '#0f62fe';
const GREEN  = '#42be65';

// ─── Build plain-text email body from sections ───────────────
function buildPlainBody(sections: EmailSection[], reportTitle: string, subtitle: string): string {
  const lines: string[] = [
    reportTitle,
    subtitle,
    `Generated: ${new Date().toLocaleString()}`,
    '',
  ];
  sections.forEach(sec => {
    lines.push(`━━━ ${sec.title.toUpperCase()} ━━━`);
    if (sec.type === 'table' && sec.rows) {
      // find max label length for alignment
      const maxLen = Math.max(...sec.rows.map(r => String(r.label).length));
      sec.rows.forEach(r => {
        lines.push(`${String(r.label).padEnd(maxLen + 2)}: ${r.value}${r.badge ? ` [${r.badge}]` : ''}`);
      });
    } else if (sec.type === 'text' && sec.text) {
      lines.push(sec.text);
    }
    lines.push('');
  });
  lines.push('─────────────────────────────────');
  lines.push('Sent from RFP Analyzer Pro · IBM');
  return lines.join('\n');
}

// ─── Single table section component ─────────────────────────
function TableSection({ rows }: { rows: EmailTableRow[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '5px 8px', color: '#57606a', fontWeight: 500, width: '45%', fontSize: 12 }}>
              {row.label}
            </td>
            <td style={{ padding: '5px 8px', color: row.highlight ? ACCENT : '#1f2328', fontWeight: row.highlight ? 700 : 400 }}>
              {row.value}
              {row.badge && (
                <span style={{
                  marginLeft: 6, fontSize: 10, fontWeight: 700,
                  background: row.badgeColor ? `${row.badgeColor}20` : '#e0f2fe',
                  color: row.badgeColor ?? '#0369a1',
                  border: `1px solid ${row.badgeColor ?? '#bae6fd'}`,
                  borderRadius: 20, padding: '1px 7px',
                }}>
                  {row.badge}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Collapsible section wrapper ────────────────────────────
function Section({ sec }: { sec: EmailSection }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 12, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={() => sec.collapsible && setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', background: '#f7f8fa', border: 'none', cursor: sec.collapsible ? 'pointer' : 'default',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#57606a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {sec.title}
        </span>
        {sec.collapsible && (
          open ? <ChevronUp size={13} color="#94a3b8" /> : <ChevronDown size={13} color="#94a3b8" />
        )}
      </button>
      {open && (
        <div style={{ padding: '8px 4px' }}>
          {sec.type === 'table' && sec.rows && <TableSection rows={sec.rows} />}
          {sec.type === 'text' && sec.text && (
            <p style={{ padding: '4px 14px', fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 }}>
              {sec.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────
export default function EmailComposerModal({
  open, onClose, defaultTo = '', subject, reportTitle, subtitle,
  avatarInitials = 'RP', avatarColor = ACCENT, sections,
}: EmailComposerProps) {
  const [to,       setTo]       = useState(defaultTo);
  const [sent,     setSent]     = useState(false);
  const [sending,  setSending]  = useState(false);
  const [visible,  setVisible]  = useState(false);

  // entrance / exit animation
  useEffect(() => {
    if (open) { setTimeout(() => setVisible(true), 10); setSent(false); setSending(false); setTo(defaultTo); }
    else       { setVisible(false); }
  }, [open, defaultTo]);

  if (!open) return null;

  function handleSend() {
    if (!to.trim() || sending || sent) return;
    setSending(true);
    setTimeout(() => {
      const body = encodeURIComponent(buildPlainBody(sections, reportTitle, subtitle));
      const subj = encodeURIComponent(subject);
      window.open(`mailto:${encodeURIComponent(to.trim())}?subject=${subj}&body=${body}`, '_blank');
      setSending(false);
      setSent(true);
    }, 700); // brief animation delay
  }

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        transition: 'opacity 0.2s',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, background: '#ffffff',
          borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* ── Header ── */}
        <div style={{ background: `linear-gradient(135deg, #1e3a5f 0%, #0f62fe 100%)`, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar with pulse ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: -3,
                borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)',
                animation: 'pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite',
              }} />
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: avatarColor, border: '2px solid rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: 1,
              }}>
                {avatarInitials}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{reportTitle}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {subtitle}
              </div>
            </div>
            <button onClick={handleClose}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex', color: '#fff' }}>
              <X size={16} />
            </button>
          </div>
          {/* To field */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 12px' }}>
            <User size={13} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginRight: 4 }}>To:</span>
            <input
              value={to}
              onChange={e => { setTo(e.target.value); setSent(false); }}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="recipient@ibm.com"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 13, fontWeight: 500,
              }}
            />
          </div>
        </div>

        {/* ── Subject line ── */}
        <div style={{ padding: '10px 24px', borderBottom: '1px solid #e5e7eb',
          fontSize: 12, color: '#57606a', background: '#fafbfc' }}>
          <span style={{ fontWeight: 600 }}>Subject: </span>{subject}
        </div>

        {/* ── Sections ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {sections.map((sec, i) => <Section key={i} sec={sec} />)}
        </div>

        {/* ── Footer / Send button ── */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', background: '#f7f8fa',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
            Opens Outlook with content pre-filled · click Send in Outlook
          </p>
          <button
            onClick={handleSend}
            disabled={!to.trim() || sending}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 22px', borderRadius: 10, border: 'none', cursor: !to.trim() ? 'not-allowed' : 'pointer',
              background: sent ? GREEN : sending ? '#7ca7e8' : ACCENT,
              color: '#fff', fontWeight: 700, fontSize: 13,
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              transform: sent ? 'scale(1.04)' : 'scale(1)',
              opacity: !to.trim() ? 0.5 : 1,
            }}
          >
            {sent ? <CheckCircle size={15} /> : sending ? (
              <div style={{ width: 15, height: 15, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                animation: 'spin 0.7s linear infinite' }} />
            ) : <Send size={15} />}
            {sent ? 'Outlook Opened ✓' : sending ? 'Opening…' : 'Open in Outlook'}
          </button>
        </div>
      </div>

      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 0.2; transform: scale(1.18); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
