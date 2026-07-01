'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRFPStore } from '@/lib/store';
import { AlertTriangle, Send, Mail, Plus } from 'lucide-react';
import type { ChangeNotification } from '@/types';

export default function ChangeNotificationModal() {
  const pendingNotification = useRFPStore((state) => state.pendingNotification);
  const confirmNotification = useRFPStore((state) => state.confirmNotification);
  const cancelNotification  = useRFPStore((state) => state.cancelNotification);
  const activeDocumentId    = useRFPStore((state) => state.activeDocumentId);
  const documents           = useRFPStore((state) => state.documents);

  const [alertSent,    setAlertSent]    = useState(false);
  const [alertSending, setAlertSending] = useState(false);
  const [emailTo,      setEmailTo]      = useState('pradeep.lamba1@ibm.com');
  const [emailOpened,  setEmailOpened]  = useState(false);

  // ── Queue: accumulate multiple notifications before sending one combined email ──
  const [queue, setQueue] = useState<ChangeNotification[]>([]);
  const lastIdRef = useRef<string | null>(null);

  // Reset email state and add to queue each time a new notification appears
  useEffect(() => {
    if (pendingNotification && pendingNotification.id !== lastIdRef.current) {
      lastIdRef.current = pendingNotification.id;
      setEmailOpened(false);
      setAlertSent(false);
      setQueue(prev => {
        // avoid duplicates
        if (prev.some(q => q.id === pendingNotification.id)) return prev;
        return [...prev, pendingNotification];
      });
    }
    if (!pendingNotification) {
      // modal closed — clear queue
      setQueue([]);
      lastIdRef.current = null;
      setEmailOpened(false);
      setAlertSent(false);
    }
  }, [pendingNotification]);

  if (!pendingNotification) return null;

  const n = pendingNotification;
  const docName = documents.find(d => d.id === activeDocumentId)?.name ?? 'Active RFP';

  // ── Build combined email from all queued notifications ───────
  function buildCombinedMailto() {
    const items = queue.length > 0 ? queue : [n];
    const subject = encodeURIComponent(
      items.length === 1
        ? `[RFP Analyzer] ${items[0].sourceModule} Updated — ${docName}`
        : `[RFP Analyzer] ${items.length} Updates — ${docName}`
    );
    const bodyLines: string[] = [
      `RFP Analyzer — Change Notification`,
      `Document: ${docName}`,
      `Date: ${new Date().toLocaleString()}`,
      ``,
    ];
    items.forEach((item, i) => {
      if (items.length > 1) bodyLines.push(`── Change ${i + 1}: ${item.sourceModule} ──`);
      bodyLines.push(item.message);
      bodyLines.push(`Affected: ${item.affectedModules.join(', ')}`);
      bodyLines.push('');
    });
    bodyLines.push('Sent from RFP Analyzer Pro');
    const body = encodeURIComponent(bodyLines.join('\n'));
    const to   = encodeURIComponent(emailTo.trim());
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }

  function openOutlook() {
    if (!emailTo.trim()) return;
    window.open(buildCombinedMailto(), '_blank');
    setEmailOpened(true);
  }

  async function sendSlackTeams() {
    setAlertSending(true);
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceModule:    n.sourceModule,
          affectedModules: n.affectedModules,
          message:         n.message,
          documentName:    docName,
        }),
      });
      setAlertSent(true);
    } finally {
      setAlertSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-3" style={{ background: '#0F62FE' }}>
          <AlertTriangle size={20} className="text-white shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Cross-Module Update</div>
            <div className="text-xs text-blue-200">Source: {n.sourceModule}</div>
          </div>
          {/* Queue badge */}
          {queue.length > 1 && (
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
              <Plus size={10} className="text-white" />
              <span className="text-[10px] font-bold text-white">{queue.length} queued</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-700 mb-4">{n.message}</p>

          {/* Affected modules */}
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="text-xs font-semibold text-blue-800 mb-2">Panels that will be updated:</div>
            <ul className="space-y-1">
              {n.affectedModules.map((m) => (
                <li key={m} className="flex items-center gap-2 text-xs text-blue-700">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#0F62FE' }} />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          {/* Queued changes summary */}
          {queue.length > 1 && (
            <div className="mt-2 bg-amber-50 rounded-xl p-3 border border-amber-100">
              <div className="text-xs font-semibold text-amber-800 mb-1.5">
                {queue.length} changes queued — one combined email will be sent:
              </div>
              {queue.map((q, i) => (
                <div key={q.id} className="text-[11px] text-amber-700 flex items-center gap-1.5 mb-0.5">
                  <span className="font-bold">{i + 1}.</span> {q.sourceModule}
                  <span className="text-amber-400">→</span>
                  <span>{q.affectedModules.join(', ')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Notify section */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Notify team</div>

            {/* Slack / Teams */}
            <button
              onClick={sendSlackTeams}
              disabled={alertSent || alertSending}
              className="flex items-center gap-2 w-full text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                borderColor: alertSent ? '#10B981' : '#E2E8F0',
                color:       alertSent ? '#10B981' : '#64748B',
                background:  alertSent ? '#D1FAE5' : '#F8FAFC',
                cursor:      alertSent ? 'default' : 'pointer',
              }}
            >
              <Send size={11} />
              {alertSending ? 'Sending…' : alertSent ? 'Sent to Slack/Teams ✓' : 'Notify Slack / Teams'}
              {!alertSent && <span className="ml-auto text-[9px] text-slate-300">needs webhook env var</span>}
            </button>

            {/* Email — always re-sendable */}
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <input
                  type="email"
                  value={emailTo}
                  onChange={e => { setEmailTo(e.target.value); setEmailOpened(false); }}
                  placeholder="recipient@ibm.com"
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border outline-none focus:border-blue-400"
                  style={{ borderColor: emailOpened ? '#10B981' : '#E2E8F0', fontSize: 12 }}
                  onKeyDown={e => e.key === 'Enter' && openOutlook()}
                />
                <button
                  onClick={openOutlook}
                  disabled={!emailTo.trim()}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all"
                  style={{ background: emailOpened ? '#10B981' : '#0F62FE', opacity: !emailTo.trim() ? 0.5 : 1 }}
                >
                  <Mail size={10} />
                  {emailOpened ? 'Sent ✓ — Send again?' : queue.length > 1 ? `Open in Outlook (${queue.length})` : 'Open in Outlook'}
                </button>
              </div>
              {emailOpened && (
                <p className="text-[11px] text-green-600 px-1 flex items-center gap-1">
                  <Mail size={10} /> Outlook opened — click Send in Outlook, then come back here.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            onClick={cancelNotification}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmNotification}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#0F62FE' }}
          >
            OK — Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
