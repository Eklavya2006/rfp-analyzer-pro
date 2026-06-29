'use client';
// WelcomeScreen — IBM w3Id login card. Click button to enter.
import React, { useEffect, useState } from 'react';

const FONT = "'IBM Plex Sans', system-ui, sans-serif";

interface WelcomeScreenProps {
  onDone: () => void;
}

export default function WelcomeScreen({ onDone }: WelcomeScreenProps) {
  const [visible,  setVisible]  = useState(false);
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, []);

  const handleSignIn = () => {
    setPressing(false);
    setVisible(false);
    setTimeout(onDone, 320);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(160deg, #0a1a3c 0%, #0d2252 55%, #0f2b6a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
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
          margin: '0 0 28px', fontSize: 13, fontWeight: 400,
          color: 'rgba(255,255,255,0.50)',
          textAlign: 'center', fontFamily: FONT, letterSpacing: '0.04em',
        }}>
          Service Integration Hub (SIH)
        </p>

        {/* ── Sign-in button ── */}
        <button
          onClick={handleSignIn}
          onMouseDown={() => setPressing(true)}
          onMouseUp={() => setPressing(false)}
          onMouseLeave={() => setPressing(false)}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: 8,
            border: 'none',
            background: pressing ? '#0043CE' : '#0F62FE',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: FONT,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'background 0.12s ease, transform 0.1s ease',
            transform: pressing ? 'scale(0.985)' : 'scale(1)',
            boxShadow: pressing ? 'none' : '0 2px 12px rgba(15,98,254,0.45)',
          }}
        >
          Sign in with IBM w3 Id
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>

        {/* Privacy disclaimer */}
        <p style={{
          margin: '22px 0 0', fontSize: 11.5,
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
