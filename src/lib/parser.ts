// ============================================================
// RFP Document Parser — Structured extraction from raw text
// Supports PDF/DOCX/TXT with deterministic fallback schemas
// ============================================================
import type {
  DocumentSummary,
  ExtractedSections,
  RFPDocument,
} from '@/types';

/**
 * Extract structured sections from raw document text.
 * Uses pattern matching + keyword density for section detection.
 */
export function extractSections(rawText: string): ExtractedSections {
  const text = rawText || '';
  const lower = text.toLowerCase();

  const extract = (keywords: string[], fallback: string): string => {
    for (const kw of keywords) {
      const idx = lower.indexOf(kw);
      if (idx !== -1) {
        const start = Math.max(0, idx - 20);
        const end = Math.min(text.length, idx + 800);
        return text.slice(start, end).trim();
      }
    }
    return fallback;
  };

  return {
    scope: extract(
      ['scope of work', 'project scope', 'scope:'],
      'The project scope encompasses development and delivery of a modern software platform.'
    ),
    objectives: extract(
      ['objective', 'goal', 'purpose:'],
      'Deliver a scalable, enterprise-grade solution meeting all stated functional and non-functional requirements.'
    ),
    timeline: extract(
      ['timeline', 'schedule', 'duration', 'deadline'],
      'The project is expected to be completed within the proposed timeline, subject to finalization upon contract award.'
    ),
    budget: extract(
      ['budget', 'cost', 'funding', 'price'],
      'Budget constraints and investment parameters to be aligned with proposed cost estimates.'
    ),
    technicalRequirements: extract(
      ['technical requirement', 'system requirement', 'technology stack', 'architecture'],
      'Modern cloud-native architecture with microservices, APIs, and enterprise security compliance.'
    ),
    teamRequirements: extract(
      ['team', 'resource', 'staffing', 'personnel'],
      'Cross-functional team with technical leads, developers, QA engineers, and project management expertise.'
    ),
    evaluationCriteria: extract(
      ['evaluation criteria', 'award criteria', 'selection criteria', 'scoring'],
      'Proposals evaluated on technical approach, past performance, team qualifications, and cost.'
    ),
    risks: extract(
      ['risk', 'challenge', 'constraint', 'assumption'],
      'Key risks include scope changes, integration complexity, and stakeholder availability.'
    ),
    deliverables: extract(
      ['deliverable', 'artifact', 'output', 'product'],
      'All software deliverables, documentation, testing reports, and knowledge transfer sessions.'
    ),
  };
}

/**
 * Generate a DocumentSummary from raw text with confidence scoring.
 */
export function generateSummary(rawText: string, filename: string): DocumentSummary {
  const text = rawText || '';
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);

  // Extract project title from first 500 chars
  const titleMatch = text.match(/(?:project|system|platform|application|solution)[:\s]+([A-Z][^.\n]{5,60})/i);
  const title = titleMatch?.[1]?.trim() || filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

  // Client name detection
  const clientMatch = text.match(/(?:client|customer|organization|agency|department)[:\s]+([A-Z][^.\n]{3,40})/i);
  const client = clientMatch?.[1]?.trim() || 'Issuing Organization';

  // Budget detection
  const budgetMatch = text.match(/\$[\d,]+(?:K|M|B)?|\d+\s*(?:million|thousand|billion)/i);
  const estimatedBudget = budgetMatch?.[0] || 'To be determined';

  // Timeline detection
  const timelineMatch = text.match(/(\d+)\s*(?:months?|weeks?|years?)/i);
  const estimatedTimeline = timelineMatch?.[0] || '12-18 months';

  // Technology extraction
  const techKeywords = [
    'React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', 'AWS', 'Azure', 'GCP',
    'Kubernetes', 'Docker', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST',
    'TypeScript', 'Go', 'Rust', 'Spring', 'Django', 'FastAPI', 'Terraform',
  ];
  const technologies = techKeywords.filter((t) => lower.includes(t.toLowerCase()));
  if (technologies.length === 0) technologies.push('Cloud Platform', 'REST APIs', 'Relational Database');

  // Key requirements
  const requirementPhrases = [
    'user authentication',
    'role-based access control',
    'real-time processing',
    'data analytics',
    'reporting',
    'mobile responsive',
    'API integration',
    'audit logging',
    'high availability',
    'disaster recovery',
  ];
  const keyRequirements = requirementPhrases
    .filter((r) => lower.includes(r))
    .slice(0, 6)
    .map((r) => r.charAt(0).toUpperCase() + r.slice(1));
  if (keyRequirements.length < 3) {
    keyRequirements.push(
      'Scalable cloud-native architecture',
      'Enterprise security compliance',
      'Modern user interface',
      'Comprehensive testing and QA',
    );
  }

  // Deliverables
  const deliverables = [
    'Software application and source code',
    'Technical architecture documentation',
    'Test plans and test results',
    'Deployment and operations guide',
    'User training materials',
    'Project management artifacts',
  ];

  // Constraints
  const constraints: string[] = [];
  if (lower.includes('fedramp')) constraints.push('FedRAMP compliance required');
  if (lower.includes('hipaa')) constraints.push('HIPAA compliance required');
  if (lower.includes('section 508') || lower.includes('wcag')) constraints.push('Section 508 / WCAG 2.1 AA accessibility');
  if (lower.includes('on-premise') || lower.includes('on-prem')) constraints.push('On-premise deployment required');
  if (constraints.length === 0) {
    constraints.push(
      'Must use approved technology stack',
      'Integration with existing enterprise systems',
      'Performance SLAs must be met',
    );
  }

  // Evaluation criteria
  const evaluationCriteria = [
    'Technical approach and methodology',
    'Team qualifications and past performance',
    'Project management approach',
    'Cost and value proposition',
    'Proposed timeline and schedule',
    'Risk mitigation strategy',
  ];

  // Confidence scoring
  let confidence = 40;
  if (titleMatch) confidence += 15;
  if (clientMatch) confidence += 10;
  if (budgetMatch) confidence += 10;
  if (timelineMatch) confidence += 10;
  if (technologies.length > 2) confidence += 10;
  confidence = Math.min(95, confidence);

  return {
    title,
    client,
    projectDescription: `${title} is a comprehensive software initiative requiring skilled delivery resources across architecture, development, testing, and deployment. The project targets ${estimatedTimeline} delivery with an estimated investment of ${estimatedBudget}.`,
    estimatedBudget,
    estimatedTimeline,
    keyRequirements,
    technologies: technologies.slice(0, 8),
    deliverables,
    constraints,
    evaluationCriteria,
    wordCount: words.length,
    pageCount: Math.ceil(words.length / 250),
    confidenceScore: confidence,
  };
}

/**
 * Simulate document text extraction from file type.
 * In production, this would call pdf-parse, mammoth, etc.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.readAsText(file);
    } else {
      // For PDF/DOCX in browser demo mode, return rich sample text
      setTimeout(() => resolve(getSampleRFPText(file.name)), 500);
    }
  });
}

/**
 * Sample RFP text used for demonstration and testing.
 * Contains all key keywords to drive high extraction confidence.
 */
export function getSampleRFPText(filename: string): string {
  return `
REQUEST FOR PROPOSAL
${filename.replace(/\.[^.]+$/, '')}

SECTION 1: SCOPE OF WORK
The client organization requires a comprehensive digital transformation platform leveraging modern 
cloud-native architecture. The scope of work includes design, development, testing, deployment, 
and ongoing support of an enterprise application suite supporting 5,000+ concurrent users.

SECTION 2: OBJECTIVES
Primary objectives include delivering a scalable React/Node.js web platform integrated with 
PostgreSQL and Redis for real-time data processing. The system must provide role-based access control,
user authentication via SSO, comprehensive audit logging, and mobile responsive design.

SECTION 3: TECHNICAL REQUIREMENTS
Technology stack: React 18, TypeScript, Node.js, Python for data services, AWS cloud platform,
Kubernetes orchestration, Docker containerization, PostgreSQL database, Redis caching, 
GraphQL and REST APIs, Terraform infrastructure-as-code.

Architecture must meet high availability (99.9% uptime SLA), disaster recovery (RPO 4h, RTO 1h), 
and support horizontal scaling. WCAG 2.1 AA accessibility compliance required.

SECTION 4: TEAM REQUIREMENTS
Vendor must provide experienced team including: Senior Project Manager, Technical Lead, 
Senior Backend Developers (2), Frontend Developers (2), QA Engineers (2), DevOps Engineer, 
Business Analyst, and UX Designer. Team should have demonstrated experience in similar projects.

SECTION 5: TIMELINE
Project duration: 18 months from contract award.
Phase 1 - Discovery & Architecture: months 1-2
Phase 2 - Core Development: months 3-10
Phase 3 - Integration & Testing: months 11-14
Phase 4 - UAT & Deployment: months 15-18

SECTION 6: BUDGET
Estimated budget range: $2.5 million to $3.5 million USD.
Proposals exceeding $4 million will not be considered.

SECTION 7: DELIVERABLES
All source code and technical documentation, architecture design documents, test plans and test results,
deployment guides, operational runbooks, user training materials, knowledge transfer sessions,
and post-launch support plan.

SECTION 8: EVALUATION CRITERIA
Technical approach and methodology (35%), team qualifications and past performance (30%),
project management approach (20%), cost and value proposition (15%).

SECTION 9: RISKS AND CONSTRAINTS
Key risks include: integration complexity with legacy systems, data migration challenges,
regulatory compliance requirements, stakeholder availability constraints, and third-party API dependencies.
Vendor must provide comprehensive risk mitigation strategy.
`;
}
