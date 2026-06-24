'use client';
// Estimation — Dark glassmorphism
import React, { useState } from 'react';
import { RotateCcw, ChevronDown, ChevronUp, Info, Eye } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import type { CostAssumptions, EstimationSummary, CostBreakdown } from '@/types';
import { DEFAULT_COST_ASSUMPTIONS } from '@/types';

const ACCENT = '#6366F1';
const TEAL   = '#06B6D4';
const AMBER  = '#F59E0B';
const GLASS  = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number, total: number) {
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%';
}

function SliderRow({ label, tooltip, value, min, max, step, format, onChange, accent }: {
  label: string; tooltip: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void; accent?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-4 py-2.5 last:border-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="w-44 flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs font-semibold" style={{ color: '#94A3B8' }}>{label}</span>
        <div className="relative group">
          <Info size={11} style={{ color: '#475569' }} className="cursor-help" />
          <div className="absolute left-4 top-0 z-10 hidden group-hover:block text-white text-[10px] rounded-lg px-2.5 py-1.5 w-48 shadow-xl"
            style={{ background: '#1E2436', border: '1px solid rgba(99,102,241,0.3)' }}>{tooltip}</div>
        </div>
      </div>
      <div className="flex-1 relative">
        <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="absolute top-0 left-0 h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: accent ? ACCENT : TEAL }} />
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-1.5" style={{ zIndex: 1 }} />
      </div>
      <div className="w-20 text-right text-sm font-bold tabular-nums flex-shrink-0"
        style={{ color: accent ? ACCENT : '#F1F5F9' }}>
        {format(value)}
      </div>
    </div>
  );
}

function BreakdownBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs" style={{ color: '#94A3B8' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: '#475569' }}>{pct.toFixed(1)}%</span>
          <span className="text-xs font-semibold" style={{ color }}>{fmt(amount)}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── CLIENT VIEW ───────────────────────────────────────────────
function ClientView({ est, adjustedTotal, bd }: {
  est: EstimationSummary;
  adjustedTotal: number;
  bd: CostBreakdown;
}) {
  const milestones = [
    { label: 'Project Kickoff', pct: 15, desc: 'Discovery & architecture sign-off' },
    { label: 'MVP Delivery',    pct: 35, desc: 'Core platform go-live' },
    { label: 'UAT Completion',  pct: 30, desc: 'User acceptance & testing sign-off' },
    { label: 'Go-Live',         pct: 20, desc: 'Full production deployment' },
  ];
  return (
    <div className="space-y-6">
      {/* Engagement Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(99,102,241,0.12)', border: `2px solid rgba(99,102,241,0.4)` }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: ACCENT }}>Total Engagement Value</div>
          <div className="text-3xl font-black" style={{ color: ACCENT }}>{fmt(adjustedTotal)}</div>
          <div className="text-xs mt-1" style={{ color: '#64748B' }}>Fixed Price · Outcome-Based</div>
        </div>
        <div className="rounded-2xl p-5 text-center" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>Duration</div>
          <div className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>{est.personMonths} months</div>
          <div className="text-xs mt-1" style={{ color: '#64748B' }}>{est.totalHours.toLocaleString()} person-hours</div>
        </div>
        <div className="rounded-2xl p-5 text-center" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>Pricing Model</div>
          <div className="text-lg font-bold" style={{ color: TEAL }}>Fixed Price</div>
          <div className="text-xs mt-1" style={{ color: '#64748B' }}>Milestone-based payments</div>
        </div>
      </div>

      {/* Milestone payment schedule */}
      <div className="rounded-2xl p-5" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#F1F5F9' }}>Milestone-Based Payment Schedule</h3>
        <div className="space-y-3">
          {milestones.map((m, i) => {
            const amount = Math.round(adjustedTotal * m.pct / 100);
            return (
              <div key={m.label} className="flex items-center gap-4">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, #4F46E5)` }}>{i + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>{m.label}</span>
                    <span className="text-sm font-bold" style={{ color: ACCENT }}>{fmt(amount)}</span>
                  </div>
                  <div className="text-xs" style={{ color: '#64748B' }}>{m.desc} · {m.pct}% of total</div>
                  <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: ACCENT }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deliverable-to-cost mapping */}
      <div className="rounded-2xl p-5" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#F1F5F9' }}>Deliverable Cost Allocation</h3>
        <div className="space-y-2.5">
          {est.phaseSubtotals.map((p) => (
            <div key={p.phase} className="flex items-center justify-between gap-4">
              <span className="text-sm w-40 shrink-0" style={{ color: '#94A3B8' }}>{p.phase}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full" style={{ width: fmtPct(p.cost, adjustedTotal), background: TEAL }} />
              </div>
              <span className="text-sm font-bold w-24 text-right" style={{ color: TEAL }}>{fmt(p.cost)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Confidentiality note */}
      <div className="text-center">
        <p className="text-[11px] italic" style={{ color: '#475569' }}>
          This is a client-facing summary. Internal rates and FTE details are not disclosed.
        </p>
      </div>
    </div>
  );
}

// ── IBM INTERNAL VIEW ─────────────────────────────────────────
function IBMInternalView({ est, adjustedTotal, bd, assumptions }: {
  est: EstimationSummary;
  adjustedTotal: number;
  bd: CostBreakdown;
  assumptions: CostAssumptions;
}) {
  const ibmCost = bd.baseLaborCost;
  const revenue = adjustedTotal;
  const margin  = revenue - ibmCost;
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary table */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Base Labor Hours', value: est.totalHours.toLocaleString(), color: ACCENT },
          { label: 'Base Labor Cost',  value: fmt(est.totalCost),              color: '#F1F5F9' },
          { label: 'Person-Months',    value: est.personMonths.toLocaleString(), color: '#F1F5F9' },
          { label: 'Adjusted Revenue', value: fmt(adjustedTotal),              color: ACCENT },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl p-4" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>{m.label}</div>
            <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* P&L Summary */}
      <div className="rounded-2xl p-5" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#F1F5F9' }}>Cost vs Revenue — IBM P&L</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl p-4" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>IBM Cost</div>
            <div className="text-xl font-bold" style={{ color: '#F43F5E' }}>{fmt(ibmCost)}</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>Revenue</div>
            <div className="text-xl font-bold" style={{ color: '#10B981' }}>{fmt(revenue)}</div>
          </div>
          <div className="rounded-xl p-4 border-2" style={{
            background: marginPct >= 20 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            borderColor: marginPct >= 20 ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)',
          }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>Gross Margin</div>
            <div className="text-xl font-bold" style={{ color: marginPct >= 20 ? '#10B981' : AMBER }}>
              {fmt(margin)} <span className="text-sm">({marginPct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cost component breakdown */}
      <div className="rounded-2xl p-5" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#F1F5F9' }}>Cost Component Breakdown</h3>
        <BreakdownBar label="Base Labor Cost"  amount={bd.baseLaborCost}        total={adjustedTotal} color={ACCENT} />
        <BreakdownBar label="Contingency"       amount={bd.contingencyAmount}    total={adjustedTotal} color={TEAL} />
        <BreakdownBar label="Overhead"          amount={bd.overheadAmount}       total={adjustedTotal} color="#8B5CF6" />
        <BreakdownBar label="Infrastructure"    amount={bd.infrastructureAmount} total={adjustedTotal} color="#10B981" />
        <BreakdownBar label="Travel"            amount={bd.travelAmount}         total={adjustedTotal} color={AMBER} />
        {bd.licensingAmount > 0 && <BreakdownBar label="Licensing" amount={bd.licensingAmount} total={adjustedTotal} color="#F43F5E" />}
        <div className="mt-4 pt-3 flex justify-between items-center" style={{ borderTop: `1px solid ${BORDER}` }}>
          <span className="text-sm font-bold" style={{ color: '#F1F5F9' }}>Total Adjusted Cost</span>
          <span className="text-lg font-bold" style={{ color: ACCENT }}>{fmt(adjustedTotal)}</span>
        </div>
      </div>

      {/* Role-level FTE breakdown */}
      <div className="rounded-2xl overflow-x-auto" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-sm font-bold" style={{ color: '#F1F5F9' }}>Role-Level FTE & Cost Traceability</h3>
          <div className="text-xs" style={{ color: '#64748B' }}>Rate multiplier: <span className="font-semibold" style={{ color: ACCENT }}>{assumptions.rateMultiplier.toFixed(2)}×</span></div>
        </div>
        <table className="dark-table" style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th>Activity / Role</th>
              <th>IBM Band</th>
              <th>Phase</th>
              <th style={{ textAlign: 'center' }}>Hours</th>
              <th style={{ textAlign: 'center' }}>Rate ($/hr)</th>
              <th style={{ textAlign: 'right' }}>Cost ($)</th>
            </tr>
          </thead>
          <tbody>
            {est.rows.map((row) => (
              <tr key={row.id}>
                <td className="font-semibold">{row.activity}</td>
                <td>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: `linear-gradient(135deg, ${ACCENT}, #4F46E5)` }}>{row.band}</span>
                </td>
                <td className="text-xs" style={{ color: '#64748B' }}>{row.phase}</td>
                <td style={{ textAlign: 'center', color: '#94A3B8' }}>{row.hours.toLocaleString()}</td>
                <td style={{ textAlign: 'center', color: '#94A3B8' }}>${row.ratePerHour}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: ACCENT }}>{fmt(row.cost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'rgba(99,102,241,0.08)', borderTop: `2px solid rgba(99,102,241,0.3)` }}>
              <td colSpan={3} className="px-4 py-3 text-sm font-bold" style={{ color: '#F1F5F9' }}>Base Labor Total</td>
              <td className="px-4 py-3 text-center font-bold" style={{ color: ACCENT }}>{est.totalHours.toLocaleString()}</td>
              <td />
              <td className="px-4 py-3 text-right font-bold" style={{ color: TEAL }}>{fmt(est.totalCost)}</td>
            </tr>
            <tr style={{ background: 'rgba(99,102,241,0.12)', borderTop: `1px solid rgba(99,102,241,0.2)` }}>
              <td colSpan={5} className="px-4 py-3 text-sm font-bold" style={{ color: ACCENT }}>
                Adjusted Total (incl. contingency, overhead, infrastructure, travel, licensing)
              </td>
              <td className="px-4 py-3 text-right font-bold text-lg" style={{ color: ACCENT }}>{fmt(adjustedTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function EstimationModule() {
  const { activeDocumentId, analysisResults, costAssumptions, updateCostAssumptions, resetCostAssumptions } = useRFPStore();
  const result      = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const assumptions: CostAssumptions = (activeDocumentId ? costAssumptions[activeDocumentId] : null) ?? { ...DEFAULT_COST_ASSUMPTIONS };
  const [view, setView] = useState<'client' | 'internal'>('client');
  const [slidersOpen, setSlidersOpen] = useState(true);

  if (!result?.estimation) return (
    <div className="p-6 text-sm text-center mt-20" style={{ color: '#475569' }}>Upload a document to see estimation</div>
  );

  const est = result.estimation;
  const bd = est.costBreakdown ?? {
    baseLaborCost: est.totalCost, contingencyAmount: 0, infrastructureAmount: 0,
    overheadAmount: 0, travelAmount: 0, licensingAmount: 0, totalAdjustedCost: est.totalCost,
  };
  const adjustedTotal = est.adjustedTotalCost ?? est.totalCost;
  const isModified =
    assumptions.rateMultiplier !== DEFAULT_COST_ASSUMPTIONS.rateMultiplier ||
    assumptions.contingencyPct !== DEFAULT_COST_ASSUMPTIONS.contingencyPct ||
    assumptions.infrastructurePct !== DEFAULT_COST_ASSUMPTIONS.infrastructurePct ||
    assumptions.overheadPct !== DEFAULT_COST_ASSUMPTIONS.overheadPct ||
    assumptions.travelPct !== DEFAULT_COST_ASSUMPTIONS.travelPct ||
    assumptions.licensingFlatUSD !== DEFAULT_COST_ASSUMPTIONS.licensingFlatUSD;

  const update = (partial: Partial<CostAssumptions>) => { if (activeDocumentId) updateCostAssumptions(activeDocumentId, partial); };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── View Toggle ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#F1F5F9' }}>Estimation</h2>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Toggle between client proposal view and IBM internal cost view</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
          {([
            { key: 'client',   label: '👤 Client View' },
            { key: 'internal', label: '🔒 IBM Internal View' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setView(key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
              style={view === key
                ? { background: `linear-gradient(135deg, ${ACCENT}, #4F46E5)`, color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }
                : { color: '#94A3B8' }}>
              <Eye size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Cost Assumption Sliders ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
        <button onClick={() => setSlidersOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 transition-colors"
          style={{ background: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #4F46E5)` }}>
              <span className="text-white text-xs font-bold">$</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-bold" style={{ color: '#F1F5F9' }}>Cost Assumption Sliders</div>
              <div className="text-xs" style={{ color: '#64748B' }}>Adjust rates, contingency, overhead — live recalculation</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isModified && (
              <button onClick={(e) => { e.stopPropagation(); if (activeDocumentId) resetCostAssumptions(activeDocumentId); }}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg"
                style={{ color: ACCENT, border: `1px solid rgba(99,102,241,0.4)`, background: 'rgba(99,102,241,0.1)' }}>
                <RotateCcw size={11} /> Reset
              </button>
            )}
            {slidersOpen ? <ChevronUp size={16} style={{ color: '#64748B' }} /> : <ChevronDown size={16} style={{ color: '#64748B' }} />}
          </div>
        </button>
        {slidersOpen && (
          <div className="px-5 pb-5" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8 mt-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>Rate & Contingency</div>
                <SliderRow label="Rate Multiplier" tooltip="Scales all hourly rates." value={assumptions.rateMultiplier} min={0.5} max={2.0} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => update({ rateMultiplier: v })} accent />
                <SliderRow label="Contingency %" tooltip="Risk buffer added on top of labor." value={assumptions.contingencyPct} min={0} max={30} step={1} format={(v) => `${v}%`} onChange={(v) => update({ contingencyPct: v })} />
                <SliderRow label="Overhead %" tooltip="G&A and admin overhead." value={assumptions.overheadPct} min={0} max={25} step={1} format={(v) => `${v}%`} onChange={(v) => update({ overheadPct: v })} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>Additional Costs</div>
                <SliderRow label="Infrastructure %" tooltip="Cloud/DevOps costs as % of labor." value={assumptions.infrastructurePct} min={0} max={20} step={1} format={(v) => `${v}%`} onChange={(v) => update({ infrastructurePct: v })} />
                <SliderRow label="Travel %" tooltip="On-site travel expenses." value={assumptions.travelPct} min={0} max={10} step={0.5} format={(v) => `${v}%`} onChange={(v) => update({ travelPct: v })} />
                <SliderRow label="Licensing ($)" tooltip="Flat-fee software licensing." value={assumptions.licensingFlatUSD} min={0} max={500000} step={5000} format={(v) => v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}K`} onChange={(v) => update({ licensingFlatUSD: v })} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── View-specific content ── */}
      {view === 'client'
        ? <ClientView est={est} adjustedTotal={adjustedTotal} bd={bd} />
        : <IBMInternalView est={est} adjustedTotal={adjustedTotal} bd={bd} assumptions={assumptions} />
      }
    </div>
  );
}
