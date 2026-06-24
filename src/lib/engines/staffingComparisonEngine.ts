// ============================================================
// AI Staffing Comparison Engine
//
// Core formula:
//   FTEs_with_AI = max(0.1, FTEs_baseline × (1 − productivityPct / 100))
//
// Edge cases:
//   productivityPct = 0  → FTEs_with_AI = FTEs_baseline (no change)
//   productivityPct = 100 → FTEs_with_AI = 0.1 (minimum floor; UI shows note)
//
// All calculations are deterministic: same inputs → same outputs.
// The engine is a pure function with no side-effects.
// ============================================================

import {
  DEFAULT_STAFFING_BAND_ROWS,
  annualCost,
  BAND_LABELS,
  type StaffingBand,
  type StaffingBandRow,
} from '@/lib/staffingBenchmarks';

/** One computed row in the comparison table */
export interface ComparisonRow {
  role: string;
  band: StaffingBand;
  bandLabel: string;
  ftesWithout: number;         // baseline FTEs
  ftesWith: number;            // AI-adjusted FTEs (1 dp, min 0.1)
  fteReduction: number;        // ftesWithout - ftesWith
  costWithout: number;         // annual, fully-loaded
  costWith: number;            // annual, fully-loaded × ftesWith
  costSavings: number;         // costWithout - costWith
  productivityPct: number;     // effective pct used for this row
  isTopSaver: boolean;         // true for the top-3 cost-savings rows
  perRowOverridePct: number | null;
}

export interface ComparisonSummary {
  totalFtesWithout: number;
  totalFtesWith: number;
  totalFteReduction: number;
  totalCostWithout: number;
  totalCostWith: number;
  totalCostSavings: number;
  /** Weighted-average effective productivity % across all rows */
  effectiveProductivityPct: number;
}

export interface ComparisonResult {
  rows: ComparisonRow[];
  summary: ComparisonSummary;
}

/**
 * Compute the full AI vs Without-AI staffing comparison.
 *
 * @param globalPct     Global AI Productivity % from Zustand store (0–100)
 * @param rowOverrides  Per-row override map: role → custom pct (null = use global)
 */
export function computeStaffingComparison(
  globalPct: number,
  rowOverrides: Record<string, number | null> = {}
): ComparisonResult {
  const rows: ComparisonRow[] = DEFAULT_STAFFING_BAND_ROWS.map((def: StaffingBandRow) => {
    // Resolve effective productivity % for this row
    const overridePct = rowOverrides[def.role] ?? def.perRowOverridePct;
    const effectivePct = overridePct !== null && overridePct !== undefined
      ? overridePct
      : globalPct;

    const ftesWithout = def.baselineFTEs;

    // Core formula: FTEs_with_AI = FTEs_baseline × (1 − pct/100), floored at 0.1
    const rawWith = ftesWithout * (1 - effectivePct / 100);
    const ftesWith = Math.max(0.1, Math.round(rawWith * 10) / 10);
    const fteReduction = Math.round((ftesWithout - ftesWith) * 10) / 10;

    const unitCost = annualCost(def.role, def.defaultBand);
    const costWithout = Math.round(unitCost * ftesWithout);
    const costWith    = Math.round(unitCost * ftesWith);
    const costSavings = costWithout - costWith;

    return {
      role: def.role,
      band: def.defaultBand,
      bandLabel: BAND_LABELS[def.defaultBand],
      ftesWithout,
      ftesWith,
      fteReduction,
      costWithout,
      costWith,
      costSavings,
      productivityPct: effectivePct,
      isTopSaver: false, // set below
      perRowOverridePct: overridePct ?? null,
    };
  });

  // Mark top-3 cost-savers
  const sorted = [...rows].sort((a, b) => b.costSavings - a.costSavings);
  const top3Roles = new Set(sorted.slice(0, 3).map((r) => r.role));
  rows.forEach((r) => { r.isTopSaver = top3Roles.has(r.role); });

  // Summary
  const totalFtesWithout   = rows.reduce((s, r) => s + r.ftesWithout, 0);
  const totalFtesWith      = Math.round(rows.reduce((s, r) => s + r.ftesWith, 0) * 10) / 10;
  const totalFteReduction  = Math.round((totalFtesWithout - totalFtesWith) * 10) / 10;
  const totalCostWithout   = rows.reduce((s, r) => s + r.costWithout, 0);
  const totalCostWith      = rows.reduce((s, r) => s + r.costWith, 0);
  const totalCostSavings   = totalCostWithout - totalCostWith;

  // Weighted-average effective productivity %
  const weightedPctSum = rows.reduce((s, r) => s + r.productivityPct * r.ftesWithout, 0);
  const effectiveProductivityPct = Math.round(weightedPctSum / totalFtesWithout);

  return {
    rows,
    summary: {
      totalFtesWithout,
      totalFtesWith,
      totalFteReduction,
      totalCostWithout,
      totalCostWith,
      totalCostSavings,
      effectiveProductivityPct,
    },
  };
}
