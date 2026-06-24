'use client';
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useRFPStore } from '@/lib/store';
import type { AIRoleRow } from '@/types';

const IBM_BLUE = '#0F62FE';

export default function AIImpactModule() {
  const { activeDocumentId, analysisResults, setAnalysisResult, showNotification } = useRFPStore();
  const result = activeDocumentId ? analysisResults[activeDocumentId] : null;
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<AIRoleRow>>({});

  if (!result?.aiImpact) return <div className="p-6 text-gray-400 text-sm text-center mt-20">Upload a document to see AI impact analysis</div>;

  const ai = result.aiImpact;

  const barData = ai.phaseRows.map((p) => ({
    name: p.phase,
    Traditional: p.traditionalHours,
    'AI-Assisted': p.aiAssistedHours,
    Saved: p.hoursSaved,
  }));

  const startEdit = (row: AIRoleRow) => {
    setEditingRoleId(row.id);
    setEditValues({ productivityPct: row.productivityPct, automationCoveragePct: row.automationCoveragePct, reworkReductionPct: row.reworkReductionPct });
  };

  const commitEdit = (rowId: string) => {
    if (!activeDocumentId || !result.aiImpact) return;
    const roleRows = result.aiImpact.roleRows.map((r) => {
      if (r.id !== rowId) return r;
      const merged = { ...r, ...editValues };
      merged.aiAugmentedFTE = Math.max(1, Math.round(r.traditionalFTE * (1 - (merged.productivityPct ?? r.productivityPct) / 100)));
      return merged;
    });

    const performUpdate = () => {
      const totalTrad = result.aiImpact!.phaseRows.reduce((a, r) => a + r.traditionalHours, 0);
      const overallGain = roleRows.reduce((a, r) => a + r.productivityPct, 0) / roleRows.length;
      const totalAI = Math.round(totalTrad * (1 - overallGain / 100));
      setAnalysisResult(activeDocumentId, {
        ...result,
        aiImpact: {
          ...result.aiImpact!,
          roleRows,
          totalAIHours: totalAI,
          totalHoursSaved: totalTrad - totalAI,
          overallProductivityGain: Math.round(overallGain),
          lastUpdated: new Date().toISOString(),
        },
      });
    };

    showNotification({
      sourceModule: 'AI Impact',
      affectedModules: ['Staffing Plan → Headcount', 'Project Plan → Duration', 'Estimation → Total Cost'],
      message: 'This change will also update: Staffing Plan → Headcount, Project Plan → Duration, Estimation → Total Cost.',
      pendingUpdate: performUpdate,
    });

    setEditingRoleId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Traditional Hours', value: ai.totalTraditionalHours.toLocaleString() },
          { label: 'AI-Assisted Hours', value: ai.totalAIHours.toLocaleString() },
          { label: 'Hours Saved', value: ai.totalHoursSaved.toLocaleString() },
          { label: 'Overall Productivity Gain', value: `${ai.overallProductivityGain}%` },
        ].map((m, i) => (
          <div key={m.label} className="rounded-2xl border p-4"
            style={i === 3 ? { background: '#e8f2ff', borderColor: IBM_BLUE } : { background: '#fff', borderColor: '#e5e7eb' }}>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-xl font-bold" style={{ color: IBM_BLUE }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Phase comparison bar chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Traditional vs AI-Assisted Hours by Phase</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Traditional" fill="#da1e28" radius={[4, 4, 0, 0]} />
            <Bar dataKey="AI-Assisted" fill={IBM_BLUE} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Saved" fill="#198038" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Phase rows table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <h3 className="text-sm font-bold text-gray-700 p-5 pb-0 mb-4">Phase-by-Phase Comparison</h3>
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ background: '#f4f8ff' }}>
              <th className="px-4 py-3 text-left">Phase</th>
              <th className="px-4 py-3 text-left">Activity</th>
              <th className="px-4 py-3 text-center">Traditional Hrs</th>
              <th className="px-4 py-3 text-center">AI-Assisted Hrs</th>
              <th className="px-4 py-3 text-center">Hours Saved</th>
              <th className="px-4 py-3 text-center">Productivity Gain</th>
            </tr>
          </thead>
          <tbody>
            {ai.phaseRows.map((row, idx) => (
              <tr key={row.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                <td className="px-4 py-3 font-semibold text-gray-800">{row.phase}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{row.activity}</td>
                <td className="px-4 py-3 text-center text-gray-700">{row.traditionalHours.toLocaleString()}</td>
                <td className="px-4 py-3 text-center font-semibold" style={{ color: IBM_BLUE }}>{row.aiAssistedHours.toLocaleString()}</td>
                <td className="px-4 py-3 text-center text-green-600 font-semibold">{row.hoursSaved.toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: IBM_BLUE }}>{row.productivityGainPct}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role-level table — editable */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <h3 className="text-sm font-bold text-gray-700 p-5 pb-0 mb-1">Role-Level AI Productivity (Editable)</h3>
        <p className="text-xs text-gray-400 px-5 mb-4">Edit Productivity %, Automation Coverage %, or Rework Reduction % per role. Changes propagate to Staffing Plan, Project Plan, and Estimation.</p>
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ background: '#f4f8ff' }}>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Band</th>
              <th className="px-4 py-3 text-center">Trad. FTE</th>
              <th className="px-4 py-3 text-center">AI FTE</th>
              <th className="px-4 py-3 text-center">Productivity %</th>
              <th className="px-4 py-3 text-center">Automation %</th>
              <th className="px-4 py-3 text-center">Rework Reduction %</th>
              <th className="px-4 py-3 text-center">Accel. Factor</th>
              <th className="px-4 py-3 text-left">Tool Used</th>
              <th className="px-4 py-3 text-center">Edit</th>
            </tr>
          </thead>
          <tbody>
            {ai.roleRows.map((row, idx) => {
              const isEditing = editingRoleId === row.id;
              return (
                <tr key={row.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                  <td className="px-4 py-3 font-semibold text-gray-800">{row.role}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: IBM_BLUE }}>{row.band}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.traditionalFTE}</td>
                  <td className="px-4 py-3 text-center font-semibold" style={{ color: IBM_BLUE }}>{row.aiAugmentedFTE}</td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input type="number" min={0} max={100} value={editValues.productivityPct ?? row.productivityPct}
                        onChange={(e) => setEditValues({ ...editValues, productivityPct: Number(e.target.value) })}
                        className="w-16 text-center border border-blue-400 rounded-lg px-1 py-0.5 text-sm outline-none" />
                    ) : <span className="font-semibold text-green-600">{row.productivityPct}%</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input type="number" min={0} max={100} value={editValues.automationCoveragePct ?? row.automationCoveragePct}
                        onChange={(e) => setEditValues({ ...editValues, automationCoveragePct: Number(e.target.value) })}
                        className="w-16 text-center border border-blue-400 rounded-lg px-1 py-0.5 text-sm outline-none" />
                    ) : <span>{row.automationCoveragePct}%</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input type="number" min={0} max={100} value={editValues.reworkReductionPct ?? row.reworkReductionPct}
                        onChange={(e) => setEditValues({ ...editValues, reworkReductionPct: Number(e.target.value) })}
                        className="w-16 text-center border border-blue-400 rounded-lg px-1 py-0.5 text-sm outline-none" />
                    ) : <span>{row.reworkReductionPct}%</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.accelerationFactor}×</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{row.toolUsed}</td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <button onClick={() => commitEdit(row.id)} className="text-xs font-semibold px-2 py-0.5 rounded-lg text-white" style={{ background: IBM_BLUE }}>Save</button>
                    ) : (
                      <button onClick={() => startEdit(row)} className="text-xs font-medium px-2 py-0.5 rounded-lg border text-blue-600 border-blue-200 hover:bg-blue-50">Edit</button>
                    )}
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
