"use client";

import AppLayout from "@/components/layout/AppLayout";
import DocumentAnalyzer from "@/components/modules/DocumentAnalyzer";
import Dashboard from "@/components/modules/Dashboard";
import ScopeDeliverables from "@/components/modules/ScopeDeliverables";
import OfferingsTechnology from "@/components/modules/OfferingsTechnology";
import ProjectPlanModule from "@/components/modules/ProjectPlan";
import StaffingPlanModule from "@/components/modules/StaffingPlan";
import TestingModule from "@/components/modules/Testing";
import EstimationModule from "@/components/modules/Estimation";
import AgenticImpactModule from "@/components/modules/AIImpact";
import CreateProposalModule from "@/components/modules/CreateProposal";
import { useRFPStore } from "@/lib/store";

function ActiveModule() {
  const activeTab = useRFPStore((s) => s.activeTab);
  switch (activeTab) {
    case "document-analyzer": return <DocumentAnalyzer />;
    case "dashboard":         return <Dashboard />;
    case "scope":             return <ScopeDeliverables />;
    case "offerings":         return <OfferingsTechnology />;
    case "project-plan":      return <ProjectPlanModule />;
    case "staffing":          return <StaffingPlanModule />;
    case "testing":           return <TestingModule />;
    case "estimation":        return <EstimationModule />;
    case "agentic-impact":    return <AgenticImpactModule />;
    case "proposal":          return <CreateProposalModule />;
    default:                  return <DocumentAnalyzer />;
  }
}

export default function Home() {
  return (
    <AppLayout>
      <ActiveModule />
    </AppLayout>
  );
}
