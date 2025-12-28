
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
    if (window.confirm(`Distribute leads equally?`)) {
      await autoDistributeLeadsToTeachers(unassignedToTeacher.map(l => l.id), currentUser.department!);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">HOD Controller</p>
          <h2 className="text-xl font-black text-slate-800 uppercase leading-none">{currentUser.department} Desk</h2>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button onClick={() => setTab('leads')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'leads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Pool</button>
          <button onClick={() => setTab('teachers')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'teachers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Performance</button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: 'Total', v: myDeptLeads.length }, { l: 'Pending', v: unassignedToTeacher.length }, { l: 'Faculty', v: myTeachers.length }, { l: 'Resolved', v: myDeptLeads.filter(l => l.stage !== LeadStage.ASSIGNED).length }].map((item, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-1">{item.l}</p>
            <p className="text-xl font-black text-slate-800">{item.v}</p>
          </div>
        ))}
      </div>

      {tab === 'leads' ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <input type="text" placeholder="Search pool..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none" />
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={handleAutoDistribution} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase">Auto-Distribute</button>
              <button disabled={selectedLeadIds.length === 0} onClick={() => setIsAssignModalOpen(true)} className="flex-1 px-4 py-2 bg-slate-900 disabled:opacity-20 text-white rounded-lg text-[9px] font-black uppercase">Delegate ({selectedLeadIds.length})</button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-[#fcfdfe] text-[8px] font-black text-slate-400 uppercase border-b border-slate-50">
                <tr>
                  <th className="p-4 w-10"><input type="checkbox" onChange={(e) => setSelectedLeadIds(e.target.checked ? unassignedToTeacher.map(l => l.id) : [])} className="w-4 h-4 rounded" /></th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Faculty</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {myDeptLeads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                  <tr key={lead.id} className={`hover:bg-slate-50 transition-all ${selectedLeadIds.includes(lead.id) ? 'bg-indigo-50' : ''}`}>
                    <td className="p-4">{!lead.assignedToTeacher && <input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => setSelectedLeadIds(p => p.includes(lead.id) ? p.filter(i => i !== lead.id) : [...p, lead.id])} className="w-4 h-4 rounded" />}</td>
                    <td className="p-4 text-[10px] font-black uppercase">{lead.name}</td>
                    <td className="p-4 text-[9px] font-bold text-slate-400 uppercase">{myTeachers.find(t => t.id === lead.assignedToTeacher)?.name || '-'}</td>
                    <td className="p-4 text-right"><span className="text-[8px] font-black uppercase text-indigo-600">{lead.stage}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myTeachers.map(teacher => {
            const tLeads = myDeptLeads.filter(l => l.assignedToTeacher === teacher.id);
            const comp = tLeads.filter(l => l.stage !== LeadStage.ASSIGNED).length;
            const progress = tLeads.length > 0 ? Math.round((comp / tLeads.length) * 100) : 0;
            return (
              <div key={teacher.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center font-black text-indigo-600 border border-indigo-100 uppercase">{teacher.name.charAt(0)}</div>
                  <p className="text-xl font-black text-slate-800">{progress}%</p>
                </div>
                <h4 className="text-sm font-black text-slate-800 uppercase truncate">{teacher.name}</h4>
                <div className="mt-4 space-y-2">
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} /></div>
                  <div className="flex justify-between text-[8px] font-black uppercase text-slate-400"><span>Assigned: {tLeads.length}</span><span>Done: {comp}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white text-center"><h3 className="text-lg font-black uppercase">Delegate Faculty</h3></div>
            <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
              {myTeachers.map(teacher => (
                <button key={teacher.id} onClick={() => { assignLeadsToTeacher(selectedLeadIds, teacher.id); setSelectedLeadIds([]); setIsAssignModalOpen(false); }} className="w-full p-4 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-xl text-left border border-slate-100 transition-all">
                  <p className="text-[10px] font-black uppercase">{teacher.name}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setIsAssignModalOpen(false)} className="w-full p-4 text-[9px] font-black uppercase text-slate-400">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODDashboard;
