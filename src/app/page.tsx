'use client';

import React, { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/layout/AppLayout';
import { useRFPStore } from '@/lib/store';
import WelcomeScreen from '@/components/WelcomeScreen';

const DocumentAnalyzer = dynamic(() => import('@/components/modules/DocumentAnalyzer'), { ssr: false });
const Dashboard = dynamic(() => import('@/components/modules/Dashboard'), { ssr: false });
const ScopeDeliverables = dynamic(() => import('@/components/modules/ScopeDeliverables'), { ssr: false });
const OfferingsTechnology = dynamic(() => import('@/components/modules/OfferingsTechnology'), { ssr: false });
const ProjectPlanModule = dynamic(() => import('@/components/modules/ProjectPlan'), { ssr: false });
const StaffingPlanModule = dynamic(() => import('@/components/modules/StaffingPlan'), { ssr: false });
const TestingModule = dynamic(() => import('@/components/modules/Testing'), { ssr: false });
const EstimationModule = dynamic(() => import('@/components/modules/Estimation'), { ssr: false });
const AgenticImpactModule = dynamic(() => import('@/components/modules/AIImpact'), { ssr: false });
const CreateProposalModule = dynamic(() => import('@/components/modules/CreateProposal'), { ssr: false });
const ConfidenceInsightsModule = dynamic(() => import('@/components/modules/ConfidenceInsights'), { ssr: false });

const moduleFallback = (
  <div className="p-6 text-sm text-slate-500">Loading module…</div>
);

const ActiveModule = React.memo(function ActiveModule() {
  const activeTab = useRFPStore((s) => s.activeTab);

  switch (activeTab) {
    case 'document-analyzer':
      return <DocumentAnalyzer />;
    case 'dashboard':
      return <Dashboard />;
    case 'scope':
      return <ScopeDeliverables />;
    case 'offerings':
      return <OfferingsTechnology />;
    case 'project-plan':
      return <ProjectPlanModule />;
    case 'staffing':
      return <StaffingPlanModule />;
    case 'testing':
      return <TestingModule />;
    case 'estimation':
      return <EstimationModule />;
    case 'agentic-impact':
      return <AgenticImpactModule />;
    case 'proposal':
      return <CreateProposalModule />;
    case 'confidence-insights':
      return <ConfidenceInsightsModule />;
    default:
      return <DocumentAnalyzer />;
  }
});

const SESSION_KEY = 'fnc-sih-welcomed';

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Show only once per browser session
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeDone = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setShowWelcome(false);
  };

  return (
    <>
      {showWelcome && <WelcomeScreen onDone={handleWelcomeDone} />}
      <AppLayout>
        <Suspense fallback={moduleFallback}>
          <ActiveModule />
        </Suspense>
      </AppLayout>
    </>
  );
}
