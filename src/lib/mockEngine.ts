// ============================================================
// Mock Analysis Engine — generates full AnalysisResult from document text
// ============================================================
import { v4 as uuid } from 'uuid';
import type {
  AnalysisResult, ScopeItem, DeliverableItem, IBMOffering,
  ProjectPlan, StaffingPlan, StaffingRole, TestingStrategy,
  EstimationSummary, AIImpact, IBMBand,
} from '@/types';
import { DEFAULT_COST_ASSUMPTIONS } from '@/types';
import { applyAssumptions } from '@/lib/store';

const IBM_BAND_RATES: Record<IBMBand, { desc: string; rate: number }> = {
  '6A': { desc: 'Fresher / Entry Level', rate: 45 },
  '6B': { desc: 'Fresher / Entry Level', rate: 48 },
  '6G': { desc: 'Fresher / Entry Level', rate: 50 },
  '7A': { desc: 'Middle Level', rate: 65 },
  '7B': { desc: 'Middle Level', rate: 70 },
  '8':  { desc: 'Senior Middle Level', rate: 90 },
  '9':  { desc: 'Senior Middle Level', rate: 100 },
  '10': { desc: 'Senior', rate: 120 },
  'Executive': { desc: 'Senior Executive', rate: 150 },
  'D':  { desc: 'Distinguished / Senior Executive', rate: 200 },
};

export function runFullAnalysis(docId: string, text: string): AnalysisResult {
  const lower = text.toLowerCase();

  // ── Scope Items ──────────────────────────────────────────
  const scopeItems: ScopeItem[] = [
    { id: uuid(), description: 'Cloud infrastructure setup and migration', referenceSection: 'Section 2.1', pageNumber: 'Page 4', category: 'in-scope' },
    { id: uuid(), description: 'AI/ML model development and training', referenceSection: 'Section 2.3', pageNumber: 'Page 7', category: 'in-scope' },
    { id: uuid(), description: 'Data integration and ETL pipeline development', referenceSection: 'Section 3.1', pageNumber: 'Page 10', category: 'in-scope' },
    { id: uuid(), description: 'Security implementation and compliance', referenceSection: 'Section 3.4', pageNumber: 'Page 14', category: 'in-scope' },
    { id: uuid(), description: 'End-user training and change management', referenceSection: 'Section 4.2', pageNumber: 'Page 18', category: 'in-scope' },
    { id: uuid(), description: 'Third-party SaaS licensing', referenceSection: 'Section 5.1', pageNumber: 'Page 22', category: 'out-of-scope' },
    { id: uuid(), description: 'Hardware procurement', referenceSection: 'Section 5.2', pageNumber: 'Page 23', category: 'out-of-scope' },
    { id: uuid(), description: 'Existing legacy data is clean and accessible', referenceSection: 'Section 6.1', pageNumber: 'Page 26', category: 'assumption' },
  ];

  // ── Deliverables ─────────────────────────────────────────
  const deliverableItems: DeliverableItem[] = [
    { id: uuid(), description: 'Solution Architecture Document', referenceSection: 'Section 2.1', pageNumber: 'Page 5', phase: 'Discovery', priority: 'high' },
    { id: uuid(), description: 'Data Model & Schema Design', referenceSection: 'Section 2.3', pageNumber: 'Page 8', phase: 'Design', priority: 'high' },
    { id: uuid(), description: 'MVP Release — Core Platform', referenceSection: 'Section 3.1', pageNumber: 'Page 11', phase: 'Development', priority: 'high' },
    { id: uuid(), description: 'Test Strategy & Test Cases', referenceSection: 'Section 3.3', pageNumber: 'Page 13', phase: 'Testing', priority: 'medium' },
    { id: uuid(), description: 'UAT Sign-off Report', referenceSection: 'Section 3.4', pageNumber: 'Page 15', phase: 'Testing', priority: 'high' },
    { id: uuid(), description: 'Production Deployment Runbook', referenceSection: 'Section 4.1', pageNumber: 'Page 17', phase: 'Deployment', priority: 'medium' },
    { id: uuid(), description: 'Knowledge Transfer & Training Material', referenceSection: 'Section 4.2', pageNumber: 'Page 19', phase: 'Hypercare', priority: 'medium' },
    { id: uuid(), description: 'Post-Go-Live Support Plan', referenceSection: 'Section 4.3', pageNumber: 'Page 20', phase: 'Hypercare', priority: 'low' },
  ];

  // ── IBM Offerings ─────────────────────────────────────────
  const offerings: IBMOffering[] = [
    { id: uuid(), name: 'IBM Cloud', category: 'Cloud', description: 'Scalable hybrid cloud platform for enterprise workloads', relevanceScore: lower.includes('cloud') ? 92 : 75, tags: ['IaaS', 'PaaS', 'Hybrid'] },
    { id: uuid(), name: 'IBM Watson AI', category: 'AI/ML', description: 'Enterprise AI for NLP, vision, and decision automation', relevanceScore: lower.includes('ai') || lower.includes('ml') ? 95 : 70, tags: ['NLP', 'ML', 'Automation'] },
    { id: uuid(), name: 'IBM watsonx.data', category: 'Data & Analytics', description: 'Open, hybrid, governed data lakehouse', relevanceScore: lower.includes('data') ? 90 : 65, tags: ['Data Lake', 'Governance', 'Analytics'] },
    { id: uuid(), name: 'IBM Security QRadar', category: 'Security', description: 'AI-powered SIEM for threat detection and response', relevanceScore: lower.includes('security') ? 88 : 60, tags: ['SIEM', 'Threat Detection'] },
    { id: uuid(), name: 'IBM DataStage', category: 'Integration', description: 'Enterprise ETL and data integration at scale', relevanceScore: lower.includes('integration') || lower.includes('etl') ? 85 : 58, tags: ['ETL', 'DataOps'] },
    { id: uuid(), name: 'IBM Consulting', category: 'Consulting', description: 'End-to-end transformation services with IBM expertise', relevanceScore: 80, tags: ['Strategy', 'Transformation'] },
    { id: uuid(), name: 'IBM Sterling', category: 'Integration', description: 'Supply chain and B2B integration solutions', relevanceScore: 62, tags: ['Supply Chain', 'B2B'] },
    { id: uuid(), name: 'IBM Garage', category: 'Consulting', description: 'Co-creation methodology for rapid innovation', relevanceScore: 72, tags: ['Agile', 'Innovation', 'Design Thinking'] },
    { id: uuid(), name: 'IBM OpenPages', category: 'Data & Analytics', description: 'GRC and regulatory compliance management', relevanceScore: lower.includes('compliance') ? 78 : 50, tags: ['GRC', 'Compliance'] },
    { id: uuid(), name: 'IBM Turbonomic', category: 'Cloud', description: 'AI-driven resource management for hybrid cloud', relevanceScore: 65, tags: ['FinOps', 'Resource Mgmt'] },
    { id: uuid(), name: 'IBM MQ', category: 'Integration', description: 'Reliable enterprise messaging middleware', relevanceScore: 60, tags: ['Messaging', 'Middleware'] },
    { id: uuid(), name: 'IBM Cognos Analytics', category: 'Data & Analytics', description: 'Self-service BI and reporting', relevanceScore: lower.includes('reporting') || lower.includes('analytics') ? 82 : 55, tags: ['BI', 'Reporting', 'Self-service'] },
  ];

  // ── Staffing Plan ─────────────────────────────────────────
  const roleConfigs: Array<{ roleName: string; band: IBMBand; count: number; hours: number }> = [
    { roleName: 'Project Manager', band: '10', count: 1, hours: 800 },
    { roleName: 'Solution Architect', band: 'D', count: 1, hours: 600 },
    { roleName: 'Senior Developer', band: '9', count: 2, hours: 960 },
    { roleName: 'Developer', band: '7B', count: 4, hours: 800 },
    { roleName: 'Junior Developer', band: '6B', count: 2, hours: 640 },
    { roleName: 'Data Engineer', band: '8', count: 2, hours: 800 },
    { roleName: 'QA Lead', band: '8', count: 1, hours: 600 },
    { roleName: 'QA Engineer', band: '7A', count: 2, hours: 500 },
    { roleName: 'Business Analyst', band: '8', count: 1, hours: 700 },
    { roleName: 'Cloud Engineer', band: '9', count: 1, hours: 640 },
    { roleName: 'Security Consultant', band: '10', count: 1, hours: 480 },
    { roleName: 'Engagement Manager', band: 'Executive', count: 1, hours: 320 },
  ];

  const staffingRoles: StaffingRole[] = roleConfigs.map(({ roleName, band, count, hours }) => {
    const { desc, rate } = IBM_BAND_RATES[band];
    const totalHours = count * hours;
    return {
      id: uuid(), roleName, band,
      levelDescription: desc,
      numberOfResources: count,
      hoursPerResource: hours,
      totalHours,
      hourlyRate: rate,
      totalCost: totalHours * rate,
    };
  });

  const totalLaborCost = staffingRoles.reduce((a, r) => a + r.totalCost, 0);
  const totalHours = staffingRoles.reduce((a, r) => a + r.totalHours, 0);
  const totalHeadcount = staffingRoles.reduce((a, r) => a + r.numberOfResources, 0);

  const staffingPlan: StaffingPlan = {
    id: uuid(), documentId: docId,
    roles: staffingRoles,
    totalHeadcount, peakHeadcount: totalHeadcount,
    totalLaborCost, totalHours,
    lastUpdated: new Date().toISOString(),
  };

  // ── Project Plan ──────────────────────────────────────────
  const phases = [
    { name: 'Discovery', dur: 3, roles: ['Project Manager', 'Business Analyst', 'Solution Architect'], del: ['Solution Architecture Document', 'Project Charter'] },
    { name: 'Design', dur: 4, roles: ['Solution Architect', 'Senior Developer', 'Data Engineer'], del: ['Data Model', 'System Design', 'UI/UX Wireframes'] },
    { name: 'Development', dur: 10, roles: ['Senior Developer', 'Developer', 'Junior Developer', 'Data Engineer'], del: ['MVP Release', 'Sprint Deliverables', 'API Documentation'] },
    { name: 'Testing', dur: 4, roles: ['QA Lead', 'QA Engineer', 'Developer'], del: ['Test Cases', 'Test Reports', 'UAT Sign-off'] },
    { name: 'Deployment', dur: 2, roles: ['Cloud Engineer', 'DevOps Engineer', 'Project Manager'], del: ['Deployment Runbook', 'Go-Live Sign-off'] },
    { name: 'Hypercare', dur: 3, roles: ['Project Manager', 'Developer', 'Business Analyst'], del: ['Support Plan', 'Training Material', 'Handover Document'] },
  ];

  let cursor = 1;
  const projectPhases = phases.map((p) => {
    const phase = {
      id: uuid(), name: p.name,
      startWeek: cursor, durationWeeks: p.dur, endWeek: cursor + p.dur - 1,
      responsibleRoles: p.roles, deliverables: p.del,
      status: 'not-started' as const,
    };
    cursor += p.dur;
    return phase;
  });

  const projectPlan: ProjectPlan = {
    id: uuid(), documentId: docId,
    projectName: 'Enterprise Digital Transformation',
    totalDurationWeeks: cursor - 1,
    phases: projectPhases,
    lastUpdated: new Date().toISOString(),
  };

  // ── Testing Strategy ──────────────────────────────────────
  const testSections = [
    { type: 'Unit' as const, scope: 'Individual component and function testing', tools: ['Jest', 'Mocha'], hours: 320, band: '7A' as IBMBand, entry: ['Code complete', 'Dev unit tests passed'], exit: ['Code coverage ≥ 80%', 'Zero critical defects'] },
    { type: 'Integration' as const, scope: 'API and service integration testing', tools: ['Postman', 'RestAssured'], hours: 240, band: '7B' as IBMBand, entry: ['Integration builds stable'], exit: ['All APIs tested', 'Zero P1 defects'] },
    { type: 'UAT' as const, scope: 'End-user acceptance testing with business stakeholders', tools: ['TestRail', 'Jira'], hours: 200, band: '8' as IBMBand, entry: ['SIT complete', 'UAT environment ready'], exit: ['UAT sign-off obtained'] },
    { type: 'Performance' as const, scope: 'Load, stress, and scalability testing', tools: ['JMeter', 'Gatling'], hours: 160, band: '8' as IBMBand, entry: ['Performance environment ready'], exit: ['Response time < 2s at peak load'] },
    { type: 'Security' as const, scope: 'Vulnerability scanning and penetration testing', tools: ['OWASP ZAP', 'Burp Suite', 'IBM AppScan'], hours: 120, band: '9' as IBMBand, entry: ['Stable build available'], exit: ['Zero critical vulnerabilities', 'Pen test report approved'] },
    { type: 'Regression' as const, scope: 'Full regression suite on every release', tools: ['Selenium', 'Cypress', 'Playwright'], hours: 180, band: '7A' as IBMBand, entry: ['Regression suite current'], exit: ['Zero new defects introduced'] },
  ];

  const testingSections = testSections.map((t) => ({
    id: uuid(), type: t.type, scope: t.scope,
    entryCriteria: t.entry, exitCriteria: t.exit,
    tools: t.tools, estimatedHours: t.hours,
    responsibleBand: t.band, enabled: true,
  }));

  const totalQAHours = testingSections.reduce((a, t) => a + t.estimatedHours, 0);

  const testingStrategy: TestingStrategy = {
    id: uuid(), documentId: docId,
    sections: testingSections,
    totalQAHours, automationCoverage: 65,
    lastUpdated: new Date().toISOString(),
  };

  // ── Estimation ────────────────────────────────────────────
  const baseRows = staffingRoles.map((r) => ({
    id: uuid(),
    activity: r.roleName,
    role: r.roleName,
    band: r.band,
    hours: r.totalHours,
    ratePerHour: r.hourlyRate,
    cost: r.totalCost,
    phase: 'All Phases',
  }));

  const phaseSubtotals = projectPhases.map((p) => ({
    phase: p.name,
    hours: Math.round(totalHours * (p.durationWeeks / (cursor - 1))),
    cost: Math.round(totalLaborCost * (p.durationWeeks / (cursor - 1))),
  }));

  const applied = applyAssumptions(totalLaborCost, baseRows, DEFAULT_COST_ASSUMPTIONS);

  const estimation: EstimationSummary = {
    id: uuid(), documentId: docId,
    rows: applied.rows,
    totalHours, totalCost: totalLaborCost,
    adjustedTotalCost: applied.adjustedTotalCost,
    costBreakdown: applied.costBreakdown,
    personDays: Math.round(totalHours / 8),
    personMonths: Math.round(totalHours / 160),
    phaseSubtotals,
    lastUpdated: new Date().toISOString(),
  };

  // ── AI Impact ─────────────────────────────────────────────
  const phaseRows = projectPhases.map((p) => {
    const phaseHours = Math.round(totalHours * (p.durationWeeks / (cursor - 1)));
    const gainPct = p.name === 'Development' ? 38 : p.name === 'Testing' ? 45 : p.name === 'Discovery' ? 20 : 30;
    const aiHours = Math.round(phaseHours * (1 - gainPct / 100));
    return {
      id: uuid(), phase: p.name, activity: `${p.name} Activities`,
      traditionalHours: phaseHours, aiAssistedHours: aiHours,
      hoursSaved: phaseHours - aiHours, productivityGainPct: gainPct,
    };
  });

  const roleRows = staffingRoles.slice(0, 8).map((r) => {
    const gainPct = r.band === 'D' || r.band === 'Executive' ? 15 :
      r.band === '10' || r.band === '9' ? 25 :
      r.band === '8' || r.band === '7B' ? 35 : 42;
    return {
      id: uuid(), role: r.roleName, band: r.band,
      traditionalFTE: r.numberOfResources,
      aiAugmentedFTE: Math.max(1, Math.round(r.numberOfResources * (1 - gainPct / 100))),
      productivityPct: gainPct,
      automationCoveragePct: gainPct + 5,
      reworkReductionPct: Math.round(gainPct * 0.4),
      accelerationFactor: Math.round((1 / (1 - gainPct / 100)) * 10) / 10,
      toolUsed: r.band === 'D' ? 'IBM watsonx' : r.band === '9' || r.band === '10' ? 'GitHub Copilot + watsonx Code' : 'watsonx Code Assistant',
    };
  });

  const totalTrad = phaseRows.reduce((a, r) => a + r.traditionalHours, 0);
  const totalAI = phaseRows.reduce((a, r) => a + r.aiAssistedHours, 0);

  const aiImpact: AIImpact = {
    id: uuid(), documentId: docId,
    phaseRows, roleRows,
    totalTraditionalHours: totalTrad,
    totalAIHours: totalAI,
    totalHoursSaved: totalTrad - totalAI,
    overallProductivityGain: Math.round((1 - totalAI / totalTrad) * 100),
    lastUpdated: new Date().toISOString(),
  };

  return {
    documentId: docId,
    scopeItems, deliverableItems, offerings,
    projectPlan, staffingPlan, testingStrategy,
    estimation, aiImpact,
    generatedAt: new Date().toISOString(),
  };
}
