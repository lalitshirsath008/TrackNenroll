
import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { Department, LeadStage } from '../types';

const GlobalAnalytics: React.FC = () => {
  const { leads } = useData();
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStage, setSelectedStage] = useState<string>('All');

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (selectedDept !== 'All') result = result.filter(l => l.department === selectedDept);
    if (selectedStage !== 'All') result = result.filter(l => l.stage === selectedStage);
    return result;
  }, [leads, selectedDept, selectedStage]);

  const departmentStats = useMemo(() => {
    return Object.values(Department).map(dept => {
      const deptLeads = leads.filter(l => l.department === dept);
      const targeted = deptLeads.filter(l => l.stage === LeadStage.TARGETED).length;
      return {
        name: dept,
        total: deptLeads.length,
        conversion: deptLeads.length > 0 ? Math.round((targeted / deptLeads.length) * 100) : 0
      };
    }).sort((a, b) => b.total - a.total);
  }, [leads]);

  const stageBreakdown = useMemo(() => {
    return Object.values(LeadStage).map(stage => ({
      name: stage,
      count: filteredLeads.filter(l => l.stage === stage).length,
      percentage: filteredLeads.length > 0 ? Math.round((filteredLeads.filter(l => l.stage === stage).length / filteredLeads.length) * 100) : 0
    }));
  }, [filteredLeads]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Institutional Intelligence</h1>
          <h2 className="text-4xl font-black text-[#1e293b] tracking-tighter uppercase">Global Admission Hub</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <select 
            value={selectedDept} 
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm"
          >
            <option value="All">All Departments</option>
            {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select 
            value={selectedStage} 
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm"
          >
            <option value="All">All Stages</option>
            {Object.values(LeadStage).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Institution Leads', value: leads.length, color: 'text-indigo-600' },
          { label: 'Filtered Sample', value: filteredLeads.length, color: 'text-[#1e293b]' },
          { label: 'Targeted Success', value: leads.filter(l => l.stage === LeadStage.TARGETED).length, color: 'text-emerald-600' },
          { label: 'Verified Counseling', value: leads.filter(l => l.callVerified).length, color: 'text-amber-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm flex flex-col justify-between h-44">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">{stat.label}</p>
            <p className={`text-5xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-50 shadow-sm overflow-hidden flex flex-col">
          <div className="p-10 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-xl font-black uppercase tracking-tighter text-[#1e293b]">Departmental Distribution</h3>
            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl uppercase tracking-widest">Macro View</span>
          </div>
          <div className="p-8 space-y-6 flex-1 overflow-y-auto max-h-[500px] custom-scroll">
            {departmentStats.map((dept, i) => (
              <div key={i} className="group">
                <div className="flex justify-between items-end mb-3">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-300 w-6">0{i+1}</span>
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{dept.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{dept.total} leads</span>
                  </div>
                </div>
                <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-1000 group-hover:bg-indigo-400" 
                    style={{ width: `${(dept.total / Math.max(...departmentStats.map(d => d.total))) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0f172a] rounded-[3rem] p-10 text-white shadow-xl flex flex-col">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-10">Stage Breakdown</h3>
          <div className="space-y-8 flex-1">
            {stageBreakdown.map((stage, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stage.name}</p>
                  <p className="text-2xl font-black tracking-tight">{stage.count}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-500">{stage.percentage}%</p>
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Share</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-10 border-t border-white/5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">Data reflected across all {Object.keys(Department).length} institutional branches with real-time synchronization.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalAnalytics;
