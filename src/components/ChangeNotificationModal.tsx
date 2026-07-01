'use client';
import React, { useState } from 'react';
import { useRFPStore } from '@/lib/store';
import { AlertTriangle, Send, Mail } from 'lucide-react';

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

  if (!pendingNotification) return null;

  // Capture as non-null local so closures below don't require re-narrowing
  const n = pendingNotification;
  const docName = documents.find(d => d.id === activeDocumentId)?.name ?? 'Active RFP';

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

  function openOutlook() {
    if (!emailTo.trim()) return;
    const subject = encodeURIComponent(`[RFP Analyzer] ${n.sourceModule} Updated — ${docName}`);
    const body    = encodeURIComponent(
      `${n.message}\n\nAffected modules:\n` +
      n.affectedModules.map(m => `  • ${m}`).join('\n') +
      `\n\nDocument: ${docName}\n\nSent from RFP Analyzer Pro`
    );
    const to = encodeURIComponent(emailTo.trim());
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank');
    setEmailOpened(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-3" style={{ background: '#0F62FE' }}>
          <AlertTriangle size={20} className="text-white shrink-0" />
          <div>
            <div className="text-sm font-bold text-white">Cross-Module Update</div>
            <div className="text-xs text-blue-200">Source: {n.sourceModule}</div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-700 mb-4">{n.message}</p>
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

            {/* Email via Outlook — mailto: opens Outlook directly */}
            {!emailOpened ? (
              <div className="flex gap-1.5">
                <input
                  type="email"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="recipient@ibm.com"
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border outline-none focus:border-blue-400"
                  style={{ borderColor: '#E2E8F0', fontSize: 12 }}
                  onKeyDown={e => e.key === 'Enter' && openOutlook()}
                />
                <button
                  onClick={openOutlook}
                  disabled={!emailTo.trim()}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity"
                  style={{ background: '#0F62FE', opacity: !emailTo.trim() ? 0.5 : 1 }}
                >
                  <Mail size={10} />
                  Open in Outlook
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs font-semibold text-green-600 px-1">
                <span className="flex items-center gap-1.5">
                  <Mail size={11} /> Outlook opened — click Send in Outlook ✓
                </span>
                <button
                  onClick={() => setEmailOpened(false)}
                  className="text-[10px] text-slate-400 underline font-normal"
                >
                  resend
                </button>
              </div>
            )}
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
