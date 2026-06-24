'use client';
import React, { useState } from 'react';
import { RotateCcw, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import type { CostAssumptions } from '@/types';
import { DEFAULT_COST_ASSUMPTIONS } from '@/types';

const IBM_BLUE = '#0F62FE';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

// ── Slider row component ──────────────────────────────────────
interface SliderRowProps {
  label: string;
  tooltip: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  accent?: boolean;
}

function SliderRow({ label, tooltip, value, min, max, step, format, onChange, accent }: SliderRowProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0">
      {/* Label */}
      <div className="w-44 flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <div className="relative group">
          <Info size={11} className="text-gray-300 cursor-help" />
          <div className="absolute left-4 top-0 z-10 hidden group-hover:block bg-gray-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 w-48 shadow-xl">
            {tooltip}
          </div>
        </div>
      </div>
      {/* Slider track */}
      <div className="flex-1 relative">
        <div className="relative h-1.5 bg-gray-100 rounded-full">
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: accent ? IBM_BLUE : '#4589ff' }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-1.5"
          style={{ zIndex: 1 }}
        />
      </div>
      {/* Value display */}
      <div
        className="w-20 text-right text-sm font-bold tabular-nums flex-shrink-0"
        style={{ color: accent ? IBM_BLUE : '#374151' }}
      >
        {format(value)}
      </div>
    </div>
  );
}

// ── Cost breakdown bar ────────────────────────────────────────
interface BreakdownBarProps {
  label: string;
  amount: number;
  total: number;
  color: string;
}

function BreakdownBar({ label, amount, total, color }: BreakdownBarProps) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{pct.toFixed(1)}%</span>
          <span className="text-xs font-semibold" style={{ color }}>{fmt(amount)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function EstimationModule() {
  const { activeDocumentId, analysisResults, costAssumptions, updateCostAssumptions, resetCostAssumptions } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const assumptions: CostAssumptions = (activeDocumentId ? costAssumptions[activeDocumentId] : null) ?? { ...DEFAULT_COST_ASSUMPTIONS };
  const [slidersOpen, setSlidersOpen] = useState(true);

  if (!result?.estimation) {
    return <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document to see estimation</div>;
  }

  const est = result.estimation;
  const bd = est.costBreakdown ?? {
    baseLaborCost: est.totalCost,
    contingencyAmount: 0,
    infrastructureAmount: 0,
    overheadAmount: 0,
    travelAmount: 0,
    licensingAmount: 0,
    totalAdjustedCost: est.totalCost,
  };
  const adjustedTotal = est.adjustedTotalCost ?? est.totalCost;
  const isModified =
    assumptions.rateMultiplier !== DEFAULT_COST_ASSUMPTIONS.rateMultiplier ||
    assumptions.contingencyPct !== DEFAULT_COST_ASSUMPTIONS.contingencyPct ||
    assumptions.infrastructurePct !== DEFAULT_COST_ASSUMPTIONS.infrastructurePct ||
    assumptions.overheadPct !== DEFAULT_COST_ASSUMPTIONS.overheadPct ||
    assumptions.travelPct !== DEFAULT_COST_ASSUMPTIONS.travelPct ||
    assumptions.licensingFlatUSD !== DEFAULT_COST_ASSUMPTIONS.licensingFlatUSD;

  const update = (partial: Partial<CostAssumptions>) => {
    if (activeDocumentId) updateCostAssumptions(activeDocumentId, partial);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Summary KPIs ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Base Labor Hours</div>
          <div className="text-xl font-bold" style={{ color: IBM_BLUE }}>{est.totalHours.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Base Labor Cost</div>
          <div className="text-xl font-bold text-gray-600">{fmt(est.totalCost)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Person-Months</div>
          <div className="text-xl font-bold text-gray-700">{est.personMonths.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border-2 p-4" style={{ borderColor: IBM_BLUE, background: '#e8f2ff' }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#0043CE' }}>
            Adjusted Total Cost {isModified && <span className="ml-1 text-[9px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">Modified</span>}
          </div>
          <div className="text-2xl font-bold" style={{ color: IBM_BLUE }}>{fmt(adjustedTotal)}</div>
        </div>
      </div>

      {/* ── Cost Assumption Sliders ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setSlidersOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: IBM_BLUE }}>
              <span className="text-white text-xs font-bold">$</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-gray-800">Cost Assumption Sliders</div>
              <div className="text-xs text-gray-400">Adjust rates, contingency, overhead and more — live recalculation</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isModified && (
              <button
                onClick={(e) => { e.stopPropagation(); if (activeDocumentId) resetCostAssumptions(activeDocumentId); }}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg border"
                style={{ color: IBM_BLUE, borderColor: IBM_BLUE, background: '#e8f2ff' }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
            {slidersOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </button>

        {slidersOpen && (
          <div className="px-5 pb-5 border-t border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8 mt-4">
              {/* Left column — multipliers */}
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Rate & Contingency</div>
                <SliderRow
                  label="Rate Multiplier"
                  tooltip="Scales all hourly rates. 1.0 = baseline, 1.5 = 50% premium, 0.8 = 20% discount."
                  value={assumptions.rateMultiplier}
                  min={0.5} max={2.0} step={0.05}
                  format={(v) => `${v.toFixed(2)}×`}
                  onChange={(v) => update({ rateMultiplier: v })}
                  accent
                />
                <SliderRow
                  label="Contingency %"
                  tooltip="Risk buffer added on top of base labor cost. Industry standard: 10–20%."
                  value={assumptions.contingencyPct}
                  min={0} max={30} step={1}
                  format={(v) => `${v}%`}
                  onChange={(v) => update({ contingencyPct: v })}
                />
                <SliderRow
                  label="Overhead %"
                  tooltip="G&A, management, administrative overhead charged on top of labor."
                  value={assumptions.overheadPct}
                  min={0} max={25} step={1}
                  format={(v) => `${v}%`}
                  onChange={(v) => update({ overheadPct: v })}
                />
              </div>
              {/* Right column — additional costs */}
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Additional Costs</div>
                <SliderRow
                  label="Infrastructure %"
                  tooltip="Cloud, hosting, and DevOps tooling costs as % of labor."
                  value={assumptions.infrastructurePct}
                  min={0} max={20} step={1}
                  format={(v) => `${v}%`}
                  onChange={(v) => update({ infrastructurePct: v })}
                />
                <SliderRow
                  label="Travel %"
                  tooltip="On-site travel, accommodation, and expenses as % of labor."
                  value={assumptions.travelPct}
                  min={0} max={10} step={0.5}
                  format={(v) => `${v}%`}
                  onChange={(v) => update({ travelPct: v })}
                />
                <SliderRow
                  label="Licensing ($)"
                  tooltip="Flat-fee software licensing costs (IBM Cloud, tools, etc.)."
                  value={assumptions.licensingFlatUSD}
                  min={0} max={500000} step={5000}
                  format={(v) => v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}K`}
                  onChange={(v) => update({ licensingFlatUSD: v })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Cost Breakdown ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waterfall breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Cost Component Breakdown</h3>
          <BreakdownBar label="Base Labor Cost" amount={bd.baseLaborCost} total={adjustedTotal} color={IBM_BLUE} />
          <BreakdownBar label="Contingency" amount={bd.contingencyAmount} total={adjustedTotal} color="#4589ff" />
          <BreakdownBar label="Overhead" amount={bd.overheadAmount} total={adjustedTotal} color="#78a9ff" />
          <BreakdownBar label="Infrastructure" amount={bd.infrastructureAmount} total={adjustedTotal} color="#198038" />
          <BreakdownBar label="Travel" amount={bd.travelAmount} total={adjustedTotal} color="#b45309" />
          {bd.licensingAmount > 0 && (
            <BreakdownBar label="Licensing" amount={bd.licensingAmount} total={adjustedTotal} color="#7c3aed" />
          )}
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-800">Total Adjusted Cost</span>
            <span className="text-lg font-bold" style={{ color: IBM_BLUE }}>{fmt(adjustedTotal)}</span>
          </div>
        </div>

        {/* Phase subtotals */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Phase Cost Distribution</h3>
          <div className="space-y-3">
            {est.phaseSubtotals.map((p) => {
              const pct = adjustedTotal > 0 ? (p.cost / adjustedTotal) * 100 : 0;
              return (
                <div key={p.phase}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{p.phase}</span>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{p.hours.toLocaleString()} hrs</span>
                      <span className="font-bold" style={{ color: IBM_BLUE }}>{fmt(p.cost)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: IBM_BLUE }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Detail table ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-sm font-bold text-gray-700">Role-Level Estimation Breakdown</h3>
          <div className="text-xs text-gray-400">
            Rate multiplier applied: <span className="font-semibold" style={{ color: IBM_BLUE }}>{assumptions.rateMultiplier.toFixed(2)}×</span>
          </div>
        </div>
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ background: '#f4f8ff' }}>
              <th className="px-4 py-3 text-left">Activity / Role</th>
              <th className="px-4 py-3 text-left">IBM Band</th>
              <th className="px-4 py-3 text-left">Phase</th>
              <th className="px-4 py-3 text-center">Hours</th>
              <th className="px-4 py-3 text-center">Rate ($/hr)</th>
              <th className="px-4 py-3 text-right">Cost ($)</th>
            </tr>
          </thead>
          <tbody>
            {est.rows.map((row, idx) => (
              <tr key={row.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                <td className="px-4 py-3 font-semibold text-gray-800">{row.activity}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: IBM_BLUE }}>{row.band}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{row.phase}</td>
                <td className="px-4 py-3 text-center text-gray-700">{row.hours.toLocaleString()}</td>
                <td className="px-4 py-3 text-center text-gray-700">${row.ratePerHour}</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: IBM_BLUE }}>{fmt(row.cost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f4f8ff', borderTop: '2px solid #0F62FE' }}>
              <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-700">Base Labor Total</td>
              <td className="px-4 py-3 text-center font-bold" style={{ color: IBM_BLUE }}>{est.totalHours.toLocaleString()}</td>
              <td />
              <td className="px-4 py-3 text-right font-bold" style={{ color: '#4589ff' }}>{fmt(est.totalCost)}</td>
            </tr>
            <tr style={{ background: '#e8f2ff', borderTop: '1px solid #b3d1ff' }}>
              <td colSpan={5} className="px-4 py-3 text-sm font-bold" style={{ color: IBM_BLUE }}>
                Adjusted Total (incl. contingency, overhead, infrastructure, travel, licensing)
              </td>
              <td className="px-4 py-3 text-right font-bold text-lg" style={{ color: IBM_BLUE }}>{fmt(adjustedTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
