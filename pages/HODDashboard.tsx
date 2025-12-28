
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { User, StudentLead, UserRole, LeadStage, Department } from '../types';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const HODDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, users, assignLeadsToTeacher } = useData();
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
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button onClick={() => setTab('leads')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'leads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Node Management</button>
          <button onClick={() => setTab('teachers')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'teachers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Staff Performance</button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Allocated', value: stats.totalReceived },
          { label: 'Pending Staffing', value: stats.pendingTeacherAssignment },
          { label: 'Faculty Active', value: stats.facultyActive },
          { label: 'Dept. Progress', value: stats.completedByDept }
        ].map((item, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">{item.label}</p>
            <p className="text-4xl font-black text-[#1e293b] tracking-tighter">{item.value}</p>
          </div>
        ))}
      </div>

      {tab === 'leads' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="relative flex-1">
               <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               <input type="text" placeholder="Search departmental pool..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:border-indigo-600" />
            </div>
            <div className="flex gap-2">
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button onClick={() => downloadDeptReport('pdf')} className="px-4 py-2.5 hover:bg-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">PDF</button>
                <button onClick={() => downloadDeptReport('excel')} className="px-4 py-2.5 hover:bg-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">XLSX</button>
              </div>
              <button disabled={selectedLeadIds.length === 0} onClick={() => setIsAssignModalOpen(true)} className="px-10 py-3.5 bg-indigo-600 disabled:opacity-20 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">Delegate ({selectedLeadIds.length})</button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <tr>
                    <th className="px-10 py-6 w-12 text-center">
                      <input type="checkbox" onChange={(e) => setSelectedLeadIds(e.target.checked ? unassignedToTeacher.map(l => l.id) : [])} className="w-4 h-4 rounded border-slate-200" />
                    </th>
                    <th className="px-10 py-6">Student Name</th>
                    <th className="px-10 py-6">Contact Node</th>
                    <th className="px-10 py-6">Faculty Allocation</th>
                    <th className="px-10 py-6 text-right">Current State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {myDeptLeads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                    <tr key={lead.id} className={`hover:bg-slate-50/50 transition-all ${selectedLeadIds.includes(lead.id) ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-10 py-5 text-center">
                        {!lead.assignedToTeacher && <input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => toggleLeadSelection(lead.id)} className="w-4 h-4 rounded border-slate-200" />}
                      </td>
                      <td className="px-10 py-5 font-black text-xs uppercase text-[#1e293b]">{lead.name}</td>
                      <td className="px-10 py-5 font-bold text-slate-400 text-[10px] tracking-widest">{lead.phone}</td>
                      <td className="px-10 py-5">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${lead.assignedToTeacher ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          <span className="font-black text-[9px] uppercase text-slate-600">
                            {myTeachers.find(t => t.id === lead.assignedToTeacher)?.name || 'UNALLOCATED'}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-5 text-right">
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${
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
                    <tr><td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No departmental data allocated yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teacherStats.map(teacher => (
            <div key={teacher.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
              <div className="flex justify-between items-start mb-8">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600 border border-indigo-100 uppercase">{teacher.name.charAt(0)}</div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#1e293b] leading-none">{teacher.progress}%</p>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1">Resolution</p>
                </div>
              </div>
              <h4 className="text-xl font-black text-[#1e293b] uppercase tracking-tight">{teacher.name}</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Faculty Member</p>
              
              <div className="mt-8 space-y-4">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Nodes Resolved</span>
                  <span className="text-[#1e293b] font-bold">{teacher.completedCount} / {teacher.totalAssigned}</span>
                </div>
                <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                  <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${teacher.progress}%` }} />
                </div>
                <div className="flex gap-4 pt-2">
                   <div className="flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Awaiting</p>
                      <p className="text-xs font-black text-amber-500">{teacher.pendingCount}</p>
                   </div>
                   <div className="flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Completed</p>
                      <p className="text-xs font-black text-emerald-500">{teacher.completedCount}</p>
                   </div>
                </div>
              </div>
            </div>
          ))}
          {myTeachers.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No faculty registered in this department</p>
            </div>
          )}
        </div>
      )}

      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-indigo-600 text-white text-center">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Delegate Staff</h3>
              <p className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.2em] mt-2">Provisioning {selectedLeadIds.length} Nodes</p>
            </div>
            <div className="p-8 space-y-3 max-h-[400px] overflow-y-auto custom-scroll">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Select Target Faculty</p>
              {myTeachers.map(teacher => (
                <button key={teacher.id} onClick={() => handleAllocation(teacher.id)} className="w-full p-5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl flex items-center justify-between group transition-all border border-slate-100">
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-tight">{teacher.name}</p>
                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Active Councilor</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                  </div>
                </button>
              ))}
              {myTeachers.length === 0 && (
                <p className="py-10 text-center text-rose-500 font-black text-[10px] uppercase">No eligible faculty found</p>
              )}
              <button onClick={() => setIsAssignModalOpen(false)} className="w-full py-4 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 mt-2">Abort Operation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODDashboard;
