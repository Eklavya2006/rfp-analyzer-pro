// ============================================================
// Staffing Plan Engine
// Recommends team composition with allocation timelines
// ============================================================
import type { StaffingPlan, StaffingRole, StaffingWeekData, DocumentSummary } from '@/types';
import { generateId } from '@/lib/utils';
import { DEFAULT_HOURLY_RATES } from './costEngine';

export function generateStaffingPlan(summary: DocumentSummary, durationWeeks: number): StaffingPlan {
  const roles: StaffingRole[] = [
    createRole('Project Manager', 'senior', 1, 100, 1, durationWeeks, 1, 2),
    createRole('Tech Lead', 'lead', 1, 100, 1, durationWeeks, 1, 1),
    createRole('Backend Developer', 'senior', 2, 100, 5, Math.round(durationWeeks * 0.85), 2, 3),
    createRole('Frontend Developer', 'mid', 2, 100, 7, Math.round(durationWeeks * 0.85), 2, 3),
    createRole('QA Engineer', 'mid', 2, 100, Math.round(durationWeeks * 0.4), durationWeeks - 1, 1, 2),
    createRole('DevOps Engineer', 'senior', 1, 80, 3, durationWeeks, 1, 1),
    createRole('Business Analyst', 'senior', 1, 100, 1, Math.round(durationWeeks * 0.6), 1, 2),
    createRole('UX Designer', 'mid', 1, 100, 2, Math.round(durationWeeks * 0.5), 1, 2),
    createRole('Data Engineer', 'mid', 1, 60, Math.round(durationWeeks * 0.2), Math.round(durationWeeks * 0.7), 2, 2),
    createRole('Security Engineer', 'senior', 1, 50, Math.round(durationWeeks * 0.45), Math.round(durationWeeks * 0.75), 1, 1),
  ];

  // Generate weekly data
  const weeklyData: StaffingWeekData[] = [];
  for (let week = 1; week <= durationWeeks; week++) {
    const byRole: Record<string, number> = {};
    let totalHeadcount = 0;
    let totalCost = 0;

    for (const role of roles) {
      if (week >= role.startWeek && week <= role.endWeek) {
        let allocation = role.allocationPercent / 100;
        // Ramp up
        if (week < role.startWeek + role.rampUpWeeks) {
          allocation *= (week - role.startWeek + 1) / role.rampUpWeeks;
        }
        // Ramp down
        if (week > role.endWeek - role.rampDownWeeks) {
          allocation *= (role.endWeek - week + 1) / role.rampDownWeeks;
        }
        const effectiveCount = role.headcount * Math.max(0.2, allocation);
        byRole[role.title] = Math.round(effectiveCount * 10) / 10;
        totalHeadcount += effectiveCount;
        totalCost += effectiveCount * 40 * (DEFAULT_HOURLY_RATES[role.title] ?? 150);
      }
    }

    weeklyData.push({
      week,
      totalHeadcount: Math.round(totalHeadcount * 10) / 10,
      byRole,
      totalCost: Math.round(totalCost),
    });
  }

  const peakHeadcount = Math.max(...weeklyData.map((w) => w.totalHeadcount));
  const totalLaborCost = weeklyData.reduce((sum, w) => sum + w.totalCost, 0);

  return {
    id: generateId(),
    documentId: '',
    roles,
    weeklyData,
    totalHeadcount: roles.reduce((sum, r) => sum + r.headcount, 0),
    peakHeadcount: Math.round(peakHeadcount),
    totalLaborCost: Math.round(totalLaborCost),
    assumptions: [
      'All roles available and onboarded per schedule',
      'Ramp-up periods account for knowledge transfer and environment access',
      'Allocation percentages reflect active work commitment (not availability)',
      'Part-time roles (DevOps, Security) can be sourced through staff augmentation',
      'QA engagement begins at 40% of project duration to allow testable features',
      'Offshore/nearshore staffing can reduce costs by 30-40% on development roles',
    ],
    lastUpdated: new Date().toISOString(),
  };
}

function createRole(
  title: string,
  seniority: StaffingRole['seniority'],
  headcount: number,
  allocationPercent: number,
  startWeek: number,
  endWeek: number,
  rampUpWeeks: number,
  rampDownWeeks: number
): StaffingRole {
  const skillsMap: Record<string, string[]> = {
    'Project Manager': ['PMP/PMI', 'Agile/Scrum', 'Risk Management', 'Stakeholder Management', 'MS Project'],
    'Tech Lead': ['System Architecture', 'TypeScript', 'Node.js', 'AWS', 'Code Review', 'Mentoring'],
    'Backend Developer': ['Node.js', 'Python', 'PostgreSQL', 'REST APIs', 'GraphQL', 'Docker'],
    'Frontend Developer': ['React', 'TypeScript', 'CSS/Tailwind', 'Testing Library', 'Accessibility'],
    'QA Engineer': ['Test Automation', 'Selenium/Playwright', 'API Testing', 'Performance Testing', 'JIRA'],
    'DevOps Engineer': ['Kubernetes', 'AWS/GCP', 'Terraform', 'CI/CD', 'Docker', 'Monitoring'],
    'Business Analyst': ['Requirements Elicitation', 'Process Modeling', 'Agile', 'SQL', 'Wireframing'],
    'UX Designer': ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Accessibility'],
    'Data Engineer': ['Python', 'SQL', 'ETL Pipelines', 'AWS Glue/Spark', 'Data Modeling'],
    'Security Engineer': ['OWASP', 'Penetration Testing', 'SIEM', 'IAM', 'Compliance Frameworks'],
  };

  return {
    id: generateId(),
    title,
    seniority,
    headcount,
    allocationPercent,
    startWeek,
    endWeek,
    rampUpWeeks,
    rampDownWeeks,
    skills: skillsMap[title] || [],
    hourlyRate: DEFAULT_HOURLY_RATES[title] ?? 150,
  };
}
