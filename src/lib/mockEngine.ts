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
import { extractTimelineAndSupportEvents } from '@/lib/parser';

function extractMilestoneWeeks(text: string, fallbackTotalWeeks: number): number[] {
  const milestoneMatch = text.match(/key milestones? at weeks?\s+([^.!?\n]+)/i);
  if (!milestoneMatch?.[1]) return [];

  const parsedWeeks = milestoneMatch[1]
    .match(/\d+/g)
    ?.map((value) => Number(value))
    .filter((value, index, values) => Number.isFinite(value) && value > 0 && value <= fallbackTotalWeeks * 2 && values.indexOf(value) === index)
    .sort((a, b) => a - b);

  return parsedWeeks ?? [];
}

function milestoneLabel(week: number, totalWeeks: number, phaseName: string): string {
  const lowerPhase = phaseName.toLowerCase();
  const isLast = week >= totalWeeks;

  if (week <= 4 || lowerPhase.includes('discovery')) return 'Kickoff Complete';
  if (lowerPhase.includes('design')) return 'Architecture Approved';
  if (lowerPhase.includes('development')) return week >= Math.round(totalWeeks * 0.45) ? 'MVP Feature Complete' : 'Sprint Demo';
  if (lowerPhase.includes('testing')) return week >= Math.round(totalWeeks * 0.7) ? 'UAT Sign-off' : 'SIT Complete';
  if (lowerPhase.includes('deployment') || isLast) return 'Production Go-Live';
  if (lowerPhase.includes('hypercare')) return 'Hypercare Closure';
  return `Milestone W${week}`;
}

// Default milestones per phase name when none are extracted from document text.
const PHASE_DEFAULT_MILESTONES: Record<string, string[]> = {
  discovery:   ['Kickoff Complete', 'Requirements Baselined'],
  design:      ['Architecture Approved', 'Design Sign-off'],
  development: ['Sprint 1 Demo', 'MVP Feature Complete'],
  testing:     ['SIT Complete', 'UAT Sign-off'],
  deployment:  ['Production Go-Live'],
  hypercare:   ['Hypercare Closure', 'Project Handover'],
};

function defaultMilestonesForPhase(phaseName: string): string[] {
  const lower = phaseName.toLowerCase();
  for (const [key, milestones] of Object.entries(PHASE_DEFAULT_MILESTONES)) {
    if (lower.includes(key)) return milestones;
  }
  return [`${phaseName} Complete`];
}

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

// ── Extract a short description for a given section tag from raw text ──
function extractSectionDesc(text: string, sectionTag: string, fallback: string): string {
  // Try to find the section heading and grab the first substantive sentence after it
  const tagLower = sectionTag.toLowerCase().replace('section ', '');
  // patterns: "2.1", "section 2.1", "2.1.", etc.
  const patterns = [
    new RegExp(`(?:section\\s*)?${tagLower.replace('.', '\\.')}[:\\s.]+([^\\n.]{15,120})`, 'i'),
    new RegExp(`(?:section\\s*)?${tagLower.replace('.', '\\.')}\\s*[:\\-–]?\\s*([^\\n]{15,120})`, 'i'),
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m?.[1]) {
      const desc = m[1].trim().replace(/\s+/g, ' ');
      if (desc.length > 10) return desc.charAt(0).toUpperCase() + desc.slice(1);
    }
  }
  // Try keyword-based extraction
  const keywordMap: Record<string, string[]> = {
    cloud:        ['cloud', 'infrastructure', 'migration', 'hybrid'],
    ai:           ['ai', 'ml', 'machine learning', 'watson', 'artificial intelligence'],
    data:         ['data', 'etl', 'pipeline', 'lakehouse', 'integration'],
    security:     ['security', 'compliance', 'siem', 'qradar'],
    training:     ['training', 'change management', 'knowledge transfer'],
    saas:         ['saas', 'licensing', 'third-party'],
    hardware:     ['hardware', 'procurement', 'equipment'],
    legacy:       ['legacy', 'existing data', 'data quality'],
    architecture: ['architecture', 'design', 'blueprint'],
    mvp:          ['mvp', 'platform', 'release', 'deployment'],
    testing:      ['test', 'uat', 'qa', 'quality'],
    support:      ['support', 'hypercare', 'post-go-live', 'maintenance'],
  };
  const lower = text.toLowerCase();
  for (const [, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(k => fallback.toLowerCase().includes(k))) {
      // Find a sentence in the doc containing the keyword
      for (const kw of keywords) {
        const idx = lower.indexOf(kw);
        if (idx >= 0) {
          const start = Math.max(0, lower.lastIndexOf('\n', idx) + 1);
          const end   = Math.min(lower.length, lower.indexOf('\n', idx + kw.length));
          const snippet = text.slice(start, end > start ? end : start + 120).trim().replace(/\s+/g, ' ');
          if (snippet.length > 15) return snippet.charAt(0).toUpperCase() + snippet.slice(1);
        }
      }
    }
  }
  return fallback;
}

export function runFullAnalysis(docId: string, text: string): AnalysisResult {
  const lower = text.toLowerCase();

  // ── Scope Items — descriptions populated from document text ──
  const scopeItems: ScopeItem[] = [
    { id: uuid(), description: extractSectionDesc(text, 'Section 2.1', lower.includes('cloud') ? 'Cloud infrastructure setup and migration' : 'Not found in document'), referenceSection: 'Section 2.1', pageNumber: 'Page 4', category: 'in-scope' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 2.3', lower.includes('ai') || lower.includes('ml') ? 'AI/ML model development and training' : 'Not found in document'), referenceSection: 'Section 2.3', pageNumber: 'Page 7', category: 'in-scope' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 3.1', lower.includes('data') || lower.includes('etl') ? 'Data integration and ETL pipeline development' : 'Not found in document'), referenceSection: 'Section 3.1', pageNumber: 'Page 10', category: 'in-scope' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 3.4', lower.includes('security') ? 'Security implementation and compliance' : 'Not found in document'), referenceSection: 'Section 3.4', pageNumber: 'Page 14', category: 'in-scope' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 4.2', lower.includes('training') || lower.includes('change') ? 'End-user training and change management' : 'Not found in document'), referenceSection: 'Section 4.2', pageNumber: 'Page 18', category: 'in-scope' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 5.1', 'Third-party SaaS licensing'), referenceSection: 'Section 5.1', pageNumber: 'Page 22', category: 'out-of-scope' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 5.2', 'Hardware procurement'), referenceSection: 'Section 5.2', pageNumber: 'Page 23', category: 'out-of-scope' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 6.1', 'Existing legacy data is clean and accessible'), referenceSection: 'Section 6.1', pageNumber: 'Page 26', category: 'assumption' },
  ];

  // ── Deliverables — descriptions populated from document text ──
  const deliverableItems: DeliverableItem[] = [
    { id: uuid(), description: extractSectionDesc(text, 'Section 2.1', lower.includes('architecture') ? 'Solution Architecture Document' : 'Not found in document'), referenceSection: 'Section 2.1', pageNumber: 'Page 5', phase: 'Discovery', priority: 'high' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 2.3', lower.includes('data') ? 'Data Model & Schema Design' : 'Not found in document'), referenceSection: 'Section 2.3', pageNumber: 'Page 8', phase: 'Design', priority: 'high' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 3.1', lower.includes('mvp') || lower.includes('platform') ? 'MVP Release — Core Platform' : 'Not found in document'), referenceSection: 'Section 3.1', pageNumber: 'Page 11', phase: 'Development', priority: 'high' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 3.3', lower.includes('test') ? 'Test Strategy & Test Cases' : 'Not found in document'), referenceSection: 'Section 3.3', pageNumber: 'Page 13', phase: 'Testing', priority: 'medium' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 3.4', lower.includes('uat') ? 'UAT Sign-off Report' : 'Not found in document'), referenceSection: 'Section 3.4', pageNumber: 'Page 15', phase: 'Testing', priority: 'high' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 4.1', lower.includes('deployment') ? 'Production Deployment Runbook' : 'Not found in document'), referenceSection: 'Section 4.1', pageNumber: 'Page 17', phase: 'Deployment', priority: 'medium' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 4.2', lower.includes('training') || lower.includes('knowledge') ? 'Knowledge Transfer & Training Material' : 'Not found in document'), referenceSection: 'Section 4.2', pageNumber: 'Page 19', phase: 'Hypercare', priority: 'medium' },
    { id: uuid(), description: extractSectionDesc(text, 'Section 4.3', lower.includes('support') ? 'Post-Go-Live Support Plan' : 'Not found in document'), referenceSection: 'Section 4.3', pageNumber: 'Page 20', phase: 'Hypercare', priority: 'low' },
  ];

  // ── IBM Offerings ─────────────────────────────────────────
  const offerings: IBMOffering[] = [
    { id: uuid(), name: 'IBM Cloud', category: 'Cloud', serviceLine: 'Cloud & Platform Services', description: 'Scalable hybrid cloud platform for enterprise workloads', relevanceScore: lower.includes('cloud') ? 92 : 75, tags: ['IaaS', 'PaaS', 'Hybrid'] },
    { id: uuid(), name: 'IBM Watson AI', category: 'AI/ML', serviceLine: 'Data & AI', description: 'Enterprise AI for NLP, vision, and decision automation', relevanceScore: lower.includes('ai') || lower.includes('ml') ? 95 : 70, tags: ['NLP', 'ML', 'Automation'] },
    { id: uuid(), name: 'IBM watsonx.data', category: 'Data & Analytics', serviceLine: 'Data & AI', description: 'Open, hybrid, governed data lakehouse', relevanceScore: lower.includes('data') ? 90 : 65, tags: ['Data Lake', 'Governance', 'Analytics'] },
    { id: uuid(), name: 'IBM Security QRadar', category: 'Security', serviceLine: 'Security Services', description: 'AI-powered SIEM for threat detection and response', relevanceScore: lower.includes('security') ? 88 : 60, tags: ['SIEM', 'Threat Detection'] },
    { id: uuid(), name: 'IBM DataStage', category: 'Integration', serviceLine: 'Application Modernization', description: 'Enterprise ETL and data integration at scale', relevanceScore: lower.includes('integration') || lower.includes('etl') ? 85 : 58, tags: ['ETL', 'DataOps'] },
    { id: uuid(), name: 'IBM Consulting', category: 'Consulting', serviceLine: 'General Consulting', description: 'End-to-end transformation services with IBM expertise', relevanceScore: 80, tags: ['Strategy', 'Transformation'] },
    { id: uuid(), name: 'IBM Sterling', category: 'Integration', serviceLine: 'Application Modernization', description: 'Supply chain and B2B integration solutions', relevanceScore: 62, tags: ['Supply Chain', 'B2B'] },
    { id: uuid(), name: 'IBM Garage', category: 'Consulting', serviceLine: 'General Consulting', description: 'Co-creation methodology for rapid innovation', relevanceScore: 72, tags: ['Agile', 'Innovation', 'Design Thinking'] },
    { id: uuid(), name: 'IBM OpenPages', category: 'Data & Analytics', serviceLine: 'Managed Services', description: 'GRC and regulatory compliance management', relevanceScore: lower.includes('compliance') ? 78 : 50, tags: ['GRC', 'Compliance'] },
    { id: uuid(), name: 'IBM Turbonomic', category: 'Cloud', serviceLine: 'Cloud & Platform Services', description: 'AI-driven resource management for hybrid cloud', relevanceScore: 65, tags: ['FinOps', 'Resource Mgmt'] },
    { id: uuid(), name: 'IBM MQ', category: 'Integration', serviceLine: 'Application Modernization', description: 'Reliable enterprise messaging middleware', relevanceScore: 60, tags: ['Messaging', 'Middleware'] },
    { id: uuid(), name: 'IBM Cognos Analytics', category: 'Data & Analytics', serviceLine: 'Data & AI', description: 'Self-service BI and reporting', relevanceScore: lower.includes('reporting') || lower.includes('analytics') ? 82 : 55, tags: ['BI', 'Reporting', 'Self-service'] },
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

  // ── Timeline & Support Events — extracted FIRST so plan can use them ──
  const { timelineEvents, supportEvents } = extractTimelineAndSupportEvents(text);

  // ── Project Plan ──────────────────────────────────────────
  // If the document contains an explicit project duration, scale the phases
  // proportionally so that plan.totalDurationWeeks == docTimeline.weeks.
  // This keeps Dashboard Timeline tile, Project Plan Gantt, Staffing headcount
  // curve, Estimation person-months, and AI Impact all in sync.
  // If the document only mentioned duration on a hypercare/support line (single duration),
  // the parser can't split it — treat the largest support event as the project timeline
  // when timelineEvents is empty and the support event is larger than typical HC (>8 weeks).
  const resolvedTimelineEvents = timelineEvents.length > 0
    ? timelineEvents
    : supportEvents.length > 0 && (supportEvents[0]?.weeks ?? 0) > 8
      ? [] // leave empty; we'll use plan default — don't misclassify a true HC value
      : [];

  const docTimelineWeeks = resolvedTimelineEvents[0]?.weeks ?? timelineEvents[0]?.weeks ?? 0;
  const docHypercareWeeks = (() => {
    const ev = supportEvents.find(e => e.kind === 'hypercare')
            ?? supportEvents.find(e => e.kind === 'support')
            ?? supportEvents[0];
    // Never let hypercare weeks equal the full project timeline weeks
    const w = ev?.weeks ?? 0;
    return (docTimelineWeeks > 0 && w >= docTimelineWeeks) ? 0 : w;
  })();

  // Base phase proportions (must sum to 1.0)
  const BASE_PHASES = [
    { name: 'Discovery',   pct: 0.115, roles: ['Project Manager', 'Business Analyst', 'Solution Architect'], del: ['Solution Architecture Document', 'Project Charter'] },
    { name: 'Design',      pct: 0.154, roles: ['Solution Architect', 'Senior Developer', 'Data Engineer'],   del: ['Data Model', 'System Design', 'UI/UX Wireframes'] },
    { name: 'Development', pct: 0.385, roles: ['Senior Developer', 'Developer', 'Junior Developer', 'Data Engineer'], del: ['MVP Release', 'Sprint Deliverables', 'API Documentation'] },
    { name: 'Testing',     pct: 0.154, roles: ['QA Lead', 'QA Engineer', 'Developer'],                        del: ['Test Cases', 'Test Reports', 'UAT Sign-off'] },
    { name: 'Deployment',  pct: 0.077, roles: ['Cloud Engineer', 'DevOps Engineer', 'Project Manager'],       del: ['Deployment Runbook', 'Go-Live Sign-off'] },
    { name: 'Hypercare',   pct: 0.115, roles: ['Project Manager', 'Developer', 'Business Analyst'],           del: ['Support Plan', 'Training Material', 'Handover Document'] },
  ];
  // Default total: 26 weeks (matches the percentages above: 3+4+10+4+2+3)
  const DEFAULT_TOTAL_WEEKS = 26;

  // Compute actual delivery weeks (exclude hypercare from the doc timeline since
  // the doc reports them separately — only apply if both are available).
  const deliveryWeeks = docTimelineWeeks > 0
    ? (docHypercareWeeks > 0 && docTimelineWeeks > docHypercareWeeks
        ? docTimelineWeeks - docHypercareWeeks  // delivery only
        : docTimelineWeeks)                      // delivery incl. hypercare
    : DEFAULT_TOTAL_WEEKS - (docHypercareWeeks > 0 ? 0 : 3);

  const totalProjectWeeksNoHC = deliveryWeeks;
  const hypercareWeeks        = docHypercareWeeks > 0 ? docHypercareWeeks : 3;

  // Scale non-hypercare phases to fill deliveryWeeks; hypercare gets its own bucket.
  const nonHCPctSum = BASE_PHASES.filter(p => p.name !== 'Hypercare').reduce((s, p) => s + p.pct, 0);
  const phases = BASE_PHASES.map((p) => {
    const dur = p.name === 'Hypercare'
      ? hypercareWeeks
      : Math.max(1, Math.round((p.pct / nonHCPctSum) * totalProjectWeeksNoHC));
    return { ...p, dur };
  });

  const totalProjectWeeks = phases.reduce((sum, p) => sum + p.dur, 0);
  const extractedMilestoneWeeks = extractMilestoneWeeks(text, totalProjectWeeks);

  let cursor = 1;
  const projectPhases = phases.map((p) => {
    const startWeek = cursor;
    const endWeek = cursor + p.dur - 1;
    // Use extracted milestone weeks if the document contains them; fall back to
    // sensible per-phase defaults so the KPI card never shows 0.
    const extractedForPhase = extractedMilestoneWeeks
      .filter((week) => week >= startWeek && week <= endWeek)
      .map((week) => milestoneLabel(week, totalProjectWeeks, p.name));
    const milestones = extractedForPhase.length > 0
      ? extractedForPhase
      : defaultMilestonesForPhase(p.name);

    const phase = {
      id: uuid(), name: p.name,
      startWeek, durationWeeks: p.dur, endWeek,
      responsibleRoles: p.roles, deliverables: p.del, milestones,
      status: 'not-started' as const,
    };
    cursor += p.dur;
    return phase;
  });

  // delivery weeks = all phases except Hypercare
  const deliveryOnlyWeeks = phases
    .filter(p => p.name !== 'Hypercare')
    .reduce((s, p) => s + p.dur, 0);

  const projectPlan: ProjectPlan = {
    id: uuid(), documentId: docId,
    projectName: 'Enterprise Digital Transformation',
    totalDurationWeeks: deliveryOnlyWeeks,   // delivery only — no Hypercare
    hypercareWeeks: hypercareWeeks,           // stored separately
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

  // ── Person-months — use IBM rate-card monthly hours, not the legacy 160 ──
  // We apply the IBM methodology:
  //   Domestic / Nearshore / Landed India  → 140 h/mo
  //   Offshore CIC India, ≤12 mo           → 180 h/mo
  //   Offshore CIC India, >12 mo           → 172.5 h/mo
  //
  // At generation time we don't yet know each role's deploy-type override
  // (that is stored in StaffingPlan UI state), so we use a conservative
  // blended benchmark of 140 h/mo (the Domestic/Nearshore baseline) for the
  // top-level summary displayed in the Estimation and Dashboard tiles.
  // The Staffing Plan table recalculates per-role utilisation live using the
  // actual deploy-type selected there.
  const PERSON_MONTH_HRS = 140; // IBM Domestic/Nearshore primary baseline
  const estimation: EstimationSummary = {
    id: uuid(), documentId: docId,
    rows: applied.rows,
    totalHours, totalCost: totalLaborCost,
    adjustedTotalCost: applied.adjustedTotalCost,
    costBreakdown: applied.costBreakdown,
    personDays: Math.round(totalHours / 8),
    personMonths: Math.round(totalHours / PERSON_MONTH_HRS),
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
    timelineEvents,
    supportEvents,
    generatedAt: new Date().toISOString(),
  };
}
