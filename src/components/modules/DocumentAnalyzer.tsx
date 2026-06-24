'use client';
// DocumentAnalyzer — progress steps + multi-format support + section highlight
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, CheckCircle, AlertCircle, Loader2,
  Zap, Trash2, BookOpen, X, Paperclip,
} from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { T } from '@/lib/theme';
import { runFullAnalysis } from '@/lib/mockEngine';
import { extractFromFile, generateSummary, type ParseStep } from '@/lib/parser';
import { v4 as uuid } from 'uuid';

const ACCENT = T.slate;
const TEAL   = T.chart[5];

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
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${ACCENT}20` }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: ACCENT }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      {/* Step labels */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: i <= stepIdx ? ACCENT : '#E2E8F0',
                transform: i === stepIdx ? 'scale(1.4)' : 'scale(1)',
              }}
            />
            <span
              className="text-[10px] font-medium transition-colors duration-200"
              style={{ color: i <= stepIdx ? ACCENT : '#94A3B8' }}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="text-[10px] mx-0.5" style={{ color: '#CBD5E1' }}>›</span>
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
  } = useRFPStore();
  const [dragActive, setDragActive] = useState(false);
  const [parseStep, setParseStep] = useState<ParseStep>('uploading');
  const [parsePct,  setParsePct]  = useState(0);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);

  const activeDoc = documents.find((d) => d.id === activeDocumentId);

  // ── Scroll-hint banner + in-page text highlight ──────────────
  const [scrollHint, setScrollHint] = useState<{ section: string; page: string } | null>(null);
  const textPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('rfp-scroll-hint');
      if (raw) {
        const hint = JSON.parse(raw) as { section: string; page: string; ts: number };
        if (Date.now() - hint.ts < 10000) setScrollHint({ section: hint.section, page: hint.page });
        sessionStorage.removeItem('rfp-scroll-hint');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!scrollHint || !textPreviewRef.current) return;
    const marks = textPreviewRef.current.querySelectorAll<HTMLElement>('.rfp-highlight');
    if (marks.length > 0) marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      updateDocument(docId, {
        status: 'ready', rawText,
        processedAt: new Date().toISOString(),
        summary,
      });
      const result = runFullAnalysis(docId, rawText);
      setAnalysisResult(docId, result);
    } catch (err) {
      console.error('[DocumentAnalyzer] Processing failed:', err);
      updateDocument(docId, {
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
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

      {/* ── Scroll hint banner ─────────────────────────── */}
      <AnimatePresence>
        {scrollHint && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm"
            style={{ background: `${T.gold}18`, borderColor: T.gold }}>
            <BookOpen size={16} style={{ color: T.gold, flexShrink: 0 }} />
            <span style={{ color: T.navy }}>
              Navigated from scope reference — look for{' '}
              <strong>{scrollHint.section}</strong>
              {scrollHint.page ? `, ${scrollHint.page}` : ''} in the document text below.
            </span>
            <button onClick={() => setScrollHint(null)} className="ml-auto" style={{ color: T.textMuted }}>
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#1A202C' }}>Document Analyzer</h2>
          <p className="text-sm" style={{ color: '#4A5568' }}>
            Upload PDF, DOCX, XLSX, PPTX, or TXT — text extracted automatically, binary content sanitized
          </p>
        </div>
        {documents.length > 0 && (
          <button onClick={() => reset()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <Trash2 size={12} /> Clear All
          </button>
        )}
      </div>

      {/* Upload zone */}
      <div {...getRootProps()}
        className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200"
        style={dragActive
          ? { borderColor: ACCENT, background: '#EFF6FF' }
          : { borderColor: '#E2E8F0', background: '#F8FAFC' }}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
            <Upload size={24} style={{ color: ACCENT }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1A202C' }}>Drag & drop or click to upload</p>
            <p className="text-xs mt-1" style={{ color: '#4A5568' }}>PDF · DOCX · XLSX · PPTX · TXT — max 25 MB</p>
          </div>
        </div>
      </div>

      {/* Demo button */}
      <div className="text-center mt-4">
        <button onClick={loadDemo}
          className="inline-flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 transition-colors"
          style={{ color: TEAL, background: `${TEAL}15` }}>
          <Zap size={14} /> Load Demo RFP
        </button>
      </div>

      {/* Document list */}
      {documents.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-bold" style={{ color: '#374151' }}>Documents ({documents.length})</h3>
          {documents.map((doc) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border p-4 cursor-pointer transition-all"
              style={doc.id === activeDocumentId
                ? { borderColor: ACCENT, background: `${ACCENT}08` }
                : { borderColor: '#E2E8F0', background: '#fff' }}
              onClick={() => setActiveDocument(doc.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: ACCENT }}>
                    <FileText size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: '#1A202C' }}>{doc.name}</div>
                    <div className="text-xs flex items-center gap-2" style={{ color: '#4A5568' }}>
                      <span>{formatBytes(doc.size)}</span>
                      {doc.type && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
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
                  {doc.status === 'processing' && <Loader2 size={18} className="animate-spin text-blue-500" />}
                  {doc.status === 'ready'      && <CheckCircle size={18} className="text-green-500" />}
                  {doc.status === 'error'      && <AlertCircle size={18} className="text-red-500" />}
                </div>
              </div>

              {/* Step-based progress */}
              {doc.status === 'processing' && doc.id === processingDocId && (
                <ProcessingSteps step={parseStep} pct={parsePct} />
              )}
              {doc.status === 'processing' && doc.id !== processingDocId && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${ACCENT}20` }}>
                    <motion.div className="h-full rounded-full" style={{ background: ACCENT }}
                      animate={{ width: ['5%', '95%'] }} transition={{ duration: 2.5, ease: 'easeInOut' }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: ACCENT }}>Processing document…</p>
                </div>
              )}

              {doc.status === 'error' && doc.errorMessage && (
                <div className="mt-3 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">❌ {doc.errorMessage}</div>
              )}
              {doc.status === 'ready' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: `${TEAL}18`, color: TEAL, border: `1px solid ${TEAL}40` }}>
                    <Paperclip size={11} /> Attached
                  </span>
                  {doc.summary && (
                    <span className="text-xs" style={{ color: '#94A3B8' }}>
                      {doc.summary.title && doc.summary.title !== 'Unknown Document' ? doc.summary.title : doc.name}
                    </span>
                  )}
                </div>
              )}
              {doc.status === 'ready' && (
                <div className="mt-3 flex justify-end">
                  <button onClick={(e) => { e.stopPropagation(); setActiveTab('dashboard'); }}
                    className="text-xs font-semibold px-4 py-1.5 rounded-xl text-white transition-colors"
                    style={{ background: ACCENT }}>
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
            <h3 className="text-sm font-bold" style={{ color: '#374151' }}>
              Document Content
              {scrollHint && (
                <span className="ml-2 text-xs font-normal" style={{ color: TEAL }}>
                  ↳ Showing: {scrollHint.section}{scrollHint.page ? `, ${scrollHint.page}` : ''}
                </span>
              )}
            </h3>
            {scrollHint && (
              <button onClick={() => setScrollHint(null)}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <X size={12} /> Clear highlight
              </button>
            )}
          </div>
          <div
            ref={textPreviewRef}
            className="rounded-2xl border p-5 overflow-y-auto"
            style={{
              borderColor: '#E2E8F0', background: '#F8FAFC',
              maxHeight: 420, fontSize: 12, lineHeight: 1.7,
              color: '#374151', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap',
            }}>
            {scrollHint
              ? (() => {
                  const raw  = activeDoc.rawText ?? '';
                  const needle = scrollHint.section.replace('Section ', '');
                  const idx  = raw.toLowerCase().indexOf(needle.toLowerCase());
                  if (idx < 0) return <span>{raw}</span>;
                  return (
                    <>
                      {raw.slice(0, idx)}
                      <mark className="rfp-highlight" style={{
                        background: '#FFF3CD', borderRadius: 4, padding: '1px 3px',
                        outline: '2px solid #F59E0B', outlineOffset: 1,
                        color: '#78350F', fontWeight: 600,
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
