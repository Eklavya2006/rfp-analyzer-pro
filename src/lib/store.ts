import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
} from '@/types';
import { DEFAULT_COST_ASSUMPTIONS } from '@/types';

// ── Cost recalculation helper ─────────────────────────────────
export function applyAssumptions(
  baseLaborCost: number,
  baseRows: EstimationSummary['rows'],
  assumptions: CostAssumptions
): Pick<EstimationSummary, 'rows' | 'totalCost' | 'adjustedTotalCost' | 'costBreakdown'> {
  // Re-price rows by rateMultiplier
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

  const totalAdjustedCost =
    scaledLaborCost +
    contingencyAmount +
    infrastructureAmount +
    overheadAmount +
    travelAmount +
    licensingAmount;

  const costBreakdown: CostBreakdown = {
    baseLaborCost: scaledLaborCost,
    contingencyAmount,
    infrastructureAmount,
    overheadAmount,
    travelAmount,
    licensingAmount,
    totalAdjustedCost,
  };

  return {
    rows,
    totalCost: baseLaborCost,          // original unscaled base preserved
    adjustedTotalCost: totalAdjustedCost,
    costBreakdown,
  };
}

interface RFPStore {
  // Documents
  documents: RFPDocument[];
  activeDocumentId: string | null;
  activeTab: TabId;

  // Analysis results keyed by documentId
  analysisResults: Record<string, AnalysisResult>;

  // ── NEW: Cost assumption sliders per document ─────────────
  costAssumptions: Record<string, CostAssumptions>;

  // UI state
  isProcessing: boolean;
  processingMessage: string;
  error: string | null;
  sidebarOpen: boolean;

  // Cross-module notification queue
  pendingNotification: ChangeNotification | null;

  // Actions — documents
  addDocument: (doc: RFPDocument) => void;
  updateDocument: (id: string, updates: Partial<RFPDocument>) => void;
  setActiveDocument: (id: string | null) => void;
  setActiveTab: (tab: TabId) => void;
  setAnalysisResult: (documentId: string, result: AnalysisResult) => void;
  setProcessing: (isProcessing: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  toggleSidebar: () => void;
  reset: () => void;

  // Cross-module notification
  showNotification: (n: Omit<ChangeNotification, 'id'>) => void;
  confirmNotification: () => void;
  cancelNotification: () => void;

  // ── NEW: Cost assumption update ────────────────────────────
  updateCostAssumptions: (docId: string, assumptions: Partial<CostAssumptions>) => void;
  resetCostAssumptions: (docId: string) => void;

  // Staffing edits (propagate to estimation + project plan)
  updateStaffingRole: (docId: string, roleId: string, updates: Partial<StaffingRole>) => void;
  addStaffingRole: (docId: string, role: StaffingRole) => void;
  removeStaffingRole: (docId: string, roleId: string) => void;

  // Testing edits (propagate to staffing + estimation + project plan)
  toggleTestSection: (docId: string, sectionId: string, enabled: boolean) => void;
  addTestSection: (docId: string, section: TestSection) => void;
  removeTestSection: (docId: string, sectionId: string) => void;
  updateTestCriteria: (docId: string, sectionId: string, type: 'entry' | 'exit', index: number, value: string) => void;
  addTestCriterion: (docId: string, sectionId: string, type: 'entry' | 'exit') => void;
  removeTestCriterion: (docId: string, sectionId: string, type: 'entry' | 'exit', index: number) => void;

  // Project plan edits
  updateProjectPhase: (docId: string, phaseId: string, updates: Partial<ProjectPhase>) => void;
  addProjectPhase: (docId: string, phase: ProjectPhase) => void;
  removeProjectPhase: (docId: string, phaseId: string) => void;

  // Testing — editable hours (propagates to estimation + dashboard)
  updateTestHours: (docId: string, sectionId: string, hours: number) => void;
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
};

export const useRFPStore = create<RFPStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addDocument: (doc) =>
        set((state) => ({ documents: [...state.documents, doc] })),

      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),

      setActiveDocument: (id) => set({ activeDocumentId: id }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      setAnalysisResult: (documentId, result) =>
        set((state) => {
          // When a new result is set, initialise default cost assumptions if not present
          const existingAssumptions = state.costAssumptions[documentId] ?? { ...DEFAULT_COST_ASSUMPTIONS };
          // Patch in adjustedTotalCost + costBreakdown if estimation present and not yet computed
          let patchedResult = result;
          if (result.estimation) {
            const applied = applyAssumptions(
              result.estimation.totalCost,
              result.estimation.rows,
              existingAssumptions
            );
            patchedResult = {
              ...result,
              estimation: { ...result.estimation, ...applied },
            };
          }
          return {
            analysisResults: { ...state.analysisResults, [documentId]: patchedResult },
            costAssumptions: { ...state.costAssumptions, [documentId]: existingAssumptions },
          };
        }),

      setProcessing: (isProcessing, message = '') =>
        set({ isProcessing, processingMessage: message }),

      setError: (error) => set({ error }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      reset: () => set(initialState),

      // ── Notification system ─────────────────────────────────
      showNotification: (n) =>
        set({ pendingNotification: { ...n, id: uuid() } }),

      confirmNotification: () => {
        const n = get().pendingNotification;
        if (n) {
          n.pendingUpdate();
          set({ pendingNotification: null });
        }
      },

      cancelNotification: () => set({ pendingNotification: null }),

      // ── NEW: Cost assumptions ───────────────────────────────
      updateCostAssumptions: (docId, partial) => {
        const state = get();
        const current = state.costAssumptions[docId] ?? { ...DEFAULT_COST_ASSUMPTIONS };
        const updated = { ...current, ...partial };
        const result = state.analysisResults[docId];

        if (!result?.estimation) {
          set((s) => ({
            costAssumptions: { ...s.costAssumptions, [docId]: updated },
          }));
          return;
        }

        // Re-apply assumptions to estimation rows immediately (live recalc)
        const applied = applyAssumptions(result.estimation.totalCost, result.estimation.rows, updated);

        // Recompute phaseSubtotals with new adjusted costs proportionally
        const ratio = applied.adjustedTotalCost / (result.estimation.adjustedTotalCost || result.estimation.totalCost || 1);
        const phaseSubtotals = result.estimation.phaseSubtotals.map((p) => ({
          ...p,
          cost: Math.round(p.cost * ratio),
        }));

        const updatedEstimation: EstimationSummary = {
          ...result.estimation,
          ...applied,
          phaseSubtotals,
          lastUpdated: new Date().toISOString(),
        };
        const updatedResult: AnalysisResult = { ...result, estimation: updatedEstimation };
        set((s) => ({
          costAssumptions: { ...s.costAssumptions, [docId]: updated },
          analysisResults: { ...s.analysisResults, [docId]: updatedResult },
        }));
      },

      resetCostAssumptions: (docId) => {
        get().updateCostAssumptions(docId, { ...DEFAULT_COST_ASSUMPTIONS });
      },

      // ── Staffing edits ──────────────────────────────────────
      updateStaffingRole: (docId, roleId, updates) => {
        const state = get();
        const result = state.analysisResults[docId];
        if (!result?.staffingPlan) return;

        const newRoles = result.staffingPlan.roles.map((r) => {
          if (r.id !== roleId) return r;
          const merged = { ...r, ...updates };
          merged.totalHours = merged.numberOfResources * merged.hoursPerResource;
          merged.totalCost = merged.totalHours * merged.hourlyRate;
          return merged;
        });

        const performUpdate = () => {
          set((s) => {
            const existing = s.analysisResults[docId];
            if (!existing?.staffingPlan) return s;
            const updatedPlan = recalcStaffingTotals({ ...existing.staffingPlan, roles: newRoles });
            const assumptions = s.costAssumptions[docId] ?? { ...DEFAULT_COST_ASSUMPTIONS };
            const updatedEstimation = recalcEstimationFromStaffing(existing, updatedPlan, assumptions);
            const updatedProjectPlan = recalcProjectPlanFromStaffing(existing, updatedPlan);
            return {
              analysisResults: {
                ...s.analysisResults,
                [docId]: {
                  ...existing,
                  staffingPlan: updatedPlan,
                  estimation: updatedEstimation,
                  projectPlan: updatedProjectPlan,
                },
              },
            };
          });
        };

        get().showNotification({
          sourceModule: 'Staffing Plan',
          affectedModules: ['Project Plan → Timeline', 'Estimation → Cost & Effort'],
          message: 'This change will also update: Project Plan → Timeline, Estimation → Cost & Effort.',
          pendingUpdate: performUpdate,
        });
      },

      addStaffingRole: (docId, role) => {
        const state = get();
        const result = state.analysisResults[docId];
        if (!result?.staffingPlan) return;

        const newRoles = [...result.staffingPlan.roles, role];
        const performUpdate = () => {
          set((s) => {
            const existing = s.analysisResults[docId];
            if (!existing?.staffingPlan) return s;
            const updatedPlan = recalcStaffingTotals({ ...existing.staffingPlan, roles: newRoles });
            const assumptions = s.costAssumptions[docId] ?? { ...DEFAULT_COST_ASSUMPTIONS };
            const updatedEstimation = recalcEstimationFromStaffing(existing, updatedPlan, assumptions);
            const updatedProjectPlan = recalcProjectPlanFromStaffing(existing, updatedPlan);
            return {
              analysisResults: {
                ...s.analysisResults,
                [docId]: { ...existing, staffingPlan: updatedPlan, estimation: updatedEstimation, projectPlan: updatedProjectPlan },
              },
            };
          });
        };

        get().showNotification({
          sourceModule: 'Staffing Plan',
          affectedModules: ['Project Plan → Timeline', 'Estimation → Cost & Effort'],
          message: 'Adding a new role will also update: Project Plan → Timeline, Estimation → Cost & Effort.',
          pendingUpdate: performUpdate,
        });
      },

      removeStaffingRole: (docId, roleId) => {
        const state = get();
        const result = state.analysisResults[docId];
        if (!result?.staffingPlan) return;

        const newRoles = result.staffingPlan.roles.filter((r) => r.id !== roleId);
        const performUpdate = () => {
          set((s) => {
            const existing = s.analysisResults[docId];
            if (!existing?.staffingPlan) return s;
            const updatedPlan = recalcStaffingTotals({ ...existing.staffingPlan, roles: newRoles });
            const assumptions = s.costAssumptions[docId] ?? { ...DEFAULT_COST_ASSUMPTIONS };
            const updatedEstimation = recalcEstimationFromStaffing(existing, updatedPlan, assumptions);
            const updatedProjectPlan = recalcProjectPlanFromStaffing(existing, updatedPlan);
            return {
              analysisResults: {
                ...s.analysisResults,
                [docId]: { ...existing, staffingPlan: updatedPlan, estimation: updatedEstimation, projectPlan: updatedProjectPlan },
              },
            };
          });
        };

        get().showNotification({
          sourceModule: 'Staffing Plan',
          affectedModules: ['Project Plan → Timeline', 'Estimation → Cost & Effort'],
          message: 'Removing this role will also update: Project Plan → Timeline, Estimation → Cost & Effort.',
          pendingUpdate: performUpdate,
        });
      },

      // ── Testing edits ────────────────────────────────────────
      toggleTestSection: (docId, sectionId, enabled) => {
        const performUpdate = () => {
          set((s) => {
            const existing = s.analysisResults[docId];
            if (!existing?.testingStrategy) return s;
            const sections = existing.testingStrategy.sections.map((sec) =>
              sec.id === sectionId ? { ...sec, enabled } : sec
            );
            const totalQAHours = sections.filter((s) => s.enabled).reduce((a, b) => a + b.estimatedHours, 0);
            return {
              analysisResults: {
                ...s.analysisResults,
                [docId]: {
                  ...existing,
                  testingStrategy: { ...existing.testingStrategy, sections, totalQAHours },
                },
              },
            };
          });
        };

        get().showNotification({
          sourceModule: 'Testing',
          affectedModules: ['Staffing Plan → Headcount', 'Project Plan → Duration', 'Estimation → Total Cost'],
          message: 'This change will also update: Staffing Plan → Headcount, Project Plan → Duration, Estimation → Total Cost.',
          pendingUpdate: performUpdate,
        });
      },

      addTestSection: (docId, section) => {
        const performUpdate = () => {
          set((s) => {
            const existing = s.analysisResults[docId];
            if (!existing?.testingStrategy) return s;
            const sections = [...existing.testingStrategy.sections, section];
            const totalQAHours = sections.filter((s) => s.enabled).reduce((a, b) => a + b.estimatedHours, 0);
            return {
              analysisResults: {
                ...s.analysisResults,
                [docId]: {
                  ...existing,
                  testingStrategy: { ...existing.testingStrategy, sections, totalQAHours },
                },
              },
            };
          });
        };
        get().showNotification({
          sourceModule: 'Testing',
          affectedModules: ['Staffing Plan → Headcount', 'Project Plan → Duration', 'Estimation → Total Cost'],
          message: 'Adding a test type will also update: Staffing Plan → Headcount, Project Plan → Duration, Estimation → Total Cost.',
          pendingUpdate: performUpdate,
        });
      },

      removeTestSection: (docId, sectionId) => {
        const performUpdate = () => {
          set((s) => {
            const existing = s.analysisResults[docId];
            if (!existing?.testingStrategy) return s;
            const sections = existing.testingStrategy.sections.filter((sec) => sec.id !== sectionId);
            const totalQAHours = sections.filter((s) => s.enabled).reduce((a, b) => a + b.estimatedHours, 0);
            return {
              analysisResults: {
                ...s.analysisResults,
                [docId]: {
                  ...existing,
                  testingStrategy: { ...existing.testingStrategy, sections, totalQAHours },
                },
              },
            };
          });
        };
        get().showNotification({
          sourceModule: 'Testing',
          affectedModules: ['Staffing Plan → Headcount', 'Project Plan → Duration', 'Estimation → Total Cost'],
          message: 'Removing this test type will also update: Staffing Plan → Headcount, Project Plan → Duration, Estimation → Total Cost.',
          pendingUpdate: performUpdate,
        });
      },

      updateTestCriteria: (docId, sectionId, type, index, value) => {
        set((s) => {
          const existing = s.analysisResults[docId];
          if (!existing?.testingStrategy) return s;
          const sections = existing.testingStrategy.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            if (type === 'entry') {
              const entryCriteria = [...sec.entryCriteria];
              entryCriteria[index] = value;
              return { ...sec, entryCriteria };
            } else {
              const exitCriteria = [...sec.exitCriteria];
              exitCriteria[index] = value;
              return { ...sec, exitCriteria };
            }
          });
          return {
            analysisResults: {
              ...s.analysisResults,
              [docId]: { ...existing, testingStrategy: { ...existing.testingStrategy, sections } },
            },
          };
        });
      },

      addTestCriterion: (docId, sectionId, type) => {
        set((s) => {
          const existing = s.analysisResults[docId];
          if (!existing?.testingStrategy) return s;
          const sections = existing.testingStrategy.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            if (type === 'entry') return { ...sec, entryCriteria: [...sec.entryCriteria, ''] };
            return { ...sec, exitCriteria: [...sec.exitCriteria, ''] };
          });
          return {
            analysisResults: {
              ...s.analysisResults,
              [docId]: { ...existing, testingStrategy: { ...existing.testingStrategy, sections } },
            },
          };
        });
      },

      removeTestCriterion: (docId, sectionId, type, index) => {
        set((s) => {
          const existing = s.analysisResults[docId];
          if (!existing?.testingStrategy) return s;
          const sections = existing.testingStrategy.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            if (type === 'entry') {
              const entryCriteria = sec.entryCriteria.filter((_, i) => i !== index);
              return { ...sec, entryCriteria };
            } else {
              const exitCriteria = sec.exitCriteria.filter((_, i) => i !== index);
              return { ...sec, exitCriteria };
            }
          });
          return {
            analysisResults: {
              ...s.analysisResults,
              [docId]: { ...existing, testingStrategy: { ...existing.testingStrategy, sections } },
            },
          };
        });
      },

      updateProjectPhase: (docId, phaseId, updates) => {
        set((s) => {
          const existing = s.analysisResults[docId];
          if (!existing?.projectPlan) return s;
          const phases = existing.projectPlan.phases.map((p) => {
            if (p.id !== phaseId) return p;
            const merged = { ...p, ...updates };
            merged.endWeek = merged.startWeek + merged.durationWeeks - 1;
            return merged;
          });
          let cursor = 1;
          const recalcPhases = phases.map((ph) => {
            const out = { ...ph, startWeek: cursor, endWeek: cursor + ph.durationWeeks - 1 };
            cursor += ph.durationWeeks;
            return out;
          });
          return {
            analysisResults: {
              ...s.analysisResults,
              [docId]: {
                ...existing,
                projectPlan: {
                  ...existing.projectPlan,
                  phases: recalcPhases,
                  totalDurationWeeks: cursor - 1,
                  lastUpdated: new Date().toISOString(),
                },
              },
            },
          };
        });
      },

      addProjectPhase: (docId, phase) => {
        set((s) => {
          const existing = s.analysisResults[docId];
          if (!existing?.projectPlan) return s;
          const phases = [...existing.projectPlan.phases, phase];
          let cursor = 1;
          const recalcPhases = phases.map((ph) => {
            const out = { ...ph, startWeek: cursor, endWeek: cursor + ph.durationWeeks - 1 };
            cursor += ph.durationWeeks;
            return out;
          });
          return {
            analysisResults: {
              ...s.analysisResults,
              [docId]: {
                ...existing,
                projectPlan: {
                  ...existing.projectPlan,
                  phases: recalcPhases,
                  totalDurationWeeks: cursor - 1,
                  lastUpdated: new Date().toISOString(),
                },
              },
            },
          };
        });
      },

      removeProjectPhase: (docId, phaseId) => {
        set((s) => {
          const existing = s.analysisResults[docId];
          if (!existing?.projectPlan) return s;
          const phases = existing.projectPlan.phases.filter((p) => p.id !== phaseId);
          let cursor = 1;
          const recalcPhases = phases.map((ph) => {
            const out = { ...ph, startWeek: cursor, endWeek: cursor + ph.durationWeeks - 1 };
            cursor += ph.durationWeeks;
            return out;
          });
          return {
            analysisResults: {
              ...s.analysisResults,
              [docId]: {
                ...existing,
                projectPlan: {
                  ...existing.projectPlan,
                  phases: recalcPhases,
                  totalDurationWeeks: Math.max(1, cursor - 1),
                  lastUpdated: new Date().toISOString(),
                },
              },
            },
          };
        });
      },

      updateTestHours: (docId, sectionId, hours) => {
        set((s) => {
          const existing = s.analysisResults[docId];
          if (!existing?.testingStrategy) return s;
          const sections = existing.testingStrategy.sections.map((sec) =>
            sec.id === sectionId ? { ...sec, estimatedHours: Math.max(0, hours) } : sec
          );
          // Recompute total QA hours from all enabled sections
          const totalQAHours = sections
            .filter((sec) => sec.enabled)
            .reduce((sum, sec) => sum + sec.estimatedHours, 0);
          // Also propagate to estimation: scale QA estimation rows proportionally
          let updatedEstimation = existing.estimation;
          if (existing.estimation) {
            const oldTotal = existing.testingStrategy.totalQAHours || 1;
            const ratio = totalQAHours / oldTotal;
            const updatedRows = existing.estimation.rows.map((r) =>
              r.phase?.toLowerCase().includes('test') || r.activity?.toLowerCase().includes('test')
                ? { ...r, hours: Math.round(r.hours * ratio), cost: Math.round(r.cost * ratio) }
                : r
            );
            const newTotalHours = updatedRows.reduce((a, r) => a + r.hours, 0);
            const newTotalCost = updatedRows.reduce((a, r) => a + r.cost, 0);
            const assumptions = s.costAssumptions[docId] ?? { ...DEFAULT_COST_ASSUMPTIONS };
            const applied = applyAssumptions(newTotalCost, updatedRows, assumptions);
            updatedEstimation = {
              ...existing.estimation,
              ...applied,
              totalHours: newTotalHours,
              personDays: Math.round(newTotalHours / 8),
              personMonths: Math.round(newTotalHours / 160),
              lastUpdated: new Date().toISOString(),
            };
          }
          return {
            analysisResults: {
              ...s.analysisResults,
              [docId]: {
                ...existing,
                testingStrategy: {
                  ...existing.testingStrategy,
                  sections,
                  totalQAHours,
                  lastUpdated: new Date().toISOString(),
                },
                estimation: updatedEstimation,
              },
            },
          };
        });
      },
    }),
    {
      name: 'rfp-analyzer-pro-store', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Persist documents, results, assumptions, sidebar, and active IDs
      // Exclude transient UI state (notifications, processing flags)
      partialize: (state) => ({
        documents: state.documents,
        activeDocumentId: state.activeDocumentId,
        activeTab: state.activeTab,
        analysisResults: state.analysisResults,
        costAssumptions: state.costAssumptions,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// ── Pure recalc helpers ──────────────────────────────────────

import type { StaffingPlan, ProjectPlan } from '@/types';
// ProjectPhase is already imported at top — no re-import needed

function recalcStaffingTotals(plan: StaffingPlan): StaffingPlan {
  const totalHours = plan.roles.reduce((a, r) => a + r.totalHours, 0);
  const totalLaborCost = plan.roles.reduce((a, r) => a + r.totalCost, 0);
  const totalHeadcount = plan.roles.reduce((a, r) => a + r.numberOfResources, 0);
  return { ...plan, totalHours, totalLaborCost, totalHeadcount, peakHeadcount: totalHeadcount, lastUpdated: new Date().toISOString() };
}

function recalcEstimationFromStaffing(
  existing: AnalysisResult,
  staffing: StaffingPlan,
  assumptions: CostAssumptions
): EstimationSummary | undefined {
  if (!existing.estimation) return existing.estimation;

  const baseRows = staffing.roles.map((r) => ({
    id: r.id,
    activity: r.roleName,
    role: r.roleName,
    band: r.band,
    hours: r.totalHours,
    ratePerHour: r.hourlyRate,
    cost: r.totalCost,
    phase: 'All Phases',
  }));

  const totalHours = baseRows.reduce((a, r) => a + r.hours, 0);
  const baseLaborCost = baseRows.reduce((a, r) => a + r.cost, 0);
  const applied = applyAssumptions(baseLaborCost, baseRows, assumptions);

  const phaseSubtotals = existing.estimation.phaseSubtotals.map((p) => ({
    ...p,
    cost: Math.round(applied.adjustedTotalCost * (p.hours / totalHours)),
  }));

  // Use IBM rate-card baseline (140 h/mo for Domestic/Nearshore primary)
  // consistent with mockEngine.ts — the Staffing Plan table shows per-role
  // utilisation using the live deploy-type selected there.
  const PERSON_MONTH_HRS = 140;
  return {
    ...existing.estimation,
    ...applied,
    totalHours,
    phaseSubtotals,
    personDays: Math.round(totalHours / 8),
    personMonths: Math.round(totalHours / PERSON_MONTH_HRS),
    lastUpdated: new Date().toISOString(),
  };
}

function recalcProjectPlanFromStaffing(existing: AnalysisResult, staffing: StaffingPlan): ProjectPlan | undefined {
  if (!existing.projectPlan) return existing.projectPlan;
  const scaleFactor = staffing.totalHours > 0 ? staffing.totalHours / 4000 : 1;
  const phases = existing.projectPlan.phases.map((p) => ({
    ...p,
    durationWeeks: Math.max(1, Math.round(p.durationWeeks * scaleFactor)),
  }));
  let cursor = 1;
  const recalcPhases = phases.map((p) => {
    const ph = { ...p, startWeek: cursor, endWeek: cursor + p.durationWeeks - 1 };
    cursor += p.durationWeeks;
    return ph;
  });
  return {
    ...existing.projectPlan,
    phases: recalcPhases,
    totalDurationWeeks: cursor - 1,
    lastUpdated: new Date().toISOString(),
  };
}
