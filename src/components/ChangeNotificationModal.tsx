'use client';
import React from 'react';
import { useRFPStore } from '@/lib/store';
import { AlertTriangle } from 'lucide-react';

export default function ChangeNotificationModal() {
  const { pendingNotification, confirmNotification, cancelNotification } = useRFPStore();
  if (!pendingNotification) return null;

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
