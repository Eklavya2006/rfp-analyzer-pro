// ============================================================
// RFP Analyzer Pro — Historical Engagement Engine (v1)
// Pure, side-effect-free similarity ranking, win/loss insights,
// and Proposal Confidence Score computation.
//
// Public API:
//   HistoricalEngagementService.findSimilarEngagements()
//   HistoricalEngagementService.getWinInsights()
//   HistoricalEngagementService.getLossInsights()
//   HistoricalEngagementService.computeConfidenceScore()
//   HistoricalEngagementService.computeFullBundle()
//
// All methods are pure functions — no I/O, no side effects.
// The service class is a static-method namespace for organisation.
// ============================================================

import type {
  HistoricalEngagement,
  SimilarityResult,
  SimilarityWeights,
  WinInsights,
  LossInsights,
  ProposalConfidenceScore,
  HistoricalInsightsBundle,
  CurrentEngagementDescriptor,
} from '@/types';
import { DEFAULT_SIMILARITY_WEIGHTS } from '@/types';
import { HISTORICAL_ENGAGEMENTS } from '@/lib/historicalData';

// ── Internal helpers ─────────────────────────────────────────

/**
 * Normalise a string to lower-case trimmed form.
 * Returns empty string for null / undefined inputs.
 */
function norm(s: string | undefined | null): string {
  return (s ?? '').trim().toLowerCase();
}

/**
 * Exact-match score: 1 if both normalised strings are equal and
 * non-empty, 0 otherwise.
 */
function exactMatch(a: string | undefined, b: string | undefined): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  return na === nb ? 1 : 0;
}

/**
 * Continuous contract-value similarity using a log-ratio approach.
 * Score = max(0, 1 − |log10(a/b)| / 2)
 * This gives 1.0 at equal values and decays to 0 at two orders of
 * magnitude difference.  Returns 0 when either value is ≤ 0.
 */
function contractValueSimilarity(a: number | undefined, b: number | undefined): number {
  if (!a || !b || a <= 0 || b <= 0) return 0;
  const ratio = Math.abs(Math.log10(a / b));
  return Math.max(0, 1 - ratio / 2);
}

/**
 * Duration similarity using a log-ratio approach identical to contract
 * value but decays to 0 at 1.5 orders of magnitude difference.
 */
function durationSimilarity(a: number | undefined, b: number | undefined): number {
  if (!a || !b || a <= 0 || b <= 0) return 0;
  const ratio = Math.abs(Math.log10(a / b));
  return Math.max(0, 1 - ratio / 1.5);
}

/**
 * Technology stack Jaccard similarity: |intersection| / |union|.
 * Tokens are normalised to lower-case before comparison.
 * Returns 0 when both arrays are empty.
 */
function technologyJaccard(a: string[] | undefined, b: string[] | undefined): number {
  const setA = new Set((a ?? []).map(norm).filter(Boolean));
  const setB = new Set((b ?? []).map(norm).filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) { if (setB.has(t)) intersection++; }
  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

/**
 * Keyword bonus: fraction of engagement keywords that appear in the
 * proposal keyword / technology set.
 * Returns a score in [0, 1] — 1 if all engagement keywords matched.
 * Returns 0 when the engagement has no keywords.
 */
function keywordBonus(
  engKeywords: string[] | undefined,
  proposalKeywords: string[] | undefined,
  proposalTechnologies: string[] | undefined
): number {
  const ek = (engKeywords ?? []).map(norm).filter(Boolean);
  if (ek.length === 0) return 0;
  const haystack = new Set([
    ...(proposalKeywords ?? []).map(norm),
    ...(proposalTechnologies ?? []).map(norm),
  ].filter(Boolean));
  const matched = ek.filter((k) => {
    // Allow substring matching so "banking" matches "core banking"
    for (const h of haystack) { if (h.includes(k) || k.includes(h)) return true; }
    return false;
  });
  return matched.length / ek.length;
}

/**
 * Normalise an arbitrary set of weights so they sum to 1.
 * Throws if all weights are zero or negative.
 */
function normaliseWeights(w: SimilarityWeights): SimilarityWeights {
  const total =
    w.industry + w.serviceType + w.contractValue +
    w.technologyStack + w.geography + w.deliveryModel +
    w.duration + w.keywordBonus;
  if (total <= 0) {
    throw new RangeError('SimilarityWeights: sum of weights must be > 0');
  }
  return {
    industry:       w.industry       / total,
    serviceType:    w.serviceType    / total,
    contractValue:  w.contractValue  / total,
    technologyStack: w.technologyStack / total,
    geography:      w.geography      / total,
    deliveryModel:  w.deliveryModel  / total,
    duration:       w.duration       / total,
    keywordBonus:   w.keywordBonus   / total,
  };
}

/**
 * Compute the completeness score (0–1) of a current engagement
 * descriptor.  Each present, non-trivial field contributes equally.
 */
function computeCompleteness(descriptor: CurrentEngagementDescriptor): number {
  const fields: boolean[] = [
    Boolean(descriptor.industry),
    Boolean(descriptor.serviceType),
    Boolean(descriptor.geography),
    Boolean(descriptor.deliveryModel),
    Boolean(descriptor.contractValueUSD && descriptor.contractValueUSD > 0),
    Boolean(descriptor.durationWeeks && descriptor.durationWeeks > 0),
    Boolean(descriptor.technologies && descriptor.technologies.length > 0),
    Boolean(descriptor.keywords && descriptor.keywords.length > 0),
  ];
  return fields.filter(Boolean).length / fields.length;
}

// ── Score a single engagement against the current descriptor ──

/**
 * Score a single historical engagement against the current proposal
 * descriptor using the provided (already-normalised) weight map.
 *
 * @param engagement - Historical engagement to score.
 * @param descriptor - Current proposal descriptor.
 * @param weights    - Normalised weight map (sum = 1).
 * @returns SimilarityResult with composite score in [0, 100] and
 *          per-dimension raw scores in [0, 1].
 */
function scoreEngagement(
  engagement: HistoricalEngagement,
  descriptor: CurrentEngagementDescriptor,
  weights: SimilarityWeights
): SimilarityResult {
  const dims = {
    industry:       exactMatch(engagement.industry,      descriptor.industry),
    serviceType:    exactMatch(engagement.serviceType,   descriptor.serviceType),
    contractValue:  contractValueSimilarity(engagement.contractValueUSD, descriptor.contractValueUSD),
    technologyStack: technologyJaccard(engagement.technologies, descriptor.technologies),
    geography:      exactMatch(engagement.geography,     descriptor.geography),
    deliveryModel:  exactMatch(engagement.deliveryModel, descriptor.deliveryModel),
    duration:       durationSimilarity(engagement.durationWeeks, descriptor.durationWeeks),
    keywordBonus:   keywordBonus(engagement.keywords, descriptor.keywords, descriptor.technologies),
  };

  const composite =
    dims.industry       * weights.industry       +
    dims.serviceType    * weights.serviceType     +
    dims.contractValue  * weights.contractValue   +
    dims.technologyStack * weights.technologyStack +
    dims.geography      * weights.geography       +
    dims.deliveryModel  * weights.deliveryModel   +
    dims.duration       * weights.duration        +
    dims.keywordBonus   * weights.keywordBonus;

  return {
    engagement,
    similarityScore: Math.round(composite * 100 * 10) / 10, // 1 d.p., 0–100
    dimensionScores: dims,
  };
}

// ── Public Service ────────────────────────────────────────────

/**
 * Configuration options accepted by the HistoricalEngagementService
 * static methods.
 */
export interface EngagementServiceOptions {
  /**
   * Maximum number of results to return.
   * Capped at the dataset length to prevent oversized requests.
   * Defaults to 5.
   */
  topN?: number;
  /**
   * Custom weight overrides.  Only specified dimensions are overridden;
   * the rest fall back to DEFAULT_SIMILARITY_WEIGHTS.
   * Weights are automatically normalised internally.
   */
  weights?: Partial<SimilarityWeights>;
  /**
   * Historical dataset to use.  Defaults to HISTORICAL_ENGAGEMENTS.
   * Override in tests to inject controlled fixtures.
   */
  dataset?: HistoricalEngagement[];
}

/**
 * Service class exposing pure static methods for historical engagement
 * similarity ranking, win/loss insights, and confidence computation.
 *
 * All methods are pure — same inputs always produce same outputs.
 * No mutation of the dataset, no network calls.
 */
export class HistoricalEngagementService {
  /**
   * Resolve and normalise the effective weights for a call.
   * @internal
   */
  private static resolveWeights(override?: Partial<SimilarityWeights>): SimilarityWeights {
    const merged: SimilarityWeights = { ...DEFAULT_SIMILARITY_WEIGHTS, ...override };
    return normaliseWeights(merged);
  }

  /**
   * Resolve the effective topN capped by dataset length.
   * @internal
   */
  private static resolveTopN(
    requested: number | undefined,
    dataset: HistoricalEngagement[]
  ): number {
    const n = requested ?? 5;
    return Math.min(Math.max(1, n), dataset.length);
  }

  // ── findSimilarEngagements ────────────────────────────────

  /**
   * Find the top-N most similar historical engagements to the current
   * proposal using the weighted similarity engine.
   *
   * The returned array is sorted by `similarityScore` descending.
   * Ties are broken by engagement `id` lexicographic order for stability.
   *
   * @param descriptor - Current proposal descriptor.
   * @param options    - Optional topN, weight overrides, and dataset.
   * @returns Array of SimilarityResult, length ≤ topN.
   *
   * @example
   * ```ts
   * const results = HistoricalEngagementService.findSimilarEngagements(
   *   { industry: 'Financial Services', serviceType: 'Data & AI' },
   *   { topN: 3 }
   * );
   * console.log(results[0].similarityScore); // e.g. 78.4
   * ```
   */
  static findSimilarEngagements(
    descriptor: CurrentEngagementDescriptor,
    options: EngagementServiceOptions = {}
  ): SimilarityResult[] {
    const dataset = options.dataset ?? HISTORICAL_ENGAGEMENTS;
    // Edge case: empty dataset
    if (dataset.length === 0) return [];

    const weights = this.resolveWeights(options.weights);
    const topN = this.resolveTopN(options.topN, dataset);

    // Score all engagements
    const scored = dataset
      .map((eng) => scoreEngagement(eng, descriptor, weights))
      .sort((a, b) => {
        const diff = b.similarityScore - a.similarityScore;
        // Stable sort: tie-break by id
        return diff !== 0 ? diff : a.engagement.id.localeCompare(b.engagement.id);
      });

    return scored.slice(0, topN);
  }

  // ── getWinInsights ────────────────────────────────────────

  /**
   * Find the top-N similar WON engagements and aggregate their winning
   * attributes with frequency counts.
   *
   * Returns an empty `topWins` array and `confidenceLevel: 'Low'` when
   * no WON engagements match (all losses, or empty dataset).
   *
   * @param descriptor - Current proposal descriptor.
   * @param options    - Optional topN, weight overrides, and dataset.
   * @returns WinInsights with ranked wins and top winning attributes.
   */
  static getWinInsights(
    descriptor: CurrentEngagementDescriptor,
    options: EngagementServiceOptions = {}
  ): WinInsights {
    const dataset = options.dataset ?? HISTORICAL_ENGAGEMENTS;
    const wonDataset = dataset.filter((e) => e.outcome === 'WON');

    // Edge case: no WON records
    if (wonDataset.length === 0) {
      return {
        topWins: [],
        topWinningAttributes: [],
        confidenceLevel: 'Low',
      };
    }

    const topWins = this.findSimilarEngagements(descriptor, {
      ...options,
      dataset: wonDataset,
    });

    // Aggregate winning attributes with frequency count
    const attrCount = new Map<string, number>();
    for (const r of topWins) {
      for (const attr of r.engagement.winningAttributes) {
        attrCount.set(attr, (attrCount.get(attr) ?? 0) + 1);
      }
    }
    const topWinningAttributes = Array.from(attrCount.entries())
      .map(([attribute, frequency]) => ({ attribute, frequency }))
      .sort((a, b) => b.frequency - a.frequency || a.attribute.localeCompare(b.attribute))
      .slice(0, 8);

    // Confidence level: based on average score of top wins
    const avgScore =
      topWins.length > 0
        ? topWins.reduce((s, r) => s + r.similarityScore, 0) / topWins.length
        : 0;

    const confidenceLevel: WinInsights['confidenceLevel'] =
      avgScore >= 65 ? 'High' : avgScore >= 40 ? 'Medium' : 'Low';

    return { topWins, topWinningAttributes, confidenceLevel };
  }

  // ── getLossInsights ───────────────────────────────────────

  /**
   * Find the top-N similar LOST engagements and aggregate their loss
   * reasons into categorised mitigation recommendations for the current
   * proposal.
   *
   * Returns an empty `topLosses` and `categorisedLossReasons` array when
   * no LOST engagements match.
   *
   * @param descriptor - Current proposal descriptor.
   * @param options    - Optional topN, weight overrides, and dataset.
   * @returns LossInsights with ranked losses and categorised risk flags.
   */
  static getLossInsights(
    descriptor: CurrentEngagementDescriptor,
    options: EngagementServiceOptions = {}
  ): LossInsights {
    const dataset = options.dataset ?? HISTORICAL_ENGAGEMENTS;
    const lostDataset = dataset.filter((e) => e.outcome === 'LOST');

    // Edge case: no LOST records
    if (lostDataset.length === 0) {
      return { topLosses: [], categorisedLossReasons: [] };
    }

    const topLosses = this.findSimilarEngagements(descriptor, {
      ...options,
      dataset: lostDataset,
    });

    // Group loss reasons by category
    const categoryMap = new Map<string, { reasons: string[]; mitigations: string[]; frequency: number }>();
    for (const r of topLosses) {
      for (const lr of r.engagement.lossReasons) {
        const existing = categoryMap.get(lr.category);
        if (existing) {
          existing.reasons.push(lr.reason);
          existing.mitigations.push(lr.mitigationForCurrentProposal);
          existing.frequency++;
        } else {
          categoryMap.set(lr.category, {
            reasons: [lr.reason],
            mitigations: [lr.mitigationForCurrentProposal],
            frequency: 1,
          });
        }
      }
    }

    const categorisedLossReasons = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.frequency - a.frequency || a.category.localeCompare(b.category));

    return { topLosses, categorisedLossReasons };
  }

  // ── computeConfidenceScore ────────────────────────────────

  /**
   * Compute the Overall Proposal Confidence Score (0–100) from:
   * - Historical win match quality (weighted contribution)
   * - Risk penalty from matched loss reasons
   * - Descriptor completeness bonus
   *
   * Score components:
   *   - Win Match Score:   up to 55 pts (avg similarity × win confidence contrib)
   *   - Completeness:      up to 20 pts
   *   - Risk Penalty:      up to −25 pts (scaled by number of active risk flags)
   *
   * @param descriptor - Current proposal descriptor.
   * @param winResults - Pre-computed win insights (or computed internally).
   * @param lossResults - Pre-computed loss insights (or computed internally).
   * @param options - Optional topN, weight overrides, and dataset.
   * @returns ProposalConfidenceScore with score, band, and driver breakdown.
   */
  static computeConfidenceScore(
    descriptor: CurrentEngagementDescriptor,
    winResults?: WinInsights,
    lossResults?: LossInsights,
    options: EngagementServiceOptions = {}
  ): ProposalConfidenceScore {
    const wins  = winResults  ?? this.getWinInsights(descriptor, options);
    const losses = lossResults ?? this.getLossInsights(descriptor, options);

    // ── Win match component (0–55) ──────────────────────────
    let winMatchRaw = 0;
    if (wins.topWins.length > 0) {
      const avgSim = wins.topWins.reduce((s, r) => s + r.similarityScore, 0) / wins.topWins.length;
      const avgConf = wins.topWins.reduce(
        (s, r) => s + r.engagement.confidenceContrib, 0
      ) / wins.topWins.length;
      winMatchRaw = (avgSim / 100) * avgConf * 55;
    }
    const winMatchScore = Math.round(winMatchRaw);

    // ── Completeness component (0–20) ──────────────────────
    const completeness = computeCompleteness(descriptor);
    const completenessScore = Math.round(completeness * 20);

    // ── Risk penalty (0–25) ─────────────────────────────────
    const activeRiskFlags = losses.categorisedLossReasons.reduce(
      (sum, c) => sum + c.frequency, 0
    );
    // Each risk flag contributes up to 5 pts penalty; capped at 25
    const riskPenalty = Math.min(activeRiskFlags * 5, 25);

    // ── Composite ──────────────────────────────────────────
    const rawScore = winMatchScore + completenessScore - riskPenalty;
    // Always add a 5-point base floor so 0 data still shows minimal signal
    const score = Math.max(0, Math.min(100, rawScore + 5));

    // ── Band ───────────────────────────────────────────────
    const band: ProposalConfidenceScore['band'] =
      score >= 75 ? 'Excellent' :
      score >= 55 ? 'Good' :
      score >= 35 ? 'Fair' : 'Poor';

    // ── Drivers ────────────────────────────────────────────
    const drivers: ProposalConfidenceScore['drivers'] = [
      {
        label: 'Historical Win Alignment',
        contribution: winMatchScore,
        description:
          wins.topWins.length > 0
            ? `${wins.topWins.length} similar WON engagement${wins.topWins.length > 1 ? 's' : ''} found (avg ${
                Math.round(wins.topWins.reduce((s, r) => s + r.similarityScore, 0) / wins.topWins.length)
              } % match).`
            : 'No closely matching WON engagements found in the dataset.',
      },
      {
        label: 'Proposal Completeness',
        contribution: completenessScore,
        description: `${Math.round(completeness * 100)} % of engagement descriptor fields are populated.`,
      },
      {
        label: 'Risk Flag Penalty',
        contribution: -riskPenalty,
        description:
          activeRiskFlags > 0
            ? `${activeRiskFlags} active risk flag${activeRiskFlags > 1 ? 's' : ''} from similar LOST engagements reduce the score.`
            : 'No active risk flags — no similar LOST patterns detected.',
      },
      {
        label: 'Base Signal',
        contribution: 5,
        description: 'Baseline contribution applied to all proposals.',
      },
    ].filter((d) => d.contribution !== 0);

    return {
      score,
      band,
      drivers,
      activeRiskFlags,
      winMatchCount: wins.topWins.length,
      completenessScore: completeness,
    };
  }

  // ── computeFullBundle ─────────────────────────────────────

  /**
   * Compute the full HistoricalInsightsBundle in a single call.
   * Internally calls getWinInsights, getLossInsights, and
   * computeConfidenceScore, reusing intermediate results to avoid
   * duplicate scoring passes.
   *
   * @param descriptor - Current proposal descriptor.
   * @param options    - Optional topN, weight overrides, and dataset.
   * @returns HistoricalInsightsBundle ready for display in the UI.
   *
   * @example
   * ```ts
   * const bundle = HistoricalEngagementService.computeFullBundle(
   *   { industry: 'Healthcare', serviceType: 'Security Services' },
   *   { topN: 5 }
   * );
   * console.log(bundle.confidenceScore.score); // e.g. 62
   * ```
   */
  static computeFullBundle(
    descriptor: CurrentEngagementDescriptor,
    options: EngagementServiceOptions = {}
  ): HistoricalInsightsBundle {
    const winInsights  = this.getWinInsights(descriptor, options);
    const lossInsights = this.getLossInsights(descriptor, options);
    const confidenceScore = this.computeConfidenceScore(
      descriptor,
      winInsights,
      lossInsights,
      options
    );
    return {
      winInsights,
      lossInsights,
      confidenceScore,
      computedAt: new Date().toISOString(),
    };
  }
}

// ── Re-export helper for building a descriptor from store data ──

/**
 * Build a CurrentEngagementDescriptor from the available analysis data
 * in the Zustand store.  All fields are optional — missing analysis
 * data simply reduces the descriptor completeness score.
 *
 * @param params - Partial descriptor fields sourced from the store.
 * @returns CurrentEngagementDescriptor ready for the similarity engine.
 */
export function buildDescriptorFromAnalysis(params: {
  rfpText?: string;
  technologies?: string[];
  projectDurationWeeks?: number;
  estimatedBudgetUSD?: number;
  deliverables?: string[];
}): CurrentEngagementDescriptor {
  const text = norm(params.rfpText ?? '');

  // ── Infer industry from keywords in document text / deliverables ──
  const industryMap: Array<[string, string]> = [
    ['bank', 'Financial Services'],
    ['financ', 'Financial Services'],
    ['insur', 'Insurance'],
    ['health', 'Healthcare'],
    ['hospital', 'Healthcare'],
    ['pharma', 'Healthcare'],
    ['retail', 'Retail'],
    ['manufact', 'Manufacturing'],
    ['logistic', 'Logistics'],
    ['transport', 'Logistics'],
    ['energy', 'Energy & Utilities'],
    ['utility', 'Energy & Utilities'],
    ['teleco', 'Telecommunications'],
    ['government', 'Public Sector'],
    ['public sector', 'Public Sector'],
    ['media', 'Media & Entertainment'],
    ['entertainment', 'Media & Entertainment'],
    ['technolog', 'Technology'],
  ];
  let industry: string | undefined;
  for (const [kw, ind] of industryMap) {
    if (text.includes(kw)) { industry = ind; break; }
  }

  // ── Infer service type from technologies ──────────────────
  const tech = (params.technologies ?? []).map(norm);
  let serviceType: string | undefined;
  if (tech.some((t) => ['openshift', 'kubernetes', 'terraform', 'openstack', 'ibm cloud'].some((k) => t.includes(k)))) {
    serviceType = 'Cloud & Platform Services';
  } else if (tech.some((t) => ['watson', 'spark', 'python', 'ml', 'ai', 'analytics', 'watsonx'].some((k) => t.includes(k)))) {
    serviceType = 'Data & AI';
  } else if (tech.some((t) => ['qradar', 'guardium', 'security', 'siem', 'zero-trust'].some((k) => t.includes(k)))) {
    serviceType = 'Security Services';
  } else if (tech.some((t) => ['cobol', 'java', 'angular', 'react', 'modernisa', 'sap'].some((k) => t.includes(k)))) {
    serviceType = 'Application Modernization';
  }

  // ── Extract keywords from rfp text ───────────────────────
  const stopwords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'will', 'from', 'are', 'our', 'your', 'their', 'been', 'have', 'has', 'was', 'all']);
  const keywords = text
    .split(/\W+/)
    .filter((w) => w.length > 4 && !stopwords.has(w))
    .slice(0, 40); // keep top-40 non-trivial tokens

  return {
    industry,
    serviceType,
    contractValueUSD: params.estimatedBudgetUSD,
    durationWeeks: params.projectDurationWeeks,
    technologies: params.technologies,
    keywords,
  };
}
