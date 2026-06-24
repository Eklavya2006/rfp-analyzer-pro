// ============================================================
// Project Plan Engine
// Generates structured project phases, milestones, timeline
// ============================================================
import type { ProjectPlan, ProjectPhase, ProjectMilestone, DocumentSummary } from '@/types';
import { generateId } from '@/lib/utils';
import { addWeeks, format } from 'date-fns';

export function generateProjectPlan(summary: DocumentSummary, durationWeeks: number): ProjectPlan {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 14); // 2 weeks from now

  const phases: ProjectPhase[] = [
    {
      id: generateId(),
      name: 'Discovery & Architecture',
      description: 'Requirements gathering, stakeholder alignment, technical architecture design, and environment setup.',
      startWeek: 1,
      durationWeeks: Math.max(2, Math.round(durationWeeks * 0.1)),
      dependencies: [],
      milestones: [
        milestone('Project Kickoff', 1, ['Kickoff presentation', 'Project charter'], true),
        milestone('Architecture Design Complete', Math.round(durationWeeks * 0.08), ['Architecture document', 'Tech stack approval', 'Environment setup complete'], true),
      ],
      deliverables: [
        'Requirements specification document',
        'System architecture design',
        'Development environment setup',
        'Project management plan',
      ],
      team: ['Project Manager', 'Tech Lead', 'Business Analyst', 'UX Designer'],
      status: 'not-started',
      completionPercent: 0,
    },
    {
      id: generateId(),
      name: 'UI/UX Design',
      description: 'Design system creation, wireframing, prototyping, and user research.',
      startWeek: Math.round(durationWeeks * 0.08),
      durationWeeks: Math.max(2, Math.round(durationWeeks * 0.1)),
      dependencies: [],
      milestones: [
        milestone('Design System Approved', Math.round(durationWeeks * 0.12), ['Design tokens', 'Component library specs'], false),
        milestone('High-Fidelity Prototypes Approved', Math.round(durationWeeks * 0.18), ['Figma prototypes', 'UX validation report'], true),
      ],
      deliverables: ['Design system', 'Wireframes', 'High-fidelity prototypes', 'UX research report'],
      team: ['UX Designer', 'Business Analyst', 'Tech Lead'],
      status: 'not-started',
      completionPercent: 0,
    },
    {
      id: generateId(),
      name: 'Core Development — Sprint 1',
      description: 'Foundation development: authentication, core APIs, database schema, CI/CD pipeline.',
      startWeek: Math.round(durationWeeks * 0.15),
      durationWeeks: Math.max(4, Math.round(durationWeeks * 0.2)),
      dependencies: [],
      milestones: [
        milestone('CI/CD Pipeline Live', Math.round(durationWeeks * 0.2), ['Pipeline documentation', 'Dev environment'], true),
        milestone('Sprint 1 Demo', Math.round(durationWeeks * 0.35), ['Working core module demo', 'Sprint review artifacts'], false),
      ],
      deliverables: ['Authentication module', 'Core API layer', 'Database schema v1', 'CI/CD pipeline', 'Development standards document'],
      team: ['Tech Lead', 'Backend Developer', 'Frontend Developer', 'DevOps Engineer'],
      status: 'not-started',
      completionPercent: 0,
    },
    {
      id: generateId(),
      name: 'Core Development — Sprint 2',
      description: 'Feature development: business logic, integrations, data processing, and frontend views.',
      startWeek: Math.round(durationWeeks * 0.35),
      durationWeeks: Math.max(4, Math.round(durationWeeks * 0.2)),
      dependencies: [],
      milestones: [
        milestone('Feature Complete — Module A', Math.round(durationWeeks * 0.45), ['Feature demo', 'Unit tests passing'], false),
        milestone('Sprint 2 Demo', Math.round(durationWeeks * 0.55), ['Working product demo', 'Sprint review'], false),
      ],
      deliverables: ['Business logic modules', 'API integrations', 'Frontend views', 'Data processing pipeline'],
      team: ['Tech Lead', 'Backend Developer', 'Frontend Developer', 'Data Engineer'],
      status: 'not-started',
      completionPercent: 0,
    },
    {
      id: generateId(),
      name: 'Integration & System Testing',
      description: 'End-to-end integration, performance testing, security scanning, and defect remediation.',
      startWeek: Math.round(durationWeeks * 0.55),
      durationWeeks: Math.max(3, Math.round(durationWeeks * 0.15)),
      dependencies: [],
      milestones: [
        milestone('Integration Testing Complete', Math.round(durationWeeks * 0.65), ['Integration test report', 'Defect log'], true),
        milestone('Performance Baseline Established', Math.round(durationWeeks * 0.68), ['Performance test results', 'Optimization plan'], false),
      ],
      deliverables: ['Integration test suite', 'Performance test results', 'Security scan report', 'Defect resolution log'],
      team: ['QA Engineer', 'Tech Lead', 'DevOps Engineer', 'Security Engineer'],
      status: 'not-started',
      completionPercent: 0,
    },
    {
      id: generateId(),
      name: 'User Acceptance Testing',
      description: 'Client-led UAT, stakeholder validation, feedback incorporation, and sign-off process.',
      startWeek: Math.round(durationWeeks * 0.7),
      durationWeeks: Math.max(2, Math.round(durationWeeks * 0.1)),
      dependencies: [],
      milestones: [
        milestone('UAT Sign-Off', Math.round(durationWeeks * 0.82), ['Signed UAT acceptance', 'Outstanding issues list'], true),
      ],
      deliverables: ['UAT test plan', 'UAT test results', 'Signed acceptance documentation'],
      team: ['Project Manager', 'QA Engineer', 'Business Analyst'],
      status: 'not-started',
      completionPercent: 0,
    },
    {
      id: generateId(),
      name: 'Deployment & Go-Live',
      description: 'Production deployment, cutover execution, hypercare support, and stabilization.',
      startWeek: Math.round(durationWeeks * 0.82),
      durationWeeks: Math.max(2, Math.round(durationWeeks * 0.1)),
      dependencies: [],
      milestones: [
        milestone('Production Deployment', Math.round(durationWeeks * 0.9), ['Go-live confirmation', 'Rollback plan'], true),
        milestone('Project Closure', durationWeeks, ['Final project report', 'Knowledge transfer complete', 'Lessons learned'], true),
      ],
      deliverables: ['Production environment', 'Deployment runbook', 'Operational documentation', 'Training materials', 'Lessons learned report'],
      team: ['Project Manager', 'Tech Lead', 'DevOps Engineer', 'QA Engineer'],
      status: 'not-started',
      completionPercent: 0,
    },
  ];

  return {
    id: generateId(),
    documentId: '',
    projectName: summary.title,
    startDate: format(startDate, 'yyyy-MM-dd'),
    totalDurationWeeks: durationWeeks,
    phases,
    assumptions: [
      'Project kickoff date is approximately 2 weeks from RFP award',
      'All team members onboarded within first 2 weeks',
      'Client stakeholders available for reviews and approvals as scheduled',
      'No major scope changes after Sprint 1 completion',
      'Development environments provisioned by end of week 2',
      'Third-party API access available by integration phase start',
    ],
    risks: [
      'Scope creep may extend timeline by 10-20%',
      'Stakeholder availability during UAT may cause delays',
      'Third-party integration dependencies could create blockers',
      'Infrastructure provisioning delays could impact environment readiness',
    ],
    lastUpdated: new Date().toISOString(),
  };
}

function milestone(
  name: string,
  dueWeek: number,
  deliverables: string[],
  isCritical: boolean
): ProjectMilestone {
  return {
    id: generateId(),
    name,
    description: `Key milestone: ${name}`,
    dueWeek: Math.max(1, dueWeek),
    deliverables,
    isCritical,
  };
}
