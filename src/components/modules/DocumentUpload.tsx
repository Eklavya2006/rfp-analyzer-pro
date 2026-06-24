// ============================================================
// Upload Component — drag-and-drop with progress, validation
// ============================================================
'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertCircle, CheckCircle2, X, Eye, RefreshCw } from 'lucide-react';
import { cn, formatFileSize, generateId, sleep } from '@/lib/utils';
import { useRFPStore } from '@/lib/store';
import { generateSummary, extractSections, getSampleRFPText } from '@/lib/parser';
import type { RFPDocument } from '@/types';
import { Button, Badge, Card, CardBody, CardHeader, ProgressBar, Alert, MetricCard } from '@/components/ui';
import { runFullAnalysis } from '@/lib/orchestrator';

const ACCEPTED = { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] };
const MAX_SIZE = 25 * 1024 * 1024;

type UploadStep = 'idle' | 'uploading' | 'processing' | 'analyzing' | 'done' | 'error';

export default function DocumentUpload() {
  const { documents, addDocument, updateDocument, setActiveDocument, setActiveTab, setAnalysisResult, activeDocumentId } = useRFPStore();
  const [step, setStep] = useState<UploadStep>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setStep('uploading');
    setProgress(0);
    setProgressLabel('Uploading document…');

    const docId = generateId();
    setCurrentDocId(docId);

    // Simulate upload progress
    for (let p = 0; p <= 30; p += 5) {
      await sleep(60);
      setProgress(p);
    }

    // Read file text
    let rawText = '';
    if (file.type === 'text/plain') {
      rawText = await file.text().catch(() => '');
    } else {
      rawText = getSampleRFPText(file.name);
    }

    setStep('processing');
    setProgressLabel('Extracting document structure...');
    for (let p = 30; p <= 55; p += 5) {
      await sleep(80);
      setProgress(p);
    }

    const summary = generateSummary(rawText, file.name);
    const sections = extractSections(rawText);

    const doc: RFPDocument = {
      id: docId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing',
      uploadedAt: new Date().toISOString(),
      summary,
      extractedSections: sections,
    };
    addDocument(doc);

    setStep('analyzing');
    setProgressLabel('Running analysis engines...');
    for (let p = 55; p <= 90; p += 5) {
      await sleep(90);
      setProgress(p);
    }

    try {
      const result = await runFullAnalysis(docId, rawText, file.name);
      setAnalysisResult(docId, result);

      updateDocument(docId, { status: 'ready', processedAt: new Date().toISOString() });

      setProgress(100);
      setProgressLabel('Analysis complete!');
      setStep('done');
      setActiveDocument(docId);
    } catch (err) {
      setError('Analysis failed. Please try again.');
      updateDocument(docId, { status: 'error', errorMessage: 'Analysis failed' });
      setStep('error');
    }
  }, [addDocument, updateDocument, setActiveDocument, setAnalysisResult, setActiveTab]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: step === 'uploading' || step === 'processing' || step === 'analyzing',
    onDropAccepted: ([file]) => processFile(file),
    onDropRejected: ([rejection]) => {
      const msg = rejection.errors[0]?.code === 'file-too-large'
        ? `File too large. Max size is 25MB.`
        : `Invalid file type. Accepted: PDF, DOCX, TXT`;
      setError(msg);
    },
  });

  const loadDemo = async () => {
    const demoFile = new File([getSampleRFPText('Enterprise Platform RFP')], 'Enterprise_Platform_RFP.txt', { type: 'text/plain' });
    await processFile(demoFile);
  };

  const activeDoc = documents.find((d) => d.id === activeDocumentId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Document Upload</h2>
        <p className="text-slate-500 text-sm mt-1">Upload an RFP document to generate comprehensive delivery insights</p>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardBody className="p-0">
          <div
            {...getRootProps()}
            className={cn(
              'relative p-10 border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer text-center',
              isDragActive && !isDragReject ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/50',
              isDragReject && 'border-rose-400 bg-rose-50/50',
              (step === 'uploading' || step === 'processing' || step === 'analyzing') && 'pointer-events-none'
            )}
          >
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {step === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                    <Upload size={28} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-800">
                      {isDragActive ? 'Drop your RFP here' : 'Drop your RFP document'}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">or click to browse — PDF, DOCX, TXT up to 25MB</p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline">PDF</Badge>
                    <Badge variant="outline">DOCX</Badge>
                    <Badge variant="outline">TXT</Badge>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); loadDemo(); }}
                      className="text-xs text-indigo-500 hover:text-indigo-700 underline underline-offset-2 transition-colors"
                    >
                      Or load demo RFP
                    </button>
                  </div>
                </motion.div>
              )}

              {(step === 'uploading' || step === 'processing' || step === 'analyzing') && (
                <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                      <RefreshCw size={28} className="text-indigo-600" />
                    </motion.div>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-800">{progressLabel}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{progress}% complete</p>
                  </div>
                  <div className="max-w-sm mx-auto">
                    <ProgressBar value={progress} showValue={false} animate />
                  </div>
                  <div className="flex justify-center gap-4 text-xs text-slate-400">
                    {['Upload', 'Extract', 'Analyze'].map((s, i) => (
                      <div key={s} className={cn('flex items-center gap-1', progress > i * 33 ? 'text-indigo-600 font-medium' : '')}>
                        <div className={cn('w-2 h-2 rounded-full', progress > i * 33 ? 'bg-indigo-500' : 'bg-slate-200')} />
                        {s}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 'done' && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                  <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 size={28} className="text-emerald-600" />
                  </div>
                  <p className="text-base font-semibold text-slate-800">Analysis Complete!</p>
                  <p className="text-sm text-slate-500">All modules generated successfully</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setStep('idle'); }}
                    className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                  >
                    Upload another document
                  </button>
                </motion.div>
              )}

              {step === 'error' && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="mx-auto w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center">
                    <AlertCircle size={28} className="text-rose-600" />
                  </div>
                  <p className="text-base font-semibold text-rose-700">Upload Failed</p>
                  <p className="text-sm text-rose-500">{error}</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setStep('idle'); setError(null); }} className="text-xs text-slate-400 hover:text-slate-600 underline">Try again</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardBody>
      </Card>

      {error && step === 'idle' && (
        <Alert type="error"><span className="font-medium">Error:</span> {error}</Alert>
      )}

      {/* Document Summary (if analysis done) */}
      <AnimatePresence>
        {activeDoc?.summary && step === 'done' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className="font-bold text-slate-900">Extracted Document Summary</h3>

            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Confidence" value={`${activeDoc.summary.confidenceScore}%`} color="indigo" />
              <MetricCard label="Est. Timeline" value={activeDoc.summary.estimatedTimeline || 'N/A'} color="violet" />
              <MetricCard label="Est. Budget" value={activeDoc.summary.estimatedBudget || 'TBD'} color="emerald" />
              <MetricCard label="Pages (est.)" value={`~${activeDoc.summary.pageCount}`} color="amber" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project info */}
              <Card>
                <CardHeader><h4 className="font-semibold text-slate-800 text-sm">Project Overview</h4></CardHeader>
                <CardBody className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Project Title</div>
                    <div className="text-sm font-semibold text-slate-800">{activeDoc.summary.title}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Client</div>
                    <div className="text-sm text-slate-700">{activeDoc.summary.client}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Description</div>
                    <div className="text-xs text-slate-600 leading-relaxed">{activeDoc.summary.projectDescription}</div>
                  </div>
                </CardBody>
              </Card>

              {/* Technologies */}
              <Card>
                <CardHeader><h4 className="font-semibold text-slate-800 text-sm">Detected Technologies</h4></CardHeader>
                <CardBody>
                  <div className="flex flex-wrap gap-2">
                    {activeDoc.summary.technologies.map((t) => (
                      <Badge key={t} variant="info">{t}</Badge>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 mb-2">Key Requirements</div>
                    <ul className="space-y-1">
                      {activeDoc.summary.keyRequirements.slice(0, 5).map((r) => (
                        <li key={r} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* CTA */}
            <div className="flex gap-3">
              <Button onClick={() => setActiveTab('dashboard')} size="lg">
                View Dashboard →
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('cost')} size="lg">
                See Cost Estimate
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing documents */}
      {documents.length > 0 && step !== 'done' && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-3 text-sm">Recent Documents</h3>
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id} hover onClick={() => { setActiveDocument(doc.id); setActiveTab('dashboard'); }}>
                <CardBody className="flex items-center gap-4 py-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <FileText size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm truncate">{doc.name}</div>
                    <div className="text-xs text-slate-400">{formatFileSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString()}</div>
                  </div>
                  <Badge variant={doc.status === 'ready' ? 'success' : doc.status === 'error' ? 'danger' : 'warning'}>
                    {doc.status}
                  </Badge>
                  <Eye size={16} className="text-slate-300" />
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
