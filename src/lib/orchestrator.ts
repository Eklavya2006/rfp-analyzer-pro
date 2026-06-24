// ============================================================
// Analysis Orchestrator — coordinates all analysis engines
// ============================================================
import type { AnalysisResult, RFPDocument } from '@/types';
import { generateSummary, extractSections } from '@/lib/parser';
import { deriveDefaultAssumptions, calculateCostBreakdown } from '@/lib/engines/costEngine';
import { generateProjectPlan } from '@/lib/engines/planEngine';
import { generateStaffingPlan } from '@/lib/engines/staffingEngine';
import { generateTestingStrategy } from '@/lib/engines/testingEngine';
import { generateAIComparison } from '@/lib/engines/aiEngine';

export async function runFullAnalysis(
  documentId: string,
  rawText: string,
  filename: string
): Promise<AnalysisResult> {
  // Step 1: Extract and summarize
  const summary = generateSummary(rawText, filename);
  const sections = extractSections(rawText);

  // Step 2: Derive cost assumptions from summary
  const costAssumptions = deriveDefaultAssumptions(summary);

  // Step 3: Calculate cost breakdown
  const costBreakdown = calculateCostBreakdown(costAssumptions);

  // Step 4: Generate project plan
  const projectPlan = generateProjectPlan(summary, costAssumptions.projectDurationWeeks);
  projectPlan.documentId = documentId;

  // Step 5: Staffing plan
  const staffingPlan = generateStaffingPlan(summary, costAssumptions.projectDurationWeeks);
  staffingPlan.documentId = documentId;

  // Step 6: Testing strategy (based on total labor hours)
  const totalLaborHours = costBreakdown.byRole.reduce((sum, r) => sum + r.hours, 0);
  const testingStrategy = generateTestingStrategy(summary, totalLaborHours);
  testingStrategy.documentId = documentId;

  // Step 7: AI comparison
  const aiComparison = generateAIComparison(costBreakdown, staffingPlan);
  aiComparison.documentId = documentId;

  return {
    documentId,
    costBreakdown,
    projectPlan,
    staffingPlan,
    testingStrategy,
    aiComparison,
    generatedAt: new Date().toISOString(),
  };
}
