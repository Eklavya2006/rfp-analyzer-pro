'use client';
// ============================================================
// AppLayout — IBM Blue sidebar with 9 animated nav icons
// ============================================================
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRFPStore } from '@/lib/store';
import type { TabId } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ChangeNotificationModal from '@/components/ChangeNotificationModal';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresDoc?: boolean;
}

// ── Animated SVG icons ───────────────────────────────────────
function IconDocAnalyzer({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.rect x="4" y="2" width="12" height="16" rx="2" stroke={active ? '#fff' : '#a8c8ff'} strokeWidth="1.5"
        animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.line x1="7" y1="7" x2="13" y2="7" stroke={active ? '#fff' : '#a8c8ff'} strokeWidth="1.5"
        animate={{ x2: [13, 11, 13] }} transition={{ duration: 1.8, repeat: Infinity }} />
      <line x1="7" y1="10" x2="13" y2="10" stroke={active ? '#fff' : '#a8c8ff'} strokeWidth="1.5" />
      <line x1="7" y1="13" x2="11" y2="13" stroke={active ? '#fff' : '#a8c8ff'} strokeWidth="1.5" />
      <motion.circle cx="18" cy="18" r="4" stroke={active ? '#fff' : '#a8c8ff'} strokeWidth="1.5"
        animate={{ r: [4, 4.8, 4] }} transition={{ duration: 1.5, repeat: Infinity }} />
      <motion.line x1="21" y1="21" x2="23" y2="23" stroke={active ? '#fff' : '#a8c8ff'} strokeWidth="1.5"
        animate={{ x2: [23, 24, 23], y2: [23, 24, 23] }} transition={{ duration: 1.5, repeat: Infinity }} />
    </svg>
  );
}

function IconDashboard({ active }: { active: boolean }) {
  const c = active ? '#fff' : '#a8c8ff';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.rect x="3" y="12" width="4" height="9" rx="1" fill={c}
        animate={{ height: [9, 12, 9] }} transition={{ duration: 1.4, repeat: Infinity }} />
      <motion.rect x="10" y="7" width="4" height="14" rx="1" fill={c}
        animate={{ height: [14, 10, 14] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }} />
      <motion.rect x="17" y="4" width="4" height="17" rx="1" fill={c}
        animate={{ height: [17, 12, 17] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }} />
    </svg>
  );
}

function IconScope({ active }: { active: boolean }) {
  const c = active ? '#fff' : '#a8c8ff';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={c} strokeWidth="1.5" />
      <motion.polyline points="7,12 10,15 17,8" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.4, 0.8, 1] }} />
    </svg>
  );
}

function IconOfferings({ active }: { active: boolean }) {
  const c = active ? '#fff' : '#a8c8ff';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.path d="M12 2l2 4 5 .7-3.5 3.4.8 5L12 13l-4.3 2.1.8-5L5 6.7 10 6z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"
        animate={{ rotate: [0, 360] }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '12px 12px' }} />
      <circle cx="12" cy="12" r="2.5" fill={c} />
    </svg>
  );
}

function IconProjectPlan({ active }: { active: boolean }) {
  const c = active ? '#fff' : '#a8c8ff';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={c} strokeWidth="1.5" />
      <line x1="3" y1="9" x2="21" y2="9" stroke={c} strokeWidth="1.5" />
      <motion.rect x="5" y="12" width="5" height="3" rx="1" fill={c}
        animate={{ width: [5, 8, 5] }} transition={{ duration: 1.6, repeat: Infinity }} />
      <motion.rect x="12" y="12" width="7" height="3" rx="1" fill={c} opacity="0.6"
        animate={{ x: [12, 11, 12] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.4 }} />
    </svg>
  );
}

function IconStaffing({ active }: { active: boolean }) {
  const c = active ? '#fff' : '#a8c8ff';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="3.5" stroke={c} strokeWidth="1.5" />
      <motion.path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke={c} strokeWidth="1.5" strokeLinecap="round"
        animate={{ d: ['M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7', 'M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7', 'M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7'] }}
        transition={{ duration: 2, repeat: Infinity }} />
      <circle cx="5.5" cy="9" r="2" stroke={c} strokeWidth="1.2" opacity="0.6" />
      <circle cx="18.5" cy="9" r="2" stroke={c} strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
}

function IconTesting({ active }: { active: boolean }) {
  const c = active ? '#fff' : '#a8c8ff';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.path d="M9 3h6l3 8H6z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"
        animate={{ scaleY: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ transformOrigin: '12px 3px' }} />
      <rect x="6" y="11" width="12" height="9" rx="2" stroke={c} strokeWidth="1.5" />
      <motion.circle cx="10" cy="15.5" r="1.2" fill={c}
        animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />
      <motion.circle cx="14" cy="15.5" r="1.2" fill={c}
        animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0.5 }} />
    </svg>
  );
}

function IconEstimation({ active }: { active: boolean }) {
  const c = active ? '#fff' : '#a8c8ff';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2" stroke={c} strokeWidth="1.5" />
      <line x1="8" y1="7" x2="16" y2="7" stroke={c} strokeWidth="1.5" />
      <line x1="8" y1="11" x2="16" y2="11" stroke={c} strokeWidth="1.5" />
      <motion.line x1="8" y1="15" x2="13" y2="15" stroke={c} strokeWidth="1.5"
        animate={{ x2: [13, 16, 13] }} transition={{ duration: 1.8, repeat: Infinity }} />
      <motion.circle cx="18" cy="18" r="3" fill={c} opacity="0.8"
        animate={{ r: [3, 3.6, 3] }} transition={{ duration: 1.2, repeat: Infinity }} />
      <text x="16.5" y="19.5" fontSize="4" fill={active ? '#0F62FE' : '#0F62FE'} fontWeight="bold">$</text>
    </svg>
  );
}

function IconAIImpact({ active }: { active: boolean }) {
  const c = active ? '#fff' : '#a8c8ff';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.ellipse cx="8" cy="12" rx="5" ry="7" stroke={c} strokeWidth="1.5"
        animate={{ ry: [7, 8, 7] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.ellipse cx="16" cy="12" rx="5" ry="7" stroke={c} strokeWidth="1.5" opacity="0.6"
        animate={{ ry: [7, 6, 7] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
      <motion.path d="M11 9l2 3-2 3" stroke={c} strokeWidth="1.5" strokeLinecap="round"
        animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { id: 'document-analyzer', label: 'Document Analyzer', icon: null, description: 'Upload & analyze RFP' },
  { id: 'dashboard',         label: 'Dashboard',          icon: null, description: 'Overview & metrics',     requiresDoc: true },
  { id: 'scope',             label: 'Scope & Deliverables', icon: null, description: 'Scope items & deliverables', requiresDoc: true },
  { id: 'offerings',         label: 'Offerings / Technology', icon: null, description: 'IBM offerings & tech',   requiresDoc: true },
  { id: 'project-plan',      label: 'Project Plan',       icon: null, description: 'Phases & Gantt timeline', requiresDoc: true },
  { id: 'staffing',          label: 'Staffing Plan',      icon: null, description: 'IBM Band staffing',       requiresDoc: true },
  { id: 'testing',           label: 'Testing',            icon: null, description: 'QA strategy',             requiresDoc: true },
  { id: 'estimation',        label: 'Estimation',         icon: null, description: 'Effort & cost breakdown', requiresDoc: true },
  { id: 'ai-impact',         label: 'AI Impact',          icon: null, description: 'AI vs traditional',       requiresDoc: true },
];

function NavIcon({ id, active }: { id: TabId; active: boolean }) {
  switch (id) {
    case 'document-analyzer': return <IconDocAnalyzer active={active} />;
    case 'dashboard':         return <IconDashboard active={active} />;
    case 'scope':             return <IconScope active={active} />;
    case 'offerings':         return <IconOfferings active={active} />;
    case 'project-plan':      return <IconProjectPlan active={active} />;
    case 'staffing':          return <IconStaffing active={active} />;
    case 'testing':           return <IconTesting active={active} />;
    case 'estimation':        return <IconEstimation active={active} />;
    case 'ai-impact':         return <IconAIImpact active={active} />;
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeTab, setActiveTab, activeDocumentId, documents, sidebarOpen, toggleSidebar } = useRFPStore();
  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const activeNavItem = NAV_ITEMS.find((n) => n.id === activeTab);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── IBM Blue Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        style={{ backgroundColor: '#0F62FE' }}
        className="flex flex-col h-full shrink-0 z-20 overflow-hidden shadow-2xl"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-xs font-black" style={{ color: '#0F62FE' }}>IBM</span>
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">RFP Analyzer Pro</div>
                <div className="text-[10px] text-blue-200 truncate">Powered by IBM</div>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={toggleSidebar} aria-label="Collapse sidebar"
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors shrink-0">
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {/* Active Document Badge */}
        {sidebarOpen && activeDoc && (
          <div className="mx-3 my-2 bg-white/10 rounded-xl p-2.5">
            <div className="text-[10px] text-blue-200 mb-0.5">Active Document</div>
            <div className="text-xs font-semibold text-white truncate">{activeDoc.name}</div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const isDisabled = !!(item.requiresDoc && !activeDocumentId);
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => { if (!isDisabled) setActiveTab(item.id); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 select-none',
                  isActive
                    ? 'bg-white/20 text-white shadow-inner'
                    : isDisabled
                    ? 'text-blue-300/40 cursor-not-allowed'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white cursor-pointer',
                )}
              >
                <span className="shrink-0">
                  <NavIcon id={item.id} active={isActive} />
                </span>
                {sidebarOpen && (
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="text-xs font-semibold truncate">{item.label}</div>
                    {!isActive && (
                      <div className={cn('text-[10px] truncate', isDisabled ? 'text-blue-300/30' : 'text-blue-200')}>
                        {isDisabled ? 'Upload document first' : item.description}
                      </div>
                    )}
                  </div>
                )}
                {isActive && sidebarOpen && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Expand toggle */}
        {!sidebarOpen && (
          <button type="button" aria-label="Expand sidebar" onClick={toggleSidebar}
            className="mx-auto mb-4 p-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronRight size={15} />
          </button>
        )}

        {/* Footer */}
        {sidebarOpen && (
          <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="text-[10px] text-blue-300 text-center">© IBM Corporation 2024</div>
          </div>
        )}
      </motion.aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm">
          <div>
            <h1 className="text-base font-bold text-gray-900">{activeNavItem?.label ?? 'RFP Analyzer Pro'}</h1>
            <p className="text-xs text-gray-500">{activeNavItem?.description ?? ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {activeDoc && (
              <div className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: '#e8f2ff', border: '1px solid #b3d1ff' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#0F62FE' }} />
                <span className="text-xs font-medium" style={{ color: '#0F62FE' }}>Analysis Ready</span>
              </div>
            )}
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#0F62FE' }}>
              A
            </div>
          </div>
        </header>

        {/* Page content */}
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

      {/* ── Cross-module change notification modal ── */}
      <ChangeNotificationModal />
    </div>
  );
}
