'use client';
// ============================================================
// AppLayout — Dark Glassmorphism · Deep navy bg · Indigo/cyan accents
// IBM Blue sidebar preserved · Frosted glass header + content
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRFPStore } from '@/lib/store';
import type { TabId } from '@/types';
import { ChevronLeft, ChevronRight, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import ChangeNotificationModal from '@/components/ChangeNotificationModal';

// ── Dark theme palette tokens ─────────────────────────────────
export const P = {
  bg:        '#0A0F1E',
  bg2:       '#0D1424',
  glass:     'rgba(255,255,255,0.04)',
  glassBd:   'rgba(255,255,255,0.08)',
  glassHi:   'rgba(99,102,241,0.3)',
  indigo:    '#6366F1',
  indigoLt:  '#818CF8',
  cyan:      '#06B6D4',
  textPri:   '#F1F5F9',
  textSec:   '#94A3B8',
  textMuted: '#475569',
  // Legacy aliases used by other components
  primary:   '#6366F1',
  teal:      '#06B6D4',
  amber:     '#F59E0B',
  surface:   '#0A0F1E',
  white:     '#F1F5F9',
  border:    'rgba(255,255,255,0.08)',
};

interface NavItem {
  id: TabId;
  label: string;
  description: string;
  requiresDoc?: boolean;
}

// ── Animated SVG icons (stroke colour adapts to dark theme) ───
function IconDocAnalyzer({ active }: { active: boolean }) {
  const c = active ? '#fff' : 'rgba(165,180,252,0.7)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.rect x="4" y="2" width="12" height="16" rx="2" stroke={c} strokeWidth="1.5"
        animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.line x1="7" y1="7" x2="13" y2="7" stroke={c} strokeWidth="1.5"
        animate={{ x2: [13, 11, 13] }} transition={{ duration: 1.8, repeat: Infinity }} />
      <line x1="7" y1="10" x2="13" y2="10" stroke={c} strokeWidth="1.5" />
      <line x1="7" y1="13" x2="11" y2="13" stroke={c} strokeWidth="1.5" />
      <motion.circle cx="18" cy="18" r="4" stroke={c} strokeWidth="1.5"
        animate={{ r: [4, 4.8, 4] }} transition={{ duration: 1.5, repeat: Infinity }} />
      <motion.line x1="21" y1="21" x2="23" y2="23" stroke={c} strokeWidth="1.5"
        animate={{ x2: [23, 24, 23], y2: [23, 24, 23] }} transition={{ duration: 1.5, repeat: Infinity }} />
    </svg>
  );
}
function IconDashboard({ active }: { active: boolean }) {
  const c = active ? '#fff' : 'rgba(165,180,252,0.7)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.rect x="3" y="12" width="4" height="9" rx="1" fill={c} animate={{ height: [9, 12, 9] }} transition={{ duration: 1.4, repeat: Infinity }} />
      <motion.rect x="10" y="7" width="4" height="14" rx="1" fill={c} animate={{ height: [14, 10, 14] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }} />
      <motion.rect x="17" y="4" width="4" height="17" rx="1" fill={c} animate={{ height: [17, 12, 17] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }} />
    </svg>
  );
}
function IconScope({ active }: { active: boolean }) {
  const c = active ? '#fff' : 'rgba(165,180,252,0.7)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={c} strokeWidth="1.5" />
      <motion.polyline points="7,12 10,15 17,8" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.4, 0.8, 1] }} />
    </svg>
  );
}
function IconOfferings({ active }: { active: boolean }) {
  const c = active ? '#fff' : 'rgba(165,180,252,0.7)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.path d="M12 2l2 4 5 .7-3.5 3.4.8 5L12 13l-4.3 2.1.8-5L5 6.7 10 6z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"
        animate={{ rotate: [0, 360] }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '12px 12px' }} />
      <circle cx="12" cy="12" r="2.5" fill={c} />
    </svg>
  );
}
function IconProjectPlan({ active }: { active: boolean }) {
  const c = active ? '#fff' : 'rgba(165,180,252,0.7)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={c} strokeWidth="1.5" />
      <line x1="3" y1="9" x2="21" y2="9" stroke={c} strokeWidth="1.5" />
      <motion.rect x="5" y="12" width="5" height="3" rx="1" fill={c} animate={{ width: [5, 8, 5] }} transition={{ duration: 1.6, repeat: Infinity }} />
      <motion.rect x="12" y="12" width="7" height="3" rx="1" fill={c} opacity="0.6" animate={{ x: [12, 11, 12] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.4 }} />
    </svg>
  );
}
function IconStaffing({ active }: { active: boolean }) {
  const c = active ? '#fff' : 'rgba(165,180,252,0.7)';
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
  const c = active ? '#fff' : 'rgba(165,180,252,0.7)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.path d="M9 3h6l3 8H6z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"
        animate={{ scaleY: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ transformOrigin: '12px 3px' }} />
      <rect x="6" y="11" width="12" height="9" rx="2" stroke={c} strokeWidth="1.5" />
      <motion.circle cx="10" cy="15.5" r="1.2" fill={c} animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />
      <motion.circle cx="14" cy="15.5" r="1.2" fill={c} animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0.5 }} />
    </svg>
  );
}
function IconEstimation({ active }: { active: boolean }) {
  const c = active ? '#fff' : 'rgba(165,180,252,0.7)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2" stroke={c} strokeWidth="1.5" />
      <line x1="8" y1="7" x2="16" y2="7" stroke={c} strokeWidth="1.5" />
      <line x1="8" y1="11" x2="16" y2="11" stroke={c} strokeWidth="1.5" />
      <motion.line x1="8" y1="15" x2="13" y2="15" stroke={c} strokeWidth="1.5"
        animate={{ x2: [13, 16, 13] }} transition={{ duration: 1.8, repeat: Infinity }} />
      <motion.circle cx="18" cy="18" r="3" fill={c} opacity="0.8" animate={{ r: [3, 3.6, 3] }} transition={{ duration: 1.2, repeat: Infinity }} />
    </svg>
  );
}
function IconAgenticImpact({ active }: { active: boolean }) {
  const c = active ? '#fff' : 'rgba(165,180,252,0.7)';
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
function IconProposal({ active }: { active: boolean }) {
  const c = active ? '#fff' : 'rgba(165,180,252,0.7)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="13" height="17" rx="2" stroke={c} strokeWidth="1.5" />
      <motion.line x1="7" y1="7" x2="14" y2="7" stroke={c} strokeWidth="1.5" animate={{ x2: [14, 12, 14] }} transition={{ duration: 1.8, repeat: Infinity }} />
      <line x1="7" y1="11" x2="14" y2="11" stroke={c} strokeWidth="1.5" />
      <line x1="7" y1="15" x2="11" y2="15" stroke={c} strokeWidth="1.5" />
      <motion.circle cx="19" cy="18" r="3" fill={c} opacity="0.9" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ transformOrigin: '19px 18px' }} />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { id: 'document-analyzer', label: 'Document Analyzer',      description: 'Upload & analyze RFP' },
  { id: 'scope',             label: 'Scope',                  description: 'Scope items & requirements',    requiresDoc: true },
  { id: 'dashboard',         label: 'Dashboard',              description: 'Overview & metrics',            requiresDoc: true },
  { id: 'offerings',         label: 'Offerings / Technology', description: 'IBM offerings & tech',          requiresDoc: true },
  { id: 'project-plan',      label: 'Project Plan',           description: 'Phases & Gantt timeline',       requiresDoc: true },
  { id: 'staffing',          label: 'Staffing Plan',          description: 'IBM Band staffing',             requiresDoc: true },
  { id: 'testing',           label: 'Testing',                description: 'QA strategy',                   requiresDoc: true },
  { id: 'estimation',        label: 'Estimation',             description: 'Effort & cost breakdown',       requiresDoc: true },
  { id: 'agentic-impact',    label: 'Agentic Impact',         description: 'AI vs traditional',             requiresDoc: true },
  { id: 'proposal',          label: 'Create Proposal',        description: 'Generate client proposal',      requiresDoc: true },
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
    case 'agentic-impact':    return <IconAgenticImpact active={active} />;
    case 'proposal':          return <IconProposal active={active} />;
    default:                  return <IconDocAnalyzer active={active} />;
  }
}

// ── Dark avatar with gradient ring ───────────────────────────
function ModernAvatar() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-200"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        aria-label="User menu"
      >
        <div className="relative">
          <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
            <defs>
              <linearGradient id="avatarRingDark" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="0.5" stopColor="#06B6D4" />
                <stop offset="1" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <circle cx="18" cy="18" r="17" stroke="url(#avatarRingDark)" strokeWidth="2" fill="rgba(255,255,255,0.05)" />
            <circle cx="18" cy="18" r="14" fill="#1E2744" />
            <ellipse cx="18" cy="10" rx="8" ry="5" fill="#6366F1" />
            <rect x="10" y="10" width="16" height="5" fill="#6366F1" />
            <ellipse cx="18" cy="18" rx="7" ry="7.5" fill="#C9A67E" />
            <circle cx="15.5" cy="17" r="1.2" fill="#1A202C" />
            <circle cx="20.5" cy="17" r="1.2" fill="#1A202C" />
            <circle cx="16" cy="16.5" r="0.4" fill="white" />
            <circle cx="21" cy="16.5" r="0.4" fill="white" />
            <path d="M15 20.5 Q18 23 21 20.5" stroke="#A07040" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M11 30 L14 24 L18 26 L22 24 L25 30" fill="#6366F1" />
          </svg>
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-semibold" style={{ color: P.textPri }}>IBMer</div>
          <div className="text-[10px]" style={{ color: P.textSec }}>Senior Consultant</div>
        </div>
        <ChevronDown size={12} style={{ color: P.textSec }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-2xl z-50 overflow-hidden"
            style={{
              background: 'rgba(17,24,39,0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xs font-bold" style={{ color: P.textPri }}>IBMer</div>
              <div className="text-[10px]" style={{ color: P.textSec }}>ibmer@ibm.com</div>
            </div>
            {[
              { icon: User, label: 'Profile' },
              { icon: Settings, label: 'Settings' },
            ].map(({ icon: Icon, label }) => (
              <button key={label} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{ color: P.textPri }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Icon size={14} style={{ color: P.textSec }} />
                {label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style={{ color: '#F87171' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,63,94,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeTab, setActiveTab, activeDocumentId, documents, sidebarOpen, toggleSidebar } = useRFPStore();
  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const activeNavItem = NAV_ITEMS.find((n) => n.id === activeTab);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: P.bg }}>

      {/* ── IBM Blue Sidebar — preserved, icon colours updated ── */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        style={{ backgroundColor: '#0F62FE' }}
        className="flex flex-col h-full shrink-0 z-20 overflow-hidden shadow-2xl"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
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
          <div className="mx-3 my-2 rounded-xl p-2.5"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <div className="text-[10px] text-blue-200 mb-0.5">Active Document</div>
            <div className="text-xs font-semibold text-white truncate">{activeDoc.name}</div>
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

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Frosted glass header ── */}
        <header className="h-16 flex items-center justify-between px-6 shrink-0"
          style={{
            background: 'rgba(13,20,36,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 1px 0 rgba(99,102,241,0.12)',
          }}>
          <div>
            <h1 className="text-base font-bold" style={{ color: P.textPri }}>
              {activeNavItem?.label ?? 'RFP Analyzer Pro'}
            </h1>
            <p className="text-xs" style={{ color: P.textSec }}>{activeNavItem?.description ?? ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {activeDoc && (
              <div className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5"
                style={{
                  background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.25)',
                }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#06B6D4' }} />
                <span className="text-xs font-medium" style={{ color: '#06B6D4' }}>Analysis Ready</span>
              </div>
            )}
            <ModernAvatar />
          </div>
        </header>

        {/* ── Page content ── */}
        <div className="flex-1 overflow-y-auto" style={{ background: P.bg }}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
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
