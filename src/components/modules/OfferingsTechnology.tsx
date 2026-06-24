'use client';
import React from 'react';
import { useRFPStore } from '@/lib/store';
import type { OfferingCategory } from '@/types';

const IBM_BLUE = '#0F62FE';

const CATEGORY_COLORS: Record<OfferingCategory, { bg: string; border: string; badge: string; text: string }> = {
  'Cloud':            { bg: '#e8f2ff', border: '#b3d1ff', badge: '#0F62FE', text: '#0043CE' },
  'AI/ML':            { bg: '#f6f2ff', border: '#d4bbff', badge: '#7c3aed', text: '#5b21b6' },
  'Security':         { bg: '#fff1f1', border: '#ffb3b8', badge: '#da1e28', text: '#a2191f' },
  'Integration':      { bg: '#defbe6', border: '#a7f0ba', badge: '#198038', text: '#0e6027' },
  'Consulting':       { bg: '#fdf6dd', border: '#f8d671', badge: '#b45309', text: '#8a3800' },
  'Data & Analytics': { bg: '#f0f4ff', border: '#c0caff', badge: '#4338ca', text: '#312e81' },
};

const CATEGORY_ORDER: OfferingCategory[] = ['Cloud', 'AI/ML', 'Security', 'Integration', 'Consulting', 'Data & Analytics'];

export default function OfferingsTechnology() {
  const { activeDocumentId, analysisResults } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  if (!result?.offerings) return <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document to see IBM offerings</div>;

  const offerings = result.offerings;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {CATEGORY_ORDER.map((category) => {
        const items = offerings.filter((o) => o.category === category).sort((a, b) => b.relevanceScore - a.relevanceScore);
        if (items.length === 0) return null;
        const colors = CATEGORY_COLORS[category];
        return (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: colors.badge }}>
                {category}
              </div>
              <div className="text-xs text-gray-400">{items.length} offering{items.length !== 1 ? 's' : ''}</div>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((offering) => (
                <div key={offering.id} className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: colors.bg, borderColor: colors.border }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="text-sm font-bold" style={{ color: colors.text }}>{offering.name}</div>
                    <div className="shrink-0">
                      <RelevanceGauge score={offering.relevanceScore} color={colors.badge} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">{offering.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {offering.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.07)', color: colors.text }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RelevanceGauge({ score, color }: { score: number; color: string }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e0e0e0" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 18 18)" />
        <text x="18" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <span className="text-[9px] text-gray-400 mt-0.5">Relevance</span>
    </div>
  );
}
