import { create } from 'zustand';
import type {
  RFPDocument,
  AnalysisResult,
  CostAssumptions,
  TabId,
} from '@/types';

interface RFPStore {
  // Documents
  documents: RFPDocument[];
  activeDocumentId: string | null;
  activeTab: TabId;

  // Analysis results keyed by documentId
  analysisResults: Record<string, AnalysisResult>;

  // UI state
  isProcessing: boolean;
  processingMessage: string;
  error: string | null;
  sidebarOpen: boolean;

  /**
   * Global AI Productivity % (0–100).
   * Formula: FTEs_with_AI = FTEs_baseline × (1 − aiProductivityPct / 100)
   * A change here propagates instantly to every module that consumes it.
   * Default: 30
   */
  aiProductivityPct: number;

  /**
   * Flash counter incremented on every aiProductivityPct change so
   * consuming modules can detect the recalculation event via useEffect.
   */
  aiRecalcFlash: number;

  // Actions
  addDocument: (doc: RFPDocument) => void;
  updateDocument: (id: string, updates: Partial<RFPDocument>) => void;
  removeDocument: (id: string) => void;
  setActiveDocument: (id: string | null) => void;
  setActiveTab: (tab: TabId) => void;
  setAnalysisResult: (documentId: string, result: AnalysisResult) => void;
  updateCostAssumptions: (documentId: string, assumptions: Partial<CostAssumptions>) => void;
  setProcessing: (isProcessing: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  toggleSidebar: () => void;
  reset: () => void;
  /** Update the global AI productivity percentage and bump the flash counter */
  setAiProductivityPct: (pct: number) => void;
}

const initialState = {
  documents: [],
  activeDocumentId: null,
  activeTab: 'dashboard' as TabId,
  analysisResults: {},
  isProcessing: false,
  processingMessage: '',
  error: null,
  sidebarOpen: true,
  aiProductivityPct: 30,
  aiRecalcFlash: 0,
};

export const useRFPStore = create<RFPStore>((set) => ({
  ...initialState,

  addDocument: (doc) =>
    set((state) => ({ documents: [...state.documents, doc] })),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),

  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      activeDocumentId:
        state.activeDocumentId === id ? null : state.activeDocumentId,
    })),

  setActiveDocument: (id) => set({ activeDocumentId: id }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setAnalysisResult: (documentId, result) =>
    set((state) => ({
      analysisResults: {
        ...state.analysisResults,
        [documentId]: result,
      },
    })),

  updateCostAssumptions: (documentId, assumptions) =>
    set((state) => {
      const existing = state.analysisResults[documentId];
      if (!existing?.costBreakdown) return state;
      return {
        analysisResults: {
          ...state.analysisResults,
          [documentId]: {
            ...existing,
            costBreakdown: {
              ...existing.costBreakdown,
              assumptions: {
                ...existing.costBreakdown.assumptions,
                ...assumptions,
              },
            },
          },
        },
      };
    }),

  setProcessing: (isProcessing, message = '') =>
    set({ isProcessing, processingMessage: message }),

  setError: (error) => set({ error }),

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setAiProductivityPct: (pct) =>
    set((state) => ({
      aiProductivityPct: Math.max(0, Math.min(100, pct)),
      aiRecalcFlash: state.aiRecalcFlash + 1,
    })),

  reset: () => set(initialState),
}));
