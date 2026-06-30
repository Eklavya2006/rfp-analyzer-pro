import type { StateCreator } from 'zustand';
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  RFPDocument,
  AnalysisResult,
  TabId,
  StaffingRole,
  TestSection,
  ChangeNotification,
  CostAssumptions,
  EstimationSummary,
  CostBreakdown,
  ProjectPhase,
  StaffingPlan,
  ProjectPlan,
  HistoricalInsightsBundle,
  CurrentEngagementDescriptor,
  HistoricalEngagement,
} from '@/types';
import { DEFAULT_COST_ASSUMPTIONS } from '@/types';
import {
  HistoricalEngagementService,
  buildDescriptorFromAnalysis,
} from '@/lib/engines/historicalEngagementEngine';

interface RFPStore {
  documents: RFPDocument[];
  activeDocumentId: string | null;
  activeTab: TabId;
  analysisResults: Record<string, AnalysisResult>;
  costAssumptions: Record<string, CostAssumptions>;
  isProcessing: boolean;
  processingMessage: string;
  error: string | null;
  sidebarOpen: boolean;
  pendingNotification: ChangeNotification | null;
  docScrollTarget: { section: string; page: string; scopeItemId: string } | null;
  activeScopeItemId: string | null;
  /** Historical insights bundles keyed by documentId. */
  historicalInsights: Record<string, HistoricalInsightsBundle>;
  /** Whether historical insights are currently being computed. */
  isComputingInsights: boolean;
  addDocument: (doc: RFPDocument) => void;
  updateDocument: (id: string, updates: Partial<RFPDocument>) => void;
  setActiveDocument: (id: string | null) => void;
  setActiveTab: (tab: TabId) => void;
  setAnalysisResult: (documentId: string, result: AnalysisResult) => void;
  setProcessing: (isProcessing: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  toggleSidebar: () => void;
  reset: () => void;
  showNotification: (n: Omit<ChangeNotification, 'id'>) => void;
  confirmNotification: () => void;
  cancelNotification: () => void;
  setDocScrollTarget: (target: { section: string; page: string; scopeItemId: string } | null) => void;
  setActiveScopeItemId: (id: string | null) => void;
  updateCostAssumptions: (docId: string, assumptions: Partial<CostAssumptions>) => void;
  resetCostAssumptions: (docId: string) => void;
  updateStaffingRole: (docId: string, roleId: string, updates: Partial<StaffingRole>) => void;
  addStaffingRole: (docId: string, role: StaffingRole) => void;
  removeStaffingRole: (docId: string, roleId: string) => void;
  toggleTestSection: (docId: string, sectionId: string, enabled: boolean) => void;
  addTestSection: (docId: string, section: TestSection) => void;
  removeTestSection: (docId: string, sectionId: string) => void;
  updateTestCriteria: (docId: string, sectionId: string, type: 'entry' | 'exit', index: number, value: string) => void;
  addTestCriterion: (docId: string, sectionId: string, type: 'entry' | 'exit') => void;
  removeTestCriterion: (docId: string, sectionId: string, type: 'entry' | 'exit', index: number) => void;
  updateProjectPhase: (docId: string, phaseId: string, updates: Partial<ProjectPhase>) => void;
  addProjectPhase: (docId: string, phase: ProjectPhase) => void;
  insertProjectPhase: (docId: string, phase: ProjectPhase, afterIndex: number) => void;
  removeProjectPhase: (docId: string, phaseId: string) => void;
  updateTestHours: (docId: string, sectionId: string, hours: number) => void;
  /**
   * Compute and store the HistoricalInsightsBundle for the given document.
   * Fetches live Salesforce engagements from /api/engagements; falls back
   * to the built-in seed dataset when the API is unavailable or unconfigured.
   * Async — sets isComputingInsights while in flight.
   */
  computeHistoricalInsights: (docId: string) => Promise<void>;
  /** Set a pre-computed insights bundle directly (e.g. for tests). */
  setHistoricalInsights: (docId: string, bundle: HistoricalInsightsBundle) => void;
}

const initialState = {
  documents: [],
  activeDocumentId: null,
  activeTab: 'document-analyzer' as TabId,
  analysisResults: {},
  costAssumptions: {},
  isProcessing: false,
  processingMessage: '',
  error: null,
  sidebarOpen: true,
  pendingNotification: null,
  docScrollTarget: null as { section: string; page: string; scopeItemId: string } | null,
  activeScopeItemId: null as string | null,
  historicalInsights: {} as Record<string, HistoricalInsightsBundle>,
  isComputingInsights: false,
};

export function applyAssumptions(
  baseLaborCost: number,
  baseRows: EstimationSummary['rows'],
  assumptions: CostAssumptions
): Pick<EstimationSummary, 'rows' | 'totalCost' | 'adjustedTotalCost' | 'costBreakdown'> {
  const rows = baseRows.map((r) => ({
    ...r,
    ratePerHour: Math.round(r.ratePerHour * assumptions.rateMultiplier),
    cost: Math.round(r.hours * r.ratePerHour * assumptions.rateMultiplier),
  }));
  const scaledLaborCost = rows.reduce((a, r) => a + r.cost, 0);
  const contingencyAmount = Math.round(scaledLaborCost * (assumptions.contingencyPct / 100));
  const infrastructureAmount = Math.round(scaledLaborCost * (assumptions.infrastructurePct / 100));
  const overheadAmount = Math.round(scaledLaborCost * (assumptions.overheadPct / 100));
  const travelAmount = Math.round(scaledLaborCost * (assumptions.travelPct / 100));
  const licensingAmount = assumptions.licensingFlatUSD;
  const totalAdjustedCost = scaledLaborCost + contingencyAmount + infrastructureAmount + overheadAmount + travelAmount + licensingAmount;

  const costBreakdown: CostBreakdown = {
    baseLaborCost: scaledLaborCost,
    contingencyAmount,
    infrastructureAmount,
    overheadAmount,
    travelAmount,
    licensingAmount,
    totalAdjustedCost,
  };

  return { rows, totalCost: baseLaborCost, adjustedTotalCost: totalAdjustedCost, costBreakdown };
}

function upsertAnalysisResult(
  state: Pick<RFPStore, 'analysisResults' | 'costAssumptions'>,
  documentId: string,
  result: AnalysisResult
) {
  const existingAssumptions = state.costAssumptions[documentId] ?? { ...DEFAULT_COST_ASSUMPTIONS };
  let patchedResult = result;
  if (result.estimation) {
    const applied = applyAssumptions(result.estimation.totalCost, result.estimation.rows, existingAssumptions);
    patchedResult = { ...result, estimation: { ...result.estimation, ...applied } };
  }
  return {
    analysisResults: { ...state.analysisResults, [documentId]: patchedResult },
    costAssumptions: { ...state.costAssumptions, [documentId]: existingAssumptions },
  };
}

export const useRFPStore = create<RFPStore>()((set, get) => ({
  ...initialState,
  addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
  updateDocument: (id, updates) => set((state) => ({ documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)) })),
  setActiveDocument: (id) => set({ activeDocumentId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setAnalysisResult: (documentId, result) => set((state) => upsertAnalysisResult(state, documentId, result)),
  setProcessing: (isProcessing, message = '') => set({ isProcessing, processingMessage: message }),
  setError: (error) => set({ error }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  reset: () => set(initialState),
  showNotification: (n) => set({ pendingNotification: { ...n, id: uuid() } }),
  confirmNotification: () => {
    const n = get().pendingNotification;
    if (n) {
      n.pendingUpdate();
      set({ pendingNotification: null });
    }
  },
  cancelNotification: () => set({ pendingNotification: null }),
  setDocScrollTarget: (target) => set({ docScrollTarget: target }),
  setActiveScopeItemId: (id) => set({ activeScopeItemId: id }),
  updateCostAssumptions: (docId, partial) => {
    const state = get();
    const current = state.costAssumptions[docId] ?? { ...DEFAULT_COST_ASSUMPTIONS };
    const updated = { ...current, ...partial };
    const result = state.analysisResults[docId];
    if (!result?.estimation) {
      set((s) => ({ costAssumptions: { ...s.costAssumptions, [docId]: updated } }));
      return;
    }
    const applied = applyAssumptions(result.estimation.totalCost, result.estimation.rows, updated);
    const ratio = applied.adjustedTotalCost / (result.estimation.adjustedTotalCost || result.estimation.totalCost || 1);
    const phaseSubtotals = result.estimation.phaseSubtotals.map((p) => ({ ...p, cost: Math.round(p.cost * ratio) }));
    const updatedEstimation: EstimationSummary = { ...result.estimation, ...applied, phaseSubtotals, lastUpdated: new Date().toISOString() };
    set((s) => ({
      costAssumptions: { ...s.costAssumptions, [docId]: updated },
      analysisResults: { ...s.analysisResults, [docId]: { ...result, estimation: updatedEstimation } },
    }));
  },
  resetCostAssumptions: (docId) => { get().updateCostAssumptions(docId, { ...DEFAULT_COST_ASSUMPTIONS }); },
  updateStaffingRole: (docId, roleId, updates) => mutateStaffing(docId, get, set, (roles) => roles.map((r) => r.id !== roleId ? r : { ...r, ...updates, totalHours: (r.id !== roleId ? r.totalHours : ((updates.numberOfResources ?? r.numberOfResources) * (updates.hoursPerResource ?? r.hoursPerResource))), totalCost: ((updates.numberOfResources ?? r.numberOfResources) * (updates.hoursPerResource ?? r.hoursPerResource) * (updates.hourlyRate ?? r.hourlyRate)) })),
  addStaffingRole: (docId, role) => mutateStaffing(docId, get, set, (roles) => [...roles, role]),
  removeStaffingRole: (docId, roleId) => mutateStaffing(docId, get, set, (roles) => roles.filter((r) => r.id !== roleId)),
  toggleTestSection: (docId, sectionId, enabled) => mutateTestingStrategy(docId, set, (existing) => {
    const sections = existing.testingStrategy!.sections.map((sec) => sec.id === sectionId ? { ...sec, enabled } : sec);
    return { ...existing, testingStrategy: { ...existing.testingStrategy!, sections, totalQAHours: sections.filter((section) => section.enabled).reduce((a, b) => a + b.estimatedHours, 0) } };
  }),
  addTestSection: (docId, section) => mutateTestingStrategy(docId, set, (existing) => {
    const sections = [...existing.testingStrategy!.sections, section];
    return { ...existing, testingStrategy: { ...existing.testingStrategy!, sections, totalQAHours: sections.filter((item) => item.enabled).reduce((a, b) => a + b.estimatedHours, 0) } };
  }),
  removeTestSection: (docId, sectionId) => mutateTestingStrategy(docId, set, (existing) => {
    const sections = existing.testingStrategy!.sections.filter((sec) => sec.id !== sectionId);
    return { ...existing, testingStrategy: { ...existing.testingStrategy!, sections, totalQAHours: sections.filter((item) => item.enabled).reduce((a, b) => a + b.estimatedHours, 0) } };
  }),
  updateTestCriteria: (docId, sectionId, type, index, value) => set((s) => updateAnalysisEntry(s, docId, (existing) => ({ ...existing, testingStrategy: { ...existing.testingStrategy!, sections: existing.testingStrategy!.sections.map((sec) => sec.id !== sectionId ? sec : type === 'entry' ? { ...sec, entryCriteria: sec.entryCriteria.map((criterion, i) => i === index ? value : criterion) } : { ...sec, exitCriteria: sec.exitCriteria.map((criterion, i) => i === index ? value : criterion) }) } }))),
  addTestCriterion: (docId, sectionId, type) => set((s) => updateAnalysisEntry(s, docId, (existing) => ({ ...existing, testingStrategy: { ...existing.testingStrategy!, sections: existing.testingStrategy!.sections.map((sec) => sec.id !== sectionId ? sec : type === 'entry' ? { ...sec, entryCriteria: [...sec.entryCriteria, ''] } : { ...sec, exitCriteria: [...sec.exitCriteria, ''] }) } }))),
  removeTestCriterion: (docId, sectionId, type, index) => set((s) => updateAnalysisEntry(s, docId, (existing) => ({ ...existing, testingStrategy: { ...existing.testingStrategy!, sections: existing.testingStrategy!.sections.map((sec) => sec.id !== sectionId ? sec : type === 'entry' ? { ...sec, entryCriteria: sec.entryCriteria.filter((_, i) => i !== index) } : { ...sec, exitCriteria: sec.exitCriteria.filter((_, i) => i !== index) }) } }))),
  updateProjectPhase: (docId, phaseId, updates) => set((s) => updateAnalysisEntry(s, docId, (existing) => ({ ...existing, projectPlan: recalcProjectPlan({ ...existing.projectPlan!, phases: existing.projectPlan!.phases.map((p) => p.id !== phaseId ? p : { ...p, ...updates, endWeek: (updates.startWeek ?? p.startWeek) + (updates.durationWeeks ?? p.durationWeeks) - 1 }) }) }))),
  addProjectPhase: (docId, phase) => set((s) => updateAnalysisEntry(s, docId, (existing) => ({ ...existing, projectPlan: recalcProjectPlan({ ...existing.projectPlan!, phases: [...existing.projectPlan!.phases, phase] }) }))),
  insertProjectPhase: (docId, phase, afterIndex) => set((s) => updateAnalysisEntry(s, docId, (existing) => {
    const phases = [...existing.projectPlan!.phases];
    phases.splice(afterIndex + 1, 0, phase);
    return { ...existing, projectPlan: recalcProjectPlan({ ...existing.projectPlan!, phases }) };
  })),
  removeProjectPhase: (docId, phaseId) => set((s) => updateAnalysisEntry(s, docId, (existing) => ({ ...existing, projectPlan: recalcProjectPlan({ ...existing.projectPlan!, phases: existing.projectPlan!.phases.filter((p) => p.id !== phaseId) }) }))),
  updateTestHours: (docId, sectionId, hours) => set((s) => updateAnalysisEntry(s, docId, (existing) => updateTestingHours(existing, s.costAssumptions[docId] ?? { ...DEFAULT_COST_ASSUMPTIONS }, sectionId, hours))),
  computeHistoricalInsights: async (docId) => {
    const state = get();
    const result = state.analysisResults[docId];
    if (!result) return;
    set({ isComputingInsights: true });

    // ── 1. Attempt live Salesforce fetch ─────────────────────
    let liveDataset: HistoricalEngagement[] = [];
    try {
      const res = await fetch('/api/engagements', {
        signal: AbortSignal.timeout(12_000), // 12 s timeout
      });
      if (res.ok) {
        const json: HistoricalEngagement[] = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          liveDataset = json;
        }
      }
    } catch {
      // Network error, timeout, or no credentials configured.
      // liveDataset stays [] → engine uses seed data.
    }

    // ── 2. Build descriptor from available analysis data ─────
    const descriptor: CurrentEngagementDescriptor = buildDescriptorFromAnalysis({
      rfpText:             state.documents.find((d) => d.id === docId)?.rawText ?? '',
      technologies:        result.offerings?.flatMap((o) => o.tags) ?? result.staffingPlan?.roles.map((r) => r.roleName) ?? [],
      projectDurationWeeks: result.projectPlan?.totalDurationWeeks,
      estimatedBudgetUSD:  result.estimation?.adjustedTotalCost,
    });

    // ── 3. Run similarity engine (live data if available, else seed) ──
    const bundle = HistoricalEngagementService.computeFullBundle(descriptor, {
      topN:    5,
      dataset: liveDataset.length > 0 ? liveDataset : undefined,
    });

    set((s) => ({
      historicalInsights:  { ...s.historicalInsights, [docId]: bundle },
      isComputingInsights: false,
    }));
  },
  setHistoricalInsights: (docId, bundle) =>
    set((s) => ({ historicalInsights: { ...s.historicalInsights, [docId]: bundle } })),
}));

function updateAnalysisEntry(state: RFPStore, docId: string, updater: (existing: AnalysisResult) => AnalysisResult) {
  const existing = state.analysisResults[docId];
  if (!existing) return state;
  return { analysisResults: { ...state.analysisResults, [docId]: updater(existing) } };
}

type StoreSetter = Parameters<StateCreator<RFPStore>>[0];

function mutateStaffing(docId: string, get: () => RFPStore, set: StoreSetter, mutateRoles: (roles: StaffingRole[]) => StaffingRole[]) {
  const state = get();
  const result = state.analysisResults[docId];
  if (!result?.staffingPlan) return;
  const newRoles = mutateRoles(result.staffingPlan.roles);
  const pendingUpdate = () => set((s) => updateAnalysisEntry(s, docId, (existing) => {
    const updatedPlan = recalcStaffingTotals({ ...existing.staffingPlan!, roles: newRoles });
    const assumptions = s.costAssumptions[docId] ?? { ...DEFAULT_COST_ASSUMPTIONS };
    return { ...existing, staffingPlan: updatedPlan, estimation: recalcEstimationFromStaffing(existing, updatedPlan, assumptions), projectPlan: recalcProjectPlanFromStaffing(existing, updatedPlan) };
  }));
  get().showNotification({ sourceModule: 'Staffing Plan', affectedModules: ['Project Plan → Timeline', 'Estimation → Cost & Effort'], message: 'This change will also update: Project Plan → Timeline, Estimation → Cost & Effort.', pendingUpdate });
}

function mutateTestingStrategy(docId: string, set: StoreSetter, updater: (existing: AnalysisResult) => AnalysisResult) {
  set((s) => updateAnalysisEntry(s, docId, updater));
}

function updateTestingHours(existing: AnalysisResult, assumptions: CostAssumptions, sectionId: string, hours: number): AnalysisResult {
  const sections = existing.testingStrategy!.sections.map((sec) => sec.id === sectionId ? { ...sec, estimatedHours: Math.max(0, hours) } : sec);
  const totalQAHours = sections.filter((sec) => sec.enabled).reduce((sum, sec) => sum + sec.estimatedHours, 0);
  let updatedEstimation = existing.estimation;
  if (existing.estimation) {
    const ratio = totalQAHours / (existing.testingStrategy!.totalQAHours || 1);
    const updatedRows = existing.estimation.rows.map((r) => r.phase?.toLowerCase().includes('test') || r.activity?.toLowerCase().includes('test') ? { ...r, hours: Math.round(r.hours * ratio), cost: Math.round(r.cost * ratio) } : r);
    const newTotalHours = updatedRows.reduce((a, r) => a + r.hours, 0);
    const newTotalCost = updatedRows.reduce((a, r) => a + r.cost, 0);
    updatedEstimation = { ...existing.estimation, ...applyAssumptions(newTotalCost, updatedRows, assumptions), totalHours: newTotalHours, personDays: Math.round(newTotalHours / 8), personMonths: Math.round(newTotalHours / 160), lastUpdated: new Date().toISOString() };
  }
  return { ...existing, testingStrategy: { ...existing.testingStrategy!, sections, totalQAHours, lastUpdated: new Date().toISOString() }, estimation: updatedEstimation };
}

function recalcStaffingTotals(plan: StaffingPlan): StaffingPlan {
  const totalHours = plan.roles.reduce((a, r) => a + r.totalHours, 0);
  const totalLaborCost = plan.roles.reduce((a, r) => a + r.totalCost, 0);
  const totalHeadcount = plan.roles.reduce((a, r) => a + r.numberOfResources, 0);
  return { ...plan, totalHours, totalLaborCost, totalHeadcount, peakHeadcount: totalHeadcount, lastUpdated: new Date().toISOString() };
}

function recalcEstimationFromStaffing(existing: AnalysisResult, staffing: StaffingPlan, assumptions: CostAssumptions): EstimationSummary | undefined {
  if (!existing.estimation) return existing.estimation;
  const baseRows = staffing.roles.map((r) => ({ id: r.id, activity: r.roleName, role: r.roleName, band: r.band, hours: r.totalHours, ratePerHour: r.hourlyRate, cost: r.totalCost, phase: 'All Phases' }));
  const totalHours = baseRows.reduce((a, r) => a + r.hours, 0);
  const baseLaborCost = baseRows.reduce((a, r) => a + r.cost, 0);
  const applied = applyAssumptions(baseLaborCost, baseRows, assumptions);
  const phaseSubtotals = existing.estimation.phaseSubtotals.map((p) => ({ ...p, cost: Math.round(applied.adjustedTotalCost * (p.hours / totalHours)) }));
  return { ...existing.estimation, ...applied, totalHours, phaseSubtotals, personDays: Math.round(totalHours / 8), personMonths: Math.round(totalHours / 140), lastUpdated: new Date().toISOString() };
}

function recalcProjectPlanFromStaffing(existing: AnalysisResult, staffing: StaffingPlan): ProjectPlan | undefined {
  if (!existing.projectPlan) return existing.projectPlan;
  const scaleFactor = staffing.totalHours > 0 ? staffing.totalHours / 4000 : 1;
  return recalcProjectPlan({ ...existing.projectPlan, phases: existing.projectPlan.phases.map((p) => ({ ...p, durationWeeks: Math.max(1, Math.round(p.durationWeeks * scaleFactor)) })) });
}

function recalcProjectPlan(projectPlan: ProjectPlan): ProjectPlan {
  // Preserve milestone arrays while recalculating schedule fields so Project Plan KPIs stay accurate after edits.
  let cursor = 1;
  const phases = projectPlan.phases.map((phase) => {
    const next = { ...phase, startWeek: cursor, endWeek: cursor + phase.durationWeeks - 1 };
    cursor += phase.durationWeeks;
    return next;
  });
  return { ...projectPlan, phases, totalDurationWeeks: Math.max(1, cursor - 1), lastUpdated: new Date().toISOString() };
}
