// ============================================================
// RFP Analyzer Pro — Core Type Definitions
// ============================================================

export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface RFPDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  status: DocumentStatus;
  uploadedAt: string;
  processedAt?: string;
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
// Cost Estimation Types
// ============================================================
export interface CostAssumptions {
  hourlyRates: Record<string, number>;
  teamComposition: Record<string, number>; // role -> headcount
  projectDurationWeeks: number;
  contingencyPercent: number;
  infrastructureMonthlyCost: number;
  overheadPercent: number;
  licensesCost: number;
  travelCost: number;
}

export interface CostPhase {
  id: string;
  name: string;
  durationWeeks: number;
  roles: Record<string, number>; // role -> hours
  cost: number;
}

export interface CostBreakdown {
  totalCost: number;
  laborCost: number;
  infrastructureCost: number;
  licensesCost: number;
  travelCost: number;
  contingencyCost: number;
  overheadCost: number;
  phases: CostPhase[];
  byRole: Array<{ role: string; hours: number; cost: number; percentage: number }>;
  byCategory: Array<{ category: string; cost: number; percentage: number }>;
  assumptions: CostAssumptions;
  lastCalculated: string;
}

// ============================================================
// Project Plan Types
// ============================================================
export interface ProjectMilestone {
  id: string;
  name: string;
  description: string;
  dueWeek: number;
  deliverables: string[];
  isCritical: boolean;
}

export interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  startWeek: number;
  durationWeeks: number;
  dependencies: string[];
  milestones: ProjectMilestone[];
  deliverables: string[];
  team: string[];
  status: 'not-started' | 'in-progress' | 'completed';
  completionPercent: number;
}

export interface ProjectPlan {
  id: string;
  documentId: string;
  projectName: string;
  startDate: string;
  totalDurationWeeks: number;
  phases: ProjectPhase[];
  assumptions: string[];
  risks: string[];
  lastUpdated: string;
}

// ============================================================
// Staffing Plan Types
// ============================================================
export interface StaffingRole {
  id: string;
  title: string;
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'principal';
  headcount: number;
  allocationPercent: number;
  startWeek: number;
  endWeek: number;
  rampUpWeeks: number;
  rampDownWeeks: number;
  skills: string[];
  hourlyRate: number;
}

export interface StaffingWeekData {
  week: number;
  totalHeadcount: number;
  byRole: Record<string, number>;
  totalCost: number;
}

export interface StaffingPlan {
  id: string;
  documentId: string;
  roles: StaffingRole[];
  weeklyData: StaffingWeekData[];
  totalHeadcount: number;
  peakHeadcount: number;
  totalLaborCost: number;
  assumptions: string[];
  lastUpdated: string;
}

// ============================================================
// Testing Strategy Types
// ============================================================
export interface TestType {
  id: string;
  name: string;
  category: 'functional' | 'non-functional' | 'automation' | 'security' | 'performance';
  scope: string;
  estimatedHours: number;
  automationFeasibility: 'high' | 'medium' | 'low';
  priority: 'critical' | 'high' | 'medium' | 'low';
  tools: string[];
}

export interface TestEnvironment {
  name: string;
  purpose: string;
  infrastructure: string;
  dataSets: string[];
}

export interface TestingStrategy {
  id: string;
  documentId: string;
  testTypes: TestType[];
  environments: TestEnvironment[];
  totalQAHours: number;
  automationCoverage: number;
  qaCostEstimate: number;
  entryCriteria: string[];
  exitCriteria: string[];
  risks: string[];
  staffingRecommendation: Array<{ role: string; count: number; weeks: number }>;
  phaseDistribution: Array<{ phase: string; hours: number; percentage: number }>;
  qualityMetrics: Array<{ metric: string; target: string; current: string }>;
  lastUpdated: string;
}

// ============================================================
// AI Comparison Types
// ============================================================
export interface AIUseCase {
  id: string;
  area: string;
  description: string;
  tools: string[];
  effortReduction: number; // percentage
  costImpact: number; // percentage (negative = savings)
  qualityImpact: 'high-improvement' | 'moderate-improvement' | 'neutral' | 'risk';
  speedImprovement: number; // percentage
  automationOpportunity: 'high' | 'medium' | 'low';
  limitations: string[];
  maturityLevel: 'proven' | 'emerging' | 'experimental';
}

export interface AIScenario {
  totalCostBaseline: number;
  totalCostAIAugmented: number;
  totalEffortBaselineHours: number;
  totalEffortAIHours: number;
  timelineBaselineWeeks: number;
  timelineAIWeeks: number;
  qualityScoreBaseline: number;
  qualityScoreAI: number;
  costSavingsPercent: number;
  effortSavingsPercent: number;
  timelineSavingsPercent: number;
}

export interface AIComparison {
  id: string;
  documentId: string;
  useCases: AIUseCase[];
  baseline: AIScenario;
  aiAugmented: AIScenario;
  assumptions: string[];
  limitations: string[];
  recommendations: string[];
  lastUpdated: string;
}

// ============================================================
// App State Types
// ============================================================
export interface AnalysisResult {
  documentId: string;
  costBreakdown?: CostBreakdown;
  projectPlan?: ProjectPlan;
  staffingPlan?: StaffingPlan;
  testingStrategy?: TestingStrategy;
  aiComparison?: AIComparison;
  generatedAt: string;
}

export interface AppState {
  documents: RFPDocument[];
  activeDocumentId: string | null;
  analysisResults: Record<string, AnalysisResult>;
  isLoading: boolean;
  error: string | null;
}

export type TabId = 'dashboard' | 'upload' | 'cost' | 'plan' | 'staffing' | 'testing' | 'ai-comparison';

export interface DashboardMetric {
  label: string;
  value: string | number;
  unit?: string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}
