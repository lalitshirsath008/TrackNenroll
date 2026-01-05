
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { User, StudentLead, UserRole, LeadStage, Department, UserAction } from '../types';

const HODDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, users, assignLeadsToTeacher, autoDistributeLeadsToTeachers, addLog } = useData();
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<'leads' | 'teachers'>('leads');

  const myDeptLeads = useMemo(() => leads.filter(l => l.assignedToHOD === currentUser.id), [leads, currentUser]);
  const unassignedToTeacher = useMemo(() => myDeptLeads.filter(l => !l.assignedToTeacher), [myDeptLeads]);
  const myTeachers = useMemo(() => users.filter(u => u.role === UserRole.TEACHER && u.department === currentUser.department && u.isApproved), [users, currentUser]);

  const handleAutoDistribution = async () => {
    if (unassignedToTeacher.length === 0 || myTeachers.length === 0) return;
    if (window.confirm(`Initiate automatic and equal distribution of ${unassignedToTeacher.length} leads across all active faculty members?`)) {
      await autoDistributeLeadsToTeachers(unassignedToTeacher.map(l => l.id), currentUser.department!);
      addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Automated distribution of ${unassignedToTeacher.length} leads performed.`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-['Inter']">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Departmental Administration</p>
          <h2 className="text-xl font-black text-slate-800 uppercase leading-none">{currentUser.department} Control Desk</h2>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          <button onClick={() => setTab('leads')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'leads' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>Lead Pool</button>
          <button onClick={() => setTab('teachers')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'teachers' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>Faculty Metrics</button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Total Department Leads', v: myDeptLeads.length, c: 'text-slate-800' }, 
          { l: 'Pending Delegation', v: unassignedToTeacher.length, c: 'text-amber-600' }, 
          { l: 'Active Faculty', v: myTeachers.length, c: 'text-indigo-600' }, 
          { l: 'Processed Records', v: myDeptLeads.filter(l => l.stage !== LeadStage.ASSIGNED && l.stage !== LeadStage.UNASSIGNED).length, c: 'text-emerald-600' }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2">{item.l}</p>
            <p className={`text-2xl font-black ${item.c}`}>{item.v}</p>
          </div>
        ))}
      </div>

      {tab === 'leads' ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
            <div className="relative flex-1 w-full">
              <input type="text" placeholder="Search department pool..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600 transition-all" />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={handleAutoDistribution} className="flex-1 px-6 py-3.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Auto-Distribute</button>
              <button disabled={selectedLeadIds.length === 0} onClick={() => setIsAssignModalOpen(true)} className="flex-1 px-6 py-3.5 bg-slate-900 disabled:opacity-20 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Delegate ({selectedLeadIds.length})</button>
            </div>
          </div>
          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase border-b border-slate-50 tracking-widest">
                  <tr>
                    <th className="p-6 w-12"><input type="checkbox" onChange={(e) => setSelectedLeadIds(e.target.checked ? unassignedToTeacher.map(l => l.id) : [])} className="w-4 h-4 rounded border-slate-300" /></th>
                    <th className="p-6">Student Identity</th>
                    <th className="p-6">Assigned Personnel</th>
                    <th className="p-6 text-right">Delegation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {myDeptLeads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => {
                    const isDelegated = !!lead.assignedToTeacher;
                    const teacher = myTeachers.find(t => t.id === lead.assignedToTeacher);
                    const isProcessed = lead.stage !== LeadStage.ASSIGNED && lead.stage !== LeadStage.UNASSIGNED;

                    return (
                      <tr key={lead.id} className={`hover:bg-slate-50 transition-all group ${selectedLeadIds.includes(lead.id) ? 'bg-indigo-50/50' : ''}`}>
                        <td className="p-6">
                          {!isDelegated && (
                            <input 
                              type="checkbox" 
                              checked={selectedLeadIds.includes(lead.id)} 
                              onChange={() => setSelectedLeadIds(p => p.includes(lead.id) ? p.filter(i => i !== lead.id) : [...p, lead.id])} 
                              className="w-4 h-4 rounded border-slate-300 accent-indigo-600" 
                            />
                          )}
                        </td>
                        <td className="p-6">
                          <p className="text-[11px] font-black uppercase text-slate-800 leading-none mb-1">{lead.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 tabular-nums">{lead.phone}</p>
                        </td>
                        <td className="p-6 text-[10px] font-bold text-slate-500 uppercase">
                          {teacher ? teacher.name : <span className="text-slate-300 italic">Not yet assigned</span>}
                        </td>
                        <td className="p-6 text-right">
                          {isProcessed ? (
                            <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                              {lead.stage}
                            </span>
                          ) : isDelegated ? (
                            <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                              Delegated to Faculty
                            </span>
                          ) : (
                            <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
                              Awaiting Delegation
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myTeachers.map(teacher => {
            const tLeads = myDeptLeads.filter(l => l.assignedToTeacher === teacher.id);
            const comp = tLeads.filter(l => l.stage !== LeadStage.ASSIGNED && l.stage !== LeadStage.UNASSIGNED).length;
            const progress = tLeads.length > 0 ? Math.round((comp / tLeads.length) * 100) : 0;
            return (
              <div key={teacher.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex justify-between items-center mb-6">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600 border border-indigo-100 uppercase group-hover:scale-110 transition-transform">{teacher.name.charAt(0)}</div>
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">{progress}%</p>
                </div>
                <h4 className="text-sm font-black text-slate-800 uppercase truncate mb-6">{teacher.name}</h4>
                <div className="space-y-3">
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 tracking-widest">
                    <span>Assigned: {tLeads.length}</span>
                    <span>Verified: {comp}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {myTeachers.length === 0 && (
            <div className="lg:col-span-3 py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active faculty found for this department.</p>
            </div>
          )}
        </div>
      )}

      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-[#0f172a] text-white text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Faculty Selection</p>
              <h3 className="text-xl font-black uppercase">Delegate {selectedLeadIds.length} Leads</h3>
            </div>
            <div className="p-6 space-y-2 max-h-72 overflow-y-auto custom-scroll">
              {myTeachers.map(teacher => (
                <button key={teacher.id} onClick={async () => { await assignLeadsToTeacher(selectedLeadIds, teacher.id); setSelectedLeadIds([]); setIsAssignModalOpen(false); }} className="w-full p-5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl text-left border border-slate-100 transition-all flex justify-between items-center group">
                  <span className="text-[11px] font-black uppercase">{teacher.name}</span>
                  <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-slate-50">
              <button onClick={() => setIsAssignModalOpen(false)} className="w-full py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-600 transition-colors">Cancel Selection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODDashboard;
