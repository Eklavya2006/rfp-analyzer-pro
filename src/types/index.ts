// ============================================================
// RFP Analyzer Pro — Core Type Definitions (v4)
// ============================================================

export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'error';

export type TabId =
  | 'document-analyzer'
  | 'dashboard'
  | 'scope'
  | 'offerings'
  | 'project-plan'
  | 'staffing'
  | 'testing'
  | 'estimation'
  | 'agentic-impact'
  | 'proposal';

// IBM Band levels
export type IBMBand = '6A' | '6B' | '6G' | '7A' | '7B' | '8' | '9' | '10' | 'Executive' | 'D';

// Service Line for Offerings
export type ServiceLine =
  | 'Cloud & Platform Services'
  | 'Data & AI'
  | 'Security Services'
  | 'Application Modernization'
  | 'Managed Services'
  | 'General Consulting';

export interface RFPDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  status: DocumentStatus;
  uploadedAt: string;
  processedAt?: string;
  rawText?: string;
  /**
   * TASK 3: HTML representation of the document that preserves original visual
   * structure — headings, paragraphs, tables, lists, bold/italic, hyperlinks.
   * Populated for DOCX (via mammoth.convertToHtml). When present, DocumentAnalyzer
   * renders this instead of the plain-text pre-wrap view, giving a faithful
   * reproduction of the source document layout.
   */
  rawHtml?: string;
  summary?: DocumentSummary;
  extractedSections?: ExtractedSections;
  errorMessage?: string;
}

export interface DocumentSummary {
  title: string;
  client: string;
  projectDescription: string;
  estimatedBudget?: string;
  estimatedTimeline?: string;
  keyRequirements: string[];
  technologies: string[];
  deliverables: string[];
  constraints: string[];
  evaluationCriteria: string[];
  wordCount: number;
  pageCount: number;
  confidenceScore: number;
}

export interface ExtractedSections {
  scope: string;
  objectives: string;
  timeline: string;
  budget: string;
  technicalRequirements: string;
  teamRequirements: string;
  evaluationCriteria: string;
  risks: string;
  deliverables: string;
}

// ============================================================
// Scope & Deliverables
// ============================================================
export interface ScopeItem {
  id: string;
  description: string;
  referenceSection: string;
  pageNumber: string;
  category: 'in-scope' | 'out-of-scope' | 'assumption';
  /** Optional: Terms & Conditions text linked from this scope item */
  termsAndConditions?: string;
  /** Optional: Penalties / SLA clause linked from this scope item */
  penalties?: string;
}

export interface DeliverableItem {
  id: string;
  description: string;
  referenceSection: string;
  pageNumber: string;
  phase: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================
// Offerings / Technology
// ============================================================
export type OfferingCategory = 'Cloud' | 'AI/ML' | 'Security' | 'Integration' | 'Consulting' | 'Data & Analytics';

export interface IBMOffering {
  id: string;
  name: string;
  category: OfferingCategory;
  serviceLine: ServiceLine;
  description: string;
  relevanceScore: number; // 0-100
  tags: string[];
}

// ============================================================
// Staffing Plan (IBM Band)
// ============================================================
export interface IBMBandInfo {
  band: IBMBand;
  levelDescription: string;
  defaultHourlyRate: number;
}

// ── Monthly utilisation category ─────────────────────────────
// Drives the correct hrs/month cap per the IBM rate-card methodology:
//   Mainline Domestic / Nearshore / Landed INDIA  →  140 hrs/month (all timelines)
//   Offshore CIC Primary INDIA (≤ 12 months)      →  180 hrs/month
//   Offshore CIC Primary INDIA (> 12 months)      →  172.5 hrs/month
export type DeployCategory =
  | 'Mainline Domestic'   // onshore US/EU primary resource
  | 'Nearshore'           // nearshore primary (140 h/mo always)
  | 'Offshore CIC'        // offshore CIC primary – India (180 / 172.5)
  | 'Landed India';       // landed India resource (140 h/mo always)

export interface StaffingRole {
  id: string;
  roleName: string;
  band: IBMBand;
  levelDescription: string;
  numberOfResources: number;
  hoursPerResource: number;
  totalHours: number;
  hourlyRate: number;
  totalCost: number;
  phase?: string;
  weeklyHours?: number;
  /** Optional: overrides the deploy-type in the Staffing table for utilisation calc */
  deployCategory?: DeployCategory;
}

export interface StaffingPlan {
  id: string;
  documentId: string;
  roles: StaffingRole[];
  totalHeadcount: number;
  peakHeadcount: number;
  totalLaborCost: number;
  totalHours: number;
  lastUpdated: string;
}

// ============================================================
// Project Plan
// ============================================================
export interface ProjectPhase {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  milestones?: string[];
  startWeek: number;
  durationWeeks: number;
  endWeek: number;
  responsibleRoles: string[];
  deliverables: string[];
  status: 'not-started' | 'in-progress' | 'completed';
}

export interface ProjectPlan {
  id: string;
  documentId: string;
  projectName: string;
  totalDurationWeeks: number;
  phases: ProjectPhase[];
  lastUpdated: string;
}

// ============================================================
// Testing Strategy
// ============================================================
export interface TestSection {
  id: string;
  type: 'Unit' | 'Integration' | 'UAT' | 'Performance' | 'Security' | 'Regression';
  scope: string;
  entryCriteria: string[];
  exitCriteria: string[];
  tools: string[];
  estimatedHours: number;
  responsibleBand: IBMBand;
  enabled: boolean;
}

export interface TestingStrategy {
  id: string;
  documentId: string;
  sections: TestSection[];
  totalQAHours: number;
  automationCoverage: number;
  lastUpdated: string;
}

// ============================================================
// Estimation + Cost Assumptions
// ============================================================

export interface CostAssumptions {
  rateMultiplier: number;
  contingencyPct: number;
  infrastructurePct: number;
  overheadPct: number;
  travelPct: number;
  licensingFlatUSD: number;
}

export const DEFAULT_COST_ASSUMPTIONS: CostAssumptions = {
  rateMultiplier: 1.0,
  contingencyPct: 10,
  infrastructurePct: 8,
  overheadPct: 12,
  travelPct: 3,
  licensingFlatUSD: 0,
};

export interface EstimationRow {
  id: string;
  activity: string;
  role: string;
  band: IBMBand;
  hours: number;
  ratePerHour: number;
  cost: number;
  phase: string;
}

export interface EstimationSummary {
  id: string;
  documentId: string;
  rows: EstimationRow[];
  totalHours: number;
  totalCost: number;
  adjustedTotalCost: number;
  costBreakdown: CostBreakdown;
  personDays: number;
  personMonths: number;
  phaseSubtotals: Array<{ phase: string; hours: number; cost: number }>;
  lastUpdated: string;
}

export interface CostBreakdown {
  baseLaborCost: number;
  contingencyAmount: number;
  infrastructureAmount: number;
  overheadAmount: number;
  travelAmount: number;
  licensingAmount: number;
  totalAdjustedCost: number;
}

// ============================================================
// Agentic Impact (formerly AI Impact)
// ============================================================
export interface AIPhaseRow {
  id: string;
  phase: string;
  activity: string;
  traditionalHours: number;
  aiAssistedHours: number;
  hoursSaved: number;
  productivityGainPct: number;
}

export interface AIRoleRow {
  id: string;
  role: string;
  band: IBMBand;
  traditionalFTE: number;
  aiAugmentedFTE: number;
  productivityPct: number;
  automationCoveragePct: number;
  reworkReductionPct: number;
  accelerationFactor: number;
  toolUsed: string;
  agentName?: string;
  modelName?: string;
  tokenUsage?: number;
  costPerRun?: number;
}

export interface AIImpact {
  id: string;
  documentId: string;
  phaseRows: AIPhaseRow[];
  roleRows: AIRoleRow[];
  totalTraditionalHours: number;
  totalAIHours: number;
  totalHoursSaved: number;
  overallProductivityGain: number;
  lastUpdated: string;
}

// ============================================================
// Global Analysis Result
// ============================================================
export interface AnalysisResult {
  documentId: string;
  scopeItems?: ScopeItem[];
  deliverableItems?: DeliverableItem[];
  offerings?: IBMOffering[];
  projectPlan?: ProjectPlan;
  staffingPlan?: StaffingPlan;
  testingStrategy?: TestingStrategy;
  estimation?: EstimationSummary;
  aiImpact?: AIImpact;
  generatedAt: string;
}

// Popup notification
export interface ChangeNotification {
  id: string;
  sourceModule: string;
  affectedModules: string[];
  message: string;
  pendingUpdate: () => void;
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  unit?: string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}
