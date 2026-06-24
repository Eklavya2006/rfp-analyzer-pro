// ============================================================
// AiProductivityWidget
// Persistent global control for the AI Productivity %.
// Used in the AppLayout topbar and embedded in the Staffing module.
// Changing the slider/input calls setAiProductivityPct() in the
// Zustand store, which propagates the change to every consumer.
// ============================================================
'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const DEFAULT_PCT = 30;

interface Props {
  /** 'compact' = topbar pill, 'full' = expanded panel inside Staffing module */
  variant?: 'compact' | 'full';
  className?: string;
}

export default function AiProductivityWidget({ variant = 'compact', className }: Props) {
  const { aiProductivityPct, setAiProductivityPct } = useRFPStore();
  const [expanded, setExpanded] = useState(false);
  const [inputVal, setInputVal] = useState(String(aiProductivityPct));
  const [showTooltip, setShowTooltip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local input in sync with store when external changes occur
  React.useEffect(() => {
    setInputVal(String(aiProductivityPct));
  }, [aiProductivityPct]);

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setAiProductivityPct(v);
    setInputVal(String(v));
  }, [setAiProductivityPct]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
  }, []);

  const handleInputCommit = useCallback(() => {
    const v = Math.max(0, Math.min(100, Number(inputVal) || 0));
    setAiProductivityPct(v);
    setInputVal(String(v));
  }, [inputVal, setAiProductivityPct]);

  const handleReset = useCallback(() => {
    setAiProductivityPct(DEFAULT_PCT);
    setInputVal(String(DEFAULT_PCT));
  }, [setAiProductivityPct]);

  // Colour ramp: 0% = slate, 30% = indigo, 60% = violet, 100% = emerald
  const barColor =
    aiProductivityPct === 0 ? 'bg-slate-300'
    : aiProductivityPct < 20 ? 'bg-sky-400'
    : aiProductivityPct < 50 ? 'bg-indigo-500'
    : aiProductivityPct < 80 ? 'bg-violet-500'
    : 'bg-emerald-500';

  const fteImpactLabel = aiProductivityPct === 0
    ? 'No FTE reduction'
    : aiProductivityPct === 100
    ? 'Maximum reduction (min 0.1 FTE floor applied)'
    : `~${aiProductivityPct}% fewer FTEs required`;

  // ── Compact (topbar pill) ──
  if (variant === 'compact') {
    return (
      <div className={cn('relative', className)}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all',
            'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
          )}
        >
          <Bot size={13} className="text-indigo-600" />
          <span>AI Productivity</span>
          <span className="font-bold text-indigo-900">{aiProductivityPct}%</span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-72 bg-white border border-indigo-100 rounded-2xl shadow-xl p-4 z-50"
            >
              <SliderPanel
                pct={aiProductivityPct}
                inputVal={inputVal}
                barColor={barColor}
                fteImpactLabel={fteImpactLabel}
                onSlider={handleSlider}
                onInputChange={handleInputChange}
                onInputCommit={handleInputCommit}
                onReset={handleReset}
                showTooltip={showTooltip}
                setShowTooltip={setShowTooltip}
                inputRef={inputRef}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Full (embedded in Staffing module) ──
  return (
    <div className={cn('bg-indigo-50 border border-indigo-100 rounded-2xl p-5', className)}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-indigo-100 border border-indigo-200 rounded-xl flex items-center justify-center">
          <Bot size={16} className="text-indigo-600" />
        </div>
        <div>
          <div className="text-sm font-bold text-indigo-900">AI Productivity Settings</div>
          <div className="text-xs text-indigo-500">Changes propagate instantly across all modules</div>
        </div>
        <motion.div
          key={aiProductivityPct}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="ml-auto text-2xl font-extrabold text-indigo-700"
        >
          {aiProductivityPct}%
        </motion.div>
      </div>

      <SliderPanel
        pct={aiProductivityPct}
        inputVal={inputVal}
        barColor={barColor}
        fteImpactLabel={fteImpactLabel}
        onSlider={handleSlider}
        onInputChange={handleInputChange}
        onInputCommit={handleInputCommit}
        onReset={handleReset}
        showTooltip={showTooltip}
        setShowTooltip={setShowTooltip}
        inputRef={inputRef}
        fullWidth
      />
    </div>
  );
}

// ── Shared slider panel ──────────────────────────────────────
interface SliderPanelProps {
  pct: number;
  inputVal: string;
  barColor: string;
  fteImpactLabel: string;
  onSlider: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputCommit: () => void;
  onReset: () => void;
  showTooltip: boolean;
  setShowTooltip: (v: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  fullWidth?: boolean;
}

function SliderPanel({
  pct, inputVal, barColor, fteImpactLabel,
  onSlider, onInputChange, onInputCommit, onReset,
  showTooltip, setShowTooltip, inputRef, fullWidth,
}: SliderPanelProps) {
  return (
    <div className="space-y-3">
      {/* Slider row */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={pct}
            onChange={onSlider}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #6366f1 ${pct}%, #e2e8f0 ${pct}%)`,
            }}
            aria-label="AI Productivity Percentage"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          {/* Live tooltip above thumb */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -top-8 text-[10px] font-bold text-white bg-indigo-600 rounded-lg px-2 py-0.5 pointer-events-none"
                style={{ left: `calc(${pct}% - 18px)` }}
              >
                {pct}%
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Numeric input */}
        <div className="flex items-center gap-1 shrink-0">
          <input
            ref={inputRef}
            type="number"
            min={0}
            max={100}
            value={inputVal}
            onChange={onInputChange}
            onBlur={onInputCommit}
            onKeyDown={(e) => e.key === 'Enter' && onInputCommit()}
            className="w-14 text-center text-sm font-bold border border-indigo-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-indigo-800 bg-white"
            aria-label="AI productivity percentage input"
          />
          <span className="text-xs font-semibold text-indigo-600">%</span>
        </div>
      </div>

      {/* Track ticks */}
      <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      {/* Impact label */}
      <motion.div
        key={pct}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-xs text-indigo-700 bg-white border border-indigo-100 rounded-xl px-3 py-2"
      >
        <div className={cn('w-2 h-2 rounded-full shrink-0', barColor)} />
        {fteImpactLabel}
        {pct === 100 && (
          <span className="text-amber-600 font-medium ml-1">· 0.1 FTE floor active</span>
        )}
      </motion.div>

      {/* Reset button */}
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <RotateCcw size={11} />
        Reset to default (30%)
      </button>
    </div>
  );
}
