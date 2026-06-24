// ============================================================
// RFP Analyzer Pro — Cost Engine
// Derives a CostBreakdown from CostAssumptions + a base cost.
// Used by /api/recalculate route.
// ============================================================
import type { CostAssumptions, CostBreakdown } from '@/types';
import { applyAssumptions } from '@/lib/store';

/**
 * Given a set of cost assumptions and an optional base cost,
 * return a fully populated CostBreakdown object.
 * When baseCost is omitted we use a default of $2,500,000.
 */
export function calculateCostBreakdown(
  assumptions: CostAssumptions,
  baseCost = 2_500_000,
): CostBreakdown {
  // Reuse the shared pure helper already used by the store & mock engine
  const result = applyAssumptions(baseCost, [], assumptions);
  return result.costBreakdown;
}
