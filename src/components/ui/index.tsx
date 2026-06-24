// ============================================================
// Reusable UI Components — Avatar-inspired premium design
// ============================================================
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Card ─────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function Card({ children, className, hover, glow, onClick, ...rest }: CardProps) {
  return (
    <div
      onClick={onClick}
      {...rest}
      className={cn(
        'bg-white rounded-2xl border border-slate-200/80 shadow-sm',
        hover && 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
        glow && 'ring-2 ring-indigo-200/50',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4 border-b border-slate-100', className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

// ─── KPI Metric Card ──────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  subValue?: string;
  icon?: React.ReactNode;
  color?: 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose' | 'sky';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  animate?: boolean;
  className?: string;
}

const colorMap = {
  indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', border: 'border-indigo-100', text: 'text-indigo-700' },
  violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600', border: 'border-violet-100', text: 'text-violet-700' },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100', text: 'text-emerald-700' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', border: 'border-amber-100', text: 'text-amber-700' },
  rose: { bg: 'bg-rose-50', icon: 'bg-rose-100 text-rose-600', border: 'border-rose-100', text: 'text-rose-700' },
  sky: { bg: 'bg-sky-50', icon: 'bg-sky-100 text-sky-600', border: 'border-sky-100', text: 'text-sky-700' },
};

export function MetricCard({ label, value, subValue, icon, color = 'indigo', trend, trendValue, animate = true, className }: MetricCardProps) {
  const colors = colorMap[color];
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 12 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.4 }}
      className={cn(
        'rounded-2xl border p-5 flex flex-col gap-3',
        colors.bg, colors.border,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {icon && (
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', colors.icon)}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <div className={cn('text-2xl font-bold', colors.text)}>{value}</div>
        {subValue && <div className="text-xs text-slate-500 mt-0.5">{subValue}</div>}
      </div>
      {trend && trendValue && (
        <div className={cn(
          'text-xs font-medium flex items-center gap-1',
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-slate-500'
        )}>
          <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Badge ────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

const badgeVariants = {
  default: 'bg-slate-100 text-slate-700 border border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border border-rose-200',
  info: 'bg-sky-50 text-sky-700 border border-sky-200',
  purple: 'bg-violet-50 text-violet-700 border border-violet-200',
  outline: 'bg-white text-slate-600 border border-slate-300',
};

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1',
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const buttonVariants = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200',
  secondary: 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-200',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300',
};

const buttonSizes = {
  sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2 rounded-xl gap-2',
  lg: 'text-base px-6 py-3 rounded-xl gap-2.5',
};

export function Button({
  children, variant = 'primary', size = 'md', loading, leftIcon, rightIcon,
  className, disabled, ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

// ─── Progress Bar ─────────────────────────────────────────
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  showValue?: boolean;
  animate?: boolean;
  className?: string;
}

export function ProgressBar({ value, max = 100, label, sublabel, color = 'bg-indigo-500', showValue = true, animate = true, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs">
          <div className="flex flex-col">
            {label && <span className="font-medium text-slate-700">{label}</span>}
            {sublabel && <span className="text-slate-400">{sublabel}</span>}
          </div>
          {showValue && <span className="font-semibold text-slate-600">{pct}%</span>}
        </div>
      )}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: animate ? 0.8 : 0, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: string;
}

export function SectionHeader({ title, description, icon, actions, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {badge && <Badge variant="info">{badge}</Badge>}
          </div>
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return (
    <svg className={cn(s, 'animate-spin text-indigo-600', className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Empty State ──────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────
export function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}

// ─── Data Table ───────────────────────────────────────────
interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  className?: string;
}

export function DataTable<T>({ columns, data, rowKey, className }: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col) => (
              <th key={String(col.key)} className={cn('text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <motion.tr
              key={rowKey(row)}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors"
            >
              {columns.map((col) => (
                <td key={String(col.key)} className={cn('px-4 py-3 text-slate-700', col.className)}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[String(col.key)] ?? '')}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────
export function Divider({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 my-4', className)}>
      <div className="flex-1 h-px bg-slate-100" />
      {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

// ─── Alert ────────────────────────────────────────────────
interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const alertStyles = {
  info: 'bg-sky-50 border-sky-200 text-sky-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-rose-50 border-rose-200 text-rose-800',
};

export function Alert({ type = 'info', title, children, className }: AlertProps) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm', alertStyles[type], className)}>
      {title && <div className="font-semibold mb-1">{title}</div>}
      {children}
    </div>
  );
}

// ─── Animated Counter ─────────────────────────────────────
export function AnimatedCounter({ value, prefix = '', suffix = '', className }: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const duration = 1000;
    const steps = 40;
    const step = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className={className}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}
