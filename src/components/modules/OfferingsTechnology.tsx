'use client';
// ============================================================
// OfferingsTechnology — S4: Service Line badge + Group by toggle
// + IBM Cloud Catalog live enrichment (Feature 6 — feature/enriched)
// ============================================================
import React, { useState, useEffect } from 'react';
import { useRFPStore } from '@/lib/store';
import type { OfferingCategory, ServiceLine } from '@/types';
import type { CatalogEnrichment } from '@/app/api/ibm-catalog/route';
import { ExternalLink } from 'lucide-react';

const ACCENT = '#1E3A5F';
const TEAL   = '#0D7377';

const CATEGORY_COLORS: Record<OfferingCategory, { bg: string; border: string; badge: string; text: string }> = {
  'Cloud':            { bg: '#EFF6FF', border: '#BFDBFE', badge: ACCENT,   text: ACCENT },
  'AI/ML':            { bg: '#F5F3FF', border: '#DDD6FE', badge: '#7C3AED', text: '#5B21B6' },
  'Security':         { bg: '#FFF1F2', border: '#FECDD3', badge: '#DC2626', text: '#991B1B' },
  'Integration':      { bg: '#ECFDF5', border: '#A7F3D0', badge: TEAL,      text: '#065F46' },
  'Consulting':       { bg: '#FFFBEB', border: '#FDE68A', badge: '#D97706', text: '#92400E' },
  'Data & Analytics': { bg: '#EFF6F6', border: '#99F6E4', badge: '#0D9488', text: '#134E4A' },
};

const SERVICE_LINE_COLORS: Record<ServiceLine, string> = {
  'Cloud & Platform Services': '#1E3A5F',
  'Data & AI':                 '#7C3AED',
  'Security Services':         '#DC2626',
  'Application Modernization': '#0D7377',
  'Managed Services':          '#D97706',
  'General Consulting':        '#4B5563',
};

const CATEGORY_ORDER: OfferingCategory[] = ['Cloud', 'AI/ML', 'Security', 'Integration', 'Consulting', 'Data & Analytics'];
const SERVICE_LINE_ORDER: ServiceLine[] = ['Cloud & Platform Services', 'Data & AI', 'Security Services', 'Application Modernization', 'Managed Services', 'General Consulting'];

function RelevanceGauge({ score, color }: { score: number; color: string }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e0e0e0" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 18 18)" />
        <text x="18" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <span className="text-[9px] text-gray-400 mt-0.5">Relevance</span>
    </div>
  );
}

export default function OfferingsTechnology() {
  const activeDocumentId = useRFPStore((state) => state.activeDocumentId);
  const analysisResults = useRFPStore((state) => state.analysisResults);
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [groupByServiceLine, setGroupByServiceLine] = useState(false);

  if (!result?.offerings) return <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document to see IBM offerings</div>;

  const offerings = result.offerings;
  const groupedByCategory = React.useMemo(
    () => CATEGORY_ORDER.map((category) => ({
      category,
      items: offerings
        .filter((offering) => offering.category === category)
        .sort((a, b) => b.relevanceScore - a.relevanceScore),
    })).filter((group) => group.items.length > 0),
    [offerings]
  );
  const groupedByServiceLine = React.useMemo(
    () => SERVICE_LINE_ORDER.map((serviceLine) => ({
      serviceLine,
      items: offerings
        .filter((offering) => offering.serviceLine === serviceLine)
        .sort((a, b) => b.relevanceScore - a.relevanceScore),
    })).filter((group) => group.items.length > 0),
    [offerings]
  );

  // ── IBM Cloud Catalog enrichment ──────────────────────────
  const [catalogItems, setCatalogItems] = useState<CatalogEnrichment[]>([]);
  const [catalogSource, setCatalogSource] = useState<'live' | 'fallback' | null>(null);

  useEffect(() => {
    const keywords = offerings.slice(0, 4).flatMap(o => o.tags).slice(0, 6).join(',');
    fetch(`/api/ibm-catalog?q=${encodeURIComponent(keywords)}`)
      .then(r => r.json())
      .then(d => { setCatalogItems(d.items ?? []); setCatalogSource(d.source); })
      .catch(() => {});
  }, [offerings]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* IBM Cloud Catalog live enrichment panel */}
      {catalogItems.length > 0 && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '14px 18px' }}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1E3A5F' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>IBM Cloud Catalog</span>
            {catalogSource === 'live' && <span style={{ fontSize: 10, fontWeight: 600, background: '#D1FAE5', color: '#065F46', borderRadius: 999, padding: '1px 7px' }}>LIVE</span>}
            {catalogSource === 'fallback' && <span style={{ fontSize: 10, fontWeight: 600, background: '#FEF3C7', color: '#92400E', borderRadius: 999, padding: '1px 7px' }}>CURATED</span>}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#3B82F6' }}>{catalogItems.length} products matched</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {catalogItems.map(item => (
              <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: '#FFFFFF', border: '1px solid #BFDBFE',
                  borderRadius: 8, padding: '5px 10px', textDecoration: 'none',
                  fontSize: 11, color: '#1E3A5F', fontWeight: 600,
                }}>
                {item.name}
                <ExternalLink size={9} style={{ color: '#93C5FD' }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#1A202C' }}>IBM Offerings & Technology</h2>
          <p className="text-xs mt-0.5" style={{ color: '#4A5568' }}>{offerings.length} offerings identified</p>
        </div>
        {/* Group by Service Line toggle */}
        <div className="flex items-center gap-3 bg-white rounded-xl border px-4 py-2" style={{ borderColor: '#E2E8F0' }}>
          <span className="text-xs font-semibold" style={{ color: '#1A202C' }}>Group by Service Line</span>
          <button
            onClick={() => setGroupByServiceLine((v) => !v)}
            className="relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none"
            style={{ background: groupByServiceLine ? TEAL : '#CBD5E0' }}
            aria-checked={groupByServiceLine}
            role="switch"
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
              style={{ transform: groupByServiceLine ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </div>

      {/* Grouped by Category */}
      {!groupByServiceLine && groupedByCategory.map(({ category, items }) => {
        const colors = CATEGORY_COLORS[category];
        return (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: colors.badge }}>{category}</div>
              <div className="text-xs text-gray-400">{items.length} offering{items.length !== 1 ? 's' : ''}</div>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((offering) => (
                <div key={offering.id} className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: colors.bg, borderColor: colors.border }}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="text-sm font-bold" style={{ color: colors.text }}>{offering.name}</div>
                    <div className="shrink-0"><RelevanceGauge score={offering.relevanceScore} color={colors.badge} /></div>
                  </div>
                  {/* Service Line badge */}
                  <div className="mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: SERVICE_LINE_COLORS[offering.serviceLine] ?? '#4B5563' }}>
                      {offering.serviceLine}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">{offering.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {offering.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.07)', color: colors.text }}>{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Grouped by Service Line */}
      {groupByServiceLine && groupedByServiceLine.map(({ serviceLine, items }) => {
        const slColor = SERVICE_LINE_COLORS[serviceLine];
        return (
          <div key={serviceLine}>
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: slColor }}>{serviceLine}</div>
              <div className="text-xs text-gray-400">{items.length} offering{items.length !== 1 ? 's' : ''}</div>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((offering) => {
                const colors = CATEGORY_COLORS[offering.category];
                return (
                  <div key={offering.id} className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{ background: colors.bg, borderColor: colors.border }}>
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <div className="text-sm font-bold" style={{ color: colors.text }}>{offering.name}</div>
                        <span className="text-[10px] text-gray-500 mt-0.5">{offering.category}</span>
                      </div>
                      <div className="shrink-0"><RelevanceGauge score={offering.relevanceScore} color={colors.badge} /></div>
                    </div>
                    <p className="text-xs text-gray-600 mb-3 leading-relaxed">{offering.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {offering.tags.map((tag) => (
                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(0,0,0,0.07)', color: colors.text }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
