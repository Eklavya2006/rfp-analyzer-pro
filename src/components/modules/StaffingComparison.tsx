// ============================================================
// StaffingComparison — AI vs Without-AI staffing comparison table
// with grouped bar chart, per-row overrides, summary bar, CSV export.
// ============================================================
'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Download, Info, Star, RotateCcw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { computeStaffingComparison } from '@/lib/engines/staffingComparisonEngine';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardHeader, CardBody, Badge } from '@/components/ui';

// ── Types ──────────────────────────────────────────────────
interface RowOverrides {
  [role: string]: number | null;
}

// ── Helpers ───────────────────────────────────────────────
function pctColor(pct: number) {
  if (pct === 0) return 'text-slate-400';
  if (pct < 20) return 'text-sky-600';
  if (pct < 50) return 'text-indigo-600';
  if (pct < 80) return 'text-violet-600';
  return 'text-emerald-600';
}

function pctBadgeCls(pct: number) {
  if (pct === 0) return 'bg-slate-100 text-slate-500';
  if (pct < 20) return 'bg-sky-100 text-sky-700';
  if (pct < 50) return 'bg-indigo-100 text-indigo-700';
  if (pct < 80) return 'bg-violet-100 text-violet-700';
  return 'bg-emerald-100 text-emerald-700';
}

/** Formatted number: 1.0 → "1.0", 1.5 → "1.5" */
function fmtFTE(v: number) {
  return v.toFixed(1);
}

/** Export rows to CSV and trigger download */
function exportCSV(rows: ReturnType<typeof computeStaffingComparison>['rows'], summary: ReturnType<typeof computeStaffingComparison>['summary']) {
  const headers = [
    'Role', 'Band', 'FTEs Without AI', 'FTEs With AI', 'FTE Reduction',
    'Cost Without AI ($)', 'Cost With AI ($)', 'Cost Savings ($)', 'AI Productivity %',
  ];
  const dataRows = rows.map((r) => [
    r.role, r.bandLabel, fmtFTE(r.ftesWithout), fmtFTE(r.ftesWith), fmtFTE(r.fteReduction),
    r.costWithout, r.costWith, r.costSavings, r.productivityPct,
  ]);
  dataRows.push([
    'TOTAL', '', fmtFTE(summary.totalFtesWithout), fmtFTE(summary.totalFtesWith),
    fmtFTE(summary.totalFteReduction), summary.totalCostWithout, summary.totalCostWith,
    summary.totalCostSavings, summary.effectiveProductivityPct,
  ]);

  const csv = [headers, ...dataRows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'staffing-ai-comparison.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Animated counter for numbers ──────────────────────────
function AnimNum({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) return;

    let start: number | null = null;
    const duration = 500;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(step);
      else setDisplayed(to);
    };
    requestAnimationFrame(step);
  }, [value]);

  const fmt = decimals > 0
    ? displayed.toFixed(decimals)
    : Math.round(displayed).toLocaleString();

  return <>{prefix}{fmt}{suffix}</>;
}

// ── Summary bar ────────────────────────────────────────────
function SummaryBar({ summary }: { summary: ReturnType<typeof computeStaffingComparison>['summary'] }) {
  const savingsPct = summary.totalCostWithout > 0
    ? Math.round((summary.totalCostSavings / summary.totalCostWithout) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {[
        { label: 'FTEs Without AI', value: <AnimNum value={summary.totalFtesWithout} decimals={1} />, cls: 'text-slate-800' },
        { label: 'FTEs With AI', value: <AnimNum value={summary.totalFtesWith} decimals={1} />, cls: 'text-indigo-700' },
        { label: 'FTE Reduction', value: <AnimNum value={summary.totalFteReduction} decimals={1} />, cls: 'text-violet-700' },
        { label: 'Cost Without AI', value: <AnimNum value={summary.totalCostWithout} prefix="$" />, cls: 'text-slate-800' },
        { label: 'Cost With AI', value: <AnimNum value={summary.totalCostWith} prefix="$" />, cls: 'text-indigo-700' },
        { label: 'Total Savings', value: <AnimNum value={summary.totalCostSavings} prefix="$" />, cls: 'text-emerald-700' },
        { label: 'Effective AI %', value: <AnimNum value={summary.effectiveProductivityPct} suffix="%" />, cls: pctColor(summary.effectiveProductivityPct) },
      ].map((m) => (
        <div key={m.label} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center">
          <div className={cn('text-lg font-extrabold tabular-nums', m.cls)}>{m.value}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Per-row override input ─────────────────────────────────
function OverrideCell({ role, globalPct, overridePct, onSet, onClear }: {
  role: string;
  globalPct: number;
  overridePct: number | null;
  onSet: (role: string, pct: number | null) => void;
  onClear: (role: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(overridePct ?? globalPct));

  const commit = useCallback(() => {
    const v = Math.max(0, Math.min(100, Number(draft) || 0));
    onSet(role, v);
    setEditing(false);
  }, [draft, role, onSet]);

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="number"
          min={0}
          max={100}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-14 text-center text-xs border border-indigo-300 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label={`Override AI productivity for ${role}`}
        />
        <span className="text-xs text-slate-400">%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => { setDraft(String(overridePct ?? globalPct)); setEditing(true); }}
        className={cn(
          'text-xs px-2 py-0.5 rounded-lg border transition-colors',
          overridePct !== null
            ? 'bg-violet-50 border-violet-200 text-violet-700 font-bold'
            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600',
        )}
        title={overridePct !== null ? `Override active: ${overridePct}% (click to edit)` : `Using global: ${globalPct}% (click to override)`}
      >
        {overridePct !== null ? `${overridePct}%` : `${globalPct}%`}
        {overridePct !== null && <span className="ml-1 text-[9px] font-normal opacity-70">override</span>}
      </button>
      {overridePct !== null && (
        <button
          type="button"
          onClick={() => onClear(role)}
          title="Clear override — use global"
          className="text-slate-400 hover:text-rose-500 transition-colors"
        >
          <RotateCcw size={11} />
        </button>
      )}
    </div>
  );
}

// ── Grouped Bar Chart ──────────────────────────────────────
function StaffingBarChart({ rows }: { rows: ReturnType<typeof computeStaffingComparison>['rows'] }) {
  const data = rows.map((r) => ({
    name: r.role.split(' ').slice(-1)[0],
    'Without AI': r.ftesWithout,
    'With AI': parseFloat(r.ftesWith.toFixed(1)),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 12, bottom: 40, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 10 }} domain={[0, 'dataMax + 0.5']} tickCount={5} />
        <RechartsTooltip
          formatter={(value: number, name: string) => [fmtFTE(value) + ' FTEs', name]}
          contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e2e8f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="Without AI" fill="#94a3b8" radius={[3, 3, 0, 0]} />
        <Bar dataKey="With AI" fill="#6366f1" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main component ─────────────────────────────────────────
export default function StaffingComparison() {
  const { aiProductivityPct, aiRecalcFlash } = useRFPStore();
  const [rowOverrides, setRowOverrides] = useState<RowOverrides>({});
  const [flashKey, setFlashKey] = useState(0);

  // Flash when global pct changes
  useEffect(() => {
    setFlashKey((k) => k + 1);
  }, [aiRecalcFlash]);

  const result = useMemo(
    () => computeStaffingComparison(aiProductivityPct, rowOverrides),
    [aiProductivityPct, rowOverrides],
  );

  const handleSetOverride = useCallback((role: string, pct: number | null) => {
    setRowOverrides((prev) => ({ ...prev, [role]: pct }));
  }, []);

  const handleClearOverride = useCallback((role: string) => {
    setRowOverrides((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
  }, []);

  const handleResetAll = useCallback(() => setRowOverrides({}), []);

  const hasOverrides = Object.keys(rowOverrides).length > 0;

  return (
    <div className="space-y-5">
      {/* Section header with flash indicator */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 border border-indigo-200 rounded-xl flex items-center justify-center">
            <Bot size={15} className="text-indigo-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Role-Based AI vs Without-AI Staffing Comparison</div>
            <div className="text-xs text-slate-500">Annual fully-loaded cost · salary + 30% benefits</div>
          </div>
          <AnimatePresence>
            {flashKey > 1 && (
              <motion.span
                key={flashKey}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white ml-1"
              >
                Recalculated
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasOverrides && (
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 border border-rose-200 hover:border-rose-300 bg-rose-50 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <RotateCcw size={11} />
              Reset overrides
            </button>
          )}
          <button
            type="button"
            onClick={() => exportCSV(result.rows, result.summary)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 bg-white rounded-lg px-3 py-1.5 transition-colors"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <motion.div key={`summary-${aiProductivityPct}`} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <SummaryBar summary={result.summary} />
      </motion.div>

      {/* Grouped Bar Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">FTE Comparison by Role</h4>
            <span className="text-xs text-slate-400">Global AI productivity: <span className={cn('font-bold', pctColor(aiProductivityPct))}>{aiProductivityPct}%</span></span>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <StaffingBarChart rows={result.rows} />
        </CardBody>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-800">Detailed Comparison Table</h4>
            <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
              <Star size={9} className="inline mr-0.5 text-amber-500" />
              Top-3 savers highlighted
            </span>
            <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 cursor-default" title="Click any AI % cell to override productivity for that role. The override overrides the global setting for that row only.">
              <Info size={11} />
              Click AI % to override per row
            </div>
          </div>
        </CardHeader>
        {/* Horizontally scrollable on small screens */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  'Role', 'Band', 'FTEs Without AI', 'FTEs With AI', 'FTE Reduction',
                  'Cost Without AI', 'Cost With AI', 'Cost Savings', 'AI Productivity %',
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-500 whitespace-nowrap first:rounded-tl-xl last:rounded-tr-xl">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <motion.tr
                  key={row.role}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    'border-b border-slate-50 transition-colors',
                    row.isTopSaver
                      ? 'bg-amber-50/60 hover:bg-amber-50'
                      : 'hover:bg-slate-50/80',
                  )}
                >
                  {/* Role + top-saver indicator */}
                  <td className={cn(
                    'px-4 py-3 font-semibold text-slate-800 whitespace-nowrap border-l-2',
                    row.isTopSaver ? 'border-l-amber-400' : 'border-l-transparent',
                  )}>
                    <div className="flex items-center gap-1.5">
                      {row.isTopSaver && (
                        <Star size={11} className="text-amber-500 shrink-0 fill-amber-400" />
                      )}
                      {row.role}
                      {row.isTopSaver && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold ml-1">Top Saver</span>
                      )}
                    </div>
                  </td>

                  {/* Band */}
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{row.bandLabel.split(' – ')[0]}</span>
                  </td>

                  {/* FTEs Without AI */}
                  <td className="px-4 py-3 text-slate-700 font-medium tabular-nums">{fmtFTE(row.ftesWithout)}</td>

                  {/* FTEs With AI */}
                  <td className="px-4 py-3 font-bold text-indigo-700 tabular-nums">{fmtFTE(row.ftesWith)}</td>

                  {/* FTE Reduction */}
                  <td className="px-4 py-3 tabular-nums">
                    <span className={cn('font-semibold', row.fteReduction > 0 ? 'text-emerald-700' : 'text-slate-400')}>
                      {row.fteReduction > 0 ? '−' : ''}{fmtFTE(row.fteReduction)}
                    </span>
                  </td>

                  {/* Cost Without AI */}
                  <td className="px-4 py-3 text-slate-700 tabular-nums font-medium">
                    {formatCurrency(row.costWithout, true)}
                  </td>

                  {/* Cost With AI */}
                  <td className="px-4 py-3 text-indigo-700 font-bold tabular-nums">
                    {formatCurrency(row.costWith, true)}
                  </td>

                  {/* Cost Savings */}
                  <td className="px-4 py-3 tabular-nums">
                    <span className={cn('font-bold', row.costSavings > 0 ? 'text-emerald-700' : 'text-slate-400')}>
                      {row.costSavings > 0 ? '+' : ''}{formatCurrency(row.costSavings, true)}
                    </span>
                  </td>

                  {/* AI Productivity % — clickable override */}
                  <td className="px-4 py-3">
                    <OverrideCell
                      role={row.role}
                      globalPct={aiProductivityPct}
                      overridePct={rowOverrides[row.role] ?? null}
                      onSet={handleSetOverride}
                      onClear={handleClearOverride}
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>

            {/* Totals footer */}
            <tfoot>
              <tr className="bg-indigo-50 border-t-2 border-indigo-200 font-bold text-xs">
                <td className="px-4 py-3 text-slate-900 border-l-2 border-l-indigo-400">TOTAL</td>
                <td className="px-4 py-3 text-slate-400 text-[10px]">
                  <span className={cn('px-2 py-0.5 rounded-full font-bold text-[10px]', pctBadgeCls(result.summary.effectiveProductivityPct))}>
                    wtd avg {result.summary.effectiveProductivityPct}%
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-800 tabular-nums">{fmtFTE(result.summary.totalFtesWithout)}</td>
                <td className="px-4 py-3 text-indigo-700 tabular-nums">{fmtFTE(result.summary.totalFtesWith)}</td>
                <td className="px-4 py-3 text-emerald-700 tabular-nums">−{fmtFTE(result.summary.totalFteReduction)}</td>
                <td className="px-4 py-3 text-slate-800 tabular-nums">{formatCurrency(result.summary.totalCostWithout, true)}</td>
                <td className="px-4 py-3 text-indigo-700 tabular-nums">{formatCurrency(result.summary.totalCostWith, true)}</td>
                <td className="px-4 py-3 text-emerald-700 tabular-nums">+{formatCurrency(result.summary.totalCostSavings, true)}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Star size={10} className="text-amber-500 fill-amber-400" />
          <span>Top-3 cost savers highlighted in amber</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-violet-400" />
          <span>Purple AI % badge = per-row override active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-300" />
          <span>Grey AI % = using global setting</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Info size={10} />
          <span>Cost = annual salary × 1.30 benefits × FTE count</span>
        </div>
      </div>
    </div>
  );
}
