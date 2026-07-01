'use client';
// ── /report/[token] ───────────────────────────────────────────
// Hosted visual report page — receiver opens this link from the email.
// Renders avatar with animated pulse ring, tables, narrative text.
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface TableRow  { label: string; value: string | number; highlight?: boolean; badge?: string; badgeColor?: string }
interface Section   { title: string; type: 'table' | 'text'; rows?: TableRow[]; text?: string }
interface ReportPayload {
  reportTitle:     string;
  subtitle:        string;
  avatarInitials:  string;
  avatarColor:     string;
  sections:        Section[];
  generatedAt:     string;
}

const ACCENT = '#0f62fe';
const GREEN  = '#42be65';

// ── Avatar component ─────────────────────────────────────────
function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: 64, height: 64 }}>
      {/* outer pulse ring */}
      <div style={{
        position: 'absolute', inset: -5, borderRadius: '50%',
        border: `2px solid ${color}`,
        animation: 'pulse-outer 2.2s ease-in-out infinite',
        opacity: 0.4,
      }} />
      {/* inner pulse ring */}
      <div style={{
        position: 'absolute', inset: -2, borderRadius: '50%',
        border: `2px solid ${color}`,
        animation: 'pulse-inner 2.2s ease-in-out infinite 0.4s',
        opacity: 0.6,
      }} />
      {/* avatar circle */}
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        border: '3px solid rgba(255,255,255,0.8)',
        boxShadow: `0 0 0 1px ${color}40, 0 8px 24px ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 1,
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
      }}>
        {initials}
      </div>
    </div>
  );
}

// ── Table section ────────────────────────────────────────────
function TableSec({ rows }: { rows: TableRow[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{
            borderBottom: '1px solid #f1f5f9',
            background: i % 2 === 0 ? '#ffffff' : '#fafbfc',
            animation: `row-in 0.35s ease both`,
            animationDelay: `${i * 0.04}s`,
          }}>
            <td style={{ padding: '8px 12px', color: '#57606a', fontWeight: 500, width: '42%', fontSize: 13 }}>
              {r.label}
            </td>
            <td style={{ padding: '8px 12px', color: r.highlight ? ACCENT : '#1f2328', fontWeight: r.highlight ? 700 : 400 }}>
              {r.value}
              {r.badge && (
                <span style={{
                  marginLeft: 8, fontSize: 10, fontWeight: 700, borderRadius: 20,
                  padding: '2px 8px',
                  background: r.badgeColor ? `${r.badgeColor}18` : '#e0f2fe',
                  color: r.badgeColor ?? '#0369a1',
                  border: `1px solid ${r.badgeColor ?? '#bae6fd'}40`,
                }}>
                  {r.badge}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Section card ─────────────────────────────────────────────
function SectionCard({ sec, index }: { sec: Section; index: number }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', marginBottom: 16,
      animation: `card-in 0.4s ease both`, animationDelay: `${0.1 + index * 0.08}s`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: '#f7f8fa', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#57606a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {sec.title}
        </span>
        <span style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: sec.type === 'text' ? '12px 16px' : '4px 0' }}>
          {sec.type === 'table' && sec.rows && <TableSec rows={sec.rows} />}
          {sec.type === 'text' && sec.text && (
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-line' }}>
              {sec.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page component ───────────────────────────────────────────
export default function ReportPage() {
  const params  = useParams<{ token: string }>();
  const [data,  setData]   = useState<ReportPayload | null>(null);
  const [error, setError]  = useState('');
  const [ready, setReady]  = useState(false);
  // Derive cover (first text section) and the rest separately
  const coverSection  = data?.sections.find(s => s.type === 'text');
  const dataSections  = data?.sections.filter(s => s !== coverSection) ?? [];
  const firstTable    = data?.sections.find(s => s.type === 'table');

  useEffect(() => {
    if (!params?.token) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    fetch(`${basePath}/api/email-report?token=${params.token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: ReportPayload) => { setData(d); setTimeout(() => setReady(true), 50); })
      .catch(() => setError('Report not found or has expired (links are valid for 7 days).'));
  }, [params?.token]);

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, "Segoe UI", sans-serif', color: '#57606a', fontSize: 15 }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
        <div style={{ fontWeight: 700, color: '#1f2328', marginBottom: 8 }}>Link expired</div>
        <div>{error}</div>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, "Segoe UI", sans-serif' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%',
        border: `3px solid ${ACCENT}30`, borderTopColor: ACCENT,
        animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f0f4f8; font-family: -apple-system, "Segoe UI", system-ui, sans-serif; }

        @keyframes pulse-outer {
          0%, 100% { transform: scale(1);    opacity: 0.3; }
          50%       { transform: scale(1.35); opacity: 0.05; }
        }
        @keyframes pulse-inner {
          0%, 100% { transform: scale(1);    opacity: 0.55; }
          50%       { transform: scale(1.18); opacity: 0.15; }
        }
        @keyframes hero-in {
          from { opacity: 0; transform: translateY(-18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes row-in {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes badge-pop {
          0%   { transform: scale(0.7); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px 64px' }}>

        {/* ── Hero header ── */}
        <div style={{
          background: `linear-gradient(135deg, #1e3a5f 0%, #0f62fe 100%)`,
          borderRadius: 20, padding: '32px 32px 28px', marginBottom: 24,
          animation: 'hero-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          opacity: ready ? 1 : 0, transition: 'opacity 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Avatar initials={data.avatarInitials} color={data.avatarColor} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4,
                letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                {data.reportTitle}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>
                {data.subtitle}
              </div>
            </div>
          </div>

          {/* KPI strip — sourced from first table section regardless of position */}
          {firstTable?.rows && (
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              {firstTable.rows.filter(r => r.highlight).slice(0, 3).map((r, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.12)', borderRadius: 12,
                  padding: '10px 16px', flex: '1 1 120px', minWidth: 100,
                  animation: `badge-pop 0.4s ease both`, animationDelay: `${0.2 + i * 0.1}s`,
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{r.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{r.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Generated timestamp ── */}
        <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginBottom: 16 }}>
          Generated {data.generatedAt} · RFP Analyzer Pro
        </div>

        {/* ── Cover message — always on top ── */}
        {coverSection?.text && (
          <div style={{
            background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14,
            padding: '24px 28px', marginBottom: 16,
            animation: 'card-in 0.4s ease both', animationDelay: '0.05s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#57606a',
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              {coverSection.title}
            </div>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8,
              margin: 0, whiteSpace: 'pre-line' }}>
              {coverSection.text}
            </p>
          </div>
        )}

        {/* ── RFP_Analyser_AI web link ── */}
        <div style={{
          background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14,
          padding: '16px 28px', marginBottom: 16,
          animation: 'card-in 0.4s ease both', animationDelay: '0.1s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%',
            background: ACCENT, flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: '#374151' }}>
            View full interactive report:&nbsp;
            <a
              href={typeof window !== 'undefined' ? window.location.href : '#'}
              style={{ color: ACCENT, fontWeight: 700, textDecoration: 'underline',
                fontFamily: 'inherit', fontSize: 14 }}
            >
              RFP_Analyser_AI
            </a>
          </span>
        </div>

        {/* ── Data sections (tables + any remaining text sections) ── */}
        {dataSections.map((sec, i) => (
          <SectionCard key={i} sec={sec} index={i} />
        ))}

        {/* ── Footer ── */}
        <div style={{ marginTop: 32, textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #1e3a5f, #0f62fe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 900, color: '#fff',
            }}>
              IBM
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              RFP Analyzer Pro · Confidential · Links expire after 7 days
            </span>
          </div>
        </div>

      </div>
    </>
  );
}
