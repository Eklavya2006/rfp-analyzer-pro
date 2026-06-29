import { NextRequest, NextResponse } from 'next/server';

// ── IBM Cloud Global Catalog API ───────────────────────────────
// Public endpoint — no auth required.
// Fetches live IBM Cloud service listings and maps them to RFP keywords.
// Falls back to curated static enrichment data if the API is unreachable.

export interface CatalogEnrichment {
  id: string;
  name: string;
  description: string;
  tags: string[];
  url: string;
  category: string;
}

const FALLBACK_ENRICHMENT: CatalogEnrichment[] = [
  { id: 'watsonx-ai',   name: 'IBM watsonx.ai',         tags: ['AI','ML','LLM','generative-ai'], category: 'AI/ML',       url: 'https://www.ibm.com/products/watsonx-ai',         description: 'Enterprise AI studio for foundation models and machine learning.' },
  { id: 'openshift',    name: 'Red Hat OpenShift',       tags: ['kubernetes','containers','devops','cloud-native'], category: 'Cloud', url: 'https://www.redhat.com/en/technologies/cloud-computing/openshift', description: 'Enterprise Kubernetes platform for hybrid cloud.' },
  { id: 'cp4d',         name: 'Cloud Pak for Data',      tags: ['data','analytics','data-lake','AI'], category: 'Data & Analytics', url: 'https://www.ibm.com/products/cloud-pak-for-data', description: 'Unified data and AI platform on any cloud.' },
  { id: 'apic',         name: 'IBM API Connect',         tags: ['api','integration','microservices'], category: 'Integration', url: 'https://www.ibm.com/products/api-connect',  description: 'Full lifecycle API management platform.' },
  { id: 'qradar',       name: 'IBM QRadar SIEM',         tags: ['security','siem','threat-detection'], category: 'Security', url: 'https://www.ibm.com/products/qradar-siem',  description: 'AI-powered security intelligence and threat detection.' },
  { id: 'mq',           name: 'IBM MQ',                  tags: ['messaging','integration','middleware'], category: 'Integration', url: 'https://www.ibm.com/products/mq',          description: 'Enterprise messaging middleware for reliable data exchange.' },
  { id: 'turbonomic',   name: 'IBM Turbonomic',          tags: ['cost-optimisation','cloud','performance'], category: 'Cloud', url: 'https://www.ibm.com/products/turbonomic',  description: 'Application resource management for cloud cost control.' },
  { id: 'db2',          name: 'IBM Db2',                 tags: ['database','sql','data'], category: 'Data & Analytics', url: 'https://www.ibm.com/products/db2',              description: 'Enterprise-grade relational database management system.' },
];

let cache: { items: CatalogEnrichment[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function fetchCatalog(): Promise<CatalogEnrichment[]> {
  // IBM Cloud Global Catalog public API — no auth
  const res = await fetch(
    'https://globalcatalog.cloud.ibm.com/api/v1?q=kind:platform+active:true&limit=20&offset=0',
    { next: { revalidate: 21600 } }
  );
  if (!res.ok) throw new Error(`Catalog API ${res.status}`);
  const data = await res.json();

  return (data.resources ?? []).slice(0, 8).map((r: {
    id: string; name: string;
    overview_ui?: { en?: { description?: string } };
    tags?: string[];
    metadata?: { ui?: { urls?: { doc_url?: string } } };
  }) => ({
    id:          r.id,
    name:        r.name,
    description: r.overview_ui?.en?.description ?? '',
    tags:        r.tags ?? [],
    url:         r.metadata?.ui?.urls?.doc_url ?? `https://cloud.ibm.com/catalog/services/${r.id}`,
    category:    'IBM Cloud',
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keywords = (searchParams.get('q') ?? '').toLowerCase().split(',').map(k => k.trim()).filter(Boolean);

  try {
    if (!cache || Date.now() - cache.fetchedAt > CACHE_TTL_MS) {
      const items = await fetchCatalog();
      cache = { items, fetchedAt: Date.now() };
    }
    const items = keywords.length
      ? cache.items.filter(i => keywords.some(kw => i.tags.some(t => t.includes(kw)) || i.name.toLowerCase().includes(kw)))
      : cache.items;
    return NextResponse.json({ items: items.length ? items : cache.items.slice(0, 5), source: 'live' });
  } catch {
    const items = keywords.length
      ? FALLBACK_ENRICHMENT.filter(i => keywords.some(kw => i.tags.some(t => t.includes(kw)) || i.name.toLowerCase().includes(kw)))
      : FALLBACK_ENRICHMENT;
    return NextResponse.json({ items: items.length ? items : FALLBACK_ENRICHMENT.slice(0, 5), source: 'fallback' });
  }
}
