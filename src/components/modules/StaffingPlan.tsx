'use client';
// StaffingPlan — Interactive graphical view with Area, Pie, Line charts + utilization heatmap
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
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

// ── Color constants ───────────────────────────────────────────
const ROLE_COLORS = ['#0f62fe','#42be65','#ee5396','#ff832b','#a56eff','#08bdba','#f1c21b','#da1e28'];

const IBM_BANDS: IBMBand[] = ['6A', '6B', '6G', '7A', '7B', '8', '9', '10', 'Executive', 'D'];
const BAND_RATES: Record<IBMBand, number> = {
  '6A': 45, '6B': 48, '6G': 50, '7A': 65, '7B': 70,
  '8': 90, '9': 100, '10': 120, 'Executive': 150, 'D': 200,
};
const BAND_DESC: Record<IBMBand, string> = {
  '6A': 'Fresher / Entry Level', '6B': 'Fresher / Entry Level', '6G': 'Fresher / Entry Level',
  '7A': 'Middle Level', '7B': 'Middle Level',
  '8': 'Senior Middle Level', '9': 'Senior Middle Level',
  '10': 'Senior', 'Executive': 'Senior Executive', 'D': 'Distinguished / Senior Executive',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const tooltipStyle = {
  backgroundColor: '#1e2030',
  border: '1px solid #2a2d3e',
  borderRadius: 10,
  color: '#f4f4f4',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
};

// ── Interfaces ────────────────────────────────────────────────
interface HeadcountPoint { month: string; [role: string]: number | string }
interface CostPoint      { month: string; headcount: number; costK: number }
interface RoleSlice      { name: string; value: number }

// ── Utilization cell color ────────────────────────────────────
function heatColor(pct: number): string {
  if (pct < 40)  return '#d1fae5';
  if (pct < 60)  return '#6ee7b7';
  if (pct < 75)  return '#fef3c7';
  if (pct < 90)  return '#fde68a';
  if (pct < 100) return '#fee2e2';
  return '#fca5a5';
}

export default function StaffingPlanModule() {
  const { activeDocumentId, analysisResults, updateStaffingRole, addStaffingRole, removeStaffingRole } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<StaffingRole>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRole, setNewRole] = useState<Partial<StaffingRole>>({
    roleName: '', band: '7A', numberOfResources: 1, hoursPerResource: 640, hourlyRate: 65,
  });

  if (!result?.staffingPlan) return (
    <div className="p-6 text-sm text-center mt-20" style={{ color: T.textMuted }}>
      Upload a document to see the staffing plan
    </div>
  );

  const plan = result.staffingPlan;

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

  // ── Build chart data ─────────────────────────────────────────
  const MONTHS = ['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'];
  const topRoles = plan.roles.slice(0, 6);

  const headcountData: HeadcountPoint[] = MONTHS.map((month, mi) => {
    const row: HeadcountPoint = { month };
    topRoles.forEach((r, ri) => {
      const ramp = mi < 2 ? 0.3 : mi < 4 ? 0.7 : mi < 9 ? 1 : 0.5;
      row[r.roleName.split(' ')[0]] = Math.round(r.numberOfResources * ramp);
    });
    return row;
  });

  const roleDistData: RoleSlice[] = plan.roles.map(r => ({
    name: r.roleName.split(' ')[0],
    value: r.totalHours,
  }));

  const costData: CostPoint[] = MONTHS.map((month, mi) => {
    const ramp = mi < 2 ? 0.3 : mi < 4 ? 0.7 : mi < 9 ? 1 : 0.5;
    return {
      month,
      headcount: Math.round(plan.totalHeadcount * ramp),
      costK: Math.round((plan.totalLaborCost / 12) * ramp / 1000),
    };
  });

  // Utilization heatmap: roles × weeks (8 weeks)
  const heatWeeks = 8;
  const heatRoles = plan.roles.slice(0, 6);

  const avgMonthlyCost = Math.round(plan.totalLaborCost / 12);

  const inputCls = 'border rounded-lg px-3 py-1.5 text-sm outline-none';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── KPI Cards ──────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-2">
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>Staffing Plan</div>
          <div style={{ fontSize: 13, color: T.textMuted }}>{plan.roles.length} roles · peak {plan.peakHeadcount} headcount</div>
        </div>
        <span className="mt-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: T.slate }}>
          {plan.roles.length} Total Roles
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Roles',       value: String(plan.roles.length),                   color: '#0f62fe' },
          { label: 'Peak Headcount',    value: String(plan.peakHeadcount),                  color: '#42be65' },
          { label: 'Total Labor Cost',  value: fmt(plan.totalLaborCost),                    color: '#f1c21b' },
          { label: 'Avg Monthly Burn',  value: fmt(avgMonthlyCost),                         color: '#ff832b' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border p-5"
            style={{ borderColor: T.border, borderBottom: `3px solid ${m.color}` }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>{m.label}</div>
            <div className="kpi-value" style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Headcount Over Time (Area Chart) ───────────── */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 20 }}>Headcount Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={headcountData} margin={{ left: -10, right: 10 }}>
            <defs>
              {topRoles.map((r, i) => (
                <linearGradient key={r.id} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ROLE_COLORS[i % ROLE_COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ROLE_COLORS[i % ROLE_COLORS.length]} stopOpacity={0}   />
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
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Role Distribution Pie + Cost Line ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Pie */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 20 }}>Role Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie data={roleDistData} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                  dataKey="value" paddingAngle={3}>
                  {roleDistData.map((_, i) => (
                    <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f4f4f4' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {roleDistData.slice(0, 7).map((d, i) => {
                const total = roleDistData.reduce((s, r) => s + r.value, 0);
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: ROLE_COLORS[i % ROLE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: T.textSecondary, flex: 1 }}>{d.name}</span>
                    <span className="kpi-value" style={{ fontSize: 12, color: ROLE_COLORS[i % ROLE_COLORS.length], fontWeight: 600 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dual-axis Line: Headcount + Cost */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 20 }}>Staffing Cost Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={costData} margin={{ left: -10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}K`} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f4f4f4' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left"  type="monotone" dataKey="headcount" stroke="#0f62fe" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} name="Headcount" />
              <Line yAxisId="right" type="monotone" dataKey="costK"     stroke="#42be65" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} name="Cost $K"   />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Utilization Heatmap ─────────────────────────── */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: T.border }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 20 }}>Utilization Heatmap (Team × Week)</h3>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 12, minWidth: 600 }}>
            <thead>
              <tr style={{ color: T.textMuted }}>
                <th className="py-2 px-3 text-left font-medium">Role</th>
                {Array.from({ length: heatWeeks }, (_, i) => (
                  <th key={i} className="py-2 px-2 text-center font-medium">W{i + 1}</th>
                ))}
                <th className="py-2 px-3 text-center font-medium">Avg</th>
              </tr>
            </thead>
            <tbody>
              {heatRoles.map((role, ri) => {
                const values = Array.from({ length: heatWeeks }, (_, wi) => {
                  const base = 50 + (ri * 7) + (wi * 3);
                  return Math.min(100, Math.max(20, base + Math.round(Math.sin(ri + wi) * 15)));
                });
                const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
                return (
                  <tr key={role.id} className="border-t" style={{ borderColor: T.border }}>
                    <td className="py-2 px-3 font-medium" style={{ color: T.navy, whiteSpace: 'nowrap' }}>
                      {role.roleName.length > 18 ? role.roleName.slice(0, 18) + '…' : role.roleName}
                    </td>
                    {values.map((val, wi) => (
                      <td key={wi} className="py-2 px-2 text-center">
                        <div className="rounded text-xs font-semibold py-1 px-2"
                          style={{ background: heatColor(val), color: val > 80 ? '#7f1d1d' : val > 60 ? '#78350f' : '#14532d', minWidth: 36 }}>
                          {val}%
                        </div>
                      </td>
                    ))}
                    <td className="py-2 px-3 text-center">
                      <span className="kpi-value text-xs font-bold" style={{ color: ROLE_COLORS[ri % ROLE_COLORS.length] }}>{avg}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-6 mt-4 text-xs" style={{ color: T.textMuted }}>
          {[['< 40%','#d1fae5','Low'],['40–60%','#6ee7b7','Moderate'],['60–75%','#fef3c7','Medium'],['75–90%','#fde68a','High'],['> 90%','#fca5a5','Critical']].map(([range, color, label]) => (
            <div key={range} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: color }} />
              <span>{label} ({range})</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add Role + Action bar ───────────────────────── */}
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

      {/* ── Staffing Table ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border overflow-x-auto" style={{ borderColor: T.border }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: T.border }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy }}>Role Details</h3>
        </div>
        <table className="w-full min-w-[900px]" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.surface, color: T.textMuted, fontSize: 11 }}>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Role Name</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">IBM Band</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Level</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider"># Resources</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Hrs / Resource</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Total Hours</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">$/hr</th>
              <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider">Total Cost</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plan.roles.map((role, idx) => {
              const isEditing = editingId === role.id;
              const roleColor = ROLE_COLORS[idx % ROLE_COLORS.length];
              return (
                <tr key={role.id} className="border-t hover:bg-gray-50/40 transition-colors"
                  style={{ borderColor: T.border }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: T.navy }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: roleColor }} />
                      {role.roleName}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: roleColor }}>
                      {role.band}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: T.textMuted }}>{role.levelDescription}</td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input type="number" min={1}
                        value={editValues.numberOfResources ?? role.numberOfResources}
                        onChange={(e) => setEditValues({ ...editValues, numberOfResources: Number(e.target.value) })}
                        className="w-16 text-center border rounded-lg px-1 py-0.5 text-sm outline-none"
                        style={{ borderColor: T.gold }} />
                    ) : <span>{role.numberOfResources}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input type="number" min={1}
                        value={editValues.hoursPerResource ?? role.hoursPerResource}
                        onChange={(e) => setEditValues({ ...editValues, hoursPerResource: Number(e.target.value) })}
                        className="w-20 text-center border rounded-lg px-1 py-0.5 text-sm outline-none"
                        style={{ borderColor: T.gold }} />
                    ) : <span>{role.hoursPerResource}</span>}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold" style={{ color: roleColor }}>
                    {role.totalHours.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input type="number" min={1}
                        value={editValues.hourlyRate ?? role.hourlyRate}
                        onChange={(e) => setEditValues({ ...editValues, hourlyRate: Number(e.target.value) })}
                        className="w-20 text-center border rounded-lg px-1 py-0.5 text-sm outline-none"
                        style={{ borderColor: T.gold }} />
                    ) : <span>${role.hourlyRate}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: T.gold }}>
                    {fmt(role.totalCost)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button onClick={() => commitEdit(role.id)}><Check size={14} className="text-green-600" /></button>
                          <button onClick={() => setEditingId(null)}><X size={14} className="text-gray-400" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(role)} style={{ color: T.slate }}><Edit3 size={14} /></button>
                          <button onClick={() => activeDocumentId && removeStaffingRole(activeDocumentId, role.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
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
            <tr style={{ background: T.surface, borderTop: `2px solid ${T.gold}` }}>
              <td colSpan={5} className="px-4 py-3 font-bold" style={{ color: T.navy, fontSize: 13 }}>Totals</td>
              <td className="px-4 py-3 text-center font-bold kpi-value" style={{ color: T.slate }}>
                {plan.totalHours.toLocaleString()}
              </td>
              <td />
              <td className="px-4 py-3 text-right font-bold kpi-value" style={{ color: T.gold, fontSize: 16 }}>
                {fmt(plan.totalLaborCost)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ════════════════════════════════════════════════════════════
          STAFF SELECTION TABLE — interactive filter & select
          ════════════════════════════════════════════════════════════ */}
      <StaffSelectionTable roles={plan.roles} />

    </div>
  );
}

// ── Staff Selection interfaces ────────────────────────────────
interface StaffRow {
  id:         string;
  name:       string;
  role:       string;
  band:       IBMBand;
  staffType:  'Onshore' | 'Geo' | 'Nearshore';
  count:      number;
  allocation: number;
  startDate:  string;
  endDate:    string;
  effHrsWk:   number;
  selected:   boolean;
}

const STAFF_TYPES = ['Onshore', 'Geo', 'Nearshore'] as const;
type StaffType = typeof STAFF_TYPES[number];
const STAFF_HOURS: Record<StaffType, number> = { Onshore: 45, Geo: 40, Nearshore: 40 };

// Derive a deterministic weekly start/end from role index
function roleDate(offset: number, add: number) {
  const d = new Date(Date.now() + offset * 7 * 24 * 60 * 60 * 1000 + add * 7 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

// ── Staff Selection Table Component ──────────────────────────
function StaffSelectionTable({ roles }: { roles: StaffingRole[] }) {
  const [staffSelect, setStaffSelect] = useState<string>('');
  const [bandFilter,  setBandFilter]  = useState<string>('');

  // Build initial staff rows from roles (one row per unique role, not per resource)
  const allRows = useMemo<StaffRow[]>(() => roles.map((r, ri) => ({
    id:         r.id,
    name:       r.roleName,
    role:       r.roleName,
    band:       r.band,
    staffType:  STAFF_TYPES[ri % STAFF_TYPES.length],
    count:      r.numberOfResources,
    allocation: Math.round((r.hoursPerResource / 40) * 100),
    startDate:  roleDate(ri * 2, 0),
    endDate:    roleDate(ri * 2, r.hoursPerResource / 40),
    effHrsWk:   STAFF_HOURS[STAFF_TYPES[ri % STAFF_TYPES.length]],
    selected:   false,
  })), [roles]);

  const [rows, setRows] = useState<StaffRow[]>(allRows);

  // active type tiles (multi-select)
  const [activeTypes, setActiveTypes] = useState<Set<StaffType>>(new Set());

  const filtered = useMemo(() => rows.filter(r => {
    if (staffSelect && !r.name.toLowerCase().includes(staffSelect.toLowerCase()) &&
        !r.role.toLowerCase().includes(staffSelect.toLowerCase())) return false;
    if (bandFilter  && r.band      !== bandFilter)  return false;
    if (activeTypes.size > 0 && !activeTypes.has(r.staffType)) return false;
    return true;
  }), [rows, staffSelect, bandFilter, activeTypes]);

  const uniqueBands = Array.from(new Set(roles.map(r => r.band)));

  const toggleRow     = (id: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  const setBand       = (id: string, band: IBMBand) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, band, effHrsWk: STAFF_HOURS[r.staffType] } : r));
  const setCount      = (id: string, delta: number) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, count: Math.max(1, r.count + delta) } : r));
  const setCountDirect = (id: string, val: number) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, count: Math.max(1, val) } : r));

  const toggleType = (t: StaffType) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };
  const allTypesActive = activeTypes.size === 0;
  const toggleAllTypes = () => setActiveTypes(new Set());

  const selectedCount = rows.filter(r => r.selected).length;

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: T.border }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3"
        style={{ borderColor: T.border }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: T.navy }}>Staff Selection</h3>
          <p style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
            {filtered.length} of {allRows.length} roles
            {selectedCount > 0 && ` · ${selectedCount} selected`}
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Staff search */}
          <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5"
            style={{ borderColor: T.border, background: '#F8FAFC' }}>
            <span style={{ fontSize: 11, color: T.textMuted }}>Staff</span>
            <input
              value={staffSelect}
              onChange={e => setStaffSelect(e.target.value)}
              placeholder="Search name / role…"
              className="outline-none bg-transparent text-sm"
              style={{ width: 160, color: T.navy }}
            />
          </div>

          {/* Band dropdown */}
          <select
            value={bandFilter}
            onChange={e => setBandFilter(e.target.value)}
            className="border rounded-xl px-3 py-1.5 text-sm outline-none"
            style={{ borderColor: T.border, color: T.navy, background: '#F8FAFC' }}>
            <option value="">All Bands</option>
            {uniqueBands.map(b => <option key={b} value={b}>{b} — {BAND_DESC[b]}</option>)}
          </select>

          {/* Staff Type — clickable tiles (multi-select) */}
          <div className="flex items-center gap-1.5">
            {/* "All Types" master toggle */}
            <button
              onClick={toggleAllTypes}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
              style={{
                background:   allTypesActive ? T.navy   : '#F8FAFC',
                color:        allTypesActive ? '#fff'   : T.textMuted,
                borderColor:  allTypesActive ? T.navy   : T.border,
              }}>
              All Types
            </button>
            {STAFF_TYPES.map(t => {
              const active = activeTypes.has(t);
              const tileColor = t === 'Onshore' ? '#0f62fe' : t === 'Geo' ? '#42be65' : '#a56eff';
              return (
                <button key={t} onClick={() => toggleType(t)}
                  className="flex flex-col items-center px-3 py-1.5 rounded-xl border transition-all"
                  style={{
                    background:  active ? tileColor : '#F8FAFC',
                    color:       active ? '#fff'     : T.textMuted,
                    borderColor: active ? tileColor  : T.border,
                    minWidth: 64,
                  }}>
                  <span className="text-xs font-semibold">{t}</span>
                  <span style={{ fontSize: 10, opacity: 0.85 }}>{STAFF_HOURS[t]}H</span>
                </button>
              );
            })}
          </div>

          {(staffSelect || bandFilter || activeTypes.size > 0) && (
            <button
              onClick={() => { setStaffSelect(''); setBandFilter(''); setActiveTypes(new Set()); }}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border"
              style={{ borderColor: T.border, color: T.textMuted }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontSize: 13, minWidth: 820 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', color: T.textMuted, fontSize: 11 }}>
              <th className="px-4 py-3 text-left" style={{ width: 28 }}></th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider" style={{ minWidth: 130 }}>Staff Type</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Band</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Count</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Util.&nbsp;%</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Eff.&nbsp;Hrs/Wk</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: T.textMuted }}>
                  No staff members match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((row) => {
              const tileColor = row.staffType === 'Onshore' ? '#0f62fe' : row.staffType === 'Geo' ? '#42be65' : '#a56eff';
              return (
              <tr key={row.id} className="border-t hover:bg-gray-50/40 transition-colors"
                style={{ borderColor: T.border, background: row.selected ? '#EEF2FF' : undefined }}>
                {/* Checkbox */}
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={row.selected}
                    onChange={() => toggleRow(row.id)}
                    className="w-4 h-4 rounded cursor-pointer accent-blue-600" />
                </td>

                {/* Role name */}
                <td className="px-4 py-3 font-medium" style={{ color: T.navy }}>
                  {row.name}
                </td>

                {/* Staff Type indicator */}
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex flex-col items-center px-3 py-1 rounded-xl text-xs font-semibold"
                    style={{ background: `${tileColor}18`, color: tileColor, border: `1px solid ${tileColor}40` }}>
                    <span>{row.staffType}</span>
                    <span style={{ fontSize: 10, fontWeight: 400 }}>{STAFF_HOURS[row.staffType]}H</span>
                  </span>
                </td>

                {/* Band dropdown — fully functional */}
                <td className="px-4 py-3 text-center">
                  <select
                    value={row.band}
                    onChange={e => setBand(row.id, e.target.value as IBMBand)}
                    className="border rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer"
                    style={{ borderColor: T.border, color: T.navy, background: '#F8FAFC' }}>
                    {IBM_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </td>

                {/* Count stepper — increment / decrement / direct edit */}
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-1 border rounded-lg overflow-hidden"
                    style={{ borderColor: T.border }}>
                    <button
                      onClick={() => setCount(row.id, -1)}
                      className="px-2 py-1 text-sm font-bold hover:bg-gray-100 transition-colors"
                      style={{ color: T.textMuted }}>−</button>
                    <input
                      type="number" min={1}
                      value={row.count}
                      onChange={e => setCountDirect(row.id, parseInt(e.target.value, 10) || 1)}
                      className="w-8 text-center text-xs font-semibold outline-none bg-transparent"
                      style={{ color: T.navy }}
                    />
                    <button
                      onClick={() => setCount(row.id, 1)}
                      className="px-2 py-1 text-sm font-bold hover:bg-gray-100 transition-colors"
                      style={{ color: T.textMuted }}>+</button>
                  </div>
                </td>

                {/* Utilization % */}
                <td className="px-4 py-3 text-center">
                  <span className="kpi-value" style={{ color: row.allocation >= 90 ? '#da1e28' : row.allocation >= 75 ? '#f97316' : T.navy, fontWeight: 600 }}>
                    {row.allocation}%
                  </span>
                </td>

                {/* Eff Hrs/Wk */}
                <td className="px-4 py-3 text-center">
                  <span className="kpi-value font-bold" style={{ color: T.navy }}>
                    {row.effHrsWk}h
                  </span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
