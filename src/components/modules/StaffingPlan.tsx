'use client';
// StaffingPlan — Nearshore/Geo/Offshore toggles per row · Utilization fix
//               Phases column · Role icons · Band dropdown · Count stepper
import React, { useState, useMemo } from 'react';
import {
  Plus, Trash2, Edit3, Check, X,
  Briefcase, BarChart2, Code2, ShieldCheck,
  Pencil, Building2, Settings2, GraduationCap,
  RefreshCw, Search,
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useRFPStore } from '@/lib/store';
import { T } from '@/lib/theme';
import { v4 as uuid } from 'uuid';
import type { IBMBand, StaffingRole } from '@/types';

// ── Constants ─────────────────────────────────────────────────
const ROLE_COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

const IBM_BANDS: IBMBand[] = ['6A','6B','6G','7A','7B','8','9','10','Executive','D'];
const BAND_RATES: Record<IBMBand, number> = {
  '6A': 45,'6B': 48,'6G': 50,'7A': 65,'7B': 70,
  '8': 90,'9': 100,'10': 120,'Executive': 150,'D': 200,
};
const BAND_DESC: Record<IBMBand, string> = {
  '6A': 'Entry Level','6B': 'Entry Level','6G': 'Entry Level',
  '7A': 'Middle Level','7B': 'Middle Level',
  '8': 'Senior Middle','9': 'Senior Middle',
  '10': 'Senior','Executive': 'Sr. Executive','D': 'Distinguished',
};

// Deployment types — Nearshore / Geo / Offshore
const DEPLOY_TYPES = ['Nearshore', 'Geo', 'Offshore'] as const;
type DeployType = typeof DEPLOY_TYPES[number];
// Hours per week per deploy type
const DEPLOY_HRS: Record<DeployType, number> = { Nearshore: 40, Geo: 40, Offshore: 45 };
// Monthly available hours = hrs/wk × 4 weeks per FTE
const MONTHLY_AVAIL_HRS = 160; // standard constant for utilization calc

// Project phases
const PROJECT_PHASES = ['Prepare', 'Explore', 'Realize - Build', 'Realize - Test', 'Training - Deploy - Hypercare'] as const;
type ProjectPhase = typeof PROJECT_PHASES[number];

const PHASE_COLORS: Record<ProjectPhase, string> = {
  'Prepare':                       '#6366f1',
  'Explore':                       '#06b6d4',
  'Realize - Build':               '#10b981',
  'Realize - Test':                '#f59e0b',
  'Training - Deploy - Hypercare': '#ef4444',
};

// ── Role icon mapping ──────────────────────────────────────────
function getRoleIcon(roleName: string): React.ReactNode {
  const n = roleName.toLowerCase();
  const sz = 15;
  if (n.includes('manager') || n.includes('pm'))         return <Briefcase size={sz} />;
  if (n.includes('analyst') || n.includes('ba'))         return <BarChart2 size={sz} />;
  if (n.includes('developer') || n.includes('engineer')) return <Code2 size={sz} />;
  if (n.includes('qa') || n.includes('test'))            return <ShieldCheck size={sz} />;
  if (n.includes('design') || n.includes('ux'))          return <Pencil size={sz} />;
  if (n.includes('architect'))                           return <Building2 size={sz} />;
  if (n.includes('consultant') || n.includes('functional')) return <Settings2 size={sz} />;
  if (n.includes('train') || n.includes('scrum') || n.includes('agile')) return <GraduationCap size={sz} />;
  if (n.includes('cloud') || n.includes('devops'))       return <RefreshCw size={sz} />;
  return <Briefcase size={sz} />;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const tooltipStyle = {
  backgroundColor: '#1e2030', border: '1px solid #2a2d3e',
  borderRadius: 10, color: '#f4f4f4', fontSize: 12, fontFamily: 'var(--font-mono)',
};

// ── Row-level state ────────────────────────────────────────────
interface RowOverride {
  deployType: DeployType;
  phases: Set<ProjectPhase>;
  count: number;
  band: IBMBand;
}

interface HeadcountPoint { month: string; [role: string]: number | string }
interface CostPoint      { month: string; headcount: number; costK: number }
interface RoleSlice      { name: string; value: number }

// ── Utilization color ──────────────────────────────────────────
function utilColor(pct: number): string {
  if (pct > 100) return '#ef4444'; // over-utilized — red
  if (pct < 70)  return '#f59e0b'; // under-utilized — amber
  return '#10b981';                // healthy — green
}

export default function StaffingPlanModule() {
  const { activeDocumentId, analysisResults, updateStaffingRole, addStaffingRole, removeStaffingRole } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;

  // Row overrides — persist across tab switches (component state)
  const [overrides, setOverrides] = useState<Record<string, RowOverride>>({});

  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editValues,  setEditValues]  = useState<Partial<StaffingRole>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRole,     setNewRole]     = useState<Partial<StaffingRole>>({
    roleName: '', band: '7A', numberOfResources: 1, hoursPerResource: 640, hourlyRate: 65,
  });

  if (!result?.staffingPlan) return (
    <div className="flex items-center justify-center mt-20" style={{ color: T.textMuted, fontSize: 14 }}>
      Upload a document to see the staffing plan
    </div>
  );

  const plan = result.staffingPlan;

  // Get or initialise an override for a role
  function getOverride(role: StaffingRole, idx: number): RowOverride {
    return overrides[role.id] ?? {
      deployType: DEPLOY_TYPES[idx % DEPLOY_TYPES.length],
      phases: new Set<ProjectPhase>([PROJECT_PHASES[0]]),
      count: role.numberOfResources,
      band: role.band,
    };
  }

  function setDeployType(id: string, dt: DeployType, role: StaffingRole, idx: number) {
    setOverrides((prev) => ({
      ...prev,
      [id]: { ...getOverride(role, idx), deployType: dt },
    }));
  }

  function togglePhase(id: string, phase: ProjectPhase, role: StaffingRole, idx: number) {
    setOverrides((prev) => {
      const ov = getOverride(role, idx);
      const next = new Set(ov.phases);
      if (next.has(phase)) { if (next.size > 1) next.delete(phase); }
      else next.add(phase);
      return { ...prev, [id]: { ...ov, phases: next } };
    });
  }

  function setOvCount(id: string, delta: number, role: StaffingRole, idx: number) {
    setOverrides((prev) => {
      const ov = getOverride(role, idx);
      return { ...prev, [id]: { ...ov, count: Math.max(1, ov.count + delta) } };
    });
  }

  function setOvBand(id: string, band: IBMBand, role: StaffingRole, idx: number) {
    setOverrides((prev) => ({
      ...prev,
      [id]: { ...getOverride(role, idx), band },
    }));
  }

  const startEdit = (role: StaffingRole) => {
    setEditingId(role.id);
    setEditValues({ numberOfResources: role.numberOfResources, hoursPerResource: role.hoursPerResource, hourlyRate: role.hourlyRate });
  };
  const commitEdit = (id: string) => {
    if (activeDocumentId) updateStaffingRole(activeDocumentId, id, editValues);
    setEditingId(null);
  };
  const handleAdd = () => {
    if (!activeDocumentId || !newRole.roleName) return;
    const band = (newRole.band ?? '7A') as IBMBand;
    const nr   = newRole.numberOfResources ?? 1;
    const hpr  = newRole.hoursPerResource ?? 640;
    const rate = newRole.hourlyRate ?? BAND_RATES[band];
    const role: StaffingRole = {
      id: uuid(), roleName: newRole.roleName ?? 'New Role',
      band, levelDescription: BAND_DESC[band],
      numberOfResources: nr, hoursPerResource: hpr,
      totalHours: nr * hpr, hourlyRate: rate, totalCost: nr * hpr * rate,
    };
    addStaffingRole(activeDocumentId, role);
    setShowAddForm(false);
    setNewRole({ roleName: '', band: '7A', numberOfResources: 1, hoursPerResource: 640, hourlyRate: 65 });
  };

  // ── Derived totals from overrides ──────────────────────────────
  const derivedRoles = plan.roles.map((r, idx) => {
    const ov = getOverride(r, idx);
    const effHrs = DEPLOY_HRS[ov.deployType];
    const totalHrs = ov.count * r.hoursPerResource;
    const availHrs = ov.count * MONTHLY_AVAIL_HRS;
    const utilPct = availHrs > 0 ? +((totalHrs / availHrs) * 100).toFixed(1) : 0;
    const rate = BAND_RATES[ov.band];
    const totalCost = totalHrs * rate;
    return { ...r, ov, effHrs, totalHrs, utilPct, totalCost, resolvedBand: ov.band, resolvedCount: ov.count };
  });

  const totalLaborCost = derivedRoles.reduce((a, r) => a + r.totalCost, 0);
  const totalHours = derivedRoles.reduce((a, r) => a + r.totalHrs, 0);

  // ── Chart data ────────────────────────────────────────────────
  const MONTHS = ['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'];
  const topRoles = derivedRoles.slice(0, 6);

  const headcountData: HeadcountPoint[] = MONTHS.map((month, mi) => {
    const row: HeadcountPoint = { month };
    topRoles.forEach((r) => {
      const ramp = mi < 2 ? 0.3 : mi < 4 ? 0.7 : mi < 9 ? 1 : 0.5;
      row[r.roleName.split(' ')[0]] = Math.round(r.resolvedCount * ramp);
    });
    return row;
  });

  const roleDistData: RoleSlice[] = derivedRoles.map((r) => ({
    name: r.roleName.split(' ')[0], value: r.totalHrs,
  }));

  const costData: CostPoint[] = MONTHS.map((month, mi) => {
    const ramp = mi < 2 ? 0.3 : mi < 4 ? 0.7 : mi < 9 ? 1 : 0.5;
    return {
      month,
      headcount: Math.round(plan.totalHeadcount * ramp),
      costK: Math.round((totalLaborCost / 12) * ramp / 1000),
    };
  });

  const avgMonthlyCost = Math.round(totalLaborCost / 12);
  const inputCls = 'border rounded-lg px-3 py-1.5 text-sm outline-none';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-2">
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>Staffing Plan</div>
          <div style={{ fontSize: 13, color: T.textMuted }}>
            {plan.roles.length} roles · peak {plan.peakHeadcount} headcount · real-time recalculation
          </div>
        </div>
        <span className="mt-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: T.slate }}>
          {plan.roles.length} Roles
        </span>
      </div>

      {/* ── KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Roles',      value: String(plan.roles.length),   color: '#6366f1' },
          { label: 'Peak Headcount',   value: String(plan.peakHeadcount),  color: '#06b6d4' },
          { label: 'Total Labor Cost', value: fmt(totalLaborCost),         color: '#f59e0b' },
          { label: 'Avg Monthly Burn', value: fmt(avgMonthlyCost),         color: '#ef4444' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border p-5"
            style={{ borderColor: T.border, borderBottom: `3px solid ${m.color}` }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>{m.label}</div>
            <div className="kpi-value" style={{ fontSize: 26, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Headcount Area Chart ─────────────────────────── */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 20 }}>Headcount Over Time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={headcountData} margin={{ left: -10, right: 10 }}>
            <defs>
              {topRoles.map((r, i) => (
                <linearGradient key={r.id} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ROLE_COLORS[i % ROLE_COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ROLE_COLORS[i % ROLE_COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f4f4f4' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {topRoles.map((r, i) => (
              <Area key={r.id} type="monotone"
                dataKey={r.roleName.split(' ')[0]}
                stroke={ROLE_COLORS[i % ROLE_COLORS.length]}
                fill={`url(#grad${i})`}
                strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Role Distribution + Cost Trend ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 20 }}>Role Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={roleDistData} cx="50%" cy="50%" innerRadius={55} outerRadius={88}
                  dataKey="value" paddingAngle={3}>
                  {roleDistData.map((_, i) => <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {roleDistData.slice(0, 7).map((d, i) => {
                const total = roleDistData.reduce((s, r) => s + r.value, 0);
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: ROLE_COLORS[i % ROLE_COLORS.length] }} />
                    <span style={{ fontSize: 12, color: T.textSecondary, flex: 1 }}>{d.name}</span>
                    <span className="kpi-value text-xs font-semibold" style={{ color: ROLE_COLORS[i % ROLE_COLORS.length] }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 20 }}>Staffing Cost Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={costData} margin={{ left: -10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}K`} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left"  type="monotone" dataKey="headcount" stroke="#6366f1" strokeWidth={2.5} dot={false} name="Headcount" />
              <Line yAxisId="right" type="monotone" dataKey="costK"     stroke="#06b6d4" strokeWidth={2.5} dot={false} name="Cost $K" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Add Role ─────────────────────────────────────── */}
      <div className="flex justify-end">
        <button onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90"
          style={{ background: T.navy }}>
          <Plus size={14} /> Add Role
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: T.gold }}>
          <div className="text-sm font-bold" style={{ color: T.navy }}>Add New Role</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <input placeholder="Role Name" value={newRole.roleName ?? ''}
              onChange={(e) => setNewRole({ ...newRole, roleName: e.target.value })}
              className={`col-span-2 sm:col-span-1 ${inputCls}`} style={{ borderColor: T.border }} />
            <select value={newRole.band}
              onChange={(e) => { const b = e.target.value as IBMBand; setNewRole({ ...newRole, band: b, hourlyRate: BAND_RATES[b] }); }}
              className={inputCls} style={{ borderColor: T.border }}>
              {IBM_BANDS.map((b) => <option key={b} value={b}>{b} — {BAND_DESC[b]}</option>)}
            </select>
            <input type="number" placeholder="Resources" value={newRole.numberOfResources ?? ''}
              onChange={(e) => setNewRole({ ...newRole, numberOfResources: Number(e.target.value) })}
              className={inputCls} style={{ borderColor: T.border }} />
            <input type="number" placeholder="Hrs/Resource" value={newRole.hoursPerResource ?? ''}
              onChange={(e) => setNewRole({ ...newRole, hoursPerResource: Number(e.target.value) })}
              className={inputCls} style={{ borderColor: T.border }} />
            <input type="number" placeholder="$/hr" value={newRole.hourlyRate ?? ''}
              onChange={(e) => setNewRole({ ...newRole, hourlyRate: Number(e.target.value) })}
              className={inputCls} style={{ borderColor: T.border }} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-sm border rounded-lg" style={{ borderColor: T.border, color: T.textMuted }}>Cancel</button>
            <button onClick={handleAdd}
              className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg"
              style={{ background: T.navy }}>Add Role</button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STAFFING TABLE — icons · deploy toggles · phases · util
          ════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border overflow-x-auto" style={{ borderColor: T.border }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: T.border }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy }}>Role Details</h3>
          <div className="flex items-center gap-2 text-xs" style={{ color: T.textMuted }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#10b981' }} /> 70–100% Healthy
            <span className="w-2 h-2 rounded-full inline-block ml-2" style={{ background: '#f59e0b' }} /> &lt;70% Under
            <span className="w-2 h-2 rounded-full inline-block ml-2" style={{ background: '#ef4444' }} /> &gt;100% Over
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 12, minWidth: 1080 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', color: T.textMuted, fontSize: 11 }}>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider" style={{ minWidth: 180 }}>Role</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ minWidth: 180 }}>Location Type</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ minWidth: 80 }}>Band</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ minWidth: 100 }}>Count</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ minWidth: 80 }}>Util %</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ minWidth: 60 }}>Eff H/Wk</th>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider" style={{ minWidth: 100 }}>Cost</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider" style={{ minWidth: 320 }}>Phases</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ minWidth: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {derivedRoles.map((role, idx) => {
                const ov = role.ov;
                const roleColor = ROLE_COLORS[idx % ROLE_COLORS.length];
                const isEditing = editingId === role.id;
                return (
                  <tr key={role.id}
                    className="border-t hover:bg-slate-50/60 transition-colors"
                    style={{ borderColor: T.border }}>

                    {/* Role name + icon */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${roleColor}18`, color: roleColor }}>
                          {getRoleIcon(role.roleName)}
                        </span>
                        <span className="font-semibold" style={{ color: T.navy }}>{role.roleName}</span>
                      </div>
                    </td>

                    {/* Nearshore / Geo / Offshore toggle buttons — mutually exclusive */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-center">
                        {DEPLOY_TYPES.map((dt) => {
                          const active = ov.deployType === dt;
                          const dtColor = dt === 'Nearshore' ? '#6366f1' : dt === 'Geo' ? '#06b6d4' : '#10b981';
                          return (
                            <button key={dt}
                              onClick={() => setDeployType(role.id, dt, role, idx)}
                              className="flex flex-col items-center px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all"
                              style={{
                                background:  active ? dtColor : '#F8FAFC',
                                color:       active ? '#fff'  : T.textMuted,
                                borderColor: active ? dtColor : T.border,
                                minWidth: 52,
                              }}>
                              <span>{dt}</span>
                              <span style={{ fontSize: 9, opacity: 0.85, fontWeight: 400 }}>{DEPLOY_HRS[dt]}h/wk</span>
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* Band dropdown */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <select value={editValues.band ?? ov.band}
                          onChange={(e) => setEditValues({ ...editValues, band: e.target.value as IBMBand })}
                          className="border rounded-lg px-1.5 py-1 text-xs font-semibold outline-none"
                          style={{ borderColor: T.gold, color: T.navy }}>
                          {IBM_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      ) : (
                        <select value={ov.band}
                          onChange={(e) => setOvBand(role.id, e.target.value as IBMBand, role, idx)}
                          className="border rounded-lg px-1.5 py-1 text-xs font-semibold outline-none cursor-pointer"
                          style={{ borderColor: T.border, color: T.navy, background: '#F8FAFC' }}>
                          {IBM_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      )}
                    </td>

                    {/* Count stepper */}
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center border rounded-lg overflow-hidden"
                        style={{ borderColor: T.border }}>
                        <button onClick={() => setOvCount(role.id, -1, role, idx)}
                          className="px-2 py-1 text-xs font-bold hover:bg-gray-100 transition-colors"
                          style={{ color: T.textMuted }}>−</button>
                        <span className="px-2 py-1 text-xs font-semibold" style={{ color: T.navy, minWidth: 24, textAlign: 'center' }}>
                          {ov.count}
                        </span>
                        <button onClick={() => setOvCount(role.id, 1, role, idx)}
                          className="px-2 py-1 text-xs font-bold hover:bg-gray-100 transition-colors"
                          style={{ color: T.textMuted }}>+</button>
                      </div>
                    </td>

                    {/* Utilization % — formula: (totalHours / (count × 160)) × 100 */}
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <span className="kpi-value text-xs font-bold" style={{ color: utilColor(role.utilPct) }}>
                          {role.utilPct.toFixed(1)}%
                        </span>
                        {role.utilPct > 100 && <span className="text-[9px] text-red-500 font-semibold">Over</span>}
                        {role.utilPct < 70  && <span className="text-[9px] text-amber-500 font-semibold">Under</span>}
                      </div>
                    </td>

                    {/* Effective hrs/wk */}
                    <td className="px-4 py-3 text-center text-xs font-semibold" style={{ color: T.navy }}>
                      {role.effHrs}h
                    </td>

                    {/* Total cost */}
                    <td className="px-4 py-3 text-right font-bold" style={{ color: T.gold, fontSize: 12 }}>
                      {fmt(role.totalCost)}
                    </td>

                    {/* Phases — multi-select tags */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {PROJECT_PHASES.map((ph) => {
                          const active = ov.phases.has(ph);
                          const phColor = PHASE_COLORS[ph];
                          return (
                            <button key={ph}
                              onClick={() => togglePhase(role.id, ph, role, idx)}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                              style={{
                                background:  active ? phColor      : 'transparent',
                                color:       active ? '#fff'       : phColor,
                                borderColor: phColor,
                              }}>
                              {ph}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button onClick={() => commitEdit(role.id)}><Check size={13} className="text-green-600" /></button>
                            <button onClick={() => setEditingId(null)}><X size={13} className="text-gray-400" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(role)} style={{ color: T.slate }}><Edit3 size={13} /></button>
                            <button onClick={() => activeDocumentId && removeStaffingRole(activeDocumentId, role.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#F8FAFC', borderTop: `2px solid ${T.gold}` }}>
                <td colSpan={6} className="px-4 py-3 font-bold" style={{ color: T.navy, fontSize: 13 }}>Totals</td>
                <td className="px-4 py-3 text-right font-bold kpi-value" style={{ color: T.gold, fontSize: 14 }}>
                  {fmt(totalLaborCost)}
                </td>
                <td colSpan={2} className="px-4 py-3 text-xs" style={{ color: T.textMuted }}>
                  {totalHours.toLocaleString()} total hours
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Phase allocation summary ─────────────────────── */}
      <PhaseAllocationSummary derivedRoles={derivedRoles} />

    </div>
  );
}

// ── Phase Allocation Summary Chart ────────────────────────────
interface DerivedRole extends StaffingRole {
  ov: { deployType: DeployType; phases: Set<ProjectPhase>; count: number; band: IBMBand };
  effHrs: number; totalHrs: number; utilPct: number; totalCost: number;
  resolvedBand: IBMBand; resolvedCount: number;
}

function PhaseAllocationSummary({ derivedRoles }: { derivedRoles: DerivedRole[] }) {
  const phaseHours = useMemo(() => {
    const map: Record<string, number> = {};
    PROJECT_PHASES.forEach((ph) => { map[ph] = 0; });
    derivedRoles.forEach((r) => {
      const hrsPerPhase = r.totalHrs / Math.max(1, r.ov.phases.size);
      r.ov.phases.forEach((ph) => { map[ph] = (map[ph] ?? 0) + hrsPerPhase; });
    });
    return PROJECT_PHASES.map((ph) => ({ phase: ph, hours: Math.round(map[ph]) }));
  }, [derivedRoles]);

  return (
    <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 20 }}>Phase Allocation (Hours)</h3>
      <div className="space-y-3">
        {phaseHours.map(({ phase, hours }) => {
          const maxH = Math.max(...phaseHours.map((p) => p.hours), 1);
          const pct  = Math.round((hours / maxH) * 100);
          const color = PHASE_COLORS[phase as ProjectPhase];
          return (
            <div key={phase}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: T.navy }}>{phase}</span>
                <span className="text-xs kpi-value font-bold" style={{ color }}>{hours.toLocaleString()}h</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
