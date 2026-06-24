'use client';
// ScopeDeliverables — Dark glassmorphism + hyperlinks + placeholder filter
import React, { useState } from 'react';
import { Plus, Trash2, Search, FileText } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import type { ScopeItem, DeliverableItem } from '@/types';

// ── Dark palette ──────────────────────────────────────────────
const INDIGO = '#6366F1';
const CYAN   = '#06B6D4';
const GLASS  = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';

const CAT_COLORS = {
  'in-scope':     { bg: 'rgba(16,185,129,0.15)',  text: '#34D399', border: 'rgba(16,185,129,0.3)' },
  'out-of-scope': { bg: 'rgba(244,63,94,0.12)',   text: '#FB7185', border: 'rgba(244,63,94,0.25)' },
  'assumption':   { bg: 'rgba(245,158,11,0.12)',  text: '#FCD34D', border: 'rgba(245,158,11,0.25)' },
};

const PRIO_COLORS = {
  high:   { bg: 'rgba(244,63,94,0.12)',  text: '#FB7185' },
  medium: { bg: 'rgba(245,158,11,0.12)', text: '#FCD34D' },
  low:    { bg: 'rgba(16,185,129,0.12)', text: '#34D399' },
};

function navigateToSection(setActiveTab: (t: 'document-analyzer') => void, section: string, page: string) {
  try {
    sessionStorage.setItem('rfp-scroll-hint', JSON.stringify({ section, page, ts: Date.now() }));
  } catch {}
  setActiveTab('document-analyzer');
}

function RefLink({ section, page }: { section: string; page: string }) {
  const [show, setShow] = useState(false);
  const { setActiveTab } = useRFPStore();
  return (
    <div className="relative inline-flex items-center gap-1">
      <button type="button"
        onClick={() => navigateToSection(setActiveTab, section, page)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center gap-1 text-xs underline underline-offset-2 font-medium transition-all hover:opacity-70 cursor-pointer"
        style={{ color: CYAN }}
        title={`View source: ${section} — ${page}`}>
        {section}
        <FileText size={10} />
      </button>
      {show && (
        <div className="absolute left-0 bottom-full mb-1 z-20 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl pointer-events-none"
          style={{ background: '#1E2436', border: '1px solid rgba(99,102,241,0.3)' }}>
          📄 View in document: <span className="font-semibold">{section}</span> — {page}
        </div>
      )}
    </div>
  );
}

function PageLink({ page, section }: { page: string; section: string }) {
  const [show, setShow] = useState(false);
  const { setActiveTab } = useRFPStore();
  return (
    <div className="relative inline-flex items-center gap-1">
      <button type="button"
        onClick={() => navigateToSection(setActiveTab, section, page)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center gap-1 text-xs underline underline-offset-2 font-medium transition-all hover:opacity-70 cursor-pointer"
        style={{ color: INDIGO }}
        title={`View source: ${section} — ${page}`}>
        {page}
        <FileText size={10} />
      </button>
      {show && (
        <div className="absolute left-0 bottom-full mb-1 z-20 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl pointer-events-none"
          style={{ background: '#1E2436', border: '1px solid rgba(99,102,241,0.3)' }}>
          📄 View in document: <span className="font-semibold">{section}</span> — {page}
        </div>
      )}
    </div>
  );
}

export default function ScopeDeliverables() {
  const { activeDocumentId, analysisResults, setAnalysisResult } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [tab, setTab] = useState<'scope' | 'deliverables'>('scope');
  const [search, setSearch] = useState('');

  if (!result) return (
    <div className="p-6 text-center mt-20" style={{ color: '#475569' }}>
      Upload a document to see scope items
    </div>
  );

  const PLACEHOLDERS = /^(not found|n\/a|placeholder|tbd|–|—|-|\?|null|undefined|none)$/i;
  function cleanDesc(d: string): string {
    return d.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim();
  }
  function isValidDesc(d: string): boolean {
    const c = cleanDesc(d);
    return c.length > 5 && !PLACEHOLDERS.test(c);
  }

  const scopeItems        = (result.scopeItems ?? []).filter((i) => isValidDesc(i.description));
  const deliverableItems  = (result.deliverableItems ?? []).filter((i) => isValidDesc(i.description));

  const filteredScope = scopeItems.filter((i) =>
    cleanDesc(i.description).toLowerCase().includes(search.toLowerCase()) ||
    i.referenceSection.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDel = deliverableItems.filter((i) =>
    cleanDesc(i.description).toLowerCase().includes(search.toLowerCase()) ||
    i.phase.toLowerCase().includes(search.toLowerCase())
  );

  const addScope = () => {
    const newItem: ScopeItem = { id: uuid(), description: 'New scope item', referenceSection: 'Section TBD', pageNumber: 'Page TBD', category: 'in-scope' };
    setAnalysisResult(activeDocumentId!, { ...result, scopeItems: [...scopeItems, newItem] });
  };
  const removeScope = (id: string) =>
    setAnalysisResult(activeDocumentId!, { ...result, scopeItems: scopeItems.filter((i) => i.id !== id) });
  const addDeliverable = () => {
    const newItem: DeliverableItem = { id: uuid(), description: 'New deliverable', referenceSection: 'Section TBD', pageNumber: 'Page TBD', phase: 'Development', priority: 'medium' };
    setAnalysisResult(activeDocumentId!, { ...result, deliverableItems: [...deliverableItems, newItem] });
  };
  const removeDeliverable = (id: string) =>
    setAnalysisResult(activeDocumentId!, { ...result, deliverableItems: deliverableItems.filter((i) => i.id !== id) });
  const updateScope = (id: string, field: keyof ScopeItem, value: string) =>
    setAnalysisResult(activeDocumentId!, { ...result, scopeItems: scopeItems.map((i) => i.id === id ? { ...i, [field]: value } : i) });
  const updateDeliverable = (id: string, field: keyof DeliverableItem, value: string) =>
    setAnalysisResult(activeDocumentId!, { ...result, deliverableItems: deliverableItems.map((i) => i.id === id ? { ...i, [field]: value } : i) });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Animated tab pill */}
        <div className="flex rounded-xl p-1 gap-1"
          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}` }}>
          {(['scope', 'deliverables'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
              style={tab === t
                ? { background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)`, color: '#fff', boxShadow: `0 2px 8px rgba(99,102,241,0.4)` }
                : { color: '#94A3B8', background: 'transparent' }}>
              {t === 'scope' ? `Scope Items (${scopeItems.length})` : `Deliverables (${deliverableItems.length})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl px-3 py-1.5"
            style={{ background: GLASS, border: `1px solid ${BORDER}` }}>
            <Search size={14} style={{ color: '#475569' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              className="text-sm outline-none w-40 bg-transparent"
              style={{ color: '#F1F5F9' }} />
          </div>
          <button onClick={tab === 'scope' ? addScope : addDeliverable}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl text-white transition-all duration-200"
            style={{
              background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)`,
              boxShadow: `0 2px 10px rgba(99,102,241,0.35)`,
            }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* ── Scope table ── */}
      {tab === 'scope' ? (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: GLASS }}>
          <div className="overflow-x-auto">
            <table className="dark-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Reference Section ↗</th>
                  <th>Page ↗</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredScope.map((item) => {
                  const colors = CAT_COLORS[item.category];
                  return (
                    <tr key={item.id}>
                      <td>
                        <input value={item.description} onChange={(e) => updateScope(item.id, 'description', e.target.value)}
                          className="w-full text-sm outline-none bg-transparent transition-colors"
                          style={{ color: '#F1F5F9', borderBottom: '1px dashed rgba(255,255,255,0.1)' }} />
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <RefLink section={item.referenceSection} page={item.pageNumber} />
                          <input value={item.referenceSection} onChange={(e) => updateScope(item.id, 'referenceSection', e.target.value)}
                            className="text-[10px] outline-none bg-transparent w-full"
                            style={{ color: '#475569' }} placeholder="Edit section…" />
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <PageLink page={item.pageNumber} section={item.referenceSection} />
                          <input value={item.pageNumber} onChange={(e) => updateScope(item.id, 'pageNumber', e.target.value)}
                            className="text-[10px] outline-none bg-transparent w-full"
                            style={{ color: '#475569' }} placeholder="Edit page…" />
                        </div>
                      </td>
                      <td>
                        <select value={item.category} onChange={(e) => updateScope(item.id, 'category', e.target.value)}
                          className="text-xs font-semibold px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer"
                          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                          <option value="in-scope">In Scope</option>
                          <option value="out-of-scope">Out of Scope</option>
                          <option value="assumption">Assumption</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => removeScope(item.id)}
                          className="transition-colors"
                          style={{ color: '#475569' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#F43F5E')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredScope.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: '#475569' }}>No scope items found</div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: GLASS }}>
          <div className="overflow-x-auto">
            <table className="dark-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Reference Section ↗</th>
                  <th>Page ↗</th>
                  <th>Phase</th>
                  <th>Priority</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDel.map((item) => {
                  const prio = PRIO_COLORS[item.priority];
                  return (
                    <tr key={item.id}>
                      <td>
                        <input value={item.description} onChange={(e) => updateDeliverable(item.id, 'description', e.target.value)}
                          className="w-full text-sm outline-none bg-transparent transition-colors"
                          style={{ color: '#F1F5F9', borderBottom: '1px dashed rgba(255,255,255,0.1)' }} />
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <RefLink section={item.referenceSection} page={item.pageNumber} />
                          <input value={item.referenceSection} onChange={(e) => updateDeliverable(item.id, 'referenceSection', e.target.value)}
                            className="text-[10px] outline-none bg-transparent w-full"
                            style={{ color: '#475569' }} placeholder="Edit section…" />
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <PageLink page={item.pageNumber} section={item.referenceSection} />
                          <input value={item.pageNumber} onChange={(e) => updateDeliverable(item.id, 'pageNumber', e.target.value)}
                            className="text-[10px] outline-none bg-transparent w-full"
                            style={{ color: '#475569' }} placeholder="Edit page…" />
                        </div>
                      </td>
                      <td>
                        <input value={item.phase} onChange={(e) => updateDeliverable(item.id, 'phase', e.target.value)}
                          className="w-full text-xs outline-none bg-transparent"
                          style={{ color: '#94A3B8' }} />
                      </td>
                      <td>
                        <select value={item.priority} onChange={(e) => updateDeliverable(item.id, 'priority', e.target.value)}
                          className="text-xs font-semibold px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer"
                          style={{ background: prio.bg, color: prio.text }}>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => removeDeliverable(item.id)}
                          className="transition-colors"
                          style={{ color: '#475569' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#F43F5E')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredDel.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: '#475569' }}>No deliverables found</div>
          )}
        </div>
      )}
    </div>
  );
}
