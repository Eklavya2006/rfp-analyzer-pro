'use client';
// Dashboard — Dark glassmorphism · indigo/cyan chart palette
import React, { useMemo } from 'react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { DollarSign, Calendar, Users, CheckSquare, Zap, TrendingUp } from 'lucide-react';

// ── Dark palette ──────────────────────────────────────────────
const D = {
  bg:     '#0A0F1E',
  glass:  'rgba(255,255,255,0.04)',
  glassBd:'rgba(255,255,255,0.08)',
  glassHi:'rgba(99,102,241,0.25)',
  text:   '#F1F5F9',
  muted:  '#64748B',
  sub:    '#94A3B8',
  // KPI tile accent colours
  kpi: [
    { from: 'rgba(99,102,241,0.15)',  icon: '#818CF8', label: '#818CF8',  value: '#F1F5F9' }, // Total Cost — indigo
    { from: 'rgba(59,130,246,0.12)',  icon: '#60A5FA', label: '#60A5FA',  value: '#F1F5F9' }, // Timeline — blue
    { from: 'rgba(16,185,129,0.12)',  icon: '#34D399', label: '#34D399',  value: '#F1F5F9' }, // Team Size — emerald
    { from: 'rgba(6,182,212,0.12)',   icon: '#22D3EE', label: '#22D3EE',  value: '#F1F5F9' }, // QA Hours — cyan
    { from: 'rgba(245,158,11,0.12)',  icon: '#FCD34D', label: '#FCD34D',  value: '#F1F5F9' }, // AI Savings — amber
    { from: 'rgba(244,63,94,0.12)',   icon: '#FB7185', label: '#FB7185',  value: '#F1F5F9' }, // Confidence — rose
  ],
  barColor:   '#6366F1',
  areaColor:  '#8B5CF6',
  distColors: ['#6366F1','#8B5CF6','#06B6D4','#10B981','#F59E0B','#F43F5E'],
  aiColor:    ['#10B981','#06B6D4','#8B5CF6','#F59E0B'],
} as const;

const tooltipStyle = {
  backgroundColor: '#1E2436',
  border: '1px solid rgba(99,102,241,0.3)',
  borderRadius: 10,
  color: '#F1F5F9',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  zIndex: 9999,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  pointerEvents: 'none' as const,
};

// ── Glass card ────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: D.glass,
      border: `1px solid ${D.glassBd}`,
      borderRadius: 16,
      padding: 20,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHead({ title, action }: { title: string; action?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{title}</span>
      {action && (
        <span style={{ fontSize: 11, color: '#6366F1', cursor: 'pointer', fontWeight: 500 }}>
          {action} →
        </span>
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
      border: `1px solid ${D.glassBd}`,
      borderRadius: 14,
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 8,
      minWidth: 0,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.35)')}
    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = D.glassBd)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: palette.label }}>
          {label}
        </span>
        <span style={{ color: palette.icon, opacity: 0.9 }}>{icon}</span>
      </div>
      <div className="kpi-value" style={{ fontSize: 28, fontWeight: 700, color: palette.value, lineHeight: 1.1 }}>
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
      <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
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
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
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
        <div style={{ textAlign: 'center' }}>
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

  const phaseData = (estimation?.phaseSubtotals ?? []).map(p => ({
    name: p.phase.length > 14 ? p.phase.slice(0, 14) + '…' : p.phase,
    cost: Math.round(p.cost / 1000),
  }));

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
  const distItems = bd ? [
    { label: 'Labor',            sub: `$${Math.round(bd.baseLaborCost / 1000)}K`,        val: bd.baseLaborCost },
    { label: 'Infrastructure',   sub: `$${Math.round(bd.infrastructureAmount / 1000)}K`, val: bd.infrastructureAmount },
    { label: 'Licenses & Tools', sub: `$${Math.round(bd.licensingAmount / 1000)}K`,      val: bd.licensingAmount },
    { label: 'Overhead',         sub: `$${Math.round(bd.overheadAmount / 1000)}K`,       val: bd.overheadAmount },
    { label: 'Contingency',      sub: `$${Math.round(bd.contingencyAmount / 1000)}K`,    val: bd.contingencyAmount },
    { label: 'Travel',           sub: `$${Math.round(bd.travelAmount / 1000)}K`,         val: bd.travelAmount },
  ].filter(d => d.val > 0) : [];
  const maxDist = distItems.reduce((m, d) => Math.max(m, d.val), 1);

  const trad  = aiImpact?.totalTraditionalHours ?? 1;
  const saved = aiImpact?.totalHoursSaved       ?? 0;
  const aiRows = [
    { label: 'Cost Savings',          subLabel: `${Math.round((saved / trad) * 13)}%`,      pct: Math.min(99, Math.round((saved / trad) * 13)),      value: `${Math.round((saved / trad) * 13)}%`,      color: D.aiColor[0] },
    { label: 'Effort Reduction',      subLabel: `${aiGainPct * 0.178 | 0}%`,                 pct: Math.min(99, Math.round(aiGainPct * 0.6)),          value: `${Math.round(aiGainPct * 0.6)}%`,          color: D.aiColor[1] },
    { label: 'Timeline Compression',  subLabel: `${aiGainPct * 0.1 | 0}%`,                   pct: Math.min(99, Math.round(aiGainPct * 0.35)),         value: `${Math.round(aiGainPct * 0.35)}%`,         color: D.aiColor[2] },
    { label: 'Quality Score Uplift',  subLabel: `${aiGainPct | 0}pts`,                        pct: Math.min(99, Math.round(aiGainPct * 1.1)),          value: `${Math.round(aiGainPct * 1.1)}%`,          color: D.aiColor[3] },
  ];

  const fmtCost = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;

  return (
    <div style={{ background: D.bg, minHeight: '100%', padding: '20px 24px 40px' }}>

      {/* ── 6 KPI Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 18 }}>
        <KpiTile label="Total Cost"  value={fmtCost(totalCost)}   sub={`${estimation?.personMonths ?? 0} person-months`}  icon={<DollarSign  size={16} />} palette={D.kpi[0]} />
        <KpiTile label="Timeline"    value={totalWeeks >= 52 ? `${Math.round(totalWeeks / 4.33)} months` : `${totalWeeks}w`}  sub={plan ? `${plan.phases.length} phases` : undefined}  icon={<Calendar    size={16} />} palette={D.kpi[1]} />
        <KpiTile label="Team Size"   value={String(teamSize)}     sub={`peak ${peakHC}`}                                  icon={<Users       size={16} />} palette={D.kpi[2]} />
        <KpiTile label="QA Hours"    value={qaHours.toLocaleString()} sub={`${testing?.automationCoverage ?? 0}% auto`}   icon={<CheckSquare size={16} />} palette={D.kpi[3]} />
        <KpiTile label="AI Savings"  value={fmtCost(aiSavings * 120)} sub={`${aiGainPct}% gain`}                         icon={<Zap         size={16} />} palette={D.kpi[4]} />
        <KpiTile label="Confidence"  value={`${doc?.summary?.confidenceScore ?? 0}%`} sub={`${(result.scopeItems ?? []).length} scope items`} icon={<TrendingUp size={16} />} palette={D.kpi[5]} />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <Card>
          <SectionHead title="Cost by Phase" action="Detail" />
          {phaseData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: D.muted, fontSize: 13 }}>No phase data</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={phaseData} barSize={28} margin={{ left: -10, right: 8, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                  interval={0} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v}K`} />
                <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ zIndex: 9999 }}
                  labelStyle={{ color: '#F1F5F9', fontWeight: 600 }}
                  formatter={(v: number) => [`$${v}K`, 'Cost']} />
                <Bar dataKey="cost" radius={[5, 5, 0, 0]}>
                  {phaseData.map((_, i) => (
                    <Cell key={i} fill={D.distColors[i % D.distColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <SectionHead title="Team Headcount over Time" action="Detail" />
          {headData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: D.muted, fontSize: 13 }}>No headcount data</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={headData} margin={{ left: -10, right: 8 }}>
                <defs>
                  <linearGradient id="hcGradDark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(headData.length / 8) - 1)} />
                <YAxis tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ zIndex: 9999 }}
                  labelStyle={{ color: '#F1F5F9', fontWeight: 600 }}
                  formatter={(v: number) => [v, 'Headcount']} />
                <Area type="monotone" dataKey="hc"
                  stroke={D.areaColor} strokeWidth={2.5}
                  fill="url(#hcGradDark)"
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

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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

        <Card>
          <SectionHead title="AI vs Traditional Summary" />
          {aiRows.map((r) => (
            <AiBar key={r.label} label={r.label} subLabel={r.subLabel} pct={r.pct} value={r.value} color={r.color} />
          ))}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${D.glassBd}`, display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, color: '#6366F1', cursor: 'pointer', fontWeight: 500 }}>
              View Full AI Analysis →
            </span>
          </div>
        </Card>
      </div>

    </div>
  );
}
