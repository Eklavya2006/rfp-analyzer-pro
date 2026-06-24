'use client';
import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import { useRFPStore } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import type { IBMBand, StaffingRole } from '@/types';

const IBM_BLUE = '#0F62FE';

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

export default function StaffingPlanModule() {
  const { activeDocumentId, analysisResults, updateStaffingRole, addStaffingRole, removeStaffingRole } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<StaffingRole>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRole, setNewRole] = useState<Partial<StaffingRole>>({ roleName: '', band: '7A', numberOfResources: 1, hoursPerResource: 640, hourlyRate: 65 });

  if (!result?.staffingPlan) return <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document to see the staffing plan</div>;

  const plan = result.staffingPlan;

  const startEdit = (role: StaffingRole) => {
    setEditingId(role.id);
    setEditValues({ numberOfResources: role.numberOfResources, hoursPerResource: role.hoursPerResource, hourlyRate: role.hourlyRate });
  };

  const commitEdit = (id: string) => {
    if (activeDocumentId) {
      updateStaffingRole(activeDocumentId, id, editValues);
    }
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!activeDocumentId || !newRole.roleName) return;
    const band = (newRole.band ?? '7A') as IBMBand;
    const nr = newRole.numberOfResources ?? 1;
    const hpr = newRole.hoursPerResource ?? 640;
    const rate = newRole.hourlyRate ?? BAND_RATES[band];
    const role: StaffingRole = {
      id: uuid(),
      roleName: newRole.roleName ?? 'New Role',
      band,
      levelDescription: BAND_DESC[band],
      numberOfResources: nr,
      hoursPerResource: hpr,
      totalHours: nr * hpr,
      hourlyRate: rate,
      totalCost: nr * hpr * rate,
    };
    addStaffingRole(activeDocumentId, role);
    setShowAddForm(false);
    setNewRole({ roleName: '', band: '7A', numberOfResources: 1, hoursPerResource: 640, hourlyRate: 65 });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Headcount', value: String(plan.totalHeadcount) },
          { label: 'Total Hours', value: plan.totalHours.toLocaleString() },
          { label: 'Total Labor Cost', value: fmt(plan.totalLaborCost) },
          { label: 'Roles', value: String(plan.roles.length) },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-lg font-bold" style={{ color: IBM_BLUE }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex justify-end">
        <button onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
          style={{ background: IBM_BLUE }}>
          <Plus size={14} /> Add Role
        </button>
      </div>

      {/* Add role form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: IBM_BLUE }}>
          <div className="text-sm font-bold" style={{ color: IBM_BLUE }}>Add New Role</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <input placeholder="Role Name" value={newRole.roleName ?? ''} onChange={(e) => setNewRole({ ...newRole, roleName: e.target.value })}
              className="col-span-2 sm:col-span-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
            <select value={newRole.band} onChange={(e) => { const b = e.target.value as IBMBand; setNewRole({ ...newRole, band: b, hourlyRate: BAND_RATES[b], levelDescription: BAND_DESC[b] }); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400">
              {IBM_BANDS.map((b) => <option key={b} value={b}>{b} — {BAND_DESC[b]}</option>)}
            </select>
            <input type="number" placeholder="Resources" value={newRole.numberOfResources ?? ''} onChange={(e) => setNewRole({ ...newRole, numberOfResources: Number(e.target.value) })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
            <input type="number" placeholder="Hours/Resource" value={newRole.hoursPerResource ?? ''} onChange={(e) => setNewRole({ ...newRole, hoursPerResource: Number(e.target.value) })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
            <input type="number" placeholder="$/hr" value={newRole.hourlyRate ?? ''} onChange={(e) => setNewRole({ ...newRole, hourlyRate: Number(e.target.value) })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg" style={{ background: IBM_BLUE }}>Add Role</button>
          </div>
        </div>
      )}

      {/* Staffing table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ background: '#f4f8ff' }}>
              <th className="px-4 py-3 text-left">Role Name</th>
              <th className="px-4 py-3 text-left">IBM Band</th>
              <th className="px-4 py-3 text-left">Level</th>
              <th className="px-4 py-3 text-center"># Resources</th>
              <th className="px-4 py-3 text-center">Hrs / Resource</th>
              <th className="px-4 py-3 text-center">Total Hours</th>
              <th className="px-4 py-3 text-center">$/hr</th>
              <th className="px-4 py-3 text-right">Total Cost</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plan.roles.map((role, idx) => {
              const isEditing = editingId === role.id;
              return (
                <tr key={role.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                  <td className="px-4 py-3 font-semibold text-gray-800">{role.roleName}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: IBM_BLUE }}>{role.band}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{role.levelDescription}</td>

                  {/* Editable cells */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input type="number" value={editValues.numberOfResources ?? role.numberOfResources} min={1}
                        onChange={(e) => setEditValues({ ...editValues, numberOfResources: Number(e.target.value) })}
                        className="w-16 text-center border border-blue-400 rounded-lg px-1 py-0.5 text-sm outline-none" />
                    ) : <span>{role.numberOfResources}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input type="number" value={editValues.hoursPerResource ?? role.hoursPerResource} min={1}
                        onChange={(e) => setEditValues({ ...editValues, hoursPerResource: Number(e.target.value) })}
                        className="w-20 text-center border border-blue-400 rounded-lg px-1 py-0.5 text-sm outline-none" />
                    ) : <span>{role.hoursPerResource}</span>}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-700">{role.totalHours.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input type="number" value={editValues.hourlyRate ?? role.hourlyRate} min={1}
                        onChange={(e) => setEditValues({ ...editValues, hourlyRate: Number(e.target.value) })}
                        className="w-20 text-center border border-blue-400 rounded-lg px-1 py-0.5 text-sm outline-none" />
                    ) : <span>${role.hourlyRate}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: IBM_BLUE }}>{fmt(role.totalCost)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button onClick={() => commitEdit(role.id)} className="text-green-600 hover:text-green-800"><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(role)} className="text-blue-400 hover:text-blue-600"><Edit3 size={14} /></button>
                          <button onClick={() => activeDocumentId && removeStaffingRole(activeDocumentId, role.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f4f8ff', borderTop: '2px solid #0F62FE' }}>
              <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-700">Totals</td>
              <td className="px-4 py-3 text-center font-bold" style={{ color: IBM_BLUE }}>{plan.totalHours.toLocaleString()}</td>
              <td />
              <td className="px-4 py-3 text-right font-bold text-lg" style={{ color: IBM_BLUE }}>{fmt(plan.totalLaborCost)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
