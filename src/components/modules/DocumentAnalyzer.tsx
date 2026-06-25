'use client';
// DocumentAnalyzer — Dark glassmorphism + progress steps + multi-format support
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, CheckCircle, AlertCircle, Loader2,
  Zap, Trash2, BookOpen, X, Paperclip,
} from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { runFullAnalysis } from '@/lib/mockEngine';
import { extractFromFile, generateSummary, sanitizeText, type ParseStep } from '@/lib/parser';
import { v4 as uuid } from 'uuid';

// Guard: detect if a string is still raw PDF structure (should never be shown)
function isRawPDF(text: string): boolean {
  const head = text.slice(0, 256);
  return /^%PDF-/m.test(head) || /\bLinearized\b/.test(head) || /<<\/L\s+\d+/.test(head);
}

// Return a display-safe version of rawText — re-sanitize and strip any PDF remnants
function safePreviewText(raw: string | undefined): string {
  if (!raw) return '';
  if (isRawPDF(raw)) return '[Raw PDF content detected — text extraction failed. Try re-uploading as DOCX or TXT.]';
  const cleaned = sanitizeText(raw);
  if (isRawPDF(cleaned)) return '[PDF binary content could not be fully sanitized. Try re-uploading as DOCX or TXT.]';
  return cleaned;
}

// ── Dark palette ──────────────────────────────────────────────
const INDIGO = '#6366F1';
const CYAN   = '#06B6D4';
const GLASS  = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Processing step indicator ────────────────────────────────
const STEPS: { key: ParseStep; label: string; pct: number }[] = [
  { key: 'uploading',  label: 'Uploading',   pct: 10 },
  { key: 'parsing',    label: 'Parsing',     pct: 30 },
  { key: 'extracting', label: 'Extracting',  pct: 60 },
  { key: 'rendering',  label: 'Rendering',   pct: 85 },
  { key: 'done',       label: 'Complete',    pct: 100 },
];

function ProcessingSteps({ step, pct }: { step: ParseStep; pct: number }) {
  const stepIdx = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="mt-3 space-y-2">
      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.2)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${INDIGO}, ${CYAN})` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      {/* Step dots + labels */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: i <= stepIdx ? INDIGO : 'rgba(255,255,255,0.15)',
                transform: i === stepIdx ? 'scale(1.4)' : 'scale(1)',
                boxShadow: i === stepIdx ? `0 0 6px ${INDIGO}` : 'none',
              }}
            />
            <span className="text-[10px] font-medium transition-colors duration-200"
              style={{ color: i <= stepIdx ? '#818CF8' : 'rgba(255,255,255,0.3)' }}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="text-[10px] mx-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>›</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DocumentAnalyzer() {
  const {
    documents, activeDocumentId,
    addDocument, updateDocument, setActiveDocument,
    setAnalysisResult, setActiveTab, reset,
    activeTab,
  } = useRFPStore();
  const [dragActive, setDragActive] = useState(false);
  const [parseStep, setParseStep]   = useState<ParseStep>('uploading');
  const [parsePct,  setParsePct]    = useState(0);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);

  const activeDoc = documents.find((d) => d.id === activeDocumentId);

  // ── Scroll-hint banner + in-page text highlight ──────────────
  const [scrollHint, setScrollHint] = useState<{ section: string; page: string } | null>(null);
  const textPreviewRef = useRef<HTMLDivElement>(null);

  // Re-read hint every time this tab becomes active (not just on mount)
  useEffect(() => {
    if (activeTab !== 'document-analyzer') return;
    try {
      const raw = sessionStorage.getItem('rfp-scroll-hint');
      if (raw) {
        const hint = JSON.parse(raw) as { section: string; page: string; ts: number };
        if (Date.now() - hint.ts < 15000) setScrollHint({ section: hint.section, page: hint.page });
        sessionStorage.removeItem('rfp-scroll-hint');
      }
    } catch {}
  }, [activeTab]);

  // Scroll to highlighted mark after render + trigger pulse animation
  useEffect(() => {
    if (!scrollHint || !textPreviewRef.current) return;
    // Small delay so the DOM re-renders with the highlight mark first
    const timer = setTimeout(() => {
      if (!textPreviewRef.current) return;
      const marks = textPreviewRef.current.querySelectorAll<HTMLElement>('.rfp-highlight');
      if (marks.length > 0) {
        marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Trigger CSS pulse animation
        marks[0].classList.remove('rfp-pulse');
        void marks[0].offsetWidth; // reflow to restart animation
        marks[0].classList.add('rfp-pulse');
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [scrollHint]);

  const processFile = useCallback(async (file: File) => {
    const docId = uuid();
    setProcessingDocId(docId);
    setParseStep('uploading');
    setParsePct(5);
    addDocument({
      id: docId, name: file.name, size: file.size,
      type: file.type, status: 'processing', uploadedAt: new Date().toISOString(),
    });
    setActiveDocument(docId);

    try {
      const { text: rawText, pageCount } = await extractFromFile(file, (step, pct) => {
        setParseStep(step);
        setParsePct(pct);
      });
      const summary = generateSummary(rawText, file.name, pageCount);
      updateDocument(docId, { status: 'ready', rawText, processedAt: new Date().toISOString(), summary });
      const result = runFullAnalysis(docId, rawText);
      setAnalysisResult(docId, result);
    } catch (err) {
      console.error('[DocumentAnalyzer] Processing failed:', err);
      updateDocument(docId, { status: 'error', errorMessage: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setProcessingDocId(null);
    }
  }, [addDocument, setActiveDocument, updateDocument, setAnalysisResult]);

  const onDrop = useCallback(
    (accepted: File[]) => { setDragActive(false); if (accepted[0]) processFile(accepted[0]); },
    [processFile],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const loadDemo = async () => {
    const demoText = `REQUEST FOR PROPOSAL — Enterprise Digital Transformation Platform\n\nSection 1: Executive Summary\nThe client seeks an enterprise partner to deliver a comprehensive digital transformation encompassing cloud infrastructure migration, AI/ML capabilities, data governance, and security compliance.\nEstimated budget: $2.5M to $4M. Timeline: 18 months from contract execution.\n\nSection 2: Scope of Work\n2.1 Cloud Infrastructure: Migrate all on-premise workloads to IBM Cloud hybrid architecture.\n2.2 Data Platform: Implement watsonx.data as the central data lakehouse.\n2.3 AI & Machine Learning: Deploy IBM Watson AI for NLP document processing.\n2.4 Security & Compliance: Implement IBM Security QRadar SIEM.\n\nSection 3: Deliverables\n3.1 Solution Architecture Document — Page 5\n3.2 MVP Platform Release — Page 11\n3.3 UAT Sign-off — Page 17\n\nSection 4: Timeline\nProject timeline: 18 months.\n\nSection 5: Budget\nBudget range: $2.5M to $4M including licensing, professional services, and infrastructure.`;
    await processFile(new File([demoText], 'Demo_Enterprise_RFP.txt', { type: 'text/plain' }));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* ── Pulse animation keyframes ───────────────────── */}
      <style>{`
        @keyframes rfpPulse {
          0%   { box-shadow: 0 0 0 0 rgba(245,158,11,0.7), 0 0 0 0 rgba(245,158,11,0.4); background: rgba(245,158,11,0.35); }
          40%  { box-shadow: 0 0 0 8px rgba(245,158,11,0.2), 0 0 0 16px rgba(245,158,11,0.1); background: rgba(245,158,11,0.5); }
          100% { box-shadow: 0 0 0 14px rgba(245,158,11,0), 0 0 0 28px rgba(245,158,11,0); background: rgba(245,158,11,0.25); }
        }
        .rfp-pulse {
          animation: rfpPulse 1.2s ease-out 2;
        }
      `}</style>

      {/* ── Scroll hint banner ─────────────────────────── */}
      <AnimatePresence>
        {scrollHint && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)',
            }}>
            <BookOpen size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <span style={{ color: '#F1F5F9' }}>
              Navigated from scope reference — look for{' '}
              <strong style={{ color: '#F59E0B' }}>{scrollHint.section}</strong>
              {scrollHint.page ? `, ${scrollHint.page}` : ''} in the document text below.
            </span>
            <button onClick={() => setScrollHint(null)} className="ml-auto" style={{ color: '#94A3B8' }}>
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#F1F5F9' }}>Document Analyzer</h2>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            Upload PDF, DOCX, XLSX, PPTX, or TXT — text extracted automatically, binary content sanitized
          </p>
        </div>
        {documents.length > 0 && (
          <button onClick={() => reset()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94A3B8',
            }}>
            <Trash2 size={12} /> Clear All
          </button>
        )}
      </div>

      {/* ── Upload zone ────────────────────────────────── */}
      <div {...getRootProps()}
        className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200"
        style={dragActive
          ? {
              borderColor: INDIGO,
              background: 'rgba(99,102,241,0.08)',
              boxShadow: `0 0 0 4px rgba(99,102,241,0.1), inset 0 0 40px rgba(99,102,241,0.05)`,
            }
          : {
              borderColor: BORDER,
              background: GLASS,
            }}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: dragActive ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
              border: `1px solid rgba(99,102,241,0.25)`,
              boxShadow: dragActive ? `0 0 20px rgba(99,102,241,0.3)` : 'none',
              transition: 'all 0.2s ease',
            }}>
            <Upload size={24} style={{ color: INDIGO }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Drag & drop or click to upload</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>PDF · DOCX · XLSX · PPTX · TXT — max 25 MB</p>
          </div>
        </div>
      </div>

      {/* ── Demo button ─────────────────────────────────── */}
      <div className="text-center mt-4">
        <button onClick={loadDemo}
          className="inline-flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 transition-all duration-200"
          style={{
            color: CYAN,
            background: 'rgba(6,182,212,0.1)',
            border: '1px solid rgba(6,182,212,0.2)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(6,182,212,0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(6,182,212,0.1)')}>
          <Zap size={14} /> Load Demo RFP
        </button>
      </div>

      {/* ── Document list ───────────────────────────────── */}
      {documents.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-bold" style={{ color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
            Documents ({documents.length})
          </h3>
          {documents.map((doc) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 cursor-pointer transition-all duration-200"
              style={doc.id === activeDocumentId
                ? {
                    border: `1px solid rgba(99,102,241,0.4)`,
                    background: 'rgba(99,102,241,0.07)',
                    boxShadow: '0 0 0 1px rgba(99,102,241,0.15), 0 4px 20px rgba(0,0,0,0.3)',
                  }
                : {
                    border: `1px solid ${BORDER}`,
                    background: GLASS,
                  }}
              onClick={() => setActiveDocument(doc.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${INDIGO}33, ${CYAN}22)`,
                      border: `1px solid rgba(99,102,241,0.3)`,
                    }}>
                    <FileText size={18} style={{ color: INDIGO }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: '#F1F5F9' }}>{doc.name}</div>
                    <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: '#64748B' }}>
                      <span>{formatBytes(doc.size)}</span>
                      {doc.type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(255,255,255,0.07)', color: '#94A3B8' }}>
                          {doc.type.includes('pdf') ? 'PDF'
                            : doc.type.includes('word') || doc.name.endsWith('.docx') ? 'DOCX'
                            : doc.type.includes('sheet') || doc.name.endsWith('.xlsx') ? 'XLSX'
                            : doc.type.includes('presentation') || doc.name.endsWith('.pptx') ? 'PPTX'
                            : 'TXT'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  {doc.status === 'processing' && <Loader2 size={18} className="animate-spin" style={{ color: INDIGO }} />}
                  {doc.status === 'ready'      && <CheckCircle size={18} style={{ color: '#10B981' }} />}
                  {doc.status === 'error'      && <AlertCircle size={18} style={{ color: '#F43F5E' }} />}
                </div>
              </div>

              {/* Step-based progress */}
              {doc.status === 'processing' && doc.id === processingDocId && (
                <ProcessingSteps step={parseStep} pct={parsePct} />
              )}
              {doc.status === 'processing' && doc.id !== processingDocId && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.15)' }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${INDIGO}, ${CYAN})` }}
                      animate={{ width: ['5%', '95%'] }} transition={{ duration: 2.5, ease: 'easeInOut' }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#818CF8' }}>Processing document…</p>
                </div>
              )}

              {doc.status === 'error' && doc.errorMessage && (
                <div className="mt-3 text-xs rounded-lg px-3 py-2"
                  style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#FDA4AF' }}>
                  ❌ {doc.errorMessage}
                </div>
              )}
              {doc.status === 'ready' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: 'rgba(16,185,129,0.1)',
                      color: '#10B981',
                      border: '1px solid rgba(16,185,129,0.25)',
                    }}>
                    <Paperclip size={11} /> Attached
                  </span>
                  {doc.summary && (
                    <span className="text-xs" style={{ color: '#64748B' }}>
                      {doc.summary.title && doc.summary.title !== 'Unknown Document' ? doc.summary.title : doc.name}
                    </span>
                  )}
                </div>
              )}
              {doc.status === 'ready' && (
                <div className="mt-3 flex justify-end">
                  <button onClick={(e) => { e.stopPropagation(); setActiveTab('dashboard'); }}
                    className="text-xs font-semibold px-4 py-1.5 rounded-xl text-white transition-all duration-200"
                    style={{
                      background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)`,
                      boxShadow: `0 2px 12px rgba(99,102,241,0.4)`,
                    }}>
                    View Analysis →
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Document text preview with section highlight ── */}
      {activeDoc?.rawText && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>
              Document Content
              {scrollHint && (
                <span className="ml-2 font-normal normal-case" style={{ color: CYAN }}>
                  ↳ Showing: {scrollHint.section}{scrollHint.page ? `, ${scrollHint.page}` : ''}
                </span>
              )}
            </h3>
            {scrollHint && (
              <button onClick={() => setScrollHint(null)}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: '#475569' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#94A3B8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}>
                <X size={12} /> Clear highlight
              </button>
            )}
          </div>
          <div
            ref={textPreviewRef}
            className="rounded-2xl p-5 overflow-y-auto"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              maxHeight: 420, fontSize: 12, lineHeight: 1.8,
              color: '#94A3B8', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap',
            }}>
            {scrollHint
              ? (() => {
                  const raw    = activeDoc.rawText ?? '';
                  const needle = scrollHint.section.replace('Section ', '');
                  const idx    = raw.toLowerCase().indexOf(needle.toLowerCase());
                  if (idx < 0) return <span>{raw}</span>;
                  return (
                    <>
                      {raw.slice(0, idx)}
                      <mark className="rfp-highlight" style={{
                        background: 'rgba(245,158,11,0.25)',
                        borderRadius: 4, padding: '1px 3px',
                        outline: '2px solid rgba(245,158,11,0.5)', outlineOffset: 1,
                        color: '#FCD34D', fontWeight: 600,
                      }}>
                        {raw.slice(idx, idx + needle.length + 150)}
                      </mark>
                      {raw.slice(idx + needle.length + 150)}
                    </>
                  );
                })()
              : activeDoc.rawText
            }
          </div>
        </div>
      )}
    </div>
  );
}
