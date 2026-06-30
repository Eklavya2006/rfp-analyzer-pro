'use client';
// NewsPulseWidget — fetches articles from /api/news-pulse matching RFP keywords.
// Drop-in: <NewsPulseWidget keywords={['SAP','OpenShift']} />
// Always shows fallback curated IBM articles — no API key required.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [loading,  setLoading]  = useState(true);
  const [source,   setSource]   = useState<'live' | 'fallback' | null>(null);
  const [error,    setError]    = useState(false);

  // Stable key — only re-fetch when the actual keyword list changes
  const keyString = useMemo(() => keywords.slice().sort().join(','), [keywords]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res  = await fetch(`/api/news-pulse?q=${encodeURIComponent(keyString)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const fetched: NewsArticle[] = data.articles ?? [];
      setArticles(fetched.length ? fetched : []);
      setSource(data.source ?? 'fallback');
    } catch {
      setError(true);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [keyString]);

  // Fire once when keyString changes (stable — sorted join)
  useEffect(() => { load(); }, [load]);

  // Derive icon/dot colours from current state
  const iconColor = error ? '#F43F5E' : loading ? '#F59E0B' : source === 'live' ? '#10B981' : '#6366F1';
  const dotColor  = error ? '#F43F5E' : loading ? '#F59E0B' : source === 'live' ? '#10B981' : '#6366F1';

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E2E8F0',
      borderRadius: 16, padding: '18px 20px',
    }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {/* State-reactive activity dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: dotColor,
          animation: loading ? 'pulse 1.4s ease-in-out infinite' : 'none',
          boxShadow: source === 'live' && !loading ? `0 0 0 3px rgba(16,185,129,0.2)` : 'none',
          transition: 'background 0.3s',
        }} />
        {/* Icon colour reacts to state */}
        <Newspaper size={14} style={{ color: iconColor, transition: 'color 0.3s' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Industry Pulse</span>
        {source === 'live' && !loading && (
          <span style={{ fontSize: 10, fontWeight: 600, background: '#D1FAE5', color: '#065F46', borderRadius: 999, padding: '1px 7px' }}>
            LIVE
          </span>
        )}
        {source === 'fallback' && !loading && (
          <span style={{ fontSize: 10, fontWeight: 600, background: '#FEF3C7', color: '#92400E', borderRadius: 999, padding: '1px 7px' }}>
            CURATED
          </span>
        )}
        {loading && (
          <span style={{ fontSize: 10, fontWeight: 600, background: '#FEF9EE', color: '#B45309', borderRadius: 999, padding: '1px 7px' }}>
            LOADING…
          </span>
        )}
        <button
          onClick={load}
          disabled={loading}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer', color: '#94A3B8', padding: 2 }}
          title="Refresh"
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Keyword chips */}
      <div className="flex flex-wrap gap-1 mb-3">
        {keywords.slice(0, 6).map(kw => (
          <span key={kw} style={{
            fontSize: 10, fontWeight: 600, background: '#EEF2FF', color: '#6366F1',
            borderRadius: 999, padding: '2px 8px', border: '1px solid #C7D2FE',
          }}>
            {kw}
          </span>
        ))}
      </div>

      {/* States */}
      {loading && (
        <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>
          Fetching articles…
        </div>
      )}
      {!loading && error && (
        <div style={{ fontSize: 12, color: '#F43F5E', textAlign: 'center', padding: '8px 0 4px' }}>
          Could not load articles.{' '}
          <button onClick={load} style={{ color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Retry
          </button>
        </div>
      )}
      {!loading && !error && articles.length === 0 && (
        <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>
          No articles found.
        </div>
      )}

      {/* Article list */}
      {!loading && !error && articles.map((a, i) => (
        <div key={i} style={{
          borderTop: i > 0 ? '1px solid #F1F5F9' : 'none',
          paddingTop: i > 0 ? 10 : 0,
          marginBottom: i < articles.length - 1 ? 10 : 0,
        }}>
          <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <div className="flex items-start justify-between gap-2">
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', lineHeight: 1.4, flex: 1 }}>
                {a.title}
              </span>
              <ExternalLink size={10} style={{ color: '#94A3B8', flexShrink: 0, marginTop: 2 }} />
            </div>
          </a>
          {a.description && (
            <p style={{ fontSize: 11, color: '#64748B', marginTop: 3, lineHeight: 1.5 }}>
              {a.description.length > 110 ? a.description.slice(0, 110) + '…' : a.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 600 }}>{a.source}</span>
            <span style={{ fontSize: 10, color: '#94A3B8' }}>· {timeAgo(a.publishedAt)}</span>
          </div>
        </div>
      ))}

      {/* Keyframes — inline since no CSS file */}
      <style>{`
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
      `}</style>
    </div>
  );
}
