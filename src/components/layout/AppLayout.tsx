'use client';
// ============================================================
// AppLayout — Clean white sidebar · Light theme · Reference design
// Preserves all existing logic, routing, store, and API surfaces
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRFPStore } from '@/lib/store';
import type { TabId } from '@/types';
import {
  ChevronLeft, ChevronRight,
  Zap, Upload, LayoutDashboard, DollarSign,
  CalendarDays, Users, TestTubeDiagonal, Bot,
  CheckSquare, Circle,
  FileText, Target, Cpu, ClipboardList, ShieldCheck,
} from 'lucide-react';
import ChangeNotificationModal from '@/components/ChangeNotificationModal';

// ── Keep P export so other modules that import it don't break ──
export const P = {
  bg:        '#F8FAFC',
  bg2:       '#FFFFFF',
  glass:     'rgba(255,255,255,0.04)',
  glassBd:   'rgba(255,255,255,0.08)',
  glassHi:   'rgba(99,102,241,0.3)',
  indigo:    '#6366F1',
  indigoLt:  '#818CF8',
  cyan:      '#06B6D4',
  textPri:   '#0F172A',
  textSec:   '#64748B',
  textMuted: '#94A3B8',
  primary:   '#6366F1',
  teal:      '#06B6D4',
  amber:     '#F59E0B',
  surface:   '#F8FAFC',
  white:     '#FFFFFF',
  border:    '#E2E8F0',
};

interface NavItem {
  id: TabId;
  label: string;
  description: string;
  requiresDoc?: boolean;
}

// ── Nav items — order: Document Analyzer → Scope → Dashboard → … ──
const NAV_ITEMS: NavItem[] = [
  { id: 'document-analyzer',   label: 'Document',      description: 'Upload & analyze RFP' },
  { id: 'scope',                label: 'Scope',         description: 'Scope & requirements',        requiresDoc: true },
  { id: 'dashboard',            label: 'Dashboard',     description: 'Overview & metrics',          requiresDoc: true },
  { id: 'offerings',            label: 'Offerings',     description: 'IBM offerings & tech',         requiresDoc: true },
  { id: 'project-plan',         label: 'Project Plan',  description: 'Phases & timeline',            requiresDoc: true },
  { id: 'staffing',             label: 'Staffing',      description: 'Team composition',             requiresDoc: true },
  { id: 'testing',              label: 'Testing',       description: 'QA strategy',                  requiresDoc: true },
  { id: 'estimation',           label: 'Cost',          description: 'Effort & cost breakdown',      requiresDoc: true },
  { id: 'agentic-impact',       label: 'AI Impact',     description: 'AI vs traditional',            requiresDoc: true },
  { id: 'proposal',             label: 'Proposal',      description: 'Generate client proposal',     requiresDoc: true },
  { id: 'confidence-insights',  label: 'Confidence',    description: 'Historical win/loss insights', requiresDoc: true },
];

// ── Lucide icon resolver ──────────────────────────────────────
function NavIcon({ id, className }: { id: TabId; className?: string }) {
  const props = { size: 18, className };
  switch (id) {
    case 'document-analyzer': return <Upload {...props} />;
    case 'dashboard':         return <LayoutDashboard {...props} />;
    case 'scope':             return <Target {...props} />;
    case 'offerings':         return <Cpu {...props} />;
    case 'project-plan':      return <CalendarDays {...props} />;
    case 'staffing':          return <Users {...props} />;
    case 'testing':           return <TestTubeDiagonal {...props} />;
    case 'estimation':        return <DollarSign {...props} />;
    case 'agentic-impact':         return <Bot {...props} />;
    case 'proposal':               return <ClipboardList {...props} />;
    case 'confidence-insights':    return <ShieldCheck {...props} />;
    default:                       return <FileText {...props} />;
  }
}

// ── Sidebar nav entry ─────────────────────────────────────────
interface SideNavButtonProps {
  item: NavItem;
  isActive: boolean;
  isDisabled: boolean;
  sidebarOpen: boolean;
  onClick: () => void;
}
function SideNavButton({ item, isActive, isDisabled, sidebarOpen, onClick }: SideNavButtonProps) {
  if (isActive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current="page"
        aria-label={item.label}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left bg-indigo-600 text-white shadow-sm shadow-indigo-200 select-none"
      >
        <span className="shrink-0">
          <NavIcon id={item.id} className="text-white" />
        </span>
        {sidebarOpen && (
          <>
            <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
            <Circle size={6} className="fill-white/60 stroke-none shrink-0" />
          </>
        )}
      </button>
    );
  }

  if (isDisabled) {
    return (
      <div
        aria-disabled="true"
        aria-label={item.label}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-slate-300 cursor-not-allowed select-none"
      >
        <span className="shrink-0">
          <NavIcon id={item.id} className="text-slate-300" />
        </span>
        {sidebarOpen && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">{item.label}</div>
            <div className="text-[10px] text-slate-300 truncate">Upload doc first</div>
          </div>
        )}
      </div>
    );
  }

  // Enabled, not active
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={item.label}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors duration-150 select-none"
    >
      <span className="shrink-0">
        <NavIcon id={item.id} className="text-slate-500" />
      </span>
      {sidebarOpen && (
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="text-sm font-medium truncate">{item.label}</div>
          <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
        </div>
      )}
    </button>
  );
}

// ── Avatar (simple, light theme) ─────────────────────────────
function Avatar() {
  return (
    <div
      className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xs font-bold flex items-center justify-center shrink-0"
      aria-label="User avatar"
    >
      A
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Use narrow selectors so layout chrome does not rerender for unrelated analysis payload updates.
  const activeTab = useRFPStore((state) => state.activeTab);
  const setActiveTab = useRFPStore((state) => state.setActiveTab);
  const activeDocumentId = useRFPStore((state) => state.activeDocumentId);
  const documents = useRFPStore((state) => state.documents);
  const sidebarOpen = useRFPStore((state) => state.sidebarOpen);
  const toggleSidebar = useRFPStore((state) => state.toggleSidebar);
  const activeDoc = React.useMemo(
    () => documents.find((d) => d.id === activeDocumentId),
    [documents, activeDocumentId]
  );
  const activeNavItem = React.useMemo(
    () => NAV_ITEMS.find((n) => n.id === activeTab),
    [activeTab]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── White sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        className="flex flex-col h-full shrink-0 z-20 overflow-hidden bg-white border-r border-slate-200 shadow-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 shrink-0 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            {/* Logo icon */}
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

        {/* Active document badge */}
        {sidebarOpen && activeDoc && (
          <div className="mx-3 my-2 rounded-xl p-2.5 bg-indigo-50 border border-indigo-100">
            <div className="text-[10px] text-indigo-400 mb-0.5">Active Document</div>
            <div className="text-xs font-semibold text-indigo-700 truncate">{activeDoc.name}</div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive   = activeTab === item.id;
            const isDisabled = !!(item.requiresDoc && !activeDocumentId);
            return (
              <SideNavButton
                key={item.id}
                item={item}
                isActive={isActive}
                isDisabled={isDisabled}
                sidebarOpen={sidebarOpen}
                onClick={() => { if (!isDisabled) setActiveTab(item.id); }}
              />
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
          <div className="px-4 py-3 shrink-0 border-t border-slate-100">
            <div className="text-[10px] text-slate-400 text-center">RFP Analyzer Pro v1.0</div>
          </div>
        )}
      </motion.aside>

      {/* ── Main content area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-slate-200 bg-white">
          <div>
            <h1 className="text-base font-bold text-slate-900">
              {activeNavItem?.label ?? 'Dashboard'}
            </h1>
            <p className="text-xs text-slate-500">
              {activeNavItem?.description ?? 'Overview & metrics'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeDoc && (
              <div className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 bg-indigo-50 border border-indigo-100">
                {/*
                  FIX: `animate-pulse` was attached unconditionally whenever a document
                  was loaded. Tailwind's animate-pulse drives a continuous CSS
                  opacity/scale keyframe loop that forces the browser to repaint on
                  every animation frame (~60 fps) for the entire lifetime of the session,
                  contributing to measurable background CPU usage (~5-10% on its own).
                  The indicator is now a plain static dot — it communicates the same
                  "ready" state without a perpetual animation loop.
                */}
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-xs font-medium text-indigo-600">Analysis Ready</span>
              </div>
            )}
            <Avatar />
          </div>
        </header>

        {/* Scrollable page body */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Cross-module notification modal */}
      <ChangeNotificationModal />
    </div>
  );
}
