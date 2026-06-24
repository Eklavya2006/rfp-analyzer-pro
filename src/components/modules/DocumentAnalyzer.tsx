'use client';
// ============================================================
// DocumentAnalyzer — S2: Extracted Content Preview REMOVED
// ============================================================
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, Zap, Trash2 } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { runFullAnalysis } from '@/lib/mockEngine';
import { extractTextFromFile } from '@/lib/parser';
import { v4 as uuid } from 'uuid';

const ACCENT = '#1E3A5F';
const TEAL   = '#0D7377';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentAnalyzer() {
  const {
    documents, activeDocumentId,
    addDocument, updateDocument, setActiveDocument,
    setAnalysisResult, setActiveTab, reset,
  } = useRFPStore();
  const [dragActive, setDragActive] = useState(false);
  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  void activeDoc; // used below

  const processFile = useCallback(async (file: File) => {
    const docId = uuid();
    addDocument({ id: docId, name: file.name, size: file.size, type: file.type, status: 'processing', uploadedAt: new Date().toISOString() });
    setActiveDocument(docId);
    try {
      const rawText = await extractTextFromFile(file);
      const wordCount = rawText.split(/\s+/).filter(Boolean).length;
      const pageCount = Math.max(1, Math.round(wordCount / 300));
      const budgetMatch = rawText.match(/\$[\d,.]+\s*(?:M|million)?(?:\s*(?:to|-)\s*\$[\d,.]+\s*(?:M|million)?)?/i);
      const timelineMatch = rawText.match(/(\d+)\s*(?:months?|weeks?)/i);
      const lower = rawText.toLowerCase();
      const techKeywords: [string, string][] = [
        ['ibm cloud','IBM Cloud'],['watson','IBM Watson AI'],['watsonx','IBM watsonx'],['kubernetes','Kubernetes'],
        ['react','React'],['node','Node.js'],['python','Python'],['azure','Microsoft Azure'],['aws','AWS'],
        ['docker','Docker'],['postgresql','PostgreSQL'],['mongodb','MongoDB'],['openshift','Red Hat OpenShift'],['terraform','Terraform'],
      ];
      const technologies = techKeywords.filter(([kw]) => lower.includes(kw)).map(([,label]) => label).slice(0, 8);
      if (technologies.length === 0) technologies.push('IBM Cloud', 'Watson AI', 'watsonx.data');
      const reqKeywords: [string, string][] = [
        ['cloud migration','Cloud Migration'],['ai/ml','AI/ML Implementation'],['machine learning','Machine Learning'],
        ['data integration','Data Integration'],['security','Security & Compliance'],['devops','DevOps'],
        ['microservices','Microservices'],['analytics','Analytics'],
      ];
      const keyRequirements = reqKeywords.filter(([kw]) => lower.includes(kw)).map(([,label]) => label).slice(0, 6);
      if (keyRequirements.length === 0) keyRequirements.push('Cloud Infrastructure','AI/ML Implementation','Data Integration','Security & Compliance');
      let confidence = 60;
      if (wordCount > 500) confidence += 10;
      if (wordCount > 1500) confidence += 10;
      if (budgetMatch) confidence += 8;
      if (timelineMatch) confidence += 7;
      if (technologies.length >= 3) confidence += 5;
      confidence = Math.min(99, confidence);
      updateDocument(docId, {
        status: 'ready', rawText, processedAt: new Date().toISOString(),
        summary: {
          title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          client: 'Enterprise Client',
          projectDescription: rawText.length > 100 ? rawText.slice(0, 200).replace(/\s+/g, ' ').trim() + '…' : 'Digital transformation initiative.',
          estimatedBudget: budgetMatch ? budgetMatch[0].trim() : '$2.5M – $4M',
          estimatedTimeline: timelineMatch ? timelineMatch[0] : '18–24 months',
          keyRequirements, technologies,
          deliverables: ['Architecture Document','MVP Release','UAT Sign-off','Deployment Runbook','Training Material'],
          constraints: ['Go-live within 18 months','Budget not to exceed $4M'],
          evaluationCriteria: ['Technical fit','Cost competitiveness','IBM expertise','Delivery track record'],
          wordCount, pageCount, confidenceScore: confidence,
        },
      });
      const result = runFullAnalysis(docId, rawText);
      setAnalysisResult(docId, result);
    } catch (err) {
      console.error('[DocumentAnalyzer] Processing failed:', err);
      updateDocument(docId, { status: 'error', errorMessage: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [addDocument, setActiveDocument, updateDocument, setAnalysisResult]);

  const onDrop = useCallback((accepted: File[]) => { setDragActive(false); if (accepted[0]) processFile(accepted[0]); }, [processFile]);
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'application/msword': ['.doc'], 'text/plain': ['.txt'] },
    multiple: false,
  });

  const loadDemo = async () => {
    const demoText = `REQUEST FOR PROPOSAL — Enterprise Digital Transformation Platform\n\nSection 1: Executive Summary\nThe client seeks an enterprise partner to deliver a comprehensive digital transformation encompassing cloud infrastructure migration, AI/ML capabilities, data governance, and security compliance.\nEstimated budget: $2.5M to $4M. Timeline: 18 months from contract execution.\n\nSection 2: Scope of Work\n2.1 Cloud Infrastructure: Migrate all on-premise workloads to IBM Cloud hybrid architecture.\n2.2 Data Platform: Implement watsonx.data as the central data lakehouse.\n2.3 AI & Machine Learning: Deploy IBM Watson AI for NLP document processing.\n2.4 Security & Compliance: Implement IBM Security QRadar SIEM.\n\nSection 3: Deliverables\n3.1 Solution Architecture Document — Page 5\n3.2 MVP Platform Release — Page 11\n3.3 UAT Sign-off — Page 17\n\nSection 4: Timeline\nProject timeline: 18 months.\n\nSection 5: Budget\nBudget range: $2.5M to $4M including licensing, professional services, and infrastructure.`;
    await processFile(new File([demoText], 'Demo_Enterprise_RFP.txt', { type: 'text/plain' }));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#1A202C' }}>Document Analyzer</h2>
          <p className="text-sm" style={{ color: '#4A5568' }}>Upload a PDF, DOCX, or TXT RFP document — text is extracted automatically from real file content</p>
        </div>
        {documents.length > 0 && (
          <button onClick={() => reset()} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <Trash2 size={12} /> Clear All
          </button>
        )}
      </div>
      {/* Upload zone */}
      <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200`}
        style={dragActive ? { borderColor: ACCENT, background: '#EFF6FF' } : { borderColor: '#E2E8F0', background: '#F8FAFC' }}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
            <Upload size={24} style={{ color: ACCENT }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1A202C' }}>Drag & drop or click to upload</p>
            <p className="text-xs mt-1" style={{ color: '#4A5568' }}>PDF, DOCX, TXT — max 25 MB</p>
          </div>
        </div>
      </div>
      {/* Demo button */}
      <div className="text-center mt-4">
        <button onClick={loadDemo} className="inline-flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 transition-colors"
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
              style={doc.id === activeDocumentId ? { borderColor: ACCENT, background: `${ACCENT}08` } : { borderColor: '#E2E8F0', background: '#fff' }}
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
                      {doc.type && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{doc.type.includes('pdf') ? 'PDF' : doc.type.includes('word') ? 'DOCX' : 'TXT'}</span>}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  {doc.status === 'processing' && <Loader2 size={18} className="animate-spin text-blue-500" />}
                  {doc.status === 'ready' && <CheckCircle size={18} className="text-green-500" />}
                  {doc.status === 'error' && <AlertCircle size={18} className="text-red-500" />}
                </div>
              </div>
              {doc.status === 'processing' && (
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
              {doc.status === 'ready' && doc.summary && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Pages', value: doc.summary.pageCount },
                    { label: 'Words', value: doc.summary.wordCount.toLocaleString() },
                    { label: 'Confidence', value: `${doc.summary.confidenceScore}%` },
                    { label: 'Tech', value: doc.summary.technologies.length },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl p-2.5 border text-center" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
                      <div className="text-lg font-bold" style={{ color: ACCENT }}>{m.value}</div>
                      <div className="text-[10px] text-gray-500">{m.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {doc.status === 'ready' && doc.summary && doc.summary.technologies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {doc.summary.technologies.slice(0, 6).map((t) => (
                    <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${TEAL}15`, color: TEAL }}>{t}</span>
                  ))}
                  {doc.summary.technologies.length > 6 && <span className="text-[10px] text-gray-400">+{doc.summary.technologies.length - 6} more</span>}
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
      {/* NOTE: Extracted Content Preview section intentionally removed (Section 2 requirement) */}
    </div>
  );
}
