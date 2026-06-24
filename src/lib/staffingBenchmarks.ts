// ============================================================
// Staffing Band Salary Benchmarks
// Hardcoded market-rate annual salaries (USD) per role × band.
// Source: blended US market data (2024-25 technology sector).
// ============================================================

export type StaffingBand =
  | '6a'
  | '6b'
  | '6G'
  | '7a'
  | '7b-Junior'
  | '8'
  | '9-Mid'
  | '10-Senior'
  | 'D-Lead';

export const BAND_LABELS: Record<StaffingBand, string> = {
  '6a':         'Band 6a – Entry',
  '6b':         'Band 6b – Entry+',
  '6G':         'Band 6G – Graduate',
  '7a':         'Band 7a – Associate',
  '7b-Junior':  'Band 7b – Junior',
  '8':          'Band 8 – Mid',
  '9-Mid':      'Band 9 – Mid-Senior',
  '10-Senior':  'Band 10 – Senior',
  'D-Lead':     'Band D – Lead/Principal',
};

/**
 * Annual base salary benchmarks by role × band (USD, full-time equivalent).
 * Used for cost modelling only — does not include benefits (~30 % uplift).
 */
export const SALARY_BENCHMARKS: Record<string, Partial<Record<StaffingBand, number>>> = {
  'Business Analyst': {
    '6a':        60_000,
    '6b':        65_000,
    '6G':        62_000,
    '7a':        72_000,
    '7b-Junior': 80_000,
    '8':         92_000,
    '9-Mid':    108_000,
    '10-Senior':125_000,
    'D-Lead':   148_000,
  },
  'Backend Developer': {
    '6a':        65_000,
    '6b':        70_000,
    '6G':        68_000,
    '7a':        80_000,
    '7b-Junior': 92_000,
    '8':        112_000,
    '9-Mid':    132_000,
    '10-Senior':155_000,
    'D-Lead':   185_000,
  },
  'Frontend Developer': {
    '6a':        62_000,
    '6b':        67_000,
    '6G':        64_000,
    '7a':        76_000,
    '7b-Junior': 88_000,
    '8':        105_000,
    '9-Mid':    122_000,
    '10-Senior':142_000,
    'D-Lead':   170_000,
  },
  'QA Engineer': {
    '6a':        55_000,
    '6b':        60_000,
    '6G':        58_000,
    '7a':        68_000,
    '7b-Junior': 78_000,
    '8':         92_000,
    '9-Mid':    108_000,
    '10-Senior':125_000,
    'D-Lead':   148_000,
  },
  'Project Manager': {
    '6a':        68_000,
    '6b':        74_000,
    '6G':        70_000,
    '7a':        85_000,
    '7b-Junior': 96_000,
    '8':        112_000,
    '9-Mid':    130_000,
    '10-Senior':152_000,
    'D-Lead':   180_000,
  },
  'DevOps Engineer': {
    '6a':        68_000,
    '6b':        74_000,
    '6G':        70_000,
    '7a':        84_000,
    '7b-Junior': 96_000,
    '8':        115_000,
    '9-Mid':    135_000,
    '10-Senior':158_000,
    'D-Lead':   188_000,
  },
  'Data Engineer': {
    '6a':        66_000,
    '6b':        72_000,
    '6G':        68_000,
    '7a':        82_000,
    '7b-Junior': 94_000,
    '8':        112_000,
    '9-Mid':    132_000,
    '10-Senior':155_000,
    'D-Lead':   182_000,
  },
  'UX Designer': {
    '6a':        58_000,
    '6b':        63_000,
    '6G':        60_000,
    '7a':        72_000,
    '7b-Junior': 82_000,
    '8':         96_000,
    '9-Mid':    112_000,
    '10-Senior':130_000,
    'D-Lead':   155_000,
  },
  'Security Engineer': {
    '6a':        70_000,
    '6b':        76_000,
    '6G':        72_000,
    '7a':        88_000,
    '7b-Junior':100_000,
    '8':        120_000,
    '9-Mid':    142_000,
    '10-Senior':168_000,
    'D-Lead':   198_000,
  },
  'Tech Lead': {
    '6a':        80_000,
    '6b':        88_000,
    '6G':        84_000,
    '7a':       100_000,
    '7b-Junior':115_000,
    '8':        138_000,
    '9-Mid':    162_000,
    '10-Senior':188_000,
    'D-Lead':   220_000,
  },
};

// Benefits multiplier — total comp = salary × BENEFITS_MULTIPLIER
export const BENEFITS_MULTIPLIER = 1.30;

// ============================================================
// Canonical comparison rows
// Default band assignments per role — these represent the
// "typical" band for a delivery project at this scope.
// ============================================================
export interface StaffingBandRow {
  /** Display role title */
  role: string;
  /** Default staffing band for this role on a typical project */
  defaultBand: StaffingBand;
  /** Baseline FTE count (without AI) */
  baselineFTEs: number;
  /** Per-row AI productivity override (null = use global) */
  perRowOverridePct: number | null;
}

export const DEFAULT_STAFFING_BAND_ROWS: StaffingBandRow[] = [
  { role: 'Business Analyst',  defaultBand: '9-Mid',      baselineFTEs: 1,   perRowOverridePct: null },
  { role: 'Backend Developer', defaultBand: '10-Senior',  baselineFTEs: 2,   perRowOverridePct: null },
  { role: 'Frontend Developer',defaultBand: '9-Mid',      baselineFTEs: 2,   perRowOverridePct: null },
  { role: 'QA Engineer',       defaultBand: '8',          baselineFTEs: 2,   perRowOverridePct: null },
  { role: 'Project Manager',   defaultBand: '10-Senior',  baselineFTEs: 1,   perRowOverridePct: null },
  { role: 'DevOps Engineer',   defaultBand: '10-Senior',  baselineFTEs: 1,   perRowOverridePct: null },
  { role: 'Data Engineer',     defaultBand: '9-Mid',      baselineFTEs: 1,   perRowOverridePct: null },
  { role: 'UX Designer',       defaultBand: '8',          baselineFTEs: 1,   perRowOverridePct: null },
  { role: 'Security Engineer', defaultBand: '9-Mid',      baselineFTEs: 1,   perRowOverridePct: null },
  { role: 'Tech Lead',         defaultBand: 'D-Lead',     baselineFTEs: 1,   perRowOverridePct: null },
];

/**
 * Look up annual fully-loaded cost (salary + benefits) for a role × band.
 * Falls back to nearest available band if the exact combination is missing.
 */
export function annualCost(role: string, band: StaffingBand): number {
  const roleSalaries = SALARY_BENCHMARKS[role];
  if (!roleSalaries) return 100_000 * BENEFITS_MULTIPLIER;
  const base = roleSalaries[band] ?? Object.values(roleSalaries)[0] ?? 100_000;
  return Math.round(base * BENEFITS_MULTIPLIER);
}
