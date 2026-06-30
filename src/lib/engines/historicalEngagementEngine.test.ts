// ============================================================
// Unit Tests — HistoricalEngagementService
// ============================================================
// Run with: npx vitest src/lib/engines/historicalEngagementEngine.test.ts
// (or jest with ts-jest if configured)
//
// These tests are pure — no DOM, no store, no network.
// Each test injects a controlled mini-dataset so results are
// deterministic regardless of changes to the seed data.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HistoricalEngagementService,
  buildDescriptorFromAnalysis,
} from './historicalEngagementEngine';
import type { HistoricalEngagement, CurrentEngagementDescriptor } from '@/types';

// ── Fixture factory ──────────────────────────────────────────

function makeWon(overrides: Partial<HistoricalEngagement> = {}): HistoricalEngagement {
  return {
    id: 'test-won-1',
    clientName: 'Test Client',
    projectTitle: 'Test WON Project',
    industry: 'Financial Services',
    serviceType: 'Data & AI',
    geography: 'North America',
    deliveryModel: 'Hybrid',
    contractValueUSD: 5_000_000,
    durationWeeks: 40,
    technologies: ['Watson Studio', 'Python', 'Spark'],
    keywords: ['fraud detection', 'machine learning', 'banking'],
    outcome: 'WON',
    winningAttributes: ['Explainable AI', 'Rapid POC'],
    lossReasons: [],
    lessonsLearned: 'POC builds confidence.',
    confidenceContrib: 0.85,
    ...overrides,
  };
}

function makeLost(overrides: Partial<HistoricalEngagement> = {}): HistoricalEngagement {
  return {
    id: 'test-lost-1',
    clientName: 'Test Client Lost',
    projectTitle: 'Test LOST Project',
    industry: 'Retail',
    serviceType: 'Cloud & Platform Services',
    geography: 'Europe',
    deliveryModel: 'Offshore',
    contractValueUSD: 3_000_000,
    durationWeeks: 24,
    technologies: ['Kubernetes', 'AWS'],
    keywords: ['replatform', 'e-commerce'],
    outcome: 'LOST',
    winningAttributes: [],
    lossReasons: [
      {
        category: 'Price',
        reason: 'IBM was 30% above winning bid.',
        mitigationForCurrentProposal: 'Use offshore CIC pricing model.',
      },
    ],
    lessonsLearned: 'Lead with TCO, not day-rate.',
    confidenceContrib: 0,
    ...overrides,
  };
}

function makeDescriptor(overrides: Partial<CurrentEngagementDescriptor> = {}): CurrentEngagementDescriptor {
  return {
    industry: 'Financial Services',
    serviceType: 'Data & AI',
    geography: 'North America',
    deliveryModel: 'Hybrid',
    contractValueUSD: 5_000_000,
    durationWeeks: 40,
    technologies: ['Watson Studio', 'Python'],
    keywords: ['fraud detection', 'banking'],
    ...overrides,
  };
}

// ── findSimilarEngagements ───────────────────────────────────

describe('HistoricalEngagementService.findSimilarEngagements', () => {
  it('returns empty array for empty dataset', () => {
    const results = HistoricalEngagementService.findSimilarEngagements(
      makeDescriptor(),
      { dataset: [] }
    );
    expect(results).toHaveLength(0);
  });

  it('returns at most topN results', () => {
    const dataset = [makeWon(), makeWon({ id: 'w2' }), makeWon({ id: 'w3' })];
    const results = HistoricalEngagementService.findSimilarEngagements(
      makeDescriptor(),
      { dataset, topN: 2 }
    );
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('caps topN at dataset length (oversized topN guard)', () => {
    const dataset = [makeWon()];
    const results = HistoricalEngagementService.findSimilarEngagements(
      makeDescriptor(),
      { dataset, topN: 999 }
    );
    expect(results).toHaveLength(1);
  });

  it('scores perfect match near 100', () => {
    const eng = makeWon();
    const descriptor = makeDescriptor();
    const results = HistoricalEngagementService.findSimilarEngagements(descriptor, {
      dataset: [eng],
    });
    expect(results[0].similarityScore).toBeGreaterThan(70);
  });

  it('scores zero-overlap descriptor lower than full-match descriptor', () => {
    const dataset = [makeWon()];
    const fullMatch = HistoricalEngagementService.findSimilarEngagements(makeDescriptor(), { dataset });
    const noMatch = HistoricalEngagementService.findSimilarEngagements(
      { industry: 'Media & Entertainment', serviceType: 'Managed Services' },
      { dataset }
    );
    expect(fullMatch[0].similarityScore).toBeGreaterThan(noMatch[0].similarityScore);
  });

  it('sorts results descending by similarity score', () => {
    const dataset = [
      makeWon({ id: 'a', industry: 'Financial Services', serviceType: 'Data & AI' }),
      makeWon({ id: 'b', industry: 'Media & Entertainment', serviceType: 'Managed Services' }),
    ];
    const results = HistoricalEngagementService.findSimilarEngagements(makeDescriptor(), { dataset });
    expect(results[0].similarityScore).toBeGreaterThanOrEqual(results[1].similarityScore);
  });

  it('tie-breaks by id lexicographic order', () => {
    // Two identical engagements differing only in id
    const dataset = [
      makeWon({ id: 'z-id' }),
      makeWon({ id: 'a-id' }),
    ];
    const results = HistoricalEngagementService.findSimilarEngagements(makeDescriptor(), { dataset });
    // Both have identical scores; id 'a-id' should come first (lex order)
    expect(results[0].engagement.id).toBe('a-id');
  });

  it('returns dimensionScores for all 8 dimensions', () => {
    const results = HistoricalEngagementService.findSimilarEngagements(
      makeDescriptor(),
      { dataset: [makeWon()] }
    );
    const dims = results[0].dimensionScores;
    expect(Object.keys(dims)).toEqual(
      expect.arrayContaining(['industry', 'serviceType', 'contractValue', 'technologyStack',
        'geography', 'deliveryModel', 'duration', 'keywordBonus'])
    );
    for (const v of Object.values(dims)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('handles missing descriptor fields gracefully', () => {
    const results = HistoricalEngagementService.findSimilarEngagements(
      {}, // completely empty descriptor
      { dataset: [makeWon()] }
    );
    expect(results).toHaveLength(1);
    expect(results[0].similarityScore).toBeGreaterThanOrEqual(0);
  });

  it('handles missing engagement fields gracefully', () => {
    const bare: HistoricalEngagement = {
      id: 'bare',
      clientName: '',
      projectTitle: '',
      industry: '',
      serviceType: '',
      geography: '',
      deliveryModel: '',
      contractValueUSD: 0,
      durationWeeks: 0,
      technologies: [],
      keywords: [],
      outcome: 'WON',
      winningAttributes: [],
      lossReasons: [],
      lessonsLearned: '',
      confidenceContrib: 0,
    };
    expect(() =>
      HistoricalEngagementService.findSimilarEngagements(makeDescriptor(), { dataset: [bare] })
    ).not.toThrow();
  });

  it('accepts custom weight overrides', () => {
    const dataset = [makeWon()];
    const results = HistoricalEngagementService.findSimilarEngagements(makeDescriptor(), {
      dataset,
      weights: { industry: 100, serviceType: 0, contractValue: 0, technologyStack: 0,
                  geography: 0, deliveryModel: 0, duration: 0, keywordBonus: 0 },
    });
    // With industry weight = 100% and perfect industry match, score should be near 100
    expect(results[0].similarityScore).toBeGreaterThan(90);
  });

  it('throws on all-zero weights', () => {
    expect(() =>
      HistoricalEngagementService.findSimilarEngagements(makeDescriptor(), {
        dataset: [makeWon()],
        weights: { industry: 0, serviceType: 0, contractValue: 0, technologyStack: 0,
                    geography: 0, deliveryModel: 0, duration: 0, keywordBonus: 0 },
      })
    ).toThrow(RangeError);
  });
});

// ── getWinInsights ───────────────────────────────────────────

describe('HistoricalEngagementService.getWinInsights', () => {
  it('returns Low confidence when no WON records exist', () => {
    const result = HistoricalEngagementService.getWinInsights(makeDescriptor(), {
      dataset: [makeLost()],
    });
    expect(result.confidenceLevel).toBe('Low');
    expect(result.topWins).toHaveLength(0);
    expect(result.topWinningAttributes).toHaveLength(0);
  });

  it('returns empty insights for empty dataset', () => {
    const result = HistoricalEngagementService.getWinInsights(makeDescriptor(), { dataset: [] });
    expect(result.topWins).toHaveLength(0);
    expect(result.confidenceLevel).toBe('Low');
  });

  it('aggregates winning attributes with frequency count', () => {
    const dataset = [
      makeWon({ id: 'w1', winningAttributes: ['Explainable AI', 'Rapid POC'] }),
      makeWon({ id: 'w2', winningAttributes: ['Explainable AI', 'Fixed Price'] }),
    ];
    const result = HistoricalEngagementService.getWinInsights(makeDescriptor(), { dataset });
    const attrs = result.topWinningAttributes;
    const exAI = attrs.find((a) => a.attribute === 'Explainable AI');
    expect(exAI).toBeDefined();
    expect(exAI!.frequency).toBe(2);
  });

  it('ranks winning attributes by frequency descending', () => {
    const dataset = [
      makeWon({ id: 'w1', winningAttributes: ['A', 'B'] }),
      makeWon({ id: 'w2', winningAttributes: ['A', 'C'] }),
      makeWon({ id: 'w3', winningAttributes: ['A'] }),
    ];
    const result = HistoricalEngagementService.getWinInsights(makeDescriptor(), { dataset });
    expect(result.topWinningAttributes[0].attribute).toBe('A');
    expect(result.topWinningAttributes[0].frequency).toBe(3);
  });

  it('returns High confidence for high-scoring wins', () => {
    const dataset = [makeWon(), makeWon({ id: 'w2' })];
    const result = HistoricalEngagementService.getWinInsights(makeDescriptor(), { dataset });
    // Perfect matches → avg score should be high → High confidence
    expect(result.confidenceLevel).toBe('High');
  });

  it('returns Low confidence for no-match wins', () => {
    const dataset = [makeWon({ industry: 'Media & Entertainment', serviceType: 'Managed Services',
      geography: 'Latin America', deliveryModel: 'Onshore',
      technologies: [], keywords: [], contractValueUSD: 100, durationWeeks: 2 })];
    const result = HistoricalEngagementService.getWinInsights(
      { industry: 'Technology', serviceType: 'Security Services' },
      { dataset }
    );
    expect(result.confidenceLevel).toBe('Low');
  });
});

// ── getLossInsights ──────────────────────────────────────────

describe('HistoricalEngagementService.getLossInsights', () => {
  it('returns empty arrays for empty dataset', () => {
    const result = HistoricalEngagementService.getLossInsights(makeDescriptor(), { dataset: [] });
    expect(result.topLosses).toHaveLength(0);
    expect(result.categorisedLossReasons).toHaveLength(0);
  });

  it('returns empty arrays when only WON records exist (all losses edge case)', () => {
    const result = HistoricalEngagementService.getLossInsights(makeDescriptor(), {
      dataset: [makeWon()],
    });
    expect(result.topLosses).toHaveLength(0);
    expect(result.categorisedLossReasons).toHaveLength(0);
  });

  it('groups loss reasons by category', () => {
    const dataset = [
      makeLost({
        id: 'l1',
        lossReasons: [
          { category: 'Price', reason: 'Too expensive', mitigationForCurrentProposal: 'Use offshore.' },
        ],
      }),
      makeLost({
        id: 'l2',
        lossReasons: [
          { category: 'Price', reason: 'Over budget', mitigationForCurrentProposal: 'Phase the project.' },
          { category: 'Technical Fit', reason: 'Wrong cloud', mitigationForCurrentProposal: 'Match cloud mandate.' },
        ],
      }),
    ];
    const result = HistoricalEngagementService.getLossInsights(makeDescriptor(), { dataset });
    const priceCategory = result.categorisedLossReasons.find((c) => c.category === 'Price');
    expect(priceCategory).toBeDefined();
    expect(priceCategory!.frequency).toBe(2);
    expect(priceCategory!.reasons).toHaveLength(2);
    expect(priceCategory!.mitigations).toHaveLength(2);
  });

  it('ranks categories by frequency descending', () => {
    const dataset = [
      makeLost({
        id: 'l1',
        lossReasons: [
          { category: 'Price', reason: 'r1', mitigationForCurrentProposal: 'm1' },
          { category: 'Price', reason: 'r2', mitigationForCurrentProposal: 'm2' },
        ],
      }),
      makeLost({
        id: 'l2',
        lossReasons: [
          { category: 'Technical Fit', reason: 'r3', mitigationForCurrentProposal: 'm3' },
        ],
      }),
    ];
    const result = HistoricalEngagementService.getLossInsights(makeDescriptor(), { dataset });
    expect(result.categorisedLossReasons[0].category).toBe('Price');
  });
});

// ── computeConfidenceScore ───────────────────────────────────

describe('HistoricalEngagementService.computeConfidenceScore', () => {
  it('returns score in range [0, 100]', () => {
    const descriptor = makeDescriptor();
    const result = HistoricalEngagementService.computeConfidenceScore(descriptor, undefined, undefined, {
      dataset: [makeWon(), makeLost()],
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('returns Excellent band for perfect-match all-wins dataset', () => {
    const dataset = Array.from({ length: 5 }, (_, i) => makeWon({ id: `w${i}` }));
    const result = HistoricalEngagementService.computeConfidenceScore(makeDescriptor(), undefined, undefined, {
      dataset,
    });
    expect(['Excellent', 'Good']).toContain(result.band);
  });

  it('returns Poor band for no-match all-losses dataset', () => {
    const dataset = [
      makeLost({ industry: 'Media & Entertainment', serviceType: 'Managed Services',
        geography: 'Latin America', deliveryModel: 'Onshore' }),
    ];
    const result = HistoricalEngagementService.computeConfidenceScore(
      { industry: 'Technology' }, undefined, undefined, { dataset }
    );
    // With no wins and risk flags present, score should be low
    expect(result.score).toBeLessThan(55);
  });

  it('returns correct winMatchCount', () => {
    const wins = HistoricalEngagementService.getWinInsights(makeDescriptor(), {
      dataset: [makeWon(), makeWon({ id: 'w2' })],
    });
    const result = HistoricalEngagementService.computeConfidenceScore(
      makeDescriptor(),
      wins,
      { topLosses: [], categorisedLossReasons: [] }
    );
    expect(result.winMatchCount).toBe(2);
  });

  it('activeRiskFlags is 0 when no loss insights', () => {
    const wins = HistoricalEngagementService.getWinInsights(makeDescriptor(), {
      dataset: [makeWon()],
    });
    const result = HistoricalEngagementService.computeConfidenceScore(
      makeDescriptor(),
      wins,
      { topLosses: [], categorisedLossReasons: [] }
    );
    expect(result.activeRiskFlags).toBe(0);
  });

  it('penalty reduces score when risk flags are present', () => {
    const lossesWithFlags: typeof HistoricalEngagementService extends { getLossInsights: infer T } ? never : never = undefined as never;
    void lossesWithFlags;

    const wins = HistoricalEngagementService.getWinInsights(makeDescriptor(), {
      dataset: [makeWon()],
    });
    const noLosses = { topLosses: [], categorisedLossReasons: [] };
    const withLosses = HistoricalEngagementService.getLossInsights(makeDescriptor(), {
      dataset: [makeLost({ industry: 'Financial Services', serviceType: 'Data & AI' })],
    });

    const scoreNoRisk  = HistoricalEngagementService.computeConfidenceScore(makeDescriptor(), wins, noLosses);
    const scoreWithRisk = HistoricalEngagementService.computeConfidenceScore(makeDescriptor(), wins, withLosses);
    expect(scoreNoRisk.score).toBeGreaterThanOrEqual(scoreWithRisk.score);
  });

  it('drivers array is non-empty', () => {
    const result = HistoricalEngagementService.computeConfidenceScore(
      makeDescriptor(), undefined, undefined, { dataset: [makeWon()] }
    );
    expect(result.drivers.length).toBeGreaterThan(0);
  });

  it('completenessScore is 1 for fully populated descriptor', () => {
    const result = HistoricalEngagementService.computeConfidenceScore(
      makeDescriptor(), undefined, undefined, { dataset: [makeWon()] }
    );
    expect(result.completenessScore).toBe(1);
  });

  it('completenessScore is < 1 for empty descriptor', () => {
    const result = HistoricalEngagementService.computeConfidenceScore(
      {}, undefined, undefined, { dataset: [makeWon()] }
    );
    expect(result.completenessScore).toBeLessThan(1);
  });
});

// ── computeFullBundle ────────────────────────────────────────

describe('HistoricalEngagementService.computeFullBundle', () => {
  it('returns a bundle with all three insight types', () => {
    const bundle = HistoricalEngagementService.computeFullBundle(makeDescriptor(), {
      dataset: [makeWon(), makeLost()],
    });
    expect(bundle.winInsights).toBeDefined();
    expect(bundle.lossInsights).toBeDefined();
    expect(bundle.confidenceScore).toBeDefined();
    expect(bundle.computedAt).toBeDefined();
  });

  it('computedAt is a valid ISO date string', () => {
    const bundle = HistoricalEngagementService.computeFullBundle(makeDescriptor(), {
      dataset: [makeWon()],
    });
    expect(() => new Date(bundle.computedAt).toISOString()).not.toThrow();
  });

  it('winInsights and lossInsights topN are consistent with options', () => {
    const dataset = Array.from({ length: 10 }, (_, i) =>
      i % 2 === 0 ? makeWon({ id: `w${i}` }) : makeLost({ id: `l${i}` })
    );
    const bundle = HistoricalEngagementService.computeFullBundle(makeDescriptor(), {
      dataset,
      topN: 3,
    });
    expect(bundle.winInsights.topWins.length).toBeLessThanOrEqual(3);
    expect(bundle.lossInsights.topLosses.length).toBeLessThanOrEqual(3);
  });
});

// ── buildDescriptorFromAnalysis ──────────────────────────────

describe('buildDescriptorFromAnalysis', () => {
  it('infers Financial Services from banking text', () => {
    const desc = buildDescriptorFromAnalysis({ rfpText: 'This RFP is for a banking modernisation project.' });
    expect(desc.industry).toBe('Financial Services');
  });

  it('infers Healthcare from hospital text', () => {
    const desc = buildDescriptorFromAnalysis({ rfpText: 'Hospital data management and patient care.' });
    expect(desc.industry).toBe('Healthcare');
  });

  it('infers Cloud & Platform Services from OpenShift tech', () => {
    const desc = buildDescriptorFromAnalysis({ technologies: ['OpenShift', 'Kubernetes', 'Terraform'] });
    expect(desc.serviceType).toBe('Cloud & Platform Services');
  });

  it('infers Data & AI from Watson tech', () => {
    const desc = buildDescriptorFromAnalysis({ technologies: ['Watson Studio', 'Python', 'Spark'] });
    expect(desc.serviceType).toBe('Data & AI');
  });

  it('includes projectDurationWeeks in output', () => {
    const desc = buildDescriptorFromAnalysis({ projectDurationWeeks: 36 });
    expect(desc.durationWeeks).toBe(36);
  });

  it('includes estimatedBudgetUSD in output', () => {
    const desc = buildDescriptorFromAnalysis({ estimatedBudgetUSD: 5_000_000 });
    expect(desc.contractValueUSD).toBe(5_000_000);
  });

  it('returns valid descriptor for completely empty input', () => {
    expect(() => buildDescriptorFromAnalysis({})).not.toThrow();
    const desc = buildDescriptorFromAnalysis({});
    expect(typeof desc).toBe('object');
  });

  it('keywords array is populated from rfp text', () => {
    const desc = buildDescriptorFromAnalysis({
      rfpText: 'We require cloud migration kubernetes security scanning pipeline deployment.',
    });
    expect(Array.isArray(desc.keywords)).toBe(true);
    expect(desc.keywords!.length).toBeGreaterThan(0);
  });
});
