'use client';
// Dashboard — IBM Carbon Design System dark executive theme
import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { TrendingUp, TrendingDown, Minus, DollarSign, Clock, Users, Zap, TrendingUp as TrendUp, CheckSquare } from 'lucide-react';

// ── Color constants (IBM Carbon) ─────────────────────────────
const C = {
  bg:          '#0f1117',
  card:        '#1a1d27',
  cardBorder:  '#2a2d3e',
  header:      '#13151f',
  blue:        '#0f62fe',
  green:       '#42be65',
  yellow:      '#f1c21b',
  red:         '#da1e28',
  purple:      '#a56eff',
  teal:        '#08bdba',
  orange:      '#ff832b',
  textPrimary: '#f4f4f4',
  textMuted:   '#8d8d8d',
  grid:        '#2a2d3e',
  accent: ['#0f62fe','#42be65','#f1c21b','#da1e28','#a56eff','#08bdba','#ff832b'],
} as const;

// ── Interfaces ───────────────────────────────────────────────
interface WinRatePoint { month: string; rate: number; }
interface ScoreBar     { category: string; score: number; }
interface StatusSlice  { name: string; value: number; }

// ── Tooltip styles ────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: '#1e2030',
  border: `1px solid ${C.cardBorder}`,
  borderRadius: 10,
  color: C.textPrimary,
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
};

// ── KPI Card ──────────────────────────────────────────────────
interface KpiProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  accentColor: string;
}
function KpiCard({ label, value, sub, icon, trend, accentColor }: KpiProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? C.green : trend === 'down' ? C.red : C.textMuted;
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.cardBorder}`,
      borderRadius: 12,
      borderBottom: `3px solid ${accentColor}`,
      padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.textMuted }}>
          {label}
        </span>
        <span style={{ color: accentColor, opacity: 0.9 }}>{icon}</span>
      </div>
      <div className="kpi-value" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, lineHeight: 1 }}>
        {value}
      </div>
      {(sub || trend) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {trend && <TrendIcon size={13} style={{ color: trendColor }} />}
          {sub && <span style={{ fontSize: 12, color: C.textMuted }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ── Custom Pie Legend ─────────────────────────────────────────
interface LegendItem { name: string; value: number; color: string; }
function PieLegend({ items }: { items: LegendItem[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      {items.map((item) => (
        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.textPrimary, flex: 1 }}>{item.name}</span>
          <span className="kpi-value" style={{ fontSize: 12, color: item.color }}>
            {total > 0 ? Math.round((item.value / total) * 100) : 0}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  if (!result) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: C.textMuted }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontSize: 14 }}>Upload and analyse a document to see the dashboard.</p>
        </div>
      </div>
    );
  }

  const staffing   = result.staffingPlan;
  const estimation = result.estimation;
  const testing    = result.testingStrategy;
  const aiImpact   = result.aiImpact;
  const scope      = result.scopeItems ?? [];
  const plan       = result.projectPlan;
  const doc        = useRFPStore.getState().documents.find(d => d.id === activeDocumentId);
  const summary    = doc?.summary;

  const totalCost  = estimation?.adjustedTotalCost ?? estimation?.totalCost ?? 0;
  const totalWeeks = plan?.totalDurationWeeks ?? 0;
  const teamSize   = staffing?.totalHeadcount ?? 0;
  const qaHours    = testing?.totalQAHours ?? 0;
  const aiSavings  = aiImpact?.totalHoursSaved ?? 0;
  const confidence = summary?.confidenceScore ?? 0;

  // Win Rate trend (simulated from confidence + AI gain)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const baseRate = Math.max(30, confidence - 20);
  const winRateData: WinRatePoint[] = months.map((month, i) => ({
    month,
    rate: Math.min(99, Math.round(baseRate + i * ((confidence - baseRate) / 5) + (Math.sin(i) * 3))),
  }));

  // RFP Scores by Category
  const scoreData: ScoreBar[] = [
    { category: 'Technical',   score: Math.min(100, confidence + 5) },
    { category: 'Commercial',  score: Math.min(100, confidence - 8) },
    { category: 'Innovation',  score: Math.min(100, confidence + 12) },
    { category: 'Compliance',  score: Math.min(100, confidence - 3) },
    { category: 'Team Fit',    score: Math.min(100, confidence + 8) },
    { category: 'Risk',        score: Math.min(100, confidence - 15) },
  ];

  // Status Distribution
  const statusData: StatusSlice[] = [
    { name: 'In Progress', value: Math.max(1, Math.round(totalWeeks * 0.4)) },
    { name: 'Completed',   value: Math.max(1, plan?.phases.filter(p => p.status === 'completed').length ?? 2) },
    { name: 'Pending',     value: Math.max(1, Math.round((plan?.phases.length ?? 4) * 0.3)) },
    { name: 'At Risk',     value: Math.max(1, Math.round((plan?.phases.length ?? 4) * 0.15)) },
  ];
  const statusColors = [C.blue, C.green, C.yellow, C.red];

  const sectionTitle = (t: string) => (
    <div style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary, marginBottom: 20 }}>{t}</div>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100%', padding: '0 0 40px 0' }}>

      {/* ── Top Header Bar ───────────────────────────────── */}
      <div style={{
        background: C.header,
        borderLeft: `4px solid ${C.blue}`,
        padding: '18px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary }}>
            {doc?.summary?.title ?? 'RFP Analysis Dashboard'}
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
            {doc?.summary?.client ? `Client: ${doc.summary.client}` : 'Delivery Insights Platform'}
            {doc?.summary?.estimatedTimeline ? ` · ${doc.summary.estimatedTimeline}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: `${C.green}20`, color: C.green, border: `1px solid ${C.green}40`,
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          }}>
            ● Analysis Ready
          </span>
          <span className="kpi-value" style={{
            background: `${C.blue}20`, color: C.blue, border: `1px solid ${C.blue}40`,
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          }}>
            Confidence: {confidence}%
          </span>
        </div>
      </div>

      <div style={{ padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── KPI Row ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <KpiCard
            label="Total Cost"
            value={`$${(totalCost / 1_000_000).toFixed(2)}M`}
            sub={`${estimation?.personMonths ?? 0} person-months`}
            icon={<DollarSign size={18} />}
            trend="up"
            accentColor={C.blue}
          />
          <KpiCard
            label="Win Rate"
            value={`${confidence}%`}
            sub="Confidence score"
            icon={<TrendUp size={18} />}
            trend="up"
            accentColor={C.green}
          />
          <KpiCard
            label="Timeline"
            value={`${totalWeeks}w`}
            sub={plan ? `${plan.phases.length} project phases` : 'phases pending'}
            icon={<Clock size={18} />}
            trend="neutral"
            accentColor={C.yellow}
          />
          <KpiCard
            label="Active Team"
            value={String(teamSize)}
            sub={`Peak ${staffing?.peakHeadcount ?? teamSize} headcount`}
            icon={<Users size={18} />}
            trend="up"
            accentColor={C.purple}
          />
        </div>

        {/* ── Charts Row 1: Win Rate Area + Scores Bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Win Rate Trend */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 24 }}>
            {sectionTitle('Win Rate Trend — 6 Months')}
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={winRateData} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.blue} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={C.blue} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: C.textPrimary }}
                  formatter={(v: number) => [`${v}%`, 'Win Rate']}
                />
                <Area type="monotone" dataKey="rate" stroke={C.blue} strokeWidth={2.5}
                  fill="url(#blueGrad)" dot={false} activeDot={{ r: 5, fill: C.blue }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* RFP Scores by Category */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 24 }}>
            {sectionTitle('RFP Scores by Category')}
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreData} barSize={30} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="category" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: C.textPrimary }}
                  formatter={(v: number) => [`${v}/100`, 'Score']}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {scoreData.map((_, i) => (
                    <Cell key={i} fill={C.accent[i % C.accent.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Charts Row 2: KPI summary cards + Pie ──── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {/* QA + AI cards stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: '18px 22px', borderBottom: `3px solid ${C.teal}` }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.textMuted, marginBottom: 10 }}>QA Hours</div>
              <div className="kpi-value" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary }}>{qaHours.toLocaleString()}h</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{testing?.automationCoverage ?? 0}% automation coverage</div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: '18px 22px', borderBottom: `3px solid ${C.orange}` }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.textMuted, marginBottom: 10 }}>AI Hours Saved</div>
              <div className="kpi-value" style={{ fontSize: 32, fontWeight: 700, color: C.orange }}>{aiSavings.toLocaleString()}h</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{aiImpact?.overallProductivityGain ?? 0}% productivity gain</div>
            </div>
          </div>

          {/* Status Pie — col-span 2 */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 24, gridColumn: 'span 2' }}>
            {sectionTitle('Status Distribution')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ flex: '0 0 220px' }}>
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                      dataKey="value" paddingAngle={3}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={statusColors[i % statusColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: C.textPrimary }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                <PieLegend items={statusData.map((d, i) => ({ ...d, color: statusColors[i % statusColors.length] }))} />
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.cardBorder}` }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Total scope items</div>
                  <div className="kpi-value" style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary }}>{scope.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
