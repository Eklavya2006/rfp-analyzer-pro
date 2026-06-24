// ============================================================
// AI Comparison Engine
// Evaluates AI-augmented delivery vs traditional execution
// ============================================================
import type { AIComparison, AIUseCase, AIScenario } from '@/types';
import { generateId } from '@/lib/utils';
import type { CostBreakdown, StaffingPlan } from '@/types';

export function generateAIComparison(
  costBreakdown: CostBreakdown,
  staffingPlan: StaffingPlan
): AIComparison {
  const useCases: AIUseCase[] = [
    {
      id: generateId(),
      area: 'Code Generation & Assistance',
      description: 'GitHub Copilot, Cursor, and similar AI coding assistants accelerate development by completing boilerplate, suggesting implementations, and reducing context-switching.',
      tools: ['GitHub Copilot', 'Cursor', 'Amazon CodeWhisperer', 'Tabnine'],
      effortReduction: 28,
      costImpact: -22,
      qualityImpact: 'moderate-improvement',
      speedImprovement: 35,
      automationOpportunity: 'high',
      limitations: [
        'Requires developer review for all AI-generated code',
        'Complex business logic still needs human expertise',
        'Training data cutoffs may miss latest framework patterns',
        'Security review required for sensitive code paths',
      ],
      maturityLevel: 'proven',
    },
    {
      id: generateId(),
      area: 'Automated Testing & QA',
      description: 'AI-powered test generation tools create unit tests, identify edge cases, and maintain test suites automatically, reducing QA effort and increasing coverage.',
      tools: ['Testim', 'Mabl', 'Applitools', 'CodiumAI', 'Diffblue Cover'],
      effortReduction: 35,
      costImpact: -28,
      qualityImpact: 'high-improvement',
      speedImprovement: 40,
      automationOpportunity: 'high',
      limitations: [
        'Initial setup requires significant calibration',
        'UAT and exploratory testing still requires human testers',
        'Domain-specific test scenarios need manual definition',
        'AI-generated tests may miss business rule nuances',
      ],
      maturityLevel: 'proven',
    },
    {
      id: generateId(),
      area: 'Requirements Analysis & Documentation',
      description: 'LLM-powered tools analyze requirements documents, identify ambiguities, generate user stories, and maintain living documentation automatically.',
      tools: ['ChatGPT / GPT-4', 'Claude', 'Notion AI', 'Confluence AI', 'Azure OpenAI'],
      effortReduction: 40,
      costImpact: -30,
      qualityImpact: 'high-improvement',
      speedImprovement: 45,
      automationOpportunity: 'high',
      limitations: [
        'Domain expertise still required for validation',
        'Hallucination risk in requirements interpretation',
        'Stakeholder review remains essential',
        'Integration with existing SDLC tools varies',
      ],
      maturityLevel: 'proven',
    },
    {
      id: generateId(),
      area: 'DevOps & Infrastructure Automation',
      description: 'AI-assisted IaC generation, anomaly detection in monitoring, auto-scaling decisions, and incident response recommendation.',
      tools: ['AWS DevOps Guru', 'Dynatrace AI', 'PagerDuty AIOps', 'Harness AI'],
      effortReduction: 25,
      costImpact: -20,
      qualityImpact: 'moderate-improvement',
      speedImprovement: 30,
      automationOpportunity: 'high',
      limitations: [
        'Requires substantial historical operational data',
        'False positive alerts need human triage initially',
        'Security automation requires careful guardrails',
        'Cost of AI-powered platforms can offset savings',
      ],
      maturityLevel: 'emerging',
    },
    {
      id: generateId(),
      area: 'Security & Compliance Scanning',
      description: 'AI-enhanced SAST/DAST tools that understand context, reduce false positives, and automatically prioritize and remediate common vulnerability classes.',
      tools: ['Snyk AI', 'Checkmarx AI', 'SonarQube AI', 'GitHub Advanced Security'],
      effortReduction: 30,
      costImpact: -18,
      qualityImpact: 'high-improvement',
      speedImprovement: 25,
      automationOpportunity: 'medium',
      limitations: [
        'Novel vulnerabilities require human security expertise',
        'Compliance decisions cannot be delegated to AI',
        'Integration with development workflow is essential for ROI',
      ],
      maturityLevel: 'proven',
    },
    {
      id: generateId(),
      area: 'UI/UX Design Generation',
      description: 'AI design tools accelerate wireframing, generate design variations, assist with design system component creation, and auto-generate responsive layouts.',
      tools: ['Figma AI', 'Adobe Firefly', 'Uizard', 'Galileo AI', 'V0 by Vercel'],
      effortReduction: 30,
      costImpact: -22,
      qualityImpact: 'moderate-improvement',
      speedImprovement: 38,
      automationOpportunity: 'medium',
      limitations: [
        'Human UX judgment essential for user research',
        'Brand consistency requires designer oversight',
        'Accessibility compliance must be manually verified',
        'Output quality varies significantly by tool',
      ],
      maturityLevel: 'emerging',
    },
    {
      id: generateId(),
      area: 'Project Management & Estimation',
      description: 'AI-powered project analytics provide velocity predictions, risk early warning, resource optimization, and automated status reporting.',
      tools: ['Forecast', 'Jira AI', 'Microsoft Copilot for M365', 'Linear AI'],
      effortReduction: 20,
      costImpact: -12,
      qualityImpact: 'moderate-improvement',
      speedImprovement: 15,
      automationOpportunity: 'medium',
      limitations: [
        'Historical data required for reliable predictions',
        'Human judgment essential for stakeholder management',
        'Estimation accuracy depends on data quality',
      ],
      maturityLevel: 'emerging',
    },
  ];

  // Weighted average savings across applicable use cases
  const avgEffortReduction = useCases.reduce((sum, u) => sum + u.effortReduction, 0) / useCases.length;
  const avgCostReduction = Math.abs(useCases.reduce((sum, u) => sum + u.costImpact, 0)) / useCases.length;
  const avgSpeedImprovement = useCases.reduce((sum, u) => sum + u.speedImprovement, 0) / useCases.length;

  // Apply blended 60% adoption factor (not all use cases apply at 100%)
  const adoptionFactor = 0.60;
  const effectiveEffortReduction = avgEffortReduction * adoptionFactor;
  const effectiveCostReduction = avgCostReduction * adoptionFactor;
  const effectiveSpeedImprovement = avgSpeedImprovement * adoptionFactor;

  const baseline: AIScenario = {
    totalCostBaseline: costBreakdown.totalCost,
    totalCostAIAugmented: Math.round(costBreakdown.totalCost * (1 - effectiveCostReduction / 100)),
    totalEffortBaselineHours: Math.round(costBreakdown.laborCost / 165), // avg $165/hr
    totalEffortAIHours: Math.round((costBreakdown.laborCost / 165) * (1 - effectiveEffortReduction / 100)),
    timelineBaselineWeeks: costBreakdown.assumptions.projectDurationWeeks,
    timelineAIWeeks: Math.round(costBreakdown.assumptions.projectDurationWeeks * (1 - effectiveSpeedImprovement / 100 * 0.5)),
    qualityScoreBaseline: 72,
    qualityScoreAI: 85,
    costSavingsPercent: Math.round(effectiveCostReduction * 10) / 10,
    effortSavingsPercent: Math.round(effectiveEffortReduction * 10) / 10,
    timelineSavingsPercent: Math.round(effectiveSpeedImprovement * 0.5 * 10) / 10,
  };

  return {
    id: generateId(),
    documentId: '',
    useCases,
    baseline,
    aiAugmented: baseline, // aiAugmented embedded in baseline for comparison
    assumptions: [
      'AI tools adopted by ≥60% of applicable team members within first 3 weeks',
      'Developer productivity gains materialize after 2-week AI tool onboarding',
      'AI-generated outputs undergo mandatory human review before merge',
      'AI tool licensing costs (~$30-50/user/month) factored into infrastructure budget',
      'Team has baseline AI literacy; formal training provided in onboarding',
      'Estimated savings are gross figures; net savings after tooling costs are ~5% lower',
      '60% adoption factor applied as blended average across all use case categories',
    ],
    limitations: [
      'AI productivity gains vary significantly by developer experience level',
      'Complex domain logic and novel architectural decisions remain human-driven',
      'AI-augmented estimates assume stable, well-scoped requirements',
      'Regulatory/compliance decisions cannot be delegated to AI systems',
      'First-time AI adoption projects may see lower gains than steady-state',
      'Data privacy constraints may limit AI tool use in certain environments',
    ],
    recommendations: [
      'Adopt GitHub Copilot Enterprise across all developer roles for immediate 20-30% productivity gains',
      'Implement AI test generation (Testim/CodiumAI) to accelerate QA coverage and reduce manual effort',
      'Use LLM-powered requirements analysis to front-load clarity and reduce rework in later phases',
      'Integrate AI-powered monitoring (Dynatrace AI) from deployment phase for proactive operations',
      'Establish AI governance policy before project kickoff covering acceptable use and review requirements',
      'Budget 2 weeks for AI tool onboarding and prompt engineering training for core team',
    ],
    lastUpdated: new Date().toISOString(),
  };
}
