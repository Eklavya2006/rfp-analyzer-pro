// ============================================================
// Cost Estimation Engine
// Calculates detailed cost breakdown from assumptions + scope
// ============================================================
import type {
  CostAssumptions,
  CostBreakdown,
  CostPhase,
  DocumentSummary,
} from '@/types';
import { generateId } from '@/lib/utils';

export const DEFAULT_HOURLY_RATES: Record<string, number> = {
  'Project Manager': 160,
  'Tech Lead': 210,
  'Backend Developer': 175,
  'Frontend Developer': 160,
  'QA Engineer': 130,
  'DevOps Engineer': 185,
  'Data Engineer': 190,
  'Business Analyst': 145,
  'UX Designer': 155,
  'Security Engineer': 200,
};

export const DEFAULT_TEAM_COMPOSITION: Record<string, number> = {
  'Project Manager': 1,
  'Tech Lead': 1,
  'Backend Developer': 2,
  'Frontend Developer': 2,
  'QA Engineer': 2,
  'DevOps Engineer': 1,
  'Business Analyst': 1,
  'UX Designer': 1,
};

export const DEFAULT_PHASES: Array<{ name: string; durationPercent: number; roleWeights: Record<string, number> }> = [
  { name: 'Discovery & Architecture', durationPercent: 0.1, roleWeights: { 'Project Manager': 0.8, 'Tech Lead': 1.0, 'Business Analyst': 1.0, 'UX Designer': 0.8 } },
  { name: 'Core Development Sprint 1', durationPercent: 0.2, roleWeights: { 'Project Manager': 0.6, 'Tech Lead': 1.0, 'Backend Developer': 1.0, 'Frontend Developer': 1.0, 'DevOps Engineer': 0.5 } },
  { name: 'Core Development Sprint 2', durationPercent: 0.2, roleWeights: { 'Project Manager': 0.6, 'Tech Lead': 1.0, 'Backend Developer': 1.0, 'Frontend Developer': 1.0, 'DevOps Engineer': 0.5 } },
  { name: 'Integration & API Development', durationPercent: 0.15, roleWeights: { 'Project Manager': 0.5, 'Tech Lead': 0.8, 'Backend Developer': 1.0, 'DevOps Engineer': 0.8, 'QA Engineer': 0.5 } },
  { name: 'Testing & QA', durationPercent: 0.15, roleWeights: { 'Project Manager': 0.5, 'QA Engineer': 1.0, 'Backend Developer': 0.3, 'Frontend Developer': 0.3, 'DevOps Engineer': 0.4 } },
  { name: 'UAT & Deployment', durationPercent: 0.1, roleWeights: { 'Project Manager': 0.8, 'DevOps Engineer': 1.0, 'QA Engineer': 0.6, 'Tech Lead': 0.5, 'Business Analyst': 0.6 } },
  { name: 'Stabilization & Handover', durationPercent: 0.1, roleWeights: { 'Project Manager': 1.0, 'Tech Lead': 0.6, 'DevOps Engineer': 0.5, 'Business Analyst': 0.8 } },
];

export function deriveDefaultAssumptions(summary?: DocumentSummary): CostAssumptions {
  // Parse timeline from summary
  let weeks = 72; // default 18 months
  if (summary?.estimatedTimeline) {
    const mMatch = summary.estimatedTimeline.match(/(\d+)\s*month/i);
    const wMatch = summary.estimatedTimeline.match(/(\d+)\s*week/i);
    if (mMatch) weeks = parseInt(mMatch[1]) * 4;
    else if (wMatch) weeks = parseInt(wMatch[1]);
  }

  return {
    hourlyRates: { ...DEFAULT_HOURLY_RATES },
    teamComposition: { ...DEFAULT_TEAM_COMPOSITION },
    projectDurationWeeks: weeks,
    contingencyPercent: 15,
    infrastructureMonthlyCost: 8500,
    overheadPercent: 12,
    licensesCost: 45000,
    travelCost: 20000,
  };
}

export function calculateCostBreakdown(assumptions: CostAssumptions): CostBreakdown {
  const {
    hourlyRates,
    teamComposition,
    projectDurationWeeks,
    contingencyPercent,
    infrastructureMonthlyCost,
    overheadPercent,
    licensesCost,
    travelCost,
  } = assumptions;

  const HOURS_PER_WEEK = 40;

  // Calculate phases
  const phases: CostPhase[] = DEFAULT_PHASES.map((phaseDef) => {
    const phaseDurationWeeks = Math.max(1, Math.round(phaseDef.durationPercent * projectDurationWeeks));
    const roles: Record<string, number> = {};
    let phaseCost = 0;

    for (const [role, count] of Object.entries(teamComposition)) {
      if (count === 0) continue;
      const weight = phaseDef.roleWeights[role] ?? 0;
      if (weight === 0) continue;
      const hours = phaseDurationWeeks * HOURS_PER_WEEK * weight * count;
      const rate = hourlyRates[role] ?? 150;
      roles[role] = Math.round(hours);
      phaseCost += hours * rate;
    }

    return {
      id: generateId(),
      name: phaseDef.name,
      durationWeeks: phaseDurationWeeks,
      roles,
      cost: Math.round(phaseCost),
    };
  });

  // Labor cost = sum of phases
  const laborCost = phases.reduce((sum, p) => sum + p.cost, 0);

  // Infrastructure: monthly * duration in months
  const durationMonths = projectDurationWeeks / 4.33;
  const infraCost = Math.round(infrastructureMonthlyCost * durationMonths);

  // Other costs
  const baseCost = laborCost + infraCost + licensesCost + travelCost;
  const overheadCost = Math.round(baseCost * (overheadPercent / 100));
  const contingencyCost = Math.round((baseCost + overheadCost) * (contingencyPercent / 100));
  const totalCost = baseCost + overheadCost + contingencyCost;

  // By role breakdown
  const roleHoursMap: Record<string, number> = {};
  for (const phase of phases) {
    for (const [role, hours] of Object.entries(phase.roles)) {
      roleHoursMap[role] = (roleHoursMap[role] || 0) + hours;
    }
  }

  const byRole = Object.entries(roleHoursMap).map(([role, hours]) => {
    const cost = Math.round(hours * (hourlyRates[role] ?? 150));
    return {
      role,
      hours,
      cost,
      percentage: Math.round((cost / laborCost) * 100 * 10) / 10,
    };
  }).sort((a, b) => b.cost - a.cost);

  // By category
  const byCategory = [
    { category: 'Labor', cost: laborCost, percentage: Math.round((laborCost / totalCost) * 100) },
    { category: 'Infrastructure', cost: infraCost, percentage: Math.round((infraCost / totalCost) * 100) },
    { category: 'Licenses & Tools', cost: licensesCost, percentage: Math.round((licensesCost / totalCost) * 100) },
    { category: 'Overhead', cost: overheadCost, percentage: Math.round((overheadCost / totalCost) * 100) },
    { category: 'Contingency', cost: contingencyCost, percentage: Math.round((contingencyCost / totalCost) * 100) },
    { category: 'Travel', cost: travelCost, percentage: Math.round((travelCost / totalCost) * 100) },
  ];

  return {
    totalCost,
    laborCost,
    infrastructureCost: infraCost,
    licensesCost,
    travelCost,
    contingencyCost,
    overheadCost,
    phases,
    byRole,
    byCategory,
    assumptions,
    lastCalculated: new Date().toISOString(),
  };
}
