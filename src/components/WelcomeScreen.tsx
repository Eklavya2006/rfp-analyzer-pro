'use client';
// WelcomeScreen — full-screen IBM blue splash shown once per session.
// Audio: Web Audio API synthesised IBM-style chime — no external files required.
import React, { useEffect, useRef, useState } from 'react';

// IBM Blue palette
const IBM = {
  blue:       '#0F62FE',   // IBM Blue 60
  blueDark:   '#0043CE',   // IBM Blue 70
  blueDeep:   '#001D6C',   // IBM Blue 90
  white:      '#FFFFFF',
  whiteAlpha: 'rgba(255,255,255,0.12)',
  cyan:       '#1192E8',   // IBM Cyan 50
};

// ── Synthesised IBM-style welcome chime ───────────────────────
// Three rising tones: E4 → G#4 → B4 (IBM brand-adjacent warmth)
function playWelcomeChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.18, ctx.currentTime);
    master.connect(ctx.destination);

    const notes = [
      { freq: 329.63, start: 0.0,  dur: 0.55 },   // E4
      { freq: 415.30, start: 0.32, dur: 0.55 },   // G#4
      { freq: 493.88, start: 0.62, dur: 0.90 },   // B4
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.9, ctx.currentTime + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });

    // Soft pad behind the melody
    const pad  = ctx.createOscillator();
    const padG = ctx.createGain();
    pad.type = 'sine';
    pad.frequency.setValueAtTime(164.81, ctx.currentTime);   // E3
    padG.gain.setValueAtTime(0, ctx.currentTime);
    padG.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.1);
    padG.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
    pad.connect(padG);
    padG.connect(master);
    pad.start(ctx.currentTime);
    pad.stop(ctx.currentTime + 2.0);
  } catch {
    // AudioContext not available — silent fallback
  }
}

interface WelcomeScreenProps {
  onDone: () => void;
}

export default function WelcomeScreen({ onDone }: WelcomeScreenProps) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Play chime immediately (requires user-gesture context in some browsers;
    // the component mounts on first interaction so AudioContext is usually unlocked)
    playWelcomeChime();

    // Sequence: fade-in 0.6s → hold 2.4s → fade-out 0.8s → done
    timerRef.current = setTimeout(() => setPhase('hold'), 600);
    const t2 = setTimeout(() => setPhase('out'), 3000);
    const t3 = setTimeout(() => onDone(), 3800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  const dismiss = () => {
    setPhase('out');
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(onDone, 400);
  };

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `linear-gradient(160deg, ${IBM.blueDeep} 0%, ${IBM.blueDark} 40%, ${IBM.blue} 100%)`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', userSelect: 'none',
        opacity: phase === 'in' ? 0 : phase === 'hold' ? 1 : 0,
        transition: phase === 'in'
          ? 'opacity 0.6s ease-out'
          : phase === 'out'
          ? 'opacity 0.8s ease-in'
          : 'none',
      }}
    >
      {/* ── Radial glow behind logo ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(17,146,232,0.22) 0%, transparent 70%)',
      }} />

      {/* ── IBM 8-bar logo mark (SVG inline) ── */}
      <svg
        viewBox="0 0 60 24" width={80} height={32}
        style={{ marginBottom: 28, opacity: 0.95 }}
        aria-label="IBM"
      >
        {/* Simplified IBM horizontal bar motif */}
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i}
            x={i * 7.5} y={0} width={6} height={24}
            fill={IBM.white} opacity={i % 2 === 0 ? 1 : 0.55}
            rx={1}
          />
        ))}
      </svg>

      {/* ── Main headline ── */}
      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 52px)',
          fontWeight: 700,
          color: IBM.white,
          letterSpacing: '-0.5px',
          lineHeight: 1.15,
          margin: 0,
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        }}>
          Future Now Centers
        </h1>

        {/* ── Sub-headline on its own line ── */}
        <h2 style={{
          fontSize: 'clamp(15px, 2.5vw, 26px)',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.80)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          margin: '10px 0 0',
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        }}>
          Service Integration Hub&nbsp;
          <span style={{
            fontWeight: 700,
            color: IBM.white,
            background: IBM.whiteAlpha,
            borderRadius: 4,
            padding: '1px 8px',
            letterSpacing: '0.12em',
          }}>
            (SIH)
          </span>
        </h2>
      </div>

      {/* ── Thin horizontal rule ── */}
      <div style={{
        width: 'clamp(80px, 12vw, 120px)', height: 2,
        background: `linear-gradient(90deg, transparent, ${IBM.cyan}, transparent)`,
        margin: '28px 0',
        borderRadius: 1,
      }} />

      {/* ── Product label ── */}
      <p style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        margin: 0,
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}>
        RFP Analyzer Pro
      </p>

      {/* ── Click-to-skip hint ── */}
      <p style={{
        position: 'absolute', bottom: 28,
        fontSize: 11,
        color: 'rgba(255,255,255,0.30)',
        letterSpacing: '0.1em',
        margin: 0,
      }}>
        Click anywhere to continue
      </p>
    </div>
  );
}
