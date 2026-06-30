'use client';
// ============================================================
// RFP Analyzer Pro — Confidence & Historical Insights Panel
// ============================================================
// Displays:
//  • Overall Proposal Confidence Score with gauge
//  • "Why trust this output?" explainer
//  • Expandable WON engagement cards (IBM Research badge)
//  • Expandable LOST engagement cards with loss reasons & mitigations
//  • Risk-flag mitigation panel
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Trophy,
  AlertTriangle,
  Shield,
  TrendingUp,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Microscope,
  RefreshCw,
  Lightbulb,
  BarChart2,
  Target,
  Clock,
  Globe,
  Server,
  DollarSign,
} from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import type {
  SimilarityResult,
  LossInsights,
  ProposalConfidenceScore,
} from '@/types';

// ── Theme palette (consistent with project PC / T tokens) ───
const CI = {
  bg:        '#F8FAFC',
  card:      '#FFFFFF',
  border:    '#E2E8F0',
  text:      '#0A1628',
  muted:     '#94A3B8',
  secondary: '#4A5568',
  indigo:    '#6366F1',
  indigoLt:  '#EEF2FF',
  green:     '#238636',
  greenLt:   '#DCFCE7',
  amber:     '#D97706',
  amberLt:   '#FEF3C7',
  red:       '#DC2626',
  redLt:     '#FEE2E2',
  ibmBlue:   '#0F62FE',
  ibmBlueLt: '#EFF4FF',
  gold:      '#C9A84C',
  goldLt:    '#FDF6E3',
};

// ── Helpers ─────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function bandColor(band: ProposalConfidenceScore['band']): string {
  switch (band) {
    case 'Excellent': return CI.green;
    case 'Good':      return CI.indigo;
    case 'Fair':      return CI.amber;
    case 'Poor':      return CI.red;
  }
}

function bandBg(band: ProposalConfidenceScore['band']): string {
  switch (band) {
    case 'Excellent': return CI.greenLt;
    case 'Good':      return CI.indigoLt;
    case 'Fair':      return CI.amberLt;
    case 'Poor':      return CI.redLt;
  }
}

/** Format the similarity score as a colour-coded pct string. */
function ScorePill({ score }: { score: number }) {
  const color = score >= 70 ? CI.green : score >= 45 ? CI.amber : CI.red;
  const bg    = score >= 70 ? CI.greenLt : score >= 45 ? CI.amberLt : CI.redLt;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ color, background: bg }}
    >
      {score.toFixed(0)}% match
    </span>
  );
}

/** IBM Research provenance badge. */
function IBMResearchBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
      style={{ color: CI.ibmBlue, background: CI.ibmBlueLt, border: `1px solid ${CI.ibmBlue}22` }}
      title="This record originates from IBM Research / IBM Institute for Business Value"
    >
      <Microscope size={10} />
      IBM Research
    </span>
  );
}

/** Salesforce CRM provenance badge — shown on live-fetched records. */
function SalesforceBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
      style={{ color: '#00A1E0', background: '#E8F7FD', border: '1px solid #00A1E022' }}
      title="Live record fetched from IBM Salesforce CRM (ibmsc)"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C9.2 2 7 4.2 7 7c0 1.1.4 2.2 1 3C5.3 10.8 4 12.8 4 15c0 3.3 2.7 6 6 6h.5c.3.5.8.8 1.4.8s1.1-.3 1.4-.8H14c3.3 0 6-2.7 6-6 0-2.2-1.2-4.2-3-5.2.1-.4.2-.8.2-1.3 0-2.4-2-4.3-4.4-4.3-.3 0-.6 0-.8.1C13.8 3.4 14 2 14 2h-2z"/>
      </svg>
      Salesforce CRM
    </span>
  );
}

/** Render the appropriate source badge for an engagement. */
function SourceBadge({ tag }: { tag?: string }) {
  if (tag === 'Bob IBM Research') return <IBMResearchBadge />;
  if (tag === 'Salesforce CRM')   return <SalesforceBadge />;
  return null;
}

// ── Score Gauge (SVG arc) ────────────────────────────────────

interface GaugeProps {
  score: number;
  band: ProposalConfidenceScore['band'];
}

function ScoreGauge({ score, band }: GaugeProps) {
  // Semi-circle gauge: arc from 180° to 0° (left to right)
  const radius  = 70;
  const cx      = 100;
  const cy      = 100;
  const strokeW = 14;

  // Background arc (full semi-circle)
  const bgArcD = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  // Foreground arc (fraction of semi-circle based on score)
  const fraction = Math.max(0, Math.min(1, score / 100));
  const angle    = Math.PI * fraction; // 0 → PI radians
  const ex = cx - radius * Math.cos(angle);
  const ey = cy - radius * Math.sin(angle);
  const largeArc = fraction > 0.5 ? 1 : 0;
  const fgArcD   =
    fraction <= 0
      ? ''
      : fraction >= 1
      ? bgArcD
      : `M ${cx - radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`;

  const color = bandColor(band);

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="115" viewBox="0 0 200 115" aria-label={`Confidence score gauge: ${score}`}>
        {/* Background track */}
        <path
          d={bgArcD}
          fill="none"
          stroke={CI.border}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Foreground arc */}
        {fgArcD && (
          <path
            d={fgArcD}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}
        {/* Score label */}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="28" fontWeight="800" fill={color}>
          {score}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill={CI.muted}>
          / 100
        </text>
        {/* Range labels */}
        <text x={cx - radius - 2} y={cy + 18} textAnchor="middle" fontSize="9" fill={CI.muted}>0</text>
        <text x={cx + radius + 2} y={cy + 18} textAnchor="middle" fontSize="9" fill={CI.muted}>100</text>
      </svg>
      {/* Band badge */}
      <span
        className="mt-1 px-4 py-1 rounded-full text-sm font-bold"
        style={{ color, background: bandBg(band) }}
      >
        {band}
      </span>
    </div>
  );
}

// ── Expandable card wrapper ──────────────────────────────────

interface ExpandableCardProps {
  header: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}

function ExpandableCard({ header, children, defaultOpen = false, accent }: ExpandableCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${accent ?? CI.border}`, background: CI.card }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">{header}</div>
        <span className="ml-3 text-slate-400 shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: CI.border }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Dimension Score Row ──────────────────────────────────────

interface DimRowProps {
  label: string;
  score: number;
  icon: React.ReactNode;
}

function DimRow({ label, score, icon }: DimRowProps) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? CI.green : pct >= 40 ? CI.amber : CI.muted;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="w-28 text-slate-600 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="w-8 text-right font-semibold" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ── WON Engagement Card ──────────────────────────────────────

function WonCard({ result, index }: { result: SimilarityResult; index: number }) {
  const e = result.engagement;
  const isFirst = index === 0;
  return (
    <ExpandableCard
      defaultOpen={isFirst}
      accent={isFirst ? `${CI.green}44` : undefined}
      header={
        <div className="flex flex-wrap items-center gap-2">
          <Trophy size={15} style={{ color: CI.green }} className="shrink-0" />
          <span className="text-sm font-semibold text-slate-800 truncate">{e.projectTitle}</span>
          <ScorePill score={result.similarityScore} />
          <SourceBadge tag={e.sourceTag} />
        </div>
      }
    >
      {/* Metadata row */}
      <div className="flex flex-wrap gap-3 mb-3 mt-1 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Globe size={11} />{e.geography}</span>
        <span className="flex items-center gap-1"><Target size={11} />{e.industry}</span>
        <span className="flex items-center gap-1"><Server size={11} />{e.serviceType}</span>
        <span className="flex items-center gap-1"><DollarSign size={11} />{fmt(e.contractValueUSD)}</span>
        <span className="flex items-center gap-1"><Clock size={11} />{e.durationWeeks}w</span>
      </div>

      {/* Winning attributes */}
      {e.winningAttributes.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Winning Attributes</div>
          <ul className="space-y-1">
            {e.winningAttributes.map((attr, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <CheckCircle2 size={12} style={{ color: CI.green }} className="mt-0.5 shrink-0" />
                {attr}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lessons learned */}
      {e.lessonsLearned && (
        <div className="rounded-lg px-3 py-2 text-xs italic text-slate-600" style={{ background: CI.greenLt }}>
          <Lightbulb size={11} className="inline mr-1.5 -mt-0.5" style={{ color: CI.green }} />
          {e.lessonsLearned}
        </div>
      )}

      {/* Dimension breakdown */}
      <div className="mt-3 space-y-1.5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Match Breakdown</div>
        <DimRow label="Industry"       score={result.dimensionScores.industry}       icon={<Target size={11} />} />
        <DimRow label="Service Type"   score={result.dimensionScores.serviceType}    icon={<BarChart2 size={11} />} />
        <DimRow label="Tech Stack"     score={result.dimensionScores.technologyStack} icon={<Server size={11} />} />
        <DimRow label="Geography"      score={result.dimensionScores.geography}      icon={<Globe size={11} />} />
        <DimRow label="Contract Value" score={result.dimensionScores.contractValue}  icon={<DollarSign size={11} />} />
        <DimRow label="Duration"       score={result.dimensionScores.duration}       icon={<Clock size={11} />} />
        <DimRow label="Keyword Bonus"  score={result.dimensionScores.keywordBonus}   icon={<Lightbulb size={11} />} />
      </div>

      {/* Technologies */}
      {e.technologies.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {e.technologies.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: CI.indigoLt, color: CI.indigo }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </ExpandableCard>
  );
}

// ── LOST Engagement Card ─────────────────────────────────────

function LostCard({ result, index }: { result: SimilarityResult; index: number }) {
  const e = result.engagement;
  return (
    <ExpandableCard
      defaultOpen={index === 0}
      accent={`${CI.red}33`}
      header={
        <div className="flex flex-wrap items-center gap-2">
          <XCircle size={15} style={{ color: CI.red }} className="shrink-0" />
          <span className="text-sm font-semibold text-slate-800 truncate">{e.projectTitle}</span>
          <ScorePill score={result.similarityScore} />
          <SourceBadge tag={e.sourceTag} />
        </div>
      }
    >
      <div className="flex flex-wrap gap-3 mb-3 mt-1 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Globe size={11} />{e.geography}</span>
        <span className="flex items-center gap-1"><Target size={11} />{e.industry}</span>
        <span className="flex items-center gap-1"><DollarSign size={11} />{fmt(e.contractValueUSD)}</span>
      </div>

      {/* Loss reasons */}
      {e.lossReasons.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loss Reasons</div>
          {e.lossReasons.map((lr, i) => (
            <div key={i} className="rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
                style={{ background: CI.redLt, color: CI.red }}>
                <AlertTriangle size={11} /> {lr.category}
              </div>
              <div className="px-3 py-2 text-xs text-slate-600 border-l-2" style={{ borderColor: CI.red, background: '#fff8f8' }}>
                {lr.reason}
              </div>
              <div className="px-3 py-2 text-xs flex items-start gap-1.5 rounded-b-lg"
                style={{ background: CI.amberLt, color: '#92400e' }}>
                <Shield size={11} className="mt-0.5 shrink-0" />
                <span><span className="font-semibold">Mitigation:</span> {lr.mitigationForCurrentProposal}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lessons learned */}
      {e.lessonsLearned && (
        <div className="rounded-lg px-3 py-2 text-xs italic text-slate-600" style={{ background: CI.amberLt }}>
          <Lightbulb size={11} className="inline mr-1.5 -mt-0.5" style={{ color: CI.amber }} />
          {e.lessonsLearned}
        </div>
      )}
    </ExpandableCard>
  );
}

// ── Risk Flag Summary ────────────────────────────────────────

function RiskFlagPanel({ lossInsights }: { lossInsights: LossInsights }) {
  if (lossInsights.categorisedLossReasons.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
        style={{ background: CI.greenLt, color: CI.green, border: `1px solid ${CI.green}33` }}>
        <CheckCircle2 size={16} />
        No active risk flags detected from similar engagements.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {lossInsights.categorisedLossReasons.map((cat) => (
        <ExpandableCard
          key={cat.category}
          accent={`${CI.amber}44`}
          header={
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: CI.amber }} />
              <span className="text-sm font-semibold text-slate-800">{cat.category}</span>
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: CI.amberLt, color: CI.amber }}
              >
                ×{cat.frequency}
              </span>
            </div>
          }
        >
          <div className="space-y-2 mt-1">
            {cat.reasons.map((r, i) => (
              <div key={i} className="space-y-1">
                <div className="text-xs text-slate-600 pl-2 border-l-2" style={{ borderColor: CI.red }}>
                  {r}
                </div>
                {cat.mitigations[i] && (
                  <div className="flex items-start gap-1.5 text-xs rounded px-2 py-1.5"
                    style={{ background: CI.amberLt, color: '#78350f' }}>
                    <Shield size={11} className="mt-0.5 shrink-0" />
                    <span><span className="font-semibold">Mitigation: </span>{cat.mitigations[i]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ExpandableCard>
      ))}
    </div>
  );
}

// ── Score Drivers Panel ──────────────────────────────────────

function ScoreDrivers({ confidenceScore }: { confidenceScore: ProposalConfidenceScore }) {
  return (
    <div className="space-y-2">
      {confidenceScore.drivers.map((d) => {
        const isPos = d.contribution >= 0;
        const color = isPos ? (d.contribution >= 20 ? CI.green : CI.indigo) : CI.red;
        return (
          <div
            key={d.label}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm"
            style={{ background: isPos ? CI.indigoLt : CI.redLt, border: `1px solid ${color}22` }}
          >
            {isPos ? (
              <TrendingUp size={15} style={{ color }} className="mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle size={15} style={{ color }} className="mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-semibold text-slate-800">{d.label}</span>
                <span className="text-xs font-bold shrink-0" style={{ color }}>
                  {d.contribution > 0 ? '+' : ''}{d.contribution} pts
                </span>
              </div>
              <p className="text-xs text-slate-500">{d.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── "Why trust this output?" panel ──────────────────────────

function TrustExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${CI.ibmBlue}33`, background: CI.ibmBlueLt }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-blue-50 transition-colors"
        aria-expanded={open}
      >
        <HelpCircle size={16} style={{ color: CI.ibmBlue }} className="shrink-0" />
        <span className="text-sm font-semibold text-slate-800 flex-1">
          Why should I trust this output?
        </span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="explainer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: `${CI.ibmBlue}22` }}>
              <ul className="space-y-2 text-xs text-slate-600">
                {[
                  ['Transparent scoring', 'Every similarity score is computed from 8 weighted dimensions — industry, service type, technology stack, contract value, geography, delivery model, duration, and keyword bonus. Weights are published and configurable.'],
                  ['No black-box AI', 'All logic is deterministic, pure functions. Same inputs always produce the same output. No hidden model inference.'],
                  ['Data sources', 'When IBM Salesforce CRM credentials are configured, live Closed Won / Closed Lost Opportunities are fetched from ibmsc and shown with a Salesforce CRM badge. Without credentials the built-in 20-record seed dataset is used. Records marked IBM Research originate from IBM Research / IBM Institute for Business Value.'],
                  ['Honest uncertainty', 'The confidence score explicitly penalises missing fields (completeness) and active risk flags from similar losses. A low score is a signal to investigate further, not to ignore.'],
                  ['Actionable risk flags', 'Every loss reason is paired with a concrete mitigation recommendation. Flags are derived from similar past losses — not generic advice.'],
                  ['Continuous improvement', 'Click Refresh to recompute the analysis after updating the proposal details in other tabs. The score will update immediately.'],
                ].map(([title, body]) => (
                  <li key={title} className="flex items-start gap-2">
                    <CheckCircle2 size={12} style={{ color: CI.ibmBlue }} className="mt-0.5 shrink-0" />
                    <span><span className="font-semibold text-slate-700">{title}: </span>{body}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section Header ───────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}

function SectionHeader({ icon, title, subtitle, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: CI.indigoLt }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-slate-400 text-sm text-center">
      {message}
    </div>
  );
}

// ── Main Module Export ───────────────────────────────────────

/**
 * Confidence & Historical Insights panel.
 *
 * Automatically triggers `computeHistoricalInsights` on mount when
 * an active document is present and insights have not yet been
 * computed.  Shows a loading spinner while computing, and renders
 * the full panel once the bundle is available.
 */
export default function ConfidenceInsightsModule() {
  const activeDocumentId    = useRFPStore((s) => s.activeDocumentId);
  const analysisResults     = useRFPStore((s) => s.analysisResults);
  const historicalInsights  = useRFPStore((s) => s.historicalInsights);
  const isComputingInsights = useRFPStore((s) => s.isComputingInsights);
  const computeHistoricalInsights = useRFPStore((s) => s.computeHistoricalInsights);
  const [activeSection, setActiveSection] = useState<'wins' | 'losses' | 'risks'>('wins');

  const docId   = activeDocumentId ?? '';
  const bundle  = docId ? historicalInsights[docId] : undefined;
  const hasAnalysis = docId && analysisResults[docId] !== undefined;

  // Auto-compute on mount / when analysis result arrives
  useEffect(() => {
    if (docId && hasAnalysis && !bundle && !isComputingInsights) {
      computeHistoricalInsights(docId);
    }
  }, [docId, hasAnalysis, bundle, isComputingInsights, computeHistoricalInsights]);

  const handleRefresh = useCallback(() => {
    if (docId && hasAnalysis) {
      computeHistoricalInsights(docId);
    }
  }, [docId, hasAnalysis, computeHistoricalInsights]);

  // ── No document ────────────────────────────────────────────
  if (!docId || !hasAnalysis) {
    return (
      <div className="p-6" style={{ background: CI.bg }}>
        <EmptyState message="Upload and analyze an RFP document to view Confidence & Historical Insights." />
      </div>
    );
  }

  // ── Computing ──────────────────────────────────────────────
  if (isComputingInsights || !bundle) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3 min-h-64" style={{ background: CI.bg }}>
        <RefreshCw size={24} className="text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-500">Computing historical engagement analysis…</p>
      </div>
    );
  }

  const { winInsights, lossInsights, confidenceScore } = bundle;

  const sectionTabs: Array<{ id: typeof activeSection; label: string; count: number; color: string }> = [
    { id: 'wins',   label: 'Similar Wins',   count: winInsights.topWins.length,   color: CI.green },
    { id: 'losses', label: 'Similar Losses', count: lossInsights.topLosses.length, color: CI.red   },
    { id: 'risks',  label: 'Risk Flags',     count: confidenceScore.activeRiskFlags, color: CI.amber },
  ];

  return (
    <div className="p-5 space-y-5" style={{ background: CI.bg, minHeight: '100%' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Confidence &amp; Historical Insights</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analysed against {20} historical IBM engagements · Last computed {' '}
            {new Date(bundle.computedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-white border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* ── Trust explainer ── */}
      <TrustExplainer />

      {/* ── Confidence Score ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: CI.card, border: `1px solid ${CI.border}` }}
      >
        <SectionHeader
          icon={<BarChart2 size={16} style={{ color: CI.indigo }} />}
          title="Overall Proposal Confidence Score"
          subtitle="Composite score derived from historical win alignment, risk flags, and proposal completeness."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          {/* Gauge */}
          <div className="flex flex-col items-center">
            <ScoreGauge score={confidenceScore.score} band={confidenceScore.band} />
            {/* KPI pills */}
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <span className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: CI.border }}>
                <span className="font-semibold text-slate-700">{confidenceScore.winMatchCount}</span>
                <span className="text-slate-500"> win matches</span>
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: CI.border }}>
                <span className="font-semibold" style={{ color: confidenceScore.activeRiskFlags > 0 ? CI.amber : CI.green }}>
                  {confidenceScore.activeRiskFlags}
                </span>
                <span className="text-slate-500"> risk flags</span>
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: CI.border }}>
                <span className="font-semibold text-slate-700">
                  {Math.round(confidenceScore.completenessScore * 100)}%
                </span>
                <span className="text-slate-500"> complete</span>
              </span>
            </div>
          </div>

          {/* Score drivers */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Score Drivers</div>
            <ScoreDrivers confidenceScore={confidenceScore} />
          </div>
        </div>
      </div>

      {/* ── Section Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: CI.card, border: `1px solid ${CI.border}` }}>
        {sectionTabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={
                isActive
                  ? { background: CI.indigo, color: '#fff' }
                  : { color: CI.secondary }
              }
            >
              {tab.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={isActive ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: CI.border, color: CI.secondary }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Section Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >

          {/* WINS */}
          {activeSection === 'wins' && (
            <div
              className="rounded-2xl p-5"
              style={{ background: CI.card, border: `1px solid ${CI.border}` }}
            >
              <SectionHeader
                icon={<Trophy size={16} style={{ color: CI.green }} />}
                title="Similar WON Engagements"
                subtitle="Historical IBM wins most similar to this proposal, ranked by composite match score."
                badge={
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: CI.greenLt, color: CI.green }}
                  >
                    Confidence: {winInsights.confidenceLevel}
                  </span>
                }
              />

              {winInsights.topWins.length === 0 ? (
                <EmptyState message="No closely matching WON engagements found. Expand the proposal details to improve matching." />
              ) : (
                <>
                  {/* Top winning attributes summary */}
                  {winInsights.topWinningAttributes.length > 0 && (
                    <div className="mb-4 p-3 rounded-xl" style={{ background: CI.greenLt, border: `1px solid ${CI.green}33` }}>
                      <div className="text-xs font-semibold mb-2" style={{ color: CI.green }}>
                        Top Winning Attributes Across Matched Wins
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {winInsights.topWinningAttributes.slice(0, 6).map((a) => (
                          <span
                            key={a.attribute}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                            style={{ background: '#fff', color: CI.green, border: `1px solid ${CI.green}44` }}
                          >
                            <CheckCircle2 size={10} />
                            {a.attribute}
                            {a.frequency > 1 && (
                              <span className="text-[9px] opacity-60">×{a.frequency}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {winInsights.topWins.map((r, i) => (
                      <WonCard key={r.engagement.id} result={r} index={i} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* LOSSES */}
          {activeSection === 'losses' && (
            <div
              className="rounded-2xl p-5"
              style={{ background: CI.card, border: `1px solid ${CI.border}` }}
            >
              <SectionHeader
                icon={<XCircle size={16} style={{ color: CI.red }} />}
                title="Similar LOST Engagements"
                subtitle="Historical IBM losses most similar to this proposal — understand what went wrong."
              />
              {lossInsights.topLosses.length === 0 ? (
                <EmptyState message="No closely matching LOST engagements found." />
              ) : (
                <div className="space-y-3">
                  {lossInsights.topLosses.map((r, i) => (
                    <LostCard key={r.engagement.id} result={r} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RISKS */}
          {activeSection === 'risks' && (
            <div
              className="rounded-2xl p-5"
              style={{ background: CI.card, border: `1px solid ${CI.border}` }}
            >
              <SectionHeader
                icon={<Shield size={16} style={{ color: CI.amber }} />}
                title="Risk-Flag Mitigations"
                subtitle="Actionable recommendations derived from similar engagement loss patterns."
                badge={
                  confidenceScore.activeRiskFlags > 0 ? (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: CI.amberLt, color: CI.amber }}
                    >
                      {confidenceScore.activeRiskFlags} active flag{confidenceScore.activeRiskFlags !== 1 ? 's' : ''}
                    </span>
                  ) : undefined
                }
              />
              <RiskFlagPanel lossInsights={lossInsights} />
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Confidence confidence level legend ── */}
      <div
        className="rounded-xl p-4 text-xs"
        style={{ background: CI.card, border: `1px solid ${CI.border}` }}
      >
        <div className="font-semibold text-slate-700 mb-2">Score Interpretation</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['Excellent', 'Good', 'Fair', 'Poor'] as const).map((b) => (
            <div key={b} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              style={{ background: bandBg(b), border: `1px solid ${bandColor(b)}33` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: bandColor(b) }} />
              <div>
                <div className="font-semibold" style={{ color: bandColor(b) }}>{b}</div>
                <div className="text-[10px]" style={{ color: bandColor(b) }}>
                  {b === 'Excellent' ? '75–100' : b === 'Good' ? '55–74' : b === 'Fair' ? '35–54' : '0–34'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Win/Loss breakdown bar ── */}
      {(winInsights.topWins.length + lossInsights.topLosses.length > 0) && (() => {
        const total = winInsights.topWins.length + lossInsights.topLosses.length;
        const winPct = Math.round((winInsights.topWins.length / total) * 100);
        return (
          <div
            className="rounded-xl p-4"
            style={{ background: CI.card, border: `1px solid ${CI.border}` }}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700">Similar Engagement Win Rate</span>
              <span style={{ color: winPct >= 60 ? CI.green : winPct >= 40 ? CI.amber : CI.red }}
                className="font-bold">
                {winPct}% Won
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex" style={{ background: CI.redLt }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${winPct}%`, background: CI.green }}
              />
            </div>
            <div className="flex justify-between text-[10px] mt-1.5" style={{ color: CI.muted }}>
              <span>{winInsights.topWins.length} Won</span>
              <span>{lossInsights.topLosses.length} Lost</span>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
