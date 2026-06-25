'use client';
// ============================================================
// CreateProposal — S9: Proposal generation, branding, PDF export
//                 + Dynamic Client Objections section
// ============================================================
import React, { useState, useRef } from 'react';
import { FileText, Download, Link2, Image, Globe, Wand2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useRFPStore } from '@/lib/store';

// ── Client Objection type ─────────────────────────────────────
interface ClientObjection {
  id: string;
  objection: string;
  response: string;
}

const ACCENT = '#1E3A5F';
const TEAL   = '#0D7377';
const AMBER  = '#F4A261';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

// ── Proposal HTML builder ─────────────────────────────────────
function buildProposalHTML(opts: {
  clientName: string;
  projectTitle: string;
  date: string;
  result: ReturnType<typeof useRFPStore.getState>['analysisResults'][string];
  logoDataUrl: string | null;
  withLogo: boolean;
  objections?: ClientObjection[];
}): string {
  const { clientName, projectTitle, date, result, logoDataUrl, withLogo, objections = [] } = opts;
  const est = result?.estimation;
  const plan = result?.projectPlan;
  const scope = result?.scopeItems ?? [];
  const deliverables = result?.deliverableItems ?? [];
  const adjustedTotal = est?.adjustedTotalCost ?? est?.totalCost ?? 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>IBM Proposal — ${projectTitle}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1A202C;background:#fff;line-height:1.6}
  .page{max-width:900px;margin:0 auto;padding:48px 48px 80px}
  header{display:flex;align-items:center;justify-content:space-between;padding-bottom:24px;border-bottom:3px solid ${ACCENT};margin-bottom:32px}
  .ibm-logo{font-size:18px;font-weight:900;color:${ACCENT};letter-spacing:-1px}
  .client-logo{max-height:48px;max-width:160px;object-fit:contain}
  h1{font-size:28px;font-weight:800;color:${ACCENT};margin-bottom:8px}
  .subtitle{font-size:14px;color:#4A5568}
  .meta-row{display:flex;gap:24px;margin:24px 0;background:#F8FAFC;border-radius:12px;padding:16px 20px}
  .meta-item label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#4A5568;display:block;margin-bottom:2px}
  .meta-item span{font-size:15px;font-weight:700;color:${ACCENT}}
  h2{font-size:18px;font-weight:700;color:${ACCENT};margin:32px 0 12px;padding-bottom:6px;border-bottom:2px solid #E2E8F0}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px}
  th{text-align:left;padding:8px 12px;background:#F8FAFC;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:#4A5568;border-bottom:2px solid #E2E8F0}
  td{padding:8px 12px;border-bottom:1px solid #F0F0F0;vertical-align:top}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
  .badge-teal{background:${TEAL}20;color:${TEAL}}
  .badge-accent{background:${ACCENT}15;color:${ACCENT}}
  .total-row{background:${ACCENT}10;font-weight:700;font-size:14px}
  footer{margin-top:60px;padding-top:20px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#9CA3AF}
  @media print{body{background:#fff}.page{padding:32px}}
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="ibm-logo">IBM</div>
    ${withLogo && logoDataUrl ? `<img src="${logoDataUrl}" class="client-logo" alt="Client Logo" />` : `<div style="font-size:14px;color:#4A5568;font-weight:600;font-style:italic">Prepared for: ${clientName}</div>`}
  </header>

  <h1>Client Proposal</h1>
  <div class="subtitle">${projectTitle}</div>

  <div class="meta-row">
    <div class="meta-item"><label>Prepared for</label><span>${clientName}</span></div>
    <div class="meta-item"><label>Date</label><span>${date}</span></div>
    <div class="meta-item"><label>Engagement Value</label><span>${fmt(adjustedTotal)}</span></div>
    <div class="meta-item"><label>Duration</label><span>${est?.personMonths ?? '—'} months</span></div>
  </div>

  <h2>Executive Summary</h2>
  <p style="font-size:14px;color:#374151;margin-bottom:12px">
    IBM is pleased to present this proposal for ${projectTitle}. We bring deep expertise in cloud, AI/ML, and digital transformation to deliver measurable business outcomes through our proven IBM Garage methodology.
  </p>

  <h2>Scope of Work</h2>
  <table>
    <tr><th>Description</th><th>Category</th><th>Reference</th></tr>
    ${scope.filter(s => s.category === 'in-scope').slice(0, 8).map(s => `
    <tr><td>${s.description}</td><td><span class="badge badge-teal">In Scope</span></td><td>${s.referenceSection}</td></tr>`).join('')}
  </table>

  <h2>Deliverables</h2>
  <table>
    <tr><th>Deliverable</th><th>Phase</th><th>Priority</th></tr>
    ${deliverables.slice(0, 8).map(d => `
    <tr><td>${d.description}</td><td>${d.phase}</td><td><span class="badge badge-accent">${d.priority}</span></td></tr>`).join('')}
  </table>

  ${plan ? `<h2>Project Timeline</h2>
  <table>
    <tr><th>Phase</th><th>Start</th><th>End</th><th>Duration</th></tr>
    ${plan.phases.map(p => `<tr><td><strong>${p.name}</strong></td><td>Week ${p.startWeek}</td><td>Week ${p.endWeek}</td><td>${p.durationWeeks} weeks</td></tr>`).join('')}
  </table>` : ''}

  ${est ? `<h2>Investment Summary</h2>
  <table>
    <tr><th>Component</th><th>Value</th></tr>
    <tr><td>Total Engagement Value</td><td><strong>${fmt(adjustedTotal)}</strong></td></tr>
    <tr><td>Engagement Duration</td><td>${est.personMonths} months (${est.totalHours.toLocaleString()} hours)</td></tr>
    <tr><td>Pricing Model</td><td>Fixed Price — Milestone-Based</td></tr>
  </table>

  <table>
    <tr><th>Milestone</th><th>Deliverable</th><th>Payment</th></tr>
    <tr class="total-row"><td>Project Kickoff</td><td>Discovery Complete</td><td>${fmt(Math.round(adjustedTotal * 0.15))}</td></tr>
    <tr class="total-row"><td>MVP Delivery</td><td>Core Platform</td><td>${fmt(Math.round(adjustedTotal * 0.35))}</td></tr>
    <tr class="total-row"><td>UAT Complete</td><td>Acceptance Sign-off</td><td>${fmt(Math.round(adjustedTotal * 0.30))}</td></tr>
    <tr class="total-row"><td>Go-Live</td><td>Production Deployment</td><td>${fmt(Math.round(adjustedTotal * 0.20))}</td></tr>
  </table>` : ''}

  ${objections.length > 0 ? `
  <h2>Client Objections &amp; Responses</h2>
  <table>
    <tr><th>#</th><th>Client Objection</th><th>Recommended Response</th></tr>
    ${objections.map((o, i) => `
    <tr>
      <td style="text-align:center;font-weight:700;color:${ACCENT};width:36px">${i + 1}</td>
      <td style="font-style:italic;color:#374151">${o.objection || '<em style="color:#9CA3AF">—</em>'}</td>
      <td style="color:#1A202C">${o.response || '<em style="color:#9CA3AF">—</em>'}</td>
    </tr>`).join('')}
  </table>` : ''}

  <footer>
    <span>© IBM Corporation ${new Date().getFullYear()} · Confidential &amp; Proprietary</span>
    <span>Generated by RFP Analyzer Pro · ${date}</span>
  </footer>
</div>
</body>
</html>`;
}

// ── Objections panel ──────────────────────────────────────────
function ObjectionsPanel({
  objections, onAdd, onRemove, onUpdate,
}: {
  objections: ClientObjection[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: 'objection' | 'response', value: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1A202C',
    outline: 'none', resize: 'vertical' as const, lineHeight: 1.6,
    transition: 'border-color 0.15s',
  };

  return (
    <div className="bg-white rounded-2xl border" style={{ borderColor: '#E2E8F0' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50"
        style={{ borderBottom: open ? '1px solid #E2E8F0' : 'none', borderRadius: open ? '16px 16px 0 0' : 16 }}>
        <div>
          <div className="text-sm font-bold" style={{ color: '#1A202C' }}>
            💬 Client Objections &amp; Responses
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>
            {objections.length} objection{objections.length !== 1 ? 's' : ''} — click any field to edit, fully dynamic
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: `${ACCENT}12`, color: ACCENT }}>
            {objections.length} items
          </span>
          {open ? <ChevronUp size={16} style={{ color: '#94A3B8' }} /> : <ChevronDown size={16} style={{ color: '#94A3B8' }} />}
        </div>
      </button>

      {open && (
        <div className="p-5 space-y-4">
          {objections.length === 0 && (
            <div className="text-center py-6 text-sm" style={{ color: '#94A3B8' }}>
              No objections yet. Click "Add Objection" to start building your response playbook.
            </div>
          )}
          {objections.map((obj, idx) => (
            <div key={obj.id} className="rounded-xl p-4 space-y-3"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', position: 'relative' }}>
              {/* Index badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${ACCENT}15`, color: ACCENT }}>
                  Objection #{idx + 1}
                </span>
                <button onClick={() => onRemove(obj.id)}
                  className="transition-colors p-1 rounded-lg"
                  style={{ color: '#CBD5E0' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F43F5E')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#CBD5E0')}
                  title="Remove this objection">
                  <Trash2 size={14} />
                </button>
              </div>
              {/* Objection */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#64748B' }}>
                  Client Objection Statement
                </label>
                <textarea
                  rows={2}
                  value={obj.objection}
                  onChange={e => onUpdate(obj.id, 'objection', e.target.value)}
                  placeholder="e.g. 'Your pricing is too high compared to competitors.'"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = ACCENT; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
                />
              </div>
              {/* Response */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: TEAL }}>
                  Recommended Response
                </label>
                <textarea
                  rows={3}
                  value={obj.response}
                  onChange={e => onUpdate(obj.id, 'response', e.target.value)}
                  placeholder="e.g. 'Our pricing reflects the total value delivered including IP reuse, proven methodology, and outcome guarantees...'"
                  style={{ ...inputStyle }}
                  onFocus={e => { e.currentTarget.style.borderColor = TEAL; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
                />
              </div>
            </div>
          ))}
          <button onClick={onAdd}
            className="flex items-center gap-2 w-full justify-center py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ border: `2px dashed ${ACCENT}40`, color: ACCENT, background: `${ACCENT}06` }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ACCENT}10`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ACCENT}06`; }}>
            <Plus size={14} /> Add Objection
          </button>
        </div>
      )}
    </div>
  );
}

export default function CreateProposalModule() {
  const { activeDocumentId, analysisResults, documents } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const doc = documents.find((d) => d.id === activeDocumentId);
  const [withLogo, setWithLogo] = useState(false);
  const [logoSource, setLogoSource] = useState<'upload' | 'website'>('upload');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [fetchingLogo, setFetchingLogo] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [proposalHtml, setProposalHtml] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Client Objections state ────────────────────────────────
  const [objections, setObjections] = useState<ClientObjection[]>([]);

  const addObjection = () => {
    const newObj: ClientObjection = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      objection: '',
      response: '',
    };
    setObjections(prev => [...prev, newObj]);
  };
  const removeObjection = (id: string) => setObjections(prev => prev.filter(o => o.id !== id));
  const updateObjection = (id: string, field: 'objection' | 'response', value: string) =>
    setObjections(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));

  const clientName = doc?.summary?.client || 'Enterprise Client';
  const projectTitle = doc?.summary?.title || 'Enterprise Digital Transformation';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (!result) return (
    <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document first to generate a proposal</div>
  );

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFetchLogo = async () => {
    if (!websiteUrl) return;
    setFetchingLogo(true);
    try {
      // Use favicon fetcher (Google's favicon API as CORS-safe proxy)
      const domain = websiteUrl.replace(/^https?:\/\//, '').split('/')[0];
      const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`;
      setLogoDataUrl(faviconUrl);
    } catch {
      setLogoDataUrl(null);
    }
    setFetchingLogo(false);
  };

  const generate = () => {
    const html = buildProposalHTML({ clientName, projectTitle, date, result, logoDataUrl, withLogo, objections });
    setProposalHtml(html);
    setPreviewOpen(true);
  };

  const downloadPDF = () => {
    // Open proposal HTML in new tab — user can print to PDF
    const blob = new Blob([proposalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => win.print();
    }
  };

  const copyLink = () => {
    // Encode proposal HTML state as a base64 URL hash
    const encoded = btoa(encodeURIComponent(proposalHtml.slice(0, 50000)));
    const url = `${window.location.origin}?proposal=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-base font-bold" style={{ color: '#1A202C' }}>Create Client Proposal</h2>
        <p className="text-xs mt-0.5" style={{ color: '#4A5568' }}>
          Assemble a client-ready proposal from all analysis tabs — scope, plan, estimation, agentic impact.
        </p>
      </div>

      {/* Proposal Preview card */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
            <FileText size={20} style={{ color: ACCENT }} />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: '#1A202C' }}>{projectTitle}</div>
            <div className="text-xs" style={{ color: '#4A5568' }}>Prepared for: {clientName} · {date}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Scope Items', value: result.scopeItems?.filter(s => s.category === 'in-scope').length ?? 0 },
            { label: 'Deliverables', value: result.deliverableItems?.length ?? 0 },
            { label: 'Project Phases', value: result.projectPlan?.phases.length ?? 0 },
            { label: 'Engagement Value', value: result.estimation ? fmt(result.estimation.adjustedTotalCost ?? result.estimation.totalCost) : '—' },
          ].map((m) => (
            <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="text-lg font-bold" style={{ color: ACCENT }}>{m.value}</div>
              <div className="text-[10px] text-gray-400">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Branding options */}
      <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold" style={{ color: '#1A202C' }}>Branding Options</div>
            <div className="text-xs text-gray-400 mt-0.5">Add client logo to the proposal header</div>
          </div>
          {/* With/Without logo toggle */}
          <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
            {[
              { v: false, label: 'Without Logo' },
              { v: true,  label: 'With Logo' },
            ].map(({ v, label }) => (
              <button key={String(v)} onClick={() => setWithLogo(v)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={withLogo === v ? { background: ACCENT, color: '#fff' } : { color: '#555' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {withLogo && (
          <div className="space-y-3">
            {/* Source toggle */}
            <div className="flex items-center gap-2">
              {[
                { v: 'upload' as const, icon: Image, label: 'Upload from Document' },
                { v: 'website' as const, icon: Globe, label: 'Fetch from Website' },
              ].map(({ v, icon: Icon, label }) => (
                <button key={v} onClick={() => setLogoSource(v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={logoSource === v ? { background: `${TEAL}15`, borderColor: TEAL, color: TEAL } : { borderColor: '#E2E8F0', color: '#555' }}>
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>

            {logoSource === 'upload' && (
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border transition-colors hover:bg-gray-50"
                  style={{ borderColor: '#E2E8F0', color: '#374151' }}>
                  Choose Image…
                </button>
                {logoDataUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoDataUrl} alt="Logo preview"
                    style={{ height: 48, maxWidth: 200, objectFit: 'contain', imageRendering: 'crisp-edges', borderRadius: 6 }} />
                )}
              </div>
            )}

            {logoSource === 'website' && (
              <div className="flex items-center gap-2">
                <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://client.com"
                  className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400"
                  style={{ borderColor: '#E2E8F0' }} />
                <button onClick={handleFetchLogo} disabled={fetchingLogo || !websiteUrl}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-white transition-colors"
                  style={{ background: fetchingLogo ? '#CBD5E0' : TEAL }}>
                  {fetchingLogo ? 'Fetching…' : 'Fetch Logo'}
                </button>
                {logoDataUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoDataUrl} alt="Logo preview"
                    style={{ height: 48, maxWidth: 200, objectFit: 'contain', imageRendering: 'crisp-edges', borderRadius: 6 }} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Client Objections ── */}
      <ObjectionsPanel
        objections={objections}
        onAdd={addObjection}
        onRemove={removeObjection}
        onUpdate={updateObjection}
      />

      {/* Generate button */}
      <div className="flex justify-center">
        <button onClick={generate}
          className="flex items-center gap-2 px-8 py-3 rounded-2xl text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, ${TEAL})` }}>
          <Wand2 size={16} />
          Generate Client-Ready Proposal
        </button>
      </div>

      {/* Proposal preview modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E2E8F0' }}>
              <div className="font-bold text-gray-900">📄 Proposal Preview</div>
              <div className="flex items-center gap-2">
                <button onClick={downloadPDF}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ background: ACCENT }}>
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={copyLink}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors"
                  style={{ borderColor: TEAL, color: TEAL, background: linkCopied ? `${TEAL}15` : 'transparent' }}>
                  <Link2 size={14} /> {linkCopied ? 'Copied!' : 'Copy Link'}
                </button>
                <button onClick={() => setPreviewOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-gray-500 border hover:bg-gray-50" style={{ borderColor: '#E2E8F0' }}>
                  Close
                </button>
              </div>
            </div>
            {/* Proposal iframe */}
            <div className="flex-1 overflow-hidden rounded-b-2xl">
              <iframe
                srcDoc={proposalHtml}
                className="w-full h-full border-0"
                style={{ minHeight: '600px' }}
                title="Proposal Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
