// ============================================================
// App Layout — sidebar navigation + main content shell
// ============================================================
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRFPStore } from '@/lib/store';
import type { TabId } from '@/types';
import {
  LayoutDashboard, Upload, DollarSign, CalendarDays,
  Users, TestTube2, Bot, ChevronLeft, ChevronRight,
  FileText, Zap, Circle,
} from 'lucide-react';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresDoc?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',    icon: <LayoutDashboard size={18} />, description: 'Overview & metrics' },
  { id: 'upload',        label: 'Document',     icon: <Upload size={18} />,          description: 'Upload & analyze RFP' },
  { id: 'cost',          label: 'Cost',         icon: <DollarSign size={18} />,      description: 'Cost estimation',      requiresDoc: true },
  { id: 'plan',          label: 'Project Plan', icon: <CalendarDays size={18} />,    description: 'Phases & milestones',  requiresDoc: true },
  { id: 'staffing',      label: 'Staffing',     icon: <Users size={18} />,           description: 'Team composition',     requiresDoc: true },
  { id: 'testing',       label: 'Testing',      icon: <TestTube2 size={18} />,       description: 'QA strategy',          requiresDoc: true },
  { id: 'ai-comparison', label: 'AI Impact',    icon: <Bot size={18} />,             description: 'AI vs traditional',    requiresDoc: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeTab, setActiveTab, activeDocumentId, documents, sidebarOpen, toggleSidebar } = useRFPStore();
  const activeDoc = documents.find((d) => d.id === activeDocumentId);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 68 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        className="flex flex-col bg-white border-r border-slate-200 h-full shrink-0 z-10 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">RFP Analyzer</div>
                <div className="text-[10px] text-slate-400 truncate">Pro Edition</div>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Active Document Badge */}
        {sidebarOpen && activeDoc && (
          <div className="mx-3 my-2">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                <FileText size={13} className="text-indigo-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-indigo-700 truncate">{activeDoc.name}</div>
                  <div className="text-[10px] text-indigo-400">Active document</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive   = activeTab === item.id;
            const isDisabled = !!(item.requiresDoc && !activeDocumentId);

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                aria-disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  setActiveTab(item.id);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 select-none',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : isDisabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer',
                )}
              >
                <span className="shrink-0">{item.icon}</span>

                {sidebarOpen && (
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    {!isActive && (
                      <div className={cn('text-[10px] truncate', isDisabled ? 'text-slate-300' : 'text-slate-400')}>
                        {isDisabled ? 'Upload doc first' : item.description}
                      </div>
                    )}
                  </div>
                )}

                {isActive && sidebarOpen && (
                  <Circle size={6} className="fill-white/60 stroke-none shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Expand toggle (collapsed state) */}
        {!sidebarOpen && (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={toggleSidebar}
            className="mx-auto mb-4 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Footer */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-t border-slate-100 shrink-0">
            <div className="text-[10px] text-slate-400 text-center">RFP Analyzer Pro v1.0</div>
          </div>
        )}
      </motion.aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-base font-bold text-slate-900">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? 'Dashboard'}
            </h1>
            <p className="text-xs text-slate-500">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.description ?? ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeDoc && (
              <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-emerald-700">Analysis Ready</span>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold select-none">
              A
            </div>
          </div>
        </header>

        {/* Page content — simple fade-only, no unmount race */}
        <div className="flex-1 overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
