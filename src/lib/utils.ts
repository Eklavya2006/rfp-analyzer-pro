import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatWeeks(weeks: number): string {
  if (weeks < 4) return `${weeks}w`;
  const months = Math.round(weeks / 4.33);
  return months === 1 ? '1 month' : `${months} months`;
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#6b7280',
  chart: [
    '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
    '#ef4444', '#ec4899', '#3b82f6', '#84cc16', '#f97316',
  ],
};

export const ROLE_COLORS: Record<string, string> = {
  'Project Manager': '#6366f1',
  'Tech Lead': '#8b5cf6',
  'Backend Developer': '#06b6d4',
  'Frontend Developer': '#10b981',
  'QA Engineer': '#f59e0b',
  'DevOps Engineer': '#ef4444',
  'Data Engineer': '#ec4899',
  'Business Analyst': '#3b82f6',
  'UX Designer': '#84cc16',
  'Security Engineer': '#f97316',
};
