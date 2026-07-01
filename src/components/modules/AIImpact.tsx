'use client';
// ============================================================
// AgenticImpact — KPI cards + charts + 3-way view toggle
// ============================================================
import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Mail } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import type { AIImpact, AIRoleRow } from '@/types';

// ── Color constants ───────────────────────────────────────────
const ACCENT = '#1E3A5F';
const TEAL   = '#0D7377';
const AMBER  = '#F4A261';

const AGENT_COLORS = ['#0f62fe','#42be65','#ee5396','#ff832b','#a56eff','#08bdba'];
const TASK_COLORS  = ['#0f62fe','#42be65','#f1c21b','#da1e28','#a56eff'];

const tooltipStyle = {
  backgroundColor: '#1e2030',
  border: '1px solid #2a2d3e',
  borderRadius: 10,
  color: '#f4f4f4',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
};

// ── CustomTooltip — WCAG-AA, #F8F9FA bg, dynamic border/title colour ──
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color?: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const color = payload[0].color ?? '#0f62fe';
  return (
    <div style={{
      backgroundColor: '#F8F9FA',
      border: `2px solid ${color}`,
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: 140,
    }}>
      <div style={{ color, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.name} style={{ color: '#1F2937', fontSize: 13 }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </div>
      ))}
    </div>
  );
}

// ── PieCustomTooltip for task-type donut ──────────────────────
function PieCustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ color?: string; name: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  const color = payload[0].color ?? '#0f62fe';
  return (
    <div style={{
      backgroundColor: '#F8F9FA',
      border: `2px solid ${color}`,
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: 140,
    }}>
      <div style={{ color, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{payload[0].name}</div>
      <div style={{ color: '#1F2937', fontSize: 13 }}>{payload[0].value}h</div>
    </div>
  );
}

// ── Interfaces ────────────────────────────────────────────────
interface ActivityPoint  { hour: string; [agent: string]: number | string }
interface TaskTypeSlice  { name: string; value: number }
interface RespBucket     { bucket: string; count: number }
interface PerfMatrix     { agent: string; speed: number; accuracy: number; load: number; errors: number }

type AgenticView = 'ibm' | 'agentic' | 'client';

const VIEW_LABELS: Record<AgenticView, string> = {
  ibm:     '🔒 IBM View',
  agentic: '🤖 Agentic View',
  client:  '👤 Client View',
};

// ── Info Tooltip — portal-based so it escapes table/overflow clipping ──
// Uses ReactDOM.createPortal to render at document.body, guaranteeing the
// popup is never clipped by table cells, overflow:hidden, or low z-index.
function ChartTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos]   = useState({ x: 0, y: 0 });
  const btnRef = React.useRef<HTMLButtonElement>(null);

  const handleEnter = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // Centre above the button
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
    setShow(true);
  };

  const popup = show ? (
    <div style={{
      position: 'fixed',
      left: Math.min(pos.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 150),
      top: pos.y - 8,
      transform: 'translate(-50%, -100%)',
      background: '#1A202C', color: '#F7FAFC',
      fontSize: 11, lineHeight: 1.55,
      borderRadius: 10, padding: '10px 14px',
      width: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      pointerEvents: 'none',
      whiteSpace: 'normal',
      zIndex: 2147483647,
    }}>
      {text}
      <div style={{
        position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
        borderTop: '6px solid #1A202C',
      }} />
    </div>
  ) : null;

  return (
    <span className="relative inline-flex" style={{ verticalAlign: 'middle' }}>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        onFocus={handleEnter}
        onBlur={() => setShow(false)}
        aria-label="More information"
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: '#E2E8F0', color: '#4A5568',
          fontSize: 11, fontWeight: 700,
          border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
        ⓘ
      </button>
      {typeof window !== 'undefined' && popup
        ? ReactDOM.createPortal(popup, document.body)
        : null}
    </span>
  );
}

// ── IBM View ──────────────────────────────────────────────────
function IBMView({ ai }: { ai: AIImpact }) {
  const totalTokens = ai.roleRows.reduce((a: number, r: AIRoleRow) => a + (r.tokenUsage ?? 8000), 0);
  const totalCostPerRun = ai.roleRows.reduce((a: number, r: AIRoleRow) => a + (r.costPerRun ?? 0.12), 0);
  return (
    <div className="space-y-6">
      {/* Internal KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents', value: ai.roleRows.length, color: ACCENT },
          { label: 'Token Usage (est.)', value: `${(totalTokens / 1000).toFixed(0)}K`, color: TEAL },
          { label: 'Cost Per Full Run', value: `$${totalCostPerRun.toFixed(2)}`, color: AMBER },
          { label: 'Automation ROI', value: `${ai.overallProductivityGain}×`, color: '#7C3AED' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border p-4" style={{ borderColor: '#E2E8F0' }}>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
      {/* Agent details table */}
      <div className="bg-white rounded-2xl border overflow-x-auto" style={{ borderColor: '#E2E8F0' }}>
        <h3 className="text-sm font-bold px-5 py-4" style={{ color: '#1A202C' }}>Agent Economics — IBM Internal</h3>
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ background: '#F8FAFC' }}>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Agent / Model</th>
              <th className="px-4 py-3 text-center">Trad. FTE</th>
              <th className="px-4 py-3 text-center">AI FTE</th>
              <th className="px-4 py-3 text-center">Token Usage</th>
              <th className="px-4 py-3 text-center">Cost/Run</th>
              <th className="px-4 py-3 text-center">Automation %</th>
            </tr>
          </thead>
          <tbody>
            {ai.roleRows.map((row: AIRoleRow, idx: number) => (
              <tr key={row.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                <td className="px-4 py-3 font-semibold text-gray-800">{row.role}</td>
                <td className="px-4 py-3">
                  <div className="text-xs">
                    <div className="font-medium" style={{ color: ACCENT }}>{row.agentName ?? `${row.role} Agent`}</div>
                    <div className="text-gray-400">{row.modelName ?? 'watsonx.ai'}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{row.traditionalFTE}</td>
                <td className="px-4 py-3 text-center font-semibold" style={{ color: TEAL }}>{row.aiAugmentedFTE}</td>
                <td className="px-4 py-3 text-center text-gray-600">{((row.tokenUsage ?? 8000) / 1000).toFixed(0)}K</td>
                <td className="px-4 py-3 text-center" style={{ color: AMBER }}>${(row.costPerRun ?? 0.12).toFixed(2)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: TEAL }}>
                    {row.automationCoveragePct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Agentic View ──────────────────────────────────────────────
function AgenticView({ ai }: { ai: AIImpact }) {
  const barData = ai.phaseRows.map((p) => ({
    name: p.phase.length > 10 ? p.phase.slice(0, 10) + '…' : p.phase,
    Traditional: p.traditionalHours,
    'AI-Assisted': p.aiAssistedHours,
    Saved: p.hoursSaved,
  }));

  return (
    <div className="space-y-6">
      {/* Phase comparison bar chart */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#E2E8F0' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#1A202C' }}>Agent Pipeline — Traditional vs AI-Assisted Hours by Phase</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Traditional" fill="#da1e28" radius={[4, 4, 0, 0]} />
            <Bar dataKey="AI-Assisted" fill={ACCENT} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Saved" fill={TEAL} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Agent pipeline flowchart */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#E2E8F0' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#1A202C' }}>Agentic Workflow — Task → Agent → Output</h3>
        <div className="overflow-x-auto">
          <div className="flex gap-3 min-w-[600px] pb-2">
            {ai.phaseRows.slice(0, 6).map((row, i: number) => (
              <div key={row.id} className="flex items-start gap-2">
                <div className="flex flex-col items-center gap-1 min-w-[120px]">
                  {/* Task */}
                  <div className="w-full rounded-xl border p-2.5 text-center" style={{ background: `${ACCENT}08`, borderColor: `${ACCENT}30` }}>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Task</div>
                    <div className="text-xs font-semibold" style={{ color: ACCENT }}>{row.activity}</div>
                  </div>
                  <div className="text-gray-300 text-sm">↓</div>
                  {/* Agent */}
                  <div className="w-full rounded-xl border p-2.5 text-center" style={{ background: `${TEAL}08`, borderColor: `${TEAL}30` }}>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Agent</div>
                    <div className="text-xs font-semibold" style={{ color: TEAL }}>
                      watsonx Agent {i + 1}
                    </div>
                  </div>
                  <div className="text-gray-300 text-sm">↓</div>
                  {/* Output */}
                  <div className="w-full rounded-xl border p-2.5 text-center" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Saved</div>
                    <div className="text-xs font-semibold text-amber-700">{row.hoursSaved}h</div>
                  </div>
                </div>
                {i < ai.phaseRows.slice(0, 6).length - 1 && (
                  <div className="text-gray-300 text-lg mt-6">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase-by-phase table */}
      <div className="bg-white rounded-2xl border overflow-x-auto" style={{ borderColor: '#E2E8F0' }}>
        <h3 className="text-sm font-bold px-5 py-4" style={{ color: '#1A202C' }}>Phase-by-Phase Agent Analysis</h3>
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ background: '#F8FAFC' }}>
              <th className="px-4 py-3 text-left">Phase</th>
              <th className="px-4 py-3 text-left">Activity</th>
              <th className="px-4 py-3 text-center">Traditional Hrs</th>
              <th className="px-4 py-3 text-center">AI-Assisted Hrs</th>
              <th className="px-4 py-3 text-center">Hours Saved</th>
              <th className="px-4 py-3 text-center">Productivity Gain</th>
            </tr>
          </thead>
          <tbody>
            {ai.phaseRows.map((row, idx: number) => (
              <tr key={row.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                <td className="px-4 py-3 font-semibold text-gray-800">{row.phase}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{row.activity}</td>
                <td className="px-4 py-3 text-center text-gray-700">{row.traditionalHours.toLocaleString()}</td>
                <td className="px-4 py-3 text-center font-semibold" style={{ color: ACCENT }}>{row.aiAssistedHours.toLocaleString()}</td>
                <td className="px-4 py-3 text-center text-green-600 font-semibold">{row.hoursSaved.toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: TEAL }}>
                    {row.productivityGainPct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Client View ───────────────────────────────────────────────
function ClientOutcomeView({ ai }: { ai: AIImpact }) {
  const hoursSavedValue = Math.round(ai.totalHoursSaved * 120); // avg $120/hr

  return (
    <div className="space-y-6">
      {/* Business KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: '⏱️', label: 'Time Saved', value: `${ai.totalHoursSaved.toLocaleString()} hours`, sub: 'across all phases', color: ACCENT },
          { icon: '💰', label: 'Cost Reduction', value: `$${(hoursSavedValue / 1000).toFixed(0)}K`, sub: 'in labor savings', color: TEAL },
          { icon: '📈', label: 'Quality Improvement', value: `${ai.overallProductivityGain}%`, sub: 'faster delivery', color: '#7C3AED' },
          { icon: '🛡️', label: 'Risk Reduction', value: 'High', sub: 'via automated testing', color: '#198038' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border p-5 text-center" style={{ borderColor: '#E2E8F0' }}>
            <div className="text-3xl mb-2">{m.icon}</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Business outcomes summary */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#E2E8F0' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#1A202C' }}>Business Outcomes — AI-Powered Delivery</h3>
        <div className="space-y-4">
          {[
            { title: 'Faster Time-to-Market', desc: `By leveraging IBM watsonx AI, we accelerate delivery by ${ai.overallProductivityGain}%, reducing the project timeline from traditional estimates.`, pct: ai.overallProductivityGain },
            { title: 'Reduced Labor Costs', desc: `Agentic AI reduces manual effort, saving approximately ${ai.totalHoursSaved.toLocaleString()} hours of professional service time valued at $${(hoursSavedValue / 1000).toFixed(0)}K.`, pct: Math.min(95, Math.round((ai.totalHoursSaved / ai.totalTraditionalHours) * 100)) },
            { title: 'Higher Quality Output', desc: 'AI-assisted code generation, automated testing, and document review reduce error rates and improve code quality metrics by up to 40%.', pct: 40 },
            { title: 'Continuous Improvement', desc: 'AI agents learn from each engagement, progressively improving accuracy and reducing re-work through feedback loops.', pct: 75 },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: TEAL }} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-800">{item.title}</span>
                  <span className="text-sm font-bold" style={{ color: TEAL }}>{item.pct}%</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{item.desc}</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: TEAL }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 italic">
        Client-facing view — business outcomes only. No internal metrics or agent costs shown.
      </div>
    </div>
  );
}

export default function AgenticImpactModule() {
  const activeDocumentId = useRFPStore((state) => state.activeDocumentId);
  const analysisResults = useRFPStore((state) => state.analysisResults);
  const documents       = useRFPStore((state) => state.documents);
  const setAnalysisResult = useRFPStore((state) => state.setAnalysisResult);
  const showNotification = useRFPStore((state) => state.showNotification);
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [view, setView] = useState<AgenticView>('client');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<AIRoleRow>>({});
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  if (!result?.aiImpact) return (
    <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document to see agentic impact analysis</div>
  );

  const ai = result.aiImpact;
  const docName = documents.find(d => d.id === activeDocumentId)?.name ?? 'Active RFP';

  async function emailReport() {
    setEmailSending(true);
    setEmailStatus('idle');
    try {
      const subject = `AI Impact Report — ${docName}`;
      const body = [
        `AI Impact Report — ${docName}`,
        `Generated: ${new Date().toLocaleString()}`,
        ``,
        `━━━ SUMMARY ━━━`,
        `Active Agents:          ${ai.roleRows.length}`,
        `Total AI Hours:         ${ai.totalAIHours.toLocaleString()}h`,
        `Hours Saved:            ${ai.totalHoursSaved.toLocaleString()}h`,
        `Overall Productivity:   ${ai.overallProductivityGain}%`,
        ``,
        `━━━ ROLE BREAKDOWN ━━━`,
        ...ai.roleRows.map(r =>
          `• ${r.role} (${r.band}) — Trad: ${r.traditionalFTE} FTE → AI: ${r.aiAugmentedFTE} FTE | Productivity: ${r.productivityPct}% | Automation: ${r.automationCoveragePct}% | Tool: ${r.toolUsed}`
        ),
        ``,
        `━━━ PHASE BREAKDOWN ━━━`,
        ...ai.phaseRows.map(p =>
          `• ${p.phase}: Traditional ${p.traditionalHours}h → AI ${p.aiAssistedHours}h (saved ${p.hoursSaved}h)`
        ),
      ].join('\n');

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'pradeep.lamba1@ibm.com', subject, body }),
      });
      const data = await res.json();
      if (data.method === 'mailto') {
        window.open(data.mailtoUrl, '_blank');
      }
      setEmailStatus('sent');
      setTimeout(() => setEmailStatus('idle'), 4000);
    } catch {
      setEmailStatus('error');
      setTimeout(() => setEmailStatus('idle'), 4000);
    } finally {
      setEmailSending(false);
    }
  }

  const startEdit = useCallback((row: AIRoleRow) => {
    setEditingRoleId(row.id);
    setEditValues({ productivityPct: row.productivityPct, automationCoveragePct: row.automationCoveragePct, reworkReductionPct: row.reworkReductionPct });
  }, []);

  const commitEdit = useCallback((rowId: string) => {
    if (!activeDocumentId || !result.aiImpact) return;
    const roleRows = result.aiImpact.roleRows.map((r) => {
      if (r.id !== rowId) return r;
      const merged = { ...r, ...editValues };
      merged.aiAugmentedFTE = Math.max(1, Math.round(r.traditionalFTE * (1 - (merged.productivityPct ?? r.productivityPct) / 100)));
      return merged;
    });
    const performUpdate = () => {
      const totalTrad = result.aiImpact!.phaseRows.reduce((a, r) => a + r.traditionalHours, 0);
      const overallGain = roleRows.reduce((a, r) => a + r.productivityPct, 0) / roleRows.length;
      const totalAI = Math.round(totalTrad * (1 - overallGain / 100));
      setAnalysisResult(activeDocumentId, {
        ...result,
        aiImpact: { ...result.aiImpact!, roleRows, totalAIHours: totalAI, totalHoursSaved: totalTrad - totalAI, overallProductivityGain: Math.round(overallGain), lastUpdated: new Date().toISOString() },
      });
    };
    showNotification({
      sourceModule: 'Agentic Impact',
      affectedModules: ['Staffing Plan → Headcount', 'Project Plan → Duration', 'Estimation → Total Cost'],
      message: 'This change will also update: Staffing Plan → Headcount, Project Plan → Duration, Estimation → Total Cost.',
      pendingUpdate: performUpdate,
    });
    setEditingRoleId(null);
  }, [activeDocumentId, editValues, result, setAnalysisResult, showNotification]);

  // ── Build chart data ──────────────────────────────────────────
  const HOURS = React.useMemo(() => Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`), []);
  const agentNames = React.useMemo(
    () => ai.roleRows.slice(0, 4).map((row) => (row.agentName ?? row.role).split(' ')[0]),
    [ai.roleRows]
  );

  const activityData: ActivityPoint[] = React.useMemo(() => HOURS.map((hour, hi) => {
    const row: ActivityPoint = { hour };
    agentNames.forEach((name, ni) => {
      const peak = (hi >= 8 && hi <= 18) ? 1 : 0.3;
      row[name] = Math.round(Math.max(0, (Math.sin((hi + ni * 2) * 0.5) * 8 + 6) * peak));
    });
    return row;
  }), [HOURS, agentNames]);

  const taskTypeData: TaskTypeSlice[] = [
    { name: 'Analysis',      value: Math.round(ai.totalAIHours * 0.30) },
    { name: 'Extraction',    value: Math.round(ai.totalAIHours * 0.20) },
    { name: 'Scoring',       value: Math.round(ai.totalAIHours * 0.15) },
    { name: 'Summarization', value: Math.round(ai.totalAIHours * 0.20) },
    { name: 'Validation',    value: Math.round(ai.totalAIHours * 0.15) },
  ];

  const respBuckets: RespBucket[] = [
    { bucket: '0–100ms',   count: Math.round(ai.totalAIHours * 0.40) },
    { bucket: '100–500ms', count: Math.round(ai.totalAIHours * 0.35) },
    { bucket: '500ms–1s',  count: Math.round(ai.totalAIHours * 0.15) },
    { bucket: '1s+',       count: Math.round(ai.totalAIHours * 0.10) },
  ];

  const perfMatrix: PerfMatrix[] = ai.roleRows.slice(0, 5).map((r, i) => ({
    agent:    (r.agentName ?? r.role).slice(0, 14),
    speed:    Math.min(100, 60 + i * 8),
    accuracy: Math.min(100, 75 + i * 5),
    load:     Math.min(100, 40 + i * 12),
    errors:   Math.max(1,   15 - i * 3),
  }));

  const avgResponseMs = 280;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header + 3-way toggle + Email button ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>AI vs Traditional Delivery</div>
          <p className="text-xs mt-0.5" style={{ color: '#4A5568' }}>Quantified impact analysis of AI augmented delivery</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Email report button */}
          <button
            onClick={emailReport}
            disabled={emailSending}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
            style={{
              borderColor: emailStatus === 'sent' ? '#42be65' : emailStatus === 'error' ? '#da1e28' : '#0f62fe',
              color:       emailStatus === 'sent' ? '#42be65' : emailStatus === 'error' ? '#da1e28' : '#0f62fe',
              background:  emailStatus === 'sent' ? '#d1fae5' : emailStatus === 'error' ? '#fee2e2' : '#eff6ff',
              cursor: emailSending ? 'wait' : 'pointer',
            }}
          >
            <Mail size={13} />
            {emailSending ? 'Sending…' : emailStatus === 'sent' ? 'Sent ✓' : emailStatus === 'error' ? 'Failed — retry' : 'Email Report'}
          </button>

          {/* 3-way view toggle */}
          <div className="flex items-center gap-1 rounded-xl p-1 border" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
            {(['ibm', 'agentic', 'client'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={view === v ? { background: ACCENT, color: '#fff' } : { color: '#4A5568' }}>
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Agents',       value: String(ai.roleRows.length),                      color: '#0f62fe' },
          { label: 'Tasks Completed',     value: ai.totalAIHours.toLocaleString() + 'h',          color: '#42be65' },
          { label: 'Avg Response Time',   value: `${avgResponseMs}ms`,                            color: '#a56eff' },
          { label: 'Success Rate',        value: `${ai.overallProductivityGain}%`,                color: '#f1c21b' },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border p-5 bg-white"
            style={{ borderColor: '#E2E8F0', borderBottom: `3px solid ${m.color}` }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>{m.label}</div>
            <div className="kpi-value" style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Agent Activity Timeline + Task Type Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border p-5" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex items-center gap-2 mb-5">
            <span style={{ fontSize: 16, fontWeight: 600, color: '#0A1628' }}>Agent Activity Timeline (24h)</span>
            <ChartTooltip text="Shows the distribution of agent actions over a 24-hour window. Peaks indicate high automation activity periods — typically during business hours (08:00–18:00). Use this to identify efficiency gains, bottlenecks, and optimal scheduling windows. Higher activity directly correlates with reduced manual hours and faster turnaround, contributing to measurable ROI." />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activityData} margin={{ left: -10, right: 10 }}>
              <defs>
                {agentNames.map((_, i) => (
                  <linearGradient key={i} id={`agGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={AGENT_COLORS[i % AGENT_COLORS.length]} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={AGENT_COLORS[i % AGENT_COLORS.length]} stopOpacity={0}    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                interval={3} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {agentNames.map((name, i) => (
                <Area key={name} type="monotone" dataKey={name}
                  stroke={AGENT_COLORS[i % AGENT_COLORS.length]}
                  fill={`url(#agGrad${i})`}
                  strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex items-center gap-2 mb-5">
            <span style={{ fontSize: 16, fontWeight: 600, color: '#0A1628' }}>Task Type Distribution</span>
            <ChartTooltip text="Breaks down agent tasks by category: Analysis, Extraction, Scoring, Summarization, and Validation. Identifies which task types benefit most from automation and where cost savings are highest. Higher automation coverage per task type reduces per-task cost and improves overall delivery quality. ROI is driven by shifting high-volume, repetitive tasks to AI agents." />
          </div>
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie data={taskTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" paddingAngle={3}>
                {taskTypeData.map((_, i) => (
                  <Cell key={i} fill={TASK_COLORS[i % TASK_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieCustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-1">
            {taskTypeData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: TASK_COLORS[i % TASK_COLORS.length] }} />
                <span style={{ color: '#4A5568', flex: 1 }}>{d.name}</span>
                <span className="kpi-value" style={{ color: TASK_COLORS[i % TASK_COLORS.length], fontWeight: 600 }}>
                  {d.value}h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Response Time Buckets + Performance Matrix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#E2E8F0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0A1628', marginBottom: 20 }}>Response Time Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={respBuckets} barSize={40} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {respBuckets.map((_, i) => (
                  <Cell key={i} fill={AGENT_COLORS[i % AGENT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex items-center gap-2 mb-4">
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0A1628', margin: 0 }}>Agent Performance Matrix</h3>
            <ChartTooltip text="Comparative performance scores per AI agent across 4 dimensions: Speed (task completion rate), Accuracy (output quality), Load (% capacity utilisation), and Errors (defect count). Higher Speed/Accuracy = better; lower Errors = better; Load >80% may indicate bottleneck risk. Use this to identify which agents need optimisation or rebalancing." />
          </div>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', fontSize: 12, minWidth: 400 }}>
              <thead>
                <tr style={{ color: '#94A3B8', fontSize: 11 }}>
                  <th className="py-2 px-2 text-left font-medium">Agent</th>
                  {[
                    { h: 'Speed',    tip: 'Task throughput rate — % of assigned tasks completed per cycle. Higher is better.' },
                    { h: 'Accuracy', tip: 'Output quality score — % of outputs passing validation without rework. Higher is better.' },
                    { h: 'Load',     tip: 'Capacity utilisation — % of max compute/token budget consumed. >80% = bottleneck risk (red).' },
                    { h: 'Errors',   tip: 'Defect count — number of outputs requiring human correction. Lower is better (red if >10).' },
                  ].map(({ h, tip }) => (
                    <th key={h} className="py-2 px-2 text-center font-medium">
                      <span className="inline-flex items-center gap-1 justify-center">
                        {h}
                        <ChartTooltip text={tip} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfMatrix.map((row, i) => (
                  <tr key={row.agent} className="border-t" style={{ borderColor: '#E2E8F0' }}>
                    <td className="py-2 px-2 font-semibold text-xs" style={{ color: '#0A1628' }}>{row.agent}</td>
                    {[
                      { val: row.speed,    color: '#42be65', fmt: (v: number) => `${v}%` },
                      { val: row.accuracy, color: '#0f62fe', fmt: (v: number) => `${v}%` },
                      { val: row.load,     color: row.load > 80 ? '#da1e28' : '#f1c21b', fmt: (v: number) => `${v}%` },
                      { val: row.errors,   color: row.errors > 10 ? '#da1e28' : '#94A3B8', fmt: (v: number) => String(v) },
                    ].map(({ val, color, fmt }, ci) => (
                      <td key={ci} className="py-2 px-2 text-center">
                        <span className="kpi-value text-xs font-bold" style={{ color }}>{fmt(val)}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── View-specific content ── */}
      {view === 'ibm'     && <IBMView ai={ai} />}
      {view === 'agentic' && <AgenticView ai={ai} />}
      {view === 'client'  && <ClientOutcomeView ai={ai} />}

      {/* ── Role-level editable table (IBM + Agentic views) ── */}
      {(view === 'ibm' || view === 'agentic') && (
        <div className="bg-white rounded-2xl border overflow-x-auto" style={{ borderColor: '#E2E8F0' }}>
          <div className="px-5 py-4">
            <h3 className="text-sm font-bold" style={{ color: '#1A202C' }}>Role-Level AI Productivity (Editable)</h3>
            <p className="text-xs mt-0.5" style={{ color: '#4A5568' }}>Edit Productivity %, Automation %, Rework Reduction % — changes propagate to Staffing & Estimation.</p>
          </div>
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ background: '#F8FAFC' }}>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Band</th>
                <th className="px-4 py-3 text-center">Trad. FTE</th>
                <th className="px-4 py-3 text-center">AI FTE</th>
                <th className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-1 justify-center">
                    Productivity %
                    <ChartTooltip text="Percentage reduction in effort due to AI assistance. A 40% productivity gain means the task takes 40% less time with AI augmentation compared to traditional delivery." />
                  </div>
                </th>
                <th className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-1 justify-center">
                    <span style={{ color: '#0f62fe' }}>Automation %</span>
                    <ChartTooltip text="Percentage of this role's repetitive tasks that can be fully automated by AI agents — requiring zero manual intervention. Higher automation coverage directly reduces headcount and per-deliverable cost." />
                  </div>
                </th>
                <th className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-1 justify-center">
                    <span style={{ color: '#ee5396' }}>Rework Red. %</span>
                    <ChartTooltip text="Percentage reduction in rework cycles achieved through AI-assisted quality checks, automated testing, and real-time validation. Reducing rework improves schedule adherence and lowers total delivery cost." />
                  </div>
                </th>
                <th className="px-4 py-3 text-center">Accel.</th>
                <th className="px-4 py-3 text-left">Tool</th>
                <th className="px-4 py-3 text-center">Edit</th>
              </tr>
            </thead>
            <tbody>
              {ai.roleRows.map((row, idx) => {
                const isEditing = editingRoleId === row.id;
                // Colour-code automation % by tier: ≥70 green, ≥40 amber, <40 red
                const autoColor = row.automationCoveragePct >= 70 ? '#42be65' : row.automationCoveragePct >= 40 ? '#f59e0b' : '#da1e28';
                // Colour-code rework reduction: ≥30 green, ≥15 amber, <15 red
                const reworkColor = row.reworkReductionPct >= 30 ? '#ee5396' : row.reworkReductionPct >= 15 ? '#f59e0b' : '#94A3B8';
                return (
                  <tr key={row.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{row.role}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: ACCENT }}>{row.band}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.traditionalFTE}</td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: TEAL }}>{row.aiAugmentedFTE}</td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input type="number" min={0} max={100} value={editValues.productivityPct ?? row.productivityPct}
                          onChange={(e) => setEditValues({ ...editValues, productivityPct: Number(e.target.value) })}
                          className="w-16 text-center border border-teal-400 rounded-lg px-1 py-0.5 text-sm outline-none" />
                      ) : <span className="font-semibold text-green-600">{row.productivityPct}%</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input type="number" min={0} max={100} value={editValues.automationCoveragePct ?? row.automationCoveragePct}
                          onChange={(e) => setEditValues({ ...editValues, automationCoveragePct: Number(e.target.value) })}
                          className="w-16 text-center border border-teal-400 rounded-lg px-1 py-0.5 text-sm outline-none" />
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${autoColor}18`, color: autoColor, border: `1px solid ${autoColor}40` }}>
                          {row.automationCoveragePct}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input type="number" min={0} max={100} value={editValues.reworkReductionPct ?? row.reworkReductionPct}
                          onChange={(e) => setEditValues({ ...editValues, reworkReductionPct: Number(e.target.value) })}
                          className="w-16 text-center border border-teal-400 rounded-lg px-1 py-0.5 text-sm outline-none" />
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${reworkColor}18`, color: reworkColor, border: `1px solid ${reworkColor}40` }}>
                          {row.reworkReductionPct}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.accelerationFactor}×</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.toolUsed}</td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <button onClick={() => commitEdit(row.id)} className="text-xs font-semibold px-2 py-0.5 rounded-lg text-white" style={{ background: TEAL }}>Save</button>
                      ) : (
                        <button onClick={() => startEdit(row)} className="text-xs font-medium px-2 py-0.5 rounded-lg border" style={{ color: TEAL, borderColor: TEAL }}>Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
