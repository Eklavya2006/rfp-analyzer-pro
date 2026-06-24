// ================================================================
// src/lib/theme.ts — Single source of truth for all palette tokens.
// Import T from here in every component instead of hardcoding hex.
// To change the whole app palette, edit globals.css :root AND here.
// ================================================================

export const T = {
  navy:          '#0A1628',
  slate:         '#1E3A5F',
  gold:          '#C9A84C',
  goldLight:     '#F0D98A',
  white:         '#FFFFFF',
  surface:       '#F4F6F9',
  border:        '#E2E8F0',
  textPrimary:   '#0A1628',
  textSecondary: '#4A5568',
  textMuted:     '#94A3B8',
  // Chart steps
  chart: ['#0A1628', '#1E3A5F', '#C9A84C', '#4A7FB5', '#7C5CBF', '#2A9D8F'],
  // IBM sidebar — preserved, not used in main content
  ibmBlue:       '#0F62FE',
} as const;

export type ThemeKey = keyof typeof T;
