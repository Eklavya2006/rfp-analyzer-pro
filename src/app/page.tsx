"use client";

import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/components/modules/Dashboard";
import DocumentUpload from "@/components/modules/DocumentUpload";
import CostEstimation from "@/components/modules/CostEstimation";
import ProjectPlan from "@/components/modules/ProjectPlan";
import StaffingPlan from "@/components/modules/StaffingPlan";
import TestingStrategy from "@/components/modules/TestingStrategy";
import AIComparison from "@/components/modules/AIComparison";
import { useRFPStore } from "@/lib/store";

function ActiveModule() {
  const activeTab = useRFPStore((s) => s.activeTab);
  switch (activeTab) {
    case "dashboard":      return <Dashboard />;
    case "upload":         return <DocumentUpload />;
    case "cost":           return <CostEstimation />;
    case "plan":           return <ProjectPlan />;
    case "staffing":       return <StaffingPlan />;
    case "testing":        return <TestingStrategy />;
    case "ai-comparison":  return <AIComparison />;
    default:               return <Dashboard />;
  }
}

export default function Home() {
  return (
    <AppLayout>
      <ActiveModule />
    </AppLayout>
  );
}
