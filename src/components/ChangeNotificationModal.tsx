'use client';
// + Slack/Teams alert button (Feature 5 — feature/enriched)
import React, { useState } from 'react';
import { useRFPStore } from '@/lib/store';
import { AlertTriangle, Send } from 'lucide-react';

export default function ChangeNotificationModal() {
  const pendingNotification = useRFPStore((state) => state.pendingNotification);
  const confirmNotification = useRFPStore((state) => state.confirmNotification);
  const cancelNotification  = useRFPStore((state) => state.cancelNotification);
  const activeDocumentId    = useRFPStore((state) => state.activeDocumentId);
  const documents           = useRFPStore((state) => state.documents);

  const [alertSent,   setAlertSent]   = useState(false);
  const [alertSending, setAlertSending] = useState(false);

  if (!pendingNotification) return null;

  const docName = documents.find(d => d.id === activeDocumentId)?.name ?? 'Active RFP';

  async function sendAlert() {
    if (!pendingNotification) return;
    setAlertSending(true);
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceModule:    pendingNotification.sourceModule,
          affectedModules: pendingNotification.affectedModules,
          message:         pendingNotification.message,
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
          <div>
            <div className="text-sm font-bold text-white">Cross-Module Update</div>
            <div className="text-xs text-blue-200">Source: {pendingNotification.sourceModule}</div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-700 mb-4">{pendingNotification.message}</p>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="text-xs font-semibold text-blue-800 mb-2">Panels that will be updated:</div>
            <ul className="space-y-1">
              {pendingNotification.affectedModules.map((m) => (
                <li key={m} className="flex items-center gap-2 text-xs text-blue-700">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#0F62FE' }} />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          {/* Slack/Teams alert button */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={sendAlert}
              disabled={alertSent || alertSending}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                borderColor: alertSent ? '#10B981' : '#E2E8F0',
                color:       alertSent ? '#10B981' : '#64748B',
                background:  alertSent ? '#D1FAE5' : '#F8FAFC',
                cursor:      alertSent ? 'default' : 'pointer',
              }}
            >
              <Send size={11} />
              {alertSending ? 'Sending…' : alertSent ? 'Alert sent to Slack/Teams ✓' : 'Notify Slack / Teams'}
            </button>
            {!alertSent && (
              <p className="text-[10px] text-slate-400 mt-1">
                Requires SLACK_WEBHOOK_URL or TEAMS_WEBHOOK_URL env var
              </p>
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
