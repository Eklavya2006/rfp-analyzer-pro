import { NextRequest, NextResponse } from 'next/server';

// ── News Pulse API ─────────────────────────────────────────────
// Fetches relevant news articles matching RFP keywords.
// Primary: NewsAPI.org free tier (requires NEWSAPI_KEY env var).
// Fallback: Curated static articles so the widget never shows empty.

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
}

const FALLBACK_ARTICLES: NewsArticle[] = [
  { title: 'IBM watsonx Accelerates Enterprise AI Adoption', description: 'IBM expands watsonx portfolio with new foundation models tailored for enterprise transformation projects.', url: 'https://www.ibm.com/blog/watsonx/', source: 'IBM Blog', publishedAt: new Date().toISOString() },
  { title: 'Red Hat OpenShift: The Platform for Hybrid Cloud', description: 'OpenShift continues to lead in enterprise Kubernetes deployments across financial services and government sectors.', url: 'https://www.redhat.com/en/technologies/cloud-computing/openshift', source: 'Red Hat', publishedAt: new Date().toISOString() },
  { title: 'Generative AI in Project Estimation: 2024 Trends', description: 'How AI-assisted tools are reducing RFP response time by up to 60% for system integrators.', url: 'https://www.ibm.com/thought-leadership/institute-business-value/', source: 'IBM IBV', publishedAt: new Date().toISOString() },
  { title: 'SAP S/4HANA Migration: Key Considerations', description: 'Best practices for planning and executing large-scale SAP transformations with IBM consulting expertise.', url: 'https://www.ibm.com/consulting/sap', source: 'IBM Consulting', publishedAt: new Date().toISOString() },
  { title: 'Cloud Cost Optimisation Strategies for 2024', description: 'Reducing total cost of ownership in multi-cloud deployments using FinOps practices.', url: 'https://www.ibm.com/cloud', source: 'IBM Cloud', publishedAt: new Date().toISOString() },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keywords = searchParams.get('q') ?? 'IBM enterprise digital transformation';
  const apiKey   = process.env.NEWSAPI_KEY;

  if (apiKey) {
    try {
      const query    = encodeURIComponent(keywords.split(',').slice(0, 3).join(' OR '));
      const endpoint = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`;
      const res      = await fetch(endpoint, { next: { revalidate: 1800 } });
      if (res.ok) {
        const data = await res.json();
        const articles: NewsArticle[] = (data.articles ?? []).map((a: {
          title: string; description: string; url: string;
          source: { name: string }; publishedAt: string;
        }) => ({
          title:       a.title,
          description: a.description ?? '',
          url:         a.url,
          source:      a.source?.name ?? 'News',
          publishedAt: a.publishedAt,
        }));
        return NextResponse.json({ articles, source: 'live' });
      }
    } catch { /* fall through to fallback */ }
  }

  // Filter fallback by keyword presence (case-insensitive)
  const kws = keywords.toLowerCase().split(',').map(k => k.trim());
  const filtered = FALLBACK_ARTICLES.filter(a =>
    kws.some(kw => a.title.toLowerCase().includes(kw) || a.description.toLowerCase().includes(kw))
  );
  return NextResponse.json({ articles: filtered.length ? filtered : FALLBACK_ARTICLES, source: 'fallback' });
}
