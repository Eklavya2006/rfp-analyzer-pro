'use client';
// Dashboard — Light theme · indigo/cyan chart palette
import React, { useMemo, useState } from 'react';
import NewsPulseWidget from '@/components/NewsPulseWidget';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { DollarSign, Calendar, Users, CheckSquare, Zap, TrendingUp, Upload, CalendarDays, Bot, Clock, Headphones } from 'lucide-react';
import type { TabId, TimelineEvent, SupportEvent } from '@/types';

// ── Light palette ──────────────────────────────────────────────
const D = {
  bg:      '#F8FAFC',
  card:    '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#0F172A',
  muted:   '#64748B',
  sub:     '#94A3B8',
  kpi: [
    { from: 'rgba(99,102,241,0.08)',  icon: '#6366F1', label: '#6366F1',  value: '#0F172A' }, // Total Cost
    { from: 'rgba(59,130,246,0.08)',  icon: '#3B82F6', label: '#3B82F6',  value: '#0F172A' }, // Timeline
    { from: 'rgba(16,185,129,0.08)',  icon: '#10B981', label: '#10B981',  value: '#0F172A' }, // Team Size
    { from: 'rgba(6,182,212,0.08)',   icon: '#06B6D4', label: '#06B6D4',  value: '#0F172A' }, // QA Hours
    { from: 'rgba(245,158,11,0.08)',  icon: '#F59E0B', label: '#B45309',  value: '#0F172A' }, // AI Savings
    { from: 'rgba(244,63,94,0.08)',   icon: '#F43F5E', label: '#E11D48',  value: '#0F172A' }, // Confidence
  ],
  barColor:   '#6366F1',
  areaColor:  '#6366F1',
  distColors: ['#6366F1','#8B5CF6','#06B6D4','#10B981','#F59E0B','#F43F5E'],
  aiColor:    ['#10B981','#06B6D4','#8B5CF6','#F59E0B'],
} as const;

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 10,
  color: '#0F172A',
  fontSize: 13,
  zIndex: 10000,
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  pointerEvents: 'none' as const,
  padding: '8px 12px',
};

const tooltipWrapperStyle = { zIndex: 10000, outline: 'none' };
const tooltipLabelStyle  = { color: '#0F172A', fontWeight: 700, fontSize: 13, marginBottom: 4 };

// ── CustomTooltip — WCAG-AA, dynamic border/title colour ──────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color?: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const color = payload[0].color ?? '#6366F1';
  return (
    <div style={{
      backgroundColor: '#F8F9FA',
      border: `2px solid ${color}`,
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: 140,
    }}>
      <div style={{ color, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.name} style={{ color: '#1F2937', fontSize: 13 }}>
          {entry.name}: {entry.value >= 1000
            ? `$${(entry.value / 1000).toFixed(1)}K`
            : `$${entry.value}K`}
        </div>
      ))}
    </div>
  );
}

// ── Light card ─────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: D.card,
      border: `1px solid ${D.border}`,
      borderRadius: 16,
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{title}</span>
      {action && (
        <button
          onClick={onAction}
          style={{
            fontSize: 11, color: '#6366F1', cursor: 'pointer', fontWeight: 600,
            background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: 6, padding: '3px 8px', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.14)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.07)'; }}
        >
          {action} →
        </button>
      )}
    </div>
  );
}

// ── KPI Tile ──────────────────────────────────────────────────
interface KpiPalette { from: string; icon: string; label: string; value: string }
interface KpiTileProps { label: string; value: string; sub?: string; icon: React.ReactNode; palette: KpiPalette }
function KpiTile({ label, value, sub, icon, palette }: KpiTileProps) {
  return (
    <div style={{
      background: palette.from,
      border: `1px solid ${D.border}`,
      borderRadius: 14,
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 8,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: palette.label }}>
          {label}
        </span>
        <span style={{ color: palette.icon, opacity: 0.85 }}>{icon}</span>
      </div>
      <div className="kpi-value" style={{ fontSize: 26, fontWeight: 700, color: palette.value, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: D.muted }}>{sub}</div>}
    </div>
  );
}

// ── Horizontal progress bar ───────────────────────────────────
interface HBarProps { label: string; sub: string; pct: number; value: string; color: string }
function HBar({ label, sub, pct, value, color }: HBarProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: D.text }}>{label}</span>
          {sub && <span style={{ fontSize: 11, color: D.muted, marginLeft: 6 }}>{sub}</span>}
        </div>
        <span className="kpi-value" style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 99, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

interface AiBarProps { label: string; subLabel: string; pct: number; value: string; color: string }
function AiBar({ label, subLabel, pct, value, color }: AiBarProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: D.text }}>{label}</span>
          <span style={{ fontSize: 11, color: D.muted, marginLeft: 6 }}>{subLabel}</span>
        </div>
        <span className="kpi-value" style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 99, background: color }} />
      </div>
    </div>
  );
}

// ── Welcome state (no document loaded) ───────────────────────
function WelcomeState() {
  const setActiveTab = useRFPStore((state) => state.setActiveTab);
  const features = [
    { icon: <DollarSign size={14} />, title: 'Cost Estimation',  sub: 'Detailed breakdown by phase and role' },
    { icon: <CalendarDays size={14} />, title: 'Project Plan',   sub: 'Gantt-style phases and milestones' },
    { icon: <Users size={14} />,       title: 'Staffing Plan',   sub: 'Team composition and allocation' },
    { icon: <Bot size={14} />,         title: 'AI Comparison',   sub: 'AI vs traditional delivery analysis' },
  ];
  return (
    <div className="flex items-center justify-center min-h-[80vh] p-6">
      <div className="max-w-lg w-full text-center">
        <div style={{ animation: 'welcomeScaleIn 0.3s ease-out forwards', opacity: 0, transform: 'scale(0.95)' }}>
          <style>{`@keyframes welcomeScaleIn { to { opacity: 1; transform: scale(1); } }`}</style>

          {/* Hero icon */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
            <Zap size={36} className="text-indigo-600" />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Welcome to RFP Analyzer Pro
          </h2>

          {/* Description */}
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Upload an RFP document to instantly generate cost estimates, project plans, staffing
            recommendations, testing strategies, and AI impact analysis.
          </p>

          {/* Feature grid 2×2 */}
          <div className="grid grid-cols-2 gap-3 text-left mb-8">
            {features.map((f) => (
              <div key={f.title} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                  {f.icon}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">{f.title}</div>
                  <div className="text-xs text-slate-500">{f.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => setActiveTab('document-analyzer')}
            className="inline-flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 text-base px-6 py-3 rounded-xl font-medium transition-colors"
          >
            <Upload size={16} />
            Upload RFP Document
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Duration display helpers ──────────────────────────────────
/** Format "18 months (78 weeks)" or "26 weeks (6 months)" etc. */
function fmtDuration(ev: { value: number; unit: string; months: number; weeks: number }): string {
  const primary   = `${ev.value} ${ev.unit}${ev.value !== 1 ? 's' : ''}`;
  const secondary = ev.unit === 'week'
    ? `${ev.months} month${ev.months !== 1 ? 's' : ''}`
    : `${ev.weeks} week${ev.weeks !== 1 ? 's' : ''}`;
  return `${primary}  ·  ${secondary}`;
}

// ── Timeline-Trend Card ────────────────────────────────────────
const TL_COLORS = ['#6366F1', '#3B82F6', '#06B6D4', '#10B981', '#8B5CF6', '#F59E0B'];

function TimelineTrendCard({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;
  const maxWeeks = events[0]?.weeks ?? 1; // already sorted longest→shortest

  return (
    <Card>
      <SectionHead title="Timeline Trend" />

      {/* Sub-header */}
      <div style={{ fontSize: 11, color: D.muted, marginBottom: 14 }}>
        Project delivery duration extracted from document
      </div>

      {/* Duration bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.map((ev, i) => {
          const color = TL_COLORS[i % TL_COLORS.length];
          const pct   = Math.max(6, Math.round((ev.weeks / maxWeeks) * 100));
          return (
            <div key={ev.id}>
              {/* Row: label + badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: D.text, maxWidth: '70%' }}>
                  {ev.label.length > 70 ? ev.label.slice(0, 70) + '…' : ev.label}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color,
                  background: `${color}15`, border: `1px solid ${color}40`,
                  borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap',
                }}>
                  {ev.months} mo · {ev.weeks} wk
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 8, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 99,
                  background: color, transition: 'width 0.4s ease',
                }} />
              </div>
              {/* Secondary label */}
              <div style={{ fontSize: 10, color: D.muted, marginTop: 4 }}>
                {fmtDuration(ev)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recharts horizontal bar overview (only when >1 entry) */}
      {events.length > 1 && (
        <div style={{ marginTop: 18 }}>
          <ResponsiveContainer width="100%" height={events.length * 28 + 16}>
            <BarChart
              layout="vertical"
              data={events.map((ev, i) => ({
                name: `${ev.months}mo`,
                weeks: ev.weeks,
                color: TL_COLORS[i % TL_COLORS.length],
                label: ev.label.length > 30 ? ev.label.slice(0, 30) + '…' : ev.label,
              }))}
              margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
              barSize={14}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { name: string; weeks: number; label: string; color: string };
                  return (
                    <div style={{ ...tooltipStyle, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, color: d.color, fontSize: 12, marginBottom: 3 }}>{d.name} · {d.weeks} weeks</div>
                      <div style={{ fontSize: 11, color: '#374151' }}>{d.label}</div>
                    </div>
                  );
                }}
                wrapperStyle={tooltipWrapperStyle}
              />
              <Bar dataKey="weeks" radius={[0, 4, 4, 0]}>
                {events.map((_, i) => (
                  <Cell key={i} fill={TL_COLORS[i % TL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

// ── Support-Trend Card ─────────────────────────────────────────
const SUPPORT_KIND_COLORS: Record<string, string> = {
  'hypercare':   '#8B5CF6',
  'support':     '#3B82F6',
  'warranty':    '#10B981',
  'maintenance': '#F59E0B',
  'other':       '#94A3B8',
};
const SUPPORT_KIND_LABELS: Record<string, string> = {
  'hypercare':   'Hypercare',
  'support':     'Support',
  'warranty':    'Warranty',
  'maintenance': 'Maintenance',
  'other':       'Other',
};

function SupportTrendCard({ events }: { events: SupportEvent[] }) {
  if (events.length === 0) return null;
  const maxWeeks = events[0]?.weeks ?? 1;

  return (
    <Card>
      <SectionHead title="Support &amp; Hypercare Trend" />

      <div style={{ fontSize: 11, color: D.muted, marginBottom: 14 }}>
        Post-production / post-deployment support duration from document
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.map((ev) => {
          const color = SUPPORT_KIND_COLORS[ev.kind] ?? SUPPORT_KIND_COLORS.other;
          const pct   = Math.max(6, Math.round((ev.weeks / maxWeeks) * 100));
          return (
            <div key={ev.id}>
              {/* Row: label + kind badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: D.text, maxWidth: '60%' }}>
                  {ev.label.length > 60 ? ev.label.slice(0, 60) + '…' : ev.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color,
                    background: `${color}15`, border: `1px solid ${color}40`,
                    borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap',
                  }}>
                    {ev.months} mo · {ev.weeks} wk
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: '#fff',
                    background: color, borderRadius: 4,
                    padding: '2px 6px', whiteSpace: 'nowrap',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {SUPPORT_KIND_LABELS[ev.kind] ?? ev.kind}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 8, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 99,
                  background: color, transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ fontSize: 10, color: D.muted, marginTop: 4 }}>
                {fmtDuration(ev)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Custom XAxis tick for Cost-by-Phase bar chart ─────────────
function PhaseTickDash({
  x, y, payload, activeIdx, colors,
}: {
  x?: number; y?: number;
  payload?: { value: string; index: number };
  activeIdx: number;
  colors: readonly string[];
}) {
  if (!payload) return null;
  const idx   = payload.index;
  const color = activeIdx === idx ? colors[idx % colors.length] : '#64748B';
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0} y={0} dy={4}
        textAnchor="end"
        transform="rotate(-35)"
        fontSize={10}
        fill={color}
        style={{ transition: 'fill 0.2s' }}
      >
        {payload.value}
      </text>
    </g>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  // Read only the dashboard-relevant slices so edits in other store branches do not rerender charts.
  const activeDocumentId = useRFPStore((state) => state.activeDocumentId);
  const analysisResults = useRFPStore((state) => state.analysisResults);
  const documents = useRFPStore((state) => state.documents);
  const setActiveTab = useRFPStore((state) => state.setActiveTab);
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [activeBarIdx, setActiveBarIdx] = useState(-1);

  const navigate = React.useCallback((tab: TabId) => setActiveTab(tab), [setActiveTab]);

  // ── All hooks must be called unconditionally (before early return) ──
  const doc = useMemo(
    () => documents.find((document) => document.id === activeDocumentId),
    [documents, activeDocumentId]
  );

  // ── Timeline & Support events extracted from the real document ──
  const timelineEvents = useMemo(
    () => result?.timelineEvents ?? [],
    [result?.timelineEvents]
  );
  const supportEvents = useMemo(
    () => result?.supportEvents ?? [],
    [result?.supportEvents]
  );

  const estimation = result?.estimation;
  const plan       = result?.projectPlan;
  const staffing   = result?.staffingPlan;
  const testing    = result?.testingStrategy;
  const aiImpact   = result?.aiImpact;
  const peakHC     = staffing?.peakHeadcount ?? staffing?.totalHeadcount ?? 0;
  const totalWeeks = plan?.totalDurationWeeks ?? 0;

  const phaseData = useMemo(
    () => (estimation?.phaseSubtotals ?? []).map((phase) => ({
      name: phase.phase.length > 14 ? phase.phase.slice(0, 14) + '…' : phase.phase,
      cost: Math.round(phase.cost / 1000),
    })),
    [estimation]
  );

  const headData = useMemo(() => {
    if (!totalWeeks || !peakHC) return [];
    const wks = Math.max(totalWeeks, 8);
    return Array.from({ length: wks }, (_, i) => {
      const t  = i / (wks - 1);
      const hc = t < 0.1 ? Math.round(peakHC * t / 0.1 * 0.4)
        : t < 0.7 ? Math.round(peakHC * (0.4 + 0.6 * ((t - 0.1) / 0.6)))
        : Math.round(peakHC * (1 - 0.65 * ((t - 0.7) / 0.3)));
      return { week: `W${i + 1}`, hc: Math.max(1, hc) };
    });
  }, [totalWeeks, peakHC]);

  const bd = estimation?.costBreakdown;
  const distItems = useMemo(
    () => bd ? [
      { label: 'Labor', sub: `$${Math.round(bd.baseLaborCost / 1000)}K`, val: bd.baseLaborCost },
      { label: 'Infrastructure', sub: `$${Math.round(bd.infrastructureAmount / 1000)}K`, val: bd.infrastructureAmount },
      { label: 'Licenses & Tools', sub: `$${Math.round(bd.licensingAmount / 1000)}K`, val: bd.licensingAmount },
      { label: 'Overhead', sub: `$${Math.round(bd.overheadAmount / 1000)}K`, val: bd.overheadAmount },
      { label: 'Contingency', sub: `$${Math.round(bd.contingencyAmount / 1000)}K`, val: bd.contingencyAmount },
      { label: 'Travel', sub: `$${Math.round(bd.travelAmount / 1000)}K`, val: bd.travelAmount },
    ].filter((item) => item.val > 0) : [],
    [bd]
  );
  const maxDist = useMemo(() => distItems.reduce((m, d) => Math.max(m, d.val), 1), [distItems]);

  // Stable keyword list for NewsPulseWidget — must not be rebuilt on every render
  const pulseKeywords = useMemo(
    () => (result?.offerings ?? []).slice(0, 4).map(o => o.name).concat(['IBM', 'enterprise AI']).slice(0, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result?.offerings?.map(o => o.id).join(',')]
  );

  // ── Early return after ALL hooks ──────────────────────────────
  if (!result) return <WelcomeState />;

  const totalCost  = estimation?.adjustedTotalCost ?? estimation?.totalCost ?? 0;
  const teamSize   = staffing?.totalHeadcount ?? 0;
  const qaHours    = testing?.totalQAHours ?? 0;
  const aiSavings  = aiImpact?.totalHoursSaved ?? 0;
  const aiGainPct  = aiImpact?.overallProductivityGain ?? 0;

  const trad  = aiImpact?.totalTraditionalHours ?? 1;
  const saved = aiImpact?.totalHoursSaved       ?? 0;
  const aiRows = [
    { label: 'Cost Savings',         subLabel: `${Math.round((saved / trad) * 13)}%`,    pct: Math.min(99, Math.round((saved / trad) * 13)),     value: `${Math.round((saved / trad) * 13)}%`,     color: D.aiColor[0] },
    { label: 'Effort Reduction',     subLabel: `${aiGainPct * 0.178 | 0}%`,               pct: Math.min(99, Math.round(aiGainPct * 0.6)),         value: `${Math.round(aiGainPct * 0.6)}%`,         color: D.aiColor[1] },
    { label: 'Timeline Compression', subLabel: `${aiGainPct * 0.1 | 0}%`,                 pct: Math.min(99, Math.round(aiGainPct * 0.35)),        value: `${Math.round(aiGainPct * 0.35)}%`,        color: D.aiColor[2] },
    { label: 'Quality Score Uplift', subLabel: `${aiGainPct | 0}pts`,                      pct: Math.min(99, Math.round(aiGainPct * 1.1)),         value: `${Math.round(aiGainPct * 1.1)}%`,         color: D.aiColor[3] },
  ];

  const fmtCost = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;

  return (
    <div style={{ background: D.bg, minHeight: '100%', padding: '20px 24px 40px' }}>

      {/* ── 6 KPI Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 18 }}>
        <KpiTile label="Total Cost"  value={fmtCost(totalCost)}   sub={`${estimation?.personMonths ?? 0} person-months`}        icon={<DollarSign  size={16} />} palette={D.kpi[0]} />
        <KpiTile label="Timeline"    value={totalWeeks >= 52 ? `${Math.round(totalWeeks / 4.33)} months` : `${totalWeeks}w`}    sub={plan ? `${plan.phases.length} phases` : undefined}   icon={<Calendar    size={16} />} palette={D.kpi[1]} />
        <KpiTile label="Team Size"   value={String(teamSize)}     sub={`peak ${peakHC}`}                                        icon={<Users       size={16} />} palette={D.kpi[2]} />
        <KpiTile label="QA Hours"    value={qaHours.toLocaleString()} sub={`${testing?.automationCoverage ?? 0}% auto`}         icon={<CheckSquare size={16} />} palette={D.kpi[3]} />
        <KpiTile label="AI Savings"  value={fmtCost(aiSavings * 120)} sub={`${aiGainPct}% gain`}                               icon={<Zap         size={16} />} palette={D.kpi[4]} />
        <KpiTile label="Confidence"  value={`${doc?.summary?.confidenceScore ?? 0}%`} sub={`${(result.scopeItems ?? []).length} scope items`} icon={<TrendingUp size={16} />} palette={D.kpi[5]} />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>

        {/* Cost by Phase bar chart */}
        <Card>
          <SectionHead title="Cost by Phase" action="Detail" onAction={() => navigate('project-plan')} />
          {phaseData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: D.muted, fontSize: 13 }}>No phase data</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={phaseData} barSize={28} margin={{ left: -10, right: 8, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false} tickLine={false}
                  interval={0} height={60}
                  tick={(props) => (
                    <PhaseTickDash {...props} activeIdx={activeBarIdx} colors={D.distColors} />
                  )}
                />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v}K`} />
                <Tooltip content={<CustomTooltip />} wrapperStyle={tooltipWrapperStyle} />
                <Bar
                  dataKey="cost" radius={[5, 5, 0, 0]}
                  onMouseEnter={(_: unknown, index: number) => setActiveBarIdx(index)}
                  onMouseLeave={() => setActiveBarIdx(-1)}
                >
                  {phaseData.map((_, i) => (
                    <Cell key={i} fill={D.distColors[i % D.distColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Team Headcount area chart */}
        <Card>
          <SectionHead title="Team Headcount over Time" action="Detail" onAction={() => navigate('staffing')} />
          {headData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: D.muted, fontSize: 13 }}>No headcount data</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={headData} margin={{ left: -10, right: 8 }}>
                <defs>
                  <linearGradient id="hcGradLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(headData.length / 8) - 1)} />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} wrapperStyle={tooltipWrapperStyle} />
                <Area type="monotone" dataKey="hc"
                  stroke={D.areaColor} strokeWidth={2.5}
                  fill="url(#hcGradLight)"
                  dot={false} activeDot={{ r: 5, fill: D.areaColor }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Analysis Modules row ── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Analysis Modules
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { icon: <DollarSign  size={14} style={{ color: D.kpi[0].icon }} />, label: 'Cost Estimation', value: fmtCost(totalCost) },
            { icon: <Calendar    size={14} style={{ color: D.kpi[1].icon }} />, label: 'Project Plan',    value: `${totalWeeks}w / ${plan?.phases.length ?? 0} phases` },
            { icon: <Users       size={14} style={{ color: D.kpi[2].icon }} />, label: 'Staffing',        value: `${staffing?.roles.length ?? 0} roles, peak ${peakHC}` },
            { icon: <CheckSquare size={14} style={{ color: D.kpi[3].icon }} />, label: 'Testing',         value: `${qaHours.toLocaleString()} QA hrs` },
            { icon: <Zap         size={14} style={{ color: D.kpi[4].icon }} />, label: 'AI Impact',       value: `${fmtCost(aiSavings * 120)} potential savings` },
          ].map((m) => (
            <Card key={m.label} style={{ padding: '12px 14px' }}>
              <div style={{ marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontSize: 11, color: D.muted, marginBottom: 4 }}>{m.label}</div>
              <div className="kpi-value" style={{ fontSize: 12, fontWeight: 700, color: D.text }}>{m.value}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Industry Pulse ── */}
      <div style={{ marginBottom: 18 }}>
        <NewsPulseWidget keywords={pulseKeywords} />
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Cost Distribution */}
        <Card>
          <SectionHead title="Cost Distribution" />
          {distItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: D.muted, fontSize: 13 }}>No breakdown available</div>
          ) : (
            distItems.map((d, i) => (
              <HBar key={d.label} label={d.label} sub={d.sub}
                pct={(d.val / maxDist) * 100}
                value={`$${Math.round(d.val / 1000)}K`}
                color={D.distColors[i % D.distColors.length]} />
            ))
          )}
        </Card>

        {/* AI vs Traditional */}
        <Card>
          <SectionHead title="AI vs Traditional Summary" />
          {aiRows.map((r) => (
            <AiBar key={r.label} label={r.label} subLabel={r.subLabel} pct={r.pct} value={r.value} color={r.color} />
          ))}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${D.border}`, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => navigate('agentic-impact')}
              style={{
                fontSize: 12, color: '#6366F1', cursor: 'pointer', fontWeight: 600,
                background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)',
                borderRadius: 6, padding: '4px 10px', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.14)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.07)'; }}
            >
              View Full AI Analysis →
            </button>
          </div>
        </Card>
      </div>

      {/* ── Timeline-Trend & Support-Trend row ── */}
      {(timelineEvents.length > 0 || supportEvents.length > 0) && (
        <div style={{ marginTop: 14 }}>
          {/* Section label */}
          <div style={{ fontSize: 11, fontWeight: 600, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={12} style={{ color: D.muted }} />
            Dates &amp; Timelines Extracted from Document
          </div>

          {/* Timeline card — full width if no support events, else split */}
          {timelineEvents.length > 0 && supportEvents.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <TimelineTrendCard events={timelineEvents} />
              <SupportTrendCard events={supportEvents} />
            </div>
          ) : timelineEvents.length > 0 ? (
            <TimelineTrendCard events={timelineEvents} />
          ) : (
            <SupportTrendCard events={supportEvents} />
          )}
        </div>
      )}

      {/* Empty-state hint when document has no extractable dates */}
      {timelineEvents.length === 0 && supportEvents.length === 0 && (
        <div style={{ marginTop: 14 }}>
          <Card style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={18} style={{ color: D.muted, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: D.text }}>No project duration or support period found</div>
                <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>
                  Timeline-Trend and Support-Trend cards populate automatically when the document mentions
                  durations like <strong>&ldquo;18 months&rdquo;</strong>, <strong>&ldquo;26 weeks&rdquo;</strong> or date ranges like
                  <strong>&ldquo;01/06/2025 to 31/12/2026&rdquo;</strong> in a project timeline or support/hypercare context.
                </div>
              </div>
              <Headphones size={18} style={{ color: D.muted, flexShrink: 0, marginLeft: 'auto' }} />
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
