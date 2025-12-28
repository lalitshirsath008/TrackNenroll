
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { User, StudentLead, UserRole, LeadStage, Department, UserAction } from '../types';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const HODDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, users, assignLeadsToTeacher, autoDistributeLeadsToTeachers, addLog } = useData();
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<'leads' | 'teachers'>('leads');

  // Filter leads: Specifically assigned to this HOD node by Admin
  const myDeptLeads = useMemo(() => 
    leads.filter(l => l.assignedToHOD === currentUser.id),
  [leads, currentUser]);

  const unassignedToTeacher = useMemo(() => 
    myDeptLeads.filter(l => !l.assignedToTeacher), 
  [myDeptLeads]);

  const myTeachers = useMemo(() => 
    users.filter(u => u.role === UserRole.TEACHER && u.department === currentUser.department && u.isApproved),
  [users, currentUser]);

  const stats = useMemo(() => ({
    totalReceived: myDeptLeads.length,
    pendingTeacherAssignment: unassignedToTeacher.length,
    facultyActive: myTeachers.length,
    completedByDept: myDeptLeads.filter(l => l.stage === LeadStage.TARGETED || l.stage === LeadStage.DISCARDED).length
  }), [myDeptLeads, unassignedToTeacher, myTeachers]);

  const teacherStats = useMemo(() => {
    return myTeachers.map(teacher => {
      const teacherLeads = myDeptLeads.filter(l => l.assignedToTeacher === teacher.id);
      const completed = teacherLeads.filter(l => l.stage === LeadStage.TARGETED || l.stage === LeadStage.DISCARDED).length;
      return {
        ...teacher,
        totalAssigned: teacherLeads.length,
        completedCount: completed,
        pendingCount: teacherLeads.length - completed,
        progress: teacherLeads.length > 0 ? Math.round((completed / teacherLeads.length) * 100) : 0
      };
    });
  }, [myTeachers, myDeptLeads]);

  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAllocation = async (teacherId: string) => {
    if (selectedLeadIds.length === 0) return;
    await assignLeadsToTeacher(selectedLeadIds, teacherId);
    setSelectedLeadIds([]);
    setIsAssignModalOpen(false);
  };

  const handleAutoDistribution = async () => {
    if (unassignedToTeacher.length === 0) {
      alert("No unassigned leads found in departmental pool.");
      return;
    }
    if (myTeachers.length === 0) {
      alert("No active faculty nodes found in your department.");
      return;
    }
    if (window.confirm(`Auto-distribute ${unassignedToTeacher.length} leads equally among ${myTeachers.length} active teachers?`)) {
      await autoDistributeLeadsToTeachers(unassignedToTeacher.map(l => l.id), currentUser.department!);
      addLog(currentUser.id, currentUser.name, UserAction.IMPORT_LEADS, `HOD Auto-distributed ${unassignedToTeacher.length} leads across department faculty.`);
      alert("Equal distribution to faculty completed!");
    }
  };

  const downloadDeptReport = (format: 'pdf' | 'excel') => {
    const data = myDeptLeads;
    const dateStr = new Date().toLocaleDateString('en-GB');
    const fileName = `${currentUser.department}_Performance_Report_${new Date().toISOString().split('T')[0]}`;

    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("DEPARTMENTAL STATUS REPORT", 20, 20);
      doc.setFontSize(10);
      doc.text(`BRANCH: ${currentUser.department?.toUpperCase()}`, 20, 28);
      doc.text(`GENERATED: ${dateStr}`, 160, 20);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.text("SUMMARY", 20, 55);
      doc.line(20, 57, 190, 57);
      doc.setFontSize(10);
      doc.text(`Total Allocated to Dept: ${stats.totalReceived}`, 20, 65);
      doc.text(`Successfully Targeted: ${myDeptLeads.filter(l => l.stage === LeadStage.TARGETED).length}`, 80, 65);
      doc.text(`Faculty Strength: ${stats.facultyActive}`, 150, 65);

      let y = 85;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y-5, 180, 10, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text("SR", 20, y); doc.text("STUDENT", 35, y); doc.text("PHONE", 85, y); doc.text("FACULTY ASSIGNED", 125, y); doc.text("STATUS", 170, y);
      
      doc.setFont('helvetica', 'normal');
      myDeptLeads.forEach((l, i) => {
        y += 10;
        if (y > 270) { doc.addPage(); y = 30; }
        doc.text(`${i+1}`, 20, y);
        doc.text(l.name.substring(0, 20).toUpperCase(), 35, y);
        doc.text(l.phone, 85, y);
        doc.text((myTeachers.find(t => t.id === l.assignedToTeacher)?.name || 'UNASSIGNED').toUpperCase(), 125, y);
        doc.text(l.stage.toUpperCase(), 170, y);
        doc.line(15, y+2, 195, y+2);
      });
      doc.save(`${fileName}.pdf`);
    } else {
      const worksheetData = data.map((l, i) => ({
        "Sr No": i + 1,
        "Student Name": l.name,
        "Phone": l.phone,
        "Assigned Teacher": myTeachers.find(t => t.id === l.assignedToTeacher)?.name || 'N/A',
        "Status": l.stage,
        "Call Verified": l.callVerified ? "YES" : "NO"
      }));
      const ws = XLSX.utils.json_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dept_Analytics");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Departmental Controller</p>
          <h2 className="text-4xl font-black text-[#1e293b] tracking-tighter uppercase leading-none">{currentUser.department} Desk</h2>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-[2rem] border border-slate-200 shadow-inner">
          <button onClick={() => setTab('leads')} className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'leads' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}>Node Management</button>
          <button onClick={() => setTab('teachers')} className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'teachers' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}>Staff Performance</button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Allocated', value: stats.totalReceived },
          { label: 'Pending Staffing', value: stats.pendingTeacherAssignment },
          { label: 'Faculty Active', value: stats.facultyActive },
          { label: 'Dept. Progress', value: stats.completedByDept }
        ].map((item, i) => (
          <div key={i} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">{item.label}</p>
            <p className="text-4xl font-black text-[#1e293b] tracking-tighter">{item.value}</p>
          </div>
        ))}
      </div>

      {tab === 'leads' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="relative flex-1 w-full">
               <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               <input type="text" placeholder="Search departmental pool..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-bold outline-none focus:border-indigo-600" />
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <div className="flex bg-slate-100 rounded-2xl p-1.5 border border-slate-200">
                <button onClick={() => downloadDeptReport('pdf')} className="px-5 py-3.5 hover:bg-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">PDF Report</button>
                <button onClick={() => downloadDeptReport('excel')} className="px-5 py-3.5 hover:bg-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Excel</button>
              </div>
              <button onClick={handleAutoDistribution} className="px-10 py-5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                 Auto-Distribute
              </button>
              <button disabled={selectedLeadIds.length === 0} onClick={() => setIsAssignModalOpen(true)} className="flex-1 md:flex-none px-12 py-5 bg-[#0f172a] disabled:opacity-20 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">
                Delegate ({selectedLeadIds.length})
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <tr>
                    <th className="px-10 py-7 w-12 text-center">
                      <input type="checkbox" onChange={(e) => setSelectedLeadIds(e.target.checked ? unassignedToTeacher.map(l => l.id) : [])} className="w-5 h-5 rounded border-slate-200" />
                    </th>
                    <th className="px-10 py-7">Student Name</th>
                    <th className="px-10 py-7">Contact Node</th>
                    <th className="px-10 py-7">Faculty Allocation</th>
                    <th className="px-10 py-7 text-right">Current State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {myDeptLeads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                    <tr key={lead.id} className={`hover:bg-slate-50/50 transition-all ${selectedLeadIds.includes(lead.id) ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-10 py-6 text-center">
                        {!lead.assignedToTeacher && <input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => toggleLeadSelection(lead.id)} className="w-5 h-5 rounded border-slate-200" />}
                      </td>
                      <td className="px-10 py-6 font-black text-sm uppercase text-[#1e293b]">{lead.name}</td>
                      <td className="px-10 py-6 font-bold text-slate-400 text-[11px] tracking-[0.1em]">{lead.phone}</td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${lead.assignedToTeacher ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                          <span className="font-black text-[10px] uppercase text-slate-600">
                            {myTeachers.find(t => t.id === lead.assignedToTeacher)?.name || 'UNALLOCATED'}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <span className={`text-[9px] font-black uppercase px-3 py-2 rounded-xl border ${
                          lead.stage === LeadStage.TARGETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          lead.stage === LeadStage.DISCARDED ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                          {lead.stage}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {myDeptLeads.length === 0 && (
                    <tr><td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No departmental data allocated yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teacherStats.map(teacher => (
            <div key={teacher.id} className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
              <div className="flex justify-between items-start mb-10">
                <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center font-black text-indigo-600 border border-indigo-100 text-2xl uppercase">{teacher.name.charAt(0)}</div>
                <div className="text-right">
                  <p className="text-3xl font-black text-[#1e293b] leading-none">{teacher.progress}%</p>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Resolution</p>
                </div>
              </div>
              <h4 className="text-2xl font-black text-[#1e293b] uppercase tracking-tight leading-tight">{teacher.name}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 italic">Institutional Faculty Member</p>
              
              <div className="mt-10 space-y-6">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Interaction Nodes</span>
                  <span className="text-[#1e293b] font-bold">{teacher.completedCount} / {teacher.totalAssigned}</span>
                </div>
                <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                  <div className="h-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all duration-1000" style={{ width: `${teacher.progress}%` }} />
                </div>
                <div className="flex gap-6 pt-2">
                   <div className="flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Awaiting</p>
                      <p className="text-xl font-black text-amber-500">{teacher.pendingCount}</p>
                   </div>
                   <div className="flex-1 border-l border-slate-50 pl-6">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Completed</p>
                      <p className="text-xl font-black text-emerald-500">{teacher.completedCount}</p>
                   </div>
                </div>
              </div>
            </div>
          ))}
          {myTeachers.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-200">
               <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">No faculty registered in this department</p>
            </div>
          )}
        </div>
      )}

      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
          <div className="bg-white w-full h-full md:h-auto md:max-w-xl md:rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
            <div className="p-10 bg-[#0f172a] text-white text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mt-10 blur-2xl"></div>
              <h3 className="text-3xl font-black uppercase tracking-tight relative z-10">Delegate Staff</h3>
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em] mt-3 relative z-10">Provisioning {selectedLeadIds.length} Nodes</p>
            </div>
            <div className="p-10 space-y-4 max-h-[500px] overflow-y-auto custom-scroll">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Target Faculty Identity</p>
              {myTeachers.map(teacher => (
                <button key={teacher.id} onClick={() => handleAllocation(teacher.id)} className="w-full p-6 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-[2rem] flex items-center justify-between group transition-all border border-slate-200 shadow-sm">
                  <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight leading-none mb-1 group-hover:text-white">{teacher.name}</p>
                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-[0.2em] group-hover:text-white/80">Active Councilor</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-white/20">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7"/></svg>
                  </div>
                </button>
              ))}
              {myTeachers.length === 0 && (
                <p className="py-20 text-center text-rose-500 font-black text-[11px] uppercase tracking-widest">No eligible faculty nodes found</p>
              )}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100">
               <button onClick={() => setIsAssignModalOpen(false)} className="w-full py-5 text-[11px] font-black uppercase text-slate-400 hover:text-slate-600 tracking-[0.4em] transition-all">Abort Delegation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODDashboard;
