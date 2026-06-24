// ============================================================
// Testing Strategy Engine
// Generates comprehensive QA plan with effort estimation
// ============================================================
import type { TestingStrategy, TestType, TestEnvironment } from '@/types';
import { generateId } from '@/lib/utils';
import type { DocumentSummary } from '@/types';

export function generateTestingStrategy(summary: DocumentSummary, totalLaborHours: number): TestingStrategy {
  const qaHoursBase = Math.round(totalLaborHours * 0.22); // ~22% of project effort on QA

  const testTypes: TestType[] = [
    {
      id: generateId(),
      name: 'Unit Testing',
      category: 'functional',
      scope: 'Individual components, functions, API endpoints, and business logic modules. Coverage target: 80%+ code coverage.',
      estimatedHours: Math.round(qaHoursBase * 0.18),
      automationFeasibility: 'high',
      priority: 'critical',
      tools: ['Jest', 'Vitest', 'React Testing Library', 'Supertest'],
    },
    {
      id: generateId(),
      name: 'Integration Testing',
      category: 'functional',
      scope: 'API-to-database interactions, service-to-service calls, external API integrations, and data flow validation.',
      estimatedHours: Math.round(qaHoursBase * 0.16),
      automationFeasibility: 'high',
      priority: 'critical',
      tools: ['Jest', 'Supertest', 'Docker Compose', 'Postman/Newman'],
    },
    {
      id: generateId(),
      name: 'End-to-End Testing',
      category: 'functional',
      scope: 'Critical user journeys from frontend through backend, including login, core workflows, and data submission.',
      estimatedHours: Math.round(qaHoursBase * 0.14),
      automationFeasibility: 'medium',
      priority: 'critical',
      tools: ['Playwright', 'Cypress', 'Selenium WebDriver'],
    },
    {
      id: generateId(),
      name: 'Performance & Load Testing',
      category: 'non-functional',
      scope: 'Baseline performance benchmarks, load testing at 2x expected peak, stress testing, and endurance testing.',
      estimatedHours: Math.round(qaHoursBase * 0.12),
      automationFeasibility: 'high',
      priority: 'high',
      tools: ['k6', 'Apache JMeter', 'Artillery', 'AWS Load Testing'],
    },
    {
      id: generateId(),
      name: 'Security & Penetration Testing',
      category: 'security',
      scope: 'OWASP Top 10 vulnerability scan, authentication/authorization testing, input validation, and dependency audit.',
      estimatedHours: Math.round(qaHoursBase * 0.1),
      automationFeasibility: 'medium',
      priority: 'critical',
      tools: ['OWASP ZAP', 'Burp Suite', 'Snyk', 'SonarQube', 'npm audit'],
    },
    {
      id: generateId(),
      name: 'Accessibility Testing',
      category: 'non-functional',
      scope: 'WCAG 2.1 AA compliance validation, screen reader testing, keyboard navigation, and color contrast verification.',
      estimatedHours: Math.round(qaHoursBase * 0.07),
      automationFeasibility: 'medium',
      priority: 'high',
      tools: ['axe-core', 'Lighthouse', 'WAVE', 'NVDA Screen Reader'],
    },
    {
      id: generateId(),
      name: 'User Acceptance Testing',
      category: 'functional',
      scope: 'Business stakeholder validation of all functional requirements, user stories, and acceptance criteria.',
      estimatedHours: Math.round(qaHoursBase * 0.12),
      automationFeasibility: 'low',
      priority: 'critical',
      tools: ['TestRail', 'JIRA', 'Confluence', 'User Feedback Tools'],
    },
    {
      id: generateId(),
      name: 'Regression Testing',
      category: 'automation',
      scope: 'Full regression suite executed on every release, covering all previously validated functionality.',
      estimatedHours: Math.round(qaHoursBase * 0.08),
      automationFeasibility: 'high',
      priority: 'high',
      tools: ['Playwright', 'Jest', 'GitHub Actions', 'Jenkins'],
    },
    {
      id: generateId(),
      name: 'API Contract Testing',
      category: 'automation',
      scope: 'Consumer-driven contract tests ensuring API backward compatibility and schema adherence.',
      estimatedHours: Math.round(qaHoursBase * 0.03),
      automationFeasibility: 'high',
      priority: 'medium',
      tools: ['Pact', 'Dredd', 'Postman Collections'],
    },
  ];

  const environments: TestEnvironment[] = [
    {
      name: 'Development',
      purpose: 'Unit and component testing during active development',
      infrastructure: 'Local + Docker Compose',
      dataSets: ['Synthetic unit test fixtures', 'Mock API responses'],
    },
    {
      name: 'Integration / CI',
      purpose: 'Automated integration and regression testing on every commit',
      infrastructure: 'GitHub Actions + Docker containers',
      dataSets: ['Sanitized integration dataset', 'Seed scripts'],
    },
    {
      name: 'Staging',
      purpose: 'Full system testing, performance benchmarks, security scans',
      infrastructure: 'AWS/Cloud mirroring production topology',
      dataSets: ['Production-like anonymized data', 'Performance dataset (10M records)'],
    },
    {
      name: 'UAT',
      purpose: 'Business stakeholder acceptance testing',
      infrastructure: 'Dedicated UAT environment with client access',
      dataSets: ['Client-approved test data', 'Edge case scenarios'],
    },
    {
      name: 'Production',
      purpose: 'Post-deployment smoke tests and canary validation',
      infrastructure: 'Live production environment',
      dataSets: ['Smoke test scripts', 'Synthetic monitoring'],
    },
  ];

  const totalQAHours = testTypes.reduce((sum, t) => sum + t.estimatedHours, 0);
  const automationHours = testTypes
    .filter((t) => t.automationFeasibility === 'high')
    .reduce((sum, t) => sum + t.estimatedHours, 0);
  const automationCoverage = Math.round((automationHours / totalQAHours) * 100);

  const qaCostEstimate = Math.round(totalQAHours * 130); // avg $130/hr for QA

  const phaseDistribution = [
    { phase: 'Development (Unit/Component)', hours: Math.round(totalQAHours * 0.22), percentage: 22 },
    { phase: 'Integration Phase', hours: Math.round(totalQAHours * 0.25), percentage: 25 },
    { phase: 'System Testing', hours: Math.round(totalQAHours * 0.28), percentage: 28 },
    { phase: 'UAT & Acceptance', hours: Math.round(totalQAHours * 0.15), percentage: 15 },
    { phase: 'Deployment & Go-Live', hours: Math.round(totalQAHours * 0.10), percentage: 10 },
  ];

  return {
    id: generateId(),
    documentId: '',
    testTypes,
    environments,
    totalQAHours,
    automationCoverage,
    qaCostEstimate,
    entryCriteria: [
      'All unit tests passing with >80% code coverage',
      'Development environment fully provisioned and stable',
      'Feature code reviewed and merged to integration branch',
      'Test data prepared and validated',
      'Test cases reviewed and approved by QA lead',
    ],
    exitCriteria: [
      'All critical defects resolved (P0, P1)',
      'Test execution coverage >95% of test cases',
      'Performance benchmarks met per SLA requirements',
      'Security scan completed with no critical vulnerabilities',
      'UAT sign-off obtained from authorized stakeholders',
      'Regression suite passing at 100%',
    ],
    risks: [
      'Insufficient test data availability for edge case coverage',
      'Environment instability causing false test failures',
      'Late delivery of features compressing testing timeline',
      'Third-party system dependencies causing integration test failures',
      'Scope changes invalidating previously completed test coverage',
    ],
    phaseDistribution,
    staffingRecommendation: [
      { role: 'QA Lead', count: 1, weeks: 0 },
      { role: 'QA Engineer', count: 2, weeks: 0 },
      { role: 'Automation Engineer', count: 1, weeks: 0 },
      { role: 'Performance Test Engineer', count: 1, weeks: 0 },
    ],
    qualityMetrics: [
      { metric: 'Code Coverage', target: '>80%', current: 'Baseline TBD' },
      { metric: 'Defect Density', target: '<2 per KLOC', current: 'Baseline TBD' },
      { metric: 'Automation Rate', target: `${automationCoverage}%+`, current: '0%' },
      { metric: 'Critical Defect Resolution', target: '<24 hours', current: 'SLA TBD' },
      { metric: 'UAT Pass Rate', target: '>95%', current: 'Target' },
      { metric: 'Performance (P95 Response)', target: '<500ms', current: 'Baseline TBD' },
    ],
    lastUpdated: new Date().toISOString(),
  };
}
