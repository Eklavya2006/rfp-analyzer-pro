'use client';
// NewsPulseWidget — fetches articles from /api/news-pulse matching RFP keywords.
// Drop-in component: add anywhere with <NewsPulseWidget keywords={['SAP','OpenShift']} />
// Falls back to curated IBM articles when no API key is configured.

import React, { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';
import type { NewsArticle } from '@/app/api/news-pulse/route';

interface Props {
  keywords?: string[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1)  return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NewsPulseWidget({ keywords = ['IBM', 'enterprise AI', 'digital transformation'] }: Props) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [source,   setSource]   = useState<'live' | 'fallback' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const q   = keywords.join(',');
      const res = await fetch(`/api/news-pulse?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setArticles(data.articles ?? []);
      setSource(data.source);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [keywords.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E2E8F0',
      borderRadius: 16, padding: '18px 20px',
    }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Newspaper size={14} className="text-indigo-400" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Industry Pulse</span>
        {source === 'live' && (
          <span style={{ fontSize: 10, fontWeight: 600, background: '#D1FAE5', color: '#065F46', borderRadius: 999, padding: '1px 7px' }}>
            LIVE
          </span>
        )}
        {source === 'fallback' && (
          <span style={{ fontSize: 10, fontWeight: 600, background: '#FEF3C7', color: '#92400E', borderRadius: 999, padding: '1px 7px' }}>
            CURATED
          </span>
        )}
        <button
          onClick={load}
          disabled={loading}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Keyword chips */}
      <div className="flex flex-wrap gap-1 mb-3">
        {keywords.slice(0, 5).map(kw => (
          <span key={kw} style={{
            fontSize: 10, fontWeight: 600, background: '#EEF2FF', color: '#6366F1',
            borderRadius: 999, padding: '2px 8px', border: '1px solid #C7D2FE',
          }}>
            {kw}
          </span>
        ))}
      </div>

      {/* Articles */}
      {loading && (
        <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>
          Fetching articles…
        </div>
      )}
      {!loading && articles.length === 0 && (
        <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>
          No articles found.
        </div>
      )}
      {!loading && articles.map((a, i) => (
        <div key={i} style={{
          borderTop: i > 0 ? '1px solid #F1F5F9' : 'none',
          paddingTop: i > 0 ? 10 : 0,
          marginBottom: i < articles.length - 1 ? 10 : 0,
        }}>
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex items-start justify-between gap-2">
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', lineHeight: 1.4, flex: 1 }}>
                {a.title}
              </span>
              <ExternalLink size={10} style={{ color: '#94A3B8', flexShrink: 0, marginTop: 2 }} />
            </div>
          </a>
          {a.description && (
            <p style={{ fontSize: 11, color: '#64748B', marginTop: 3, lineHeight: 1.5 }}>
              {a.description.length > 100 ? a.description.slice(0, 100) + '…' : a.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 600 }}>{a.source}</span>
            <span style={{ fontSize: 10, color: '#94A3B8' }}>· {timeAgo(a.publishedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
