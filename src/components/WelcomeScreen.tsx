'use client';
// WelcomeScreen — IBM w3Id login card with w3 ID input + validation.
import React, { useEffect, useRef, useState } from 'react';

const FONT = "'IBM Plex Sans', system-ui, sans-serif";

// Validate: non-empty local part + @ibm.com (case-insensitive)
function isValidW3Id(value: string): boolean {
  return /^[^\s@]+@ibm\.com$/i.test(value.trim());
}

interface WelcomeScreenProps {
  onDone: () => void;
}

export default function WelcomeScreen({ onDone }: WelcomeScreenProps) {
  const [visible,  setVisible]  = useState(false);
  const [w3Id,     setW3Id]     = useState('');
  const [touched,  setTouched]  = useState(false);   // show error only after first blur/submit
  const [pressing, setPressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fade in + auto-focus input
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true);
      setTimeout(() => inputRef.current?.focus(), 120);
    }, 40);
    return () => clearTimeout(t);
  }, []);

  const valid   = isValidW3Id(w3Id);
  const showErr = touched && !valid && w3Id.length > 0;
  const isEmpty = touched && w3Id.trim() === '';

  const handleSignIn = () => {
    setTouched(true);
    if (!valid) {
      inputRef.current?.focus();
      return;
    }
    setPressing(false);
    setVisible(false);
    setTimeout(onDone, 320);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSignIn();
  };

  // Border colour for input
  const inputBorder = showErr || isEmpty
    ? '#FA4D56'                          // IBM Red 40 — error
    : w3Id.length > 0 && valid
    ? '#42BE65'                          // IBM Green 40 — valid
    : 'rgba(255,255,255,0.25)';          // default

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, #0a1a3c 0%, #0d2252 55%, #0f2b6a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* ── Login card ── */}
      <div style={{
        width: '100%', maxWidth: 440, margin: '0 20px',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 16, padding: '40px 36px 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>

        {/* Welcome */}
        <h1 style={{
          margin: '0 0 6px', fontSize: 28, fontWeight: 700,
          color: '#FFFFFF', letterSpacing: '-0.2px',
          fontFamily: FONT, textAlign: 'center',
        }}>
          Welcome
        </h1>

        {/* Future Now Centers */}
        <p style={{
          margin: '0 0 3px', fontSize: 15, fontWeight: 600,
          color: 'rgba(255,255,255,0.90)',
          textAlign: 'center', fontFamily: FONT, letterSpacing: '0.01em',
        }}>
          Future Now Centers
        </p>

        {/* Service Integration Hub (SIH) */}
        <p style={{
          margin: '0 0 26px', fontSize: 13, fontWeight: 400,
          color: 'rgba(255,255,255,0.50)',
          textAlign: 'center', fontFamily: FONT, letterSpacing: '0.04em',
        }}>
          Service Integration Hub (SIH)
        </p>

        {/* Sub-line */}
        <p style={{
          margin: '0 0 20px', fontSize: 14,
          color: 'rgba(255,255,255,0.65)',
          textAlign: 'center', lineHeight: 1.5, fontFamily: FONT,
        }}>
          Sign in with your IBM w3 identity to continue
        </p>

        {/* ── w3 ID input ── */}
        <div style={{ width: '100%', marginBottom: 14 }}>
          <label style={{
            display: 'block', fontSize: 12, fontWeight: 600,
            color: 'rgba(255,255,255,0.65)',
            marginBottom: 6, fontFamily: FONT, letterSpacing: '0.04em',
          }}>
            IBM w3 ID
          </label>

          <div style={{ position: 'relative' }}>
            {/* @ icon */}
            <span style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.35)', fontSize: 14,
              pointerEvents: 'none', fontFamily: FONT,
            }}>
              @
            </span>

            <input
              ref={inputRef}
              type="email"
              autoComplete="username"
              placeholder="yourname@ibm.com"
              value={w3Id}
              onChange={e => setW3Id(e.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 40px 11px 30px',
                borderRadius: 8,
                border: `1.5px solid ${inputBorder}`,
                background: 'rgba(255,255,255,0.09)',
                color: '#FFFFFF',
                fontSize: 14,
                fontFamily: FONT,
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
            />

            {/* Valid tick */}
            {valid && (
              <span style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                color: '#42BE65', fontSize: 16, lineHeight: 1,
              }}>
                ✓
              </span>
            )}
          </div>

          {/* Error message */}
          {(showErr || isEmpty) && (
            <p style={{
              margin: '5px 0 0', fontSize: 12,
              color: '#FA4D56', fontFamily: FONT,
            }}>
              {isEmpty
                ? 'IBM w3 ID is required.'
                : 'Enter a valid IBM w3 ID ending in @ibm.com'}
            </p>
          )}
        </div>

        {/* ── Sign-in button ── */}
        <button
          onClick={handleSignIn}
          onMouseDown={() => setPressing(true)}
          onMouseUp={() => setPressing(false)}
          onMouseLeave={() => setPressing(false)}
          disabled={!valid}
          style={{
            width: '100%',
            padding: '13px 24px',
            borderRadius: 8,
            border: 'none',
            background: !valid
              ? 'rgba(255,255,255,0.12)'
              : pressing ? '#0043CE' : '#0F62FE',
            color: !valid ? 'rgba(255,255,255,0.30)' : '#FFFFFF',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: FONT,
            cursor: valid ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'background 0.12s ease, transform 0.1s ease',
            transform: pressing && valid ? 'scale(0.985)' : 'scale(1)',
            boxShadow: valid && !pressing ? '0 2px 12px rgba(15,98,254,0.45)' : 'none',
          }}
        >
          Sign in with IBM w3 Id
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>

        {/* ── Privacy disclaimer ── */}
        <p style={{
          margin: '20px 0 0', fontSize: 11.5,
          color: 'rgba(255,255,255,0.30)',
          textAlign: 'center', lineHeight: 1.55,
          fontFamily: FONT, maxWidth: 340,
        }}>
          You will be redirected to IBM identity provider to authenticate.
          Your credentials are never shared with this application.
        </p>
      </div>
    </div>
  );
}
