// ============================================================
// RFP Analyzer Pro — Document Parser
// Supports: PDF (via pdf-parse), DOCX (via mammoth), TXT (native)
// Falls back gracefully if binary parsing fails
// ============================================================

import type { DocumentSummary, ExtractedSections } from '@/types';

// ── Text extraction ──────────────────────────────────────────

/**
 * Extract plain text from a File/Blob.
 * - PDF  → pdf-parse (server-side only, imported dynamically)
 * - DOCX → mammoth  (server-side only, imported dynamically)
 * - TXT  → file.text()
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;

  // ── PDF ──────────────────────────────────────────────────
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Use dynamic import to avoid SSR issues (fixes "pdfParse is not a function")
      const pdfParseModule = await import('pdf-parse');
      // pdf-parse v2 exports directly; v1 exports via .default — handle both
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = ((pdfParseModule as any).default ?? pdfParseModule) as (buf: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(buffer);
      const text = parsed.text?.trim() ?? '';
      if (text.length > 50) return text;
    } catch (err) {
      console.warn('[parser] pdf-parse failed, falling back to text():', err);
    }
    // Fallback: read as plain text (works for text-based PDFs)
    return file.text().catch(() => '');
  }

  // ── DOCX ─────────────────────────────────────────────────
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value?.trim() ?? '';
      if (text.length > 50) return text;
    } catch (err) {
      console.warn('[parser] mammoth failed, falling back to text():', err);
    }
    return file.text().catch(() => '');
  }

  // ── TXT / fallback ────────────────────────────────────────
  return file.text().catch(() => '');
}

// ── Section extraction ───────────────────────────────────────

const SECTION_PATTERNS: Record<keyof ExtractedSections, RegExp[]> = {
  scope: [/scope\s+of\s+work/i, /project\s+scope/i, /work\s+scope/i],
  objectives: [/objective[s]?/i, /goal[s]?/i, /purpose/i],
  timeline: [/timeline/i, /schedule/i, /milestones?/i, /duration/i],
  budget: [/budget/i, /cost/i, /pricing/i, /financial/i],
  technicalRequirements: [/technical\s+req/i, /technology\s+req/i, /tech\s+stack/i],
  teamRequirements: [/team\s+req/i, /staffing/i, /resource[s]?/i, /personnel/i],
  evaluationCriteria: [/evaluation/i, /criteria/i, /selection\s+criteria/i, /scoring/i],
  risks: [/risk[s]?/i, /constraint[s]?/i, /assumption[s]?/i, /challenge[s]?/i],
  deliverables: [/deliverable[s]?/i, /output[s]?/i, /artifact[s]?/i],
};

export function extractSections(text: string): ExtractedSections {
  const lines = text.split('\n');
  const sections: ExtractedSections = {
    scope: '', objectives: '', timeline: '', budget: '',
    technicalRequirements: '', teamRequirements: '',
    evaluationCriteria: '', risks: '', deliverables: '',
  };

  const keys = Object.keys(sections) as (keyof ExtractedSections)[];
  let currentSection: keyof ExtractedSections | null = null;
  const sectionContent: Record<keyof ExtractedSections, string[]> = {} as Record<keyof ExtractedSections, string[]>;
  keys.forEach((k) => { sectionContent[k] = []; });

  for (const line of lines) {
    // Check if this line is a section header
    let matched = false;
    for (const key of keys) {
      if (SECTION_PATTERNS[key].some((re) => re.test(line))) {
        currentSection = key;
        matched = true;
        break;
      }
    }
    if (!matched && currentSection) {
      sectionContent[currentSection].push(line);
    }
  }

  // Take up to 500 chars per section
  keys.forEach((k) => {
    sections[k] = sectionContent[k].join('\n').trim().slice(0, 500);
  });

  return sections;
}

// ── Summary generation ───────────────────────────────────────

export function generateSummary(text: string, filename: string): DocumentSummary {
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const pageCount = Math.max(1, Math.round(wordCount / 300));

  // ── Budget detection ─────────────────────────────────────
  const budgetMatch = text.match(/\$[\d,.]+\s*(?:M|million|B|billion|K|thousand)?(?:\s*(?:to|-)\s*\$[\d,.]+\s*(?:M|million|B|billion|K|thousand)?)?/i);
  const estimatedBudget = budgetMatch ? budgetMatch[0].trim() : '$2M – $5M (estimated)';

  // ── Timeline detection ───────────────────────────────────
  const timelineMatch = text.match(/(\d+)\s*(?:months?|weeks?|years?)/i);
  const estimatedTimeline = timelineMatch ? timelineMatch[0] : '12–18 months';

  // ── Technology keywords ──────────────────────────────────
  const techKeywords = [
    ['ibm cloud', 'IBM Cloud'], ['watson', 'IBM Watson AI'],
    ['watsonx', 'IBM watsonx'], ['kubernetes', 'Kubernetes'],
    ['react', 'React'], ['node', 'Node.js'], ['python', 'Python'],
    ['java', 'Java'], ['azure', 'Microsoft Azure'], ['aws', 'AWS'],
    ['docker', 'Docker'], ['postgresql', 'PostgreSQL'], ['mongodb', 'MongoDB'],
    ['kafka', 'Apache Kafka'], ['spark', 'Apache Spark'],
    ['terraform', 'Terraform'], ['ansible', 'Ansible'],
    ['openshift', 'Red Hat OpenShift'],
  ];
  const technologies = techKeywords
    .filter(([kw]) => lower.includes(kw))
    .map(([, label]) => label)
    .slice(0, 8);
  if (technologies.length === 0) technologies.push('IBM Cloud', 'Watson AI', 'watsonx.data');

  // ── Requirements extraction ──────────────────────────────
  const requirementKeywords = [
    'cloud migration', 'ai/ml', 'machine learning', 'data integration',
    'security', 'compliance', 'training', 'devops', 'microservices',
    'api development', 'data governance', 'reporting', 'analytics',
  ];
  const keyRequirements = requirementKeywords
    .filter((kw) => lower.includes(kw))
    .map((kw) => kw.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
    .slice(0, 6);
  if (keyRequirements.length === 0) {
    keyRequirements.push('Cloud Infrastructure', 'AI/ML Implementation', 'Data Integration', 'Security & Compliance');
  }

  // ── Confidence score ─────────────────────────────────────
  let confidence = 60;
  if (wordCount > 500) confidence += 10;
  if (wordCount > 1500) confidence += 10;
  if (budgetMatch) confidence += 8;
  if (timelineMatch) confidence += 7;
  if (technologies.length >= 3) confidence += 5;
  confidence = Math.min(99, confidence);

  return {
    title: filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
    client: extractClientName(text) || 'Enterprise Client',
    projectDescription: extractDescription(text) ||
      'Digital transformation initiative requiring cloud, AI/ML, data integration and security capabilities.',
    estimatedBudget,
    estimatedTimeline,
    keyRequirements,
    technologies,
    deliverables: [
      'Architecture Document', 'MVP Release',
      'UAT Sign-off', 'Deployment Runbook', 'Training Material',
    ],
    constraints: extractConstraints(text),
    evaluationCriteria: ['Technical fit', 'Cost competitiveness', 'IBM expertise', 'Delivery track record'],
    wordCount,
    pageCount,
    confidenceScore: confidence,
  };
}

function extractClientName(text: string): string {
  const match = text.match(/(?:client|customer|organization|company|issued\s+by)[:\s]+([A-Z][A-Za-z\s&,.]{2,40})/);
  return match ? match[1].trim().slice(0, 40) : '';
}

function extractDescription(text: string): string {
  const match = text.match(/(?:executive\s+summary|overview|introduction)[:\s\n]+([^\n]{40,300})/i);
  return match ? match[1].trim() : '';
}

function extractConstraints(text: string): string[] {
  const constraints: string[] = [];
  const timeMatch = text.match(/(?:go-?live|launch|deadline)[^.]*?(\d+)\s*months?/i);
  if (timeMatch) constraints.push(`Go-live within ${timeMatch[1]} months`);
  const budgetMatch = text.match(/budget[^.]*?not\s+to\s+exceed[^.]*?\$[\d,.]+[MK]?/i);
  if (budgetMatch) constraints.push(budgetMatch[0].trim().slice(0, 60));
  if (text.toLowerCase().includes('zero downtime')) constraints.push('Zero downtime migration required');
  if (constraints.length === 0) {
    constraints.push('Go-live within 18 months', 'Budget not to exceed $4M');
  }
  return constraints;
}

// ── Demo RFP text ─────────────────────────────────────────────
export function getSampleRFPText(filename?: string): string {
  return `REQUEST FOR PROPOSAL — Enterprise Digital Transformation Platform
${filename ? `Document: ${filename}` : ''}

Section 1: Executive Summary
The client seeks an enterprise partner to deliver a comprehensive digital transformation encompassing
cloud infrastructure migration, AI/ML capabilities, data governance, and security compliance.
Estimated budget: $2.5M to $4M. Timeline: 18 months from contract execution.

Section 2: Scope of Work
2.1 Cloud Infrastructure: Migrate all on-premise workloads to IBM Cloud hybrid architecture.
2.2 Data Platform: Implement watsonx.data as the central data lakehouse with IBM DataStage ETL.
2.3 AI & Machine Learning: Deploy IBM Watson AI for NLP document processing and watsonx for code generation.
2.4 Security & Compliance: Implement IBM Security QRadar SIEM. Achieve SOC2 Type II and ISO 27001.

Section 3: Deliverables
3.1 Solution Architecture Document — Page 5
3.2 MVP Platform Release — Page 11
3.3 UAT Sign-off and Go-Live Approval — Page 17

Section 4: Timeline
Project timeline: 18 months. Key milestones at weeks 4, 12, 24, 36, 52, and 72.

Section 5: Budget
Budget range: $2.5M to $4M including licensing, professional services, and infrastructure.`;
}
