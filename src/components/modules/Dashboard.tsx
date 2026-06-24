'use client';
// Dashboard — Reference screenshot layout: light theme, 6 gradient KPI tiles,
// Cost by Phase bar, Headcount area, Analysis Modules row, Cost Distribution + AI vs Traditional
import React, { useMemo } from 'react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { DollarSign, Calendar, Users, CheckSquare, Zap, TrendingUp } from 'lucide-react';

// ── Color palette matching reference screenshot ───────────────
const D = {
  bg:     '#f5f6fa',
  white:  '#ffffff',
  border: '#e8eaf0',
  text:   '#1a1d2e',
  muted:  '#8b8fa8',
  // KPI tile gradients (pastel)
  kpi: [
    { from: '#eef0ff', icon: '#6366f1', label: '#6366f1', value: '#1a1d2e' }, // Total Cost  — indigo
    { from: '#e8f5ff', icon: '#3b82f6', label: '#3b82f6', value: '#1a1d2e' }, // Timeline    — blue
    { from: '#e8fff4', icon: '#10b981', label: '#10b981', value: '#1a1d2e' }, // Team Size   — green
    { from: '#f0fdf4', icon: '#22c55e', label: '#22c55e', value: '#1a1d2e' }, // QA Hours    — teal-green
    { from: '#fff8ee', icon: '#f97316', label: '#f97316', value: '#1a1d2e' }, // AI Savings  — orange
    { from: '#fef2f2', icon: '#ef4444', label: '#ef4444', value: '#1a1d2e' }, // Confidence  — red
  ],
  // Chart bars (indigo/violet like reference)
  barColor:  '#6366f1',
  areaColor: '#8b5cf6',
  // Distribution bars
  distColors: ['#6366f1','#8b5cf6','#a855f7','#06b6d4','#f59e0b','#10b981'],
  // AI vs Traditional
  aiColor:   ['#10b981','#06b6d4','#8b5cf6','#f59e0b'],
} as const;

const tooltipStyle = {
  backgroundColor: '#1a1d2e',
  border: '1px solid #2d3155',
  borderRadius: 10,
  color: '#f1f5f9',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  zIndex: 9999,
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  pointerEvents: 'none' as const,
};

// ── Reusable section card ─────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: D.white,
      border: `1px solid ${D.border}`,
      borderRadius: 16,
      padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHead({ title, action }: { title: string; action?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: D.text }}>{title}</span>
      {action && <span style={{ fontSize: 12, color: D.muted, cursor: 'pointer' }}>{action} →</span>}
    </div>
  );
}

// ── KPI Tile (matches reference screenshot style) ─────────────
interface KpiPalette { from: string; icon: string; label: string; value: string }
interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  palette: KpiPalette;
}
function KpiTile({ label, value, sub, icon, palette }: KpiTileProps) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${palette.from} 0%, #ffffff 100%)`,
      border: `1px solid ${D.border}`,
      borderRadius: 14,
      padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 8,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: palette.label }}>
          {label}
        </span>
        <span style={{ color: palette.icon, opacity: 0.85 }}>{icon}</span>
      </div>
      <div className="kpi-value" style={{ fontSize: 30, fontWeight: 700, color: palette.value, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: D.muted }}>{sub}</div>}
    </div>
  );
}

// ── Horizontal bar for cost distribution ─────────────────────
interface HBarProps { label: string; sub: string; pct: number; value: string; color: string }
function HBar({ label, sub, pct, value, color }: HBarProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: D.text }}>{label}</span>
          {sub && <span style={{ fontSize: 11, color: D.muted, marginLeft: 6 }}>{sub}</span>}
        </div>
        <span className="kpi-value" style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: '#eef0f8', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 99, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// ── AI vs Traditional horizontal comparison bar ───────────────
interface AiBarProps { label: string; subLabel: string; pct: number; value: string; color: string }
function AiBar({ label, subLabel, pct, value, color }: AiBarProps) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: D.text }}>{label}</span>
          <span style={{ fontSize: 11, color: D.muted, marginLeft: 6 }}>{subLabel}</span>
        </div>
        <span className="kpi-value" style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{value}</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: '#eef0f8', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 99, background: color }} />
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  if (!result) {
    return (
      <div style={{ background: D.bg, minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: D.muted }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontSize: 14, color: D.muted }}>Upload and analyse a document to see the dashboard.</p>
        </div>
      </div>
    );
  }

  const staffing   = result.staffingPlan;
  const estimation = result.estimation;
  const testing    = result.testingStrategy;
  const aiImpact   = result.aiImpact;
  const plan       = result.projectPlan;
  const doc        = useRFPStore.getState().documents.find(d => d.id === activeDocumentId);

  const totalCost  = estimation?.adjustedTotalCost ?? estimation?.totalCost ?? 0;
  const totalWeeks = plan?.totalDurationWeeks ?? 0;
  const teamSize   = staffing?.totalHeadcount ?? 0;
  const qaHours    = testing?.totalQAHours ?? 0;
  const aiSavings  = aiImpact?.totalHoursSaved ?? 0;
  const aiGainPct  = aiImpact?.overallProductivityGain ?? 0;
  const peakHC     = staffing?.peakHeadcount ?? teamSize;

  // ── Cost by phase bar data ────────────────────────────────────
  const phaseData = (estimation?.phaseSubtotals ?? []).map(p => ({
    name: p.phase.length > 16 ? p.phase.slice(0, 16) + '…' : p.phase,
    cost: Math.round(p.cost / 1000),
  }));

  // ── Headcount area data ───────────────────────────────────────
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

  // ── Cost distribution ─────────────────────────────────────────
  const bd = estimation?.costBreakdown;
  const distItems = bd ? [
    { label: 'Labor',            sub: `$${Math.round(bd.baseLaborCost / 1000)}K`,         val: bd.baseLaborCost },
    { label: 'Infrastructure',   sub: `$${Math.round(bd.infrastructureAmount / 1000)}K`,  val: bd.infrastructureAmount },
    { label: 'Licenses & Tools', sub: `$${Math.round(bd.licensingAmount / 1000)}K`,       val: bd.licensingAmount },
    { label: 'Overhead',         sub: `$${Math.round(bd.overheadAmount / 1000)}K`,        val: bd.overheadAmount },
    { label: 'Contingency',      sub: `$${Math.round(bd.contingencyAmount / 1000)}K`,     val: bd.contingencyAmount },
    { label: 'Travel',           sub: `$${Math.round(bd.travelAmount / 1000)}K`,          val: bd.travelAmount },
  ].filter(d => d.val > 0) : [];
  const maxDist = distItems.reduce((m, d) => Math.max(m, d.val), 1);

  // ── AI vs Traditional ─────────────────────────────────────────
  const trad  = aiImpact?.totalTraditionalHours ?? 1;
  const saved = aiImpact?.totalHoursSaved       ?? 0;
  const aiRows = [
    {
      label: 'Cost Savings', subLabel: `${Math.round((saved / trad) * 13)}%`,
      pct: Math.min(99, Math.round((saved / trad) * 13)),
      value: `${Math.round((saved / trad) * 13)}%`, color: D.aiColor[0],
    },
    {
      label: 'Effort Reduction', subLabel: `${aiGainPct * 0.178 | 0}%`,
      pct: Math.min(99, Math.round(aiGainPct * 0.6)),
      value: `${Math.round(aiGainPct * 0.6)}%`, color: D.aiColor[1],
    },
    {
      label: 'Timeline Compression', subLabel: `${aiGainPct * 0.1 | 0}%`,
      pct: Math.min(99, Math.round(aiGainPct * 0.35)),
      value: `${Math.round(aiGainPct * 0.35)}%`, color: D.aiColor[2],
    },
    {
      label: 'Quality Score Uplift', subLabel: `${aiGainPct | 0}pts`,
      pct: Math.min(99, Math.round(aiGainPct * 1.1)),
      value: `${Math.round(aiGainPct * 1.1)}%`, color: D.aiColor[3],
    },
  ];

  const fmtCost = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;

  return (
    <div style={{ background: D.bg, minHeight: '100%', padding: '20px 24px 40px' }}>

      {/* ── 6 KPI Tiles ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiTile
          label="Total Cost" value={fmtCost(totalCost)}
          sub={`${estimation?.personMonths ?? 0} person-months`}
          icon={<DollarSign size={18} />} palette={D.kpi[0]}
        />
        <KpiTile
          label="Timeline"
          value={totalWeeks >= 52 ? `${Math.round(totalWeeks / 4.33)} months` : `${totalWeeks}w`}
          sub={plan ? `${plan.phases.length} phases` : undefined}
          icon={<Calendar size={18} />} palette={D.kpi[1]}
        />
        <KpiTile
          label="Team Size" value={String(teamSize)}
          sub={`peak ${peakHC}`}
          icon={<Users size={18} />} palette={D.kpi[2]}
        />
        <KpiTile
          label="QA Hours" value={qaHours.toLocaleString()}
          sub={`${testing?.automationCoverage ?? 0}% auto`}
          icon={<CheckSquare size={18} />} palette={D.kpi[3]}
        />
        <KpiTile
          label="AI Savings" value={fmtCost(aiSavings * 120)}
          sub={`${aiGainPct}% gain`}
          icon={<Zap size={18} />} palette={D.kpi[4]}
        />
        <KpiTile
          label="Confidence" value={`${doc?.summary?.confidenceScore ?? 0}%`}
          sub={`${(result.scopeItems ?? []).length} scope items`}
          icon={<TrendingUp size={18} />} palette={D.kpi[5]}
        />
      </div>

      {/* ── Charts row: Cost by Phase + Headcount ────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Cost by Phase */}
        <Card>
          <SectionHead title="Cost by Phase" action="Detail" />
          {phaseData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: D.muted, fontSize: 13 }}>No phase data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={phaseData} barSize={32} margin={{ left: -10, right: 8, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f8" vertical={false} />
                <XAxis dataKey="name"
                  tick={{ fill: D.muted, fontSize: 10 }}
                  axisLine={false} tickLine={false}
                  interval={0} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v}K`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  wrapperStyle={{ zIndex: 9999 }}
                  labelStyle={{ color: '#f1f5f9', fontWeight: 600 }}
                  formatter={(v: number) => [`$${v}K`, 'Cost']}
                />
                <Bar dataKey="cost" radius={[5, 5, 0, 0]} fill={D.barColor}>
                  {phaseData.map((_, i) => (
                    <Cell key={i} fill={D.barColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Team Headcount over Time */}
        <Card>
          <SectionHead title="Team Headcount over Time" action="Detail" />
          {headData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: D.muted, fontSize: 13 }}>No headcount data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={headData} margin={{ left: -10, right: 8 }}>
                <defs>
                  <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={D.areaColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={D.areaColor} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f8" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(headData.length / 8) - 1)} />
                <YAxis tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  wrapperStyle={{ zIndex: 9999 }}
                  labelStyle={{ color: '#f1f5f9', fontWeight: 600 }}
                  formatter={(v: number) => [v, 'Headcount']}
                />
                <Area type="monotone" dataKey="hc"
                  stroke={D.areaColor} strokeWidth={2.5}
                  fill="url(#hcGrad)"
                  dot={false} activeDot={{ r: 5, fill: D.areaColor }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Analysis Modules row ──────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: D.text, marginBottom: 12 }}>Analysis Modules</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { icon: <DollarSign size={15} style={{ color: D.kpi[0].icon }} />, label: 'Cost Estimation',  value: fmtCost(totalCost) },
            { icon: <Calendar   size={15} style={{ color: D.kpi[1].icon }} />, label: 'Project Plan',     value: `${totalWeeks}w / ${plan?.phases.length ?? 0} phases` },
            { icon: <Users      size={15} style={{ color: D.kpi[2].icon }} />, label: 'Staffing',         value: `${staffing?.roles.length ?? 0} roles, peak ${peakHC}` },
            { icon: <CheckSquare size={15} style={{ color: D.kpi[3].icon }} />, label: 'Testing',         value: `${qaHours.toLocaleString()} QA hrs` },
            { icon: <Zap        size={15} style={{ color: D.kpi[4].icon }} />, label: 'AI Impact',        value: `${fmtCost(aiSavings * 120)} potential savings` },
          ].map((m) => (
            <Card key={m.label} style={{ padding: '14px 16px' }}>
              <div style={{ marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontSize: 12, color: D.muted, marginBottom: 4 }}>{m.label}</div>
              <div className="kpi-value" style={{ fontSize: 13, fontWeight: 700, color: D.text }}>{m.value}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Bottom row: Cost Distribution + AI vs Traditional ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Cost Distribution */}
        <Card>
          <SectionHead title="Cost Distribution" />
          {distItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: D.muted, fontSize: 13 }}>No breakdown available</div>
          ) : (
            distItems.map((d, i) => (
              <HBar
                key={d.label}
                label={d.label}
                sub={d.sub}
                pct={(d.val / maxDist) * 100}
                value={`$${Math.round(d.val / 1000)}K`}
                color={D.distColors[i % D.distColors.length]}
              />
            ))
          )}
        </Card>

        {/* AI vs Traditional Summary */}
        <Card>
          <SectionHead title="AI vs Traditional Summary" />
          {aiRows.map((r) => (
            <AiBar key={r.label} label={r.label} subLabel={r.subLabel} pct={r.pct} value={r.value} color={r.color} />
          ))}
          <div style={{
            marginTop: 16, paddingTop: 14,
            borderTop: `1px solid ${D.border}`,
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <span style={{ fontSize: 12, color: '#6366f1', cursor: 'pointer', fontWeight: 500 }}>
              View Full AI Analysis →
            </span>
          </div>
        </Card>
      </div>

    </div>
  );
}
