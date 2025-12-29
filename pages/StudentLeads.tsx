
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, Department, UserAction, UserRole, LeadStage } from '../types';
import * as XLSX from 'xlsx';

const StudentLeads: React.FC = () => {
  const { leads, users, addLog, assignLeadsToHOD } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResponse, setFilterResponse] = useState<string>('All');
  const [filterDept, setFilterDept] = useState<string>('All');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  
  // Modals state
  const [isAssignMethodModalOpen, setIsAssignMethodModalOpen] = useState(false);
  const [isManualHODPickerOpen, setIsManualHODPickerOpen] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('ten_logged_in_user') || '{}');

  const teacherMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => map[u.id] = u.name);
    return map;
  }, [users]);

  const hodList = useMemo(() => users.filter(u => u.role === UserRole.HOD && u.isApproved), [users]);

  const processedLeads = useMemo(() => {
    return leads.filter(l => l.stage !== LeadStage.UNASSIGNED && l.stage !== LeadStage.ASSIGNED);
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return processedLeads.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           l.phone.includes(searchTerm);
      const matchesResponse = filterResponse === 'All' || l.response === filterResponse;
      const matchesDept = filterDept === 'All' || l.department === filterDept;
      return matchesSearch && matchesResponse && matchesDept;
    });
  }, [processedLeads, searchTerm, filterResponse, filterDept]);

  const handleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  // SMART AUTO ROUTING
  const handleSmartReassign = async () => {
    if (selectedLeadIds.length === 0) return;
    const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));
    const deptGroups: Record<string, string[]> = {};
    selectedLeads.forEach(l => {
      if (!deptGroups[l.department]) deptGroups[l.department] = [];
      deptGroups[l.department].push(l.id);
    });
    let assignedCount = 0;
    let errors = [];
    for (const dept in deptGroups) {
      const targetHOD = hodList.find(h => h.department === dept);
      if (targetHOD) {
        await assignLeadsToHOD(deptGroups[dept], targetHOD.id);
        assignedCount += deptGroups[dept].length;
      } else {
        errors.push(dept);
      }
    }
    if (errors.length > 0) {
      alert(`Assigned ${assignedCount} leads. Warning: No HOD found for ${errors.join(', ')} branches.`);
    } else {
      alert(`Smart Routing Complete: All ${assignedCount} students sent to their respective branch HODs.`);
    }
    setSelectedLeadIds([]);
    setIsAssignMethodModalOpen(false);
    if (currentUser.id) {
      addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Smart routed ${assignedCount} leads.`);
    }
  };

  const handleManualReassign = async (hodId: string) => {
    const hod = hodList.find(h => h.id === hodId);
    if (!hod) return;
    await assignLeadsToHOD(selectedLeadIds, hodId);
    alert(`Successfully assigned ${selectedLeadIds.length} students to ${hod.name}.`);
    setSelectedLeadIds([]);
    setIsManualHODPickerOpen(false);
    setIsAssignMethodModalOpen(false);
    if (currentUser.id) {
      addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Manually assigned ${selectedLeadIds.length} leads.`);
    }
  };

  const handleForwardToSubBranch = () => {
    if (filteredLeads.length === 0) return;

    // 1. CONSTRUCT EMAIL TEMPLATE
    const subject = "Urgent: Forwarded Leads - 11th/12th Grade Students";
    let emailBody = "Hi Team,\n\nPlease find the student leads for 11th/12th grade counseling. These students require specialized follow-up from the sub-branch office.\n\nLIST OF STUDENTS:\n----------------------------------\n";
    
    filteredLeads.forEach((l, index) => {
      emailBody += `${index + 1}. NAME: ${l.name.toUpperCase()}\n   PHONE: ${l.phone}\n   INTEREST: ${l.department}\n   COUNSELOR: ${teacherMap[l.assignedToTeacher || ''] || 'System'}\n----------------------------------\n`;
    });

    emailBody += "\nPlease process these leads on priority.\n\nRegards,\nTrackNEnroll Admissions Team";

    // 2. TRIGGER GMAIL SPECIFIC URL (Desktop & Mobile)
    // Gmail web compose URL works perfectly on desktop and redirects to Gmail app on many mobile browsers
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=subbranch@college.edu&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Open in new tab for desktop, same window for mobile feeling
    window.open(gmailUrl, '_blank');

    // 3. EXCEL EXPORT (Background Backup)
    const excelData = filteredLeads.map((l, index) => ({
      'SR NO.': index + 1,
      'STUDENT NAME': l.name.toUpperCase(),
      'CONTACT': l.phone,
      'INTERESTED BRANCH': l.department,
      'COUNSELOR': teacherMap[l.assignedToTeacher || ''] || 'SYSTEM ENTRY',
      'RESPONSE': l.response
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Forwarded_Students");
    XLSX.writeFile(wb, `SubBranch_Leads_${new Date().toISOString().slice(0,10)}.xlsx`);

    if (currentUser.id) {
      addLog(currentUser.id, currentUser.name, UserAction.IMPORT_LEADS, `Forwarded ${filteredLeads.length} leads to Sub-Branch via Gmail.`);
    }
  };

  const teacherResponseOptions = [
    StudentResponse.INTERESTED,
    StudentResponse.NOT_INTERESTED,
    StudentResponse.CONFUSED,
    StudentResponse.GRADE_11_12
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Admissions Pool</p>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Student Leads</h2>
        </div>
      </header>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full">
          <div className="relative">
             <input 
               type="text" 
               placeholder="Search by name or number..." 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner" 
             />
             <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Response Filter</label>
            <select 
              value={filterResponse} 
              onChange={e => { setFilterResponse(e.target.value); setSelectedLeadIds([]); }} 
              className="px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-600 appearance-none shadow-sm cursor-pointer"
            >
              <option value="All">ALL RESPONSES</option>
              {teacherResponseOptions.map(r => (
                <option key={r} value={r}>{r.toUpperCase()}</option>
              ))}
            </select>
          </div>
          
          {filterResponse === StudentResponse.GRADE_11_12 && (
            <button 
              onClick={handleForwardToSubBranch}
              className="md:mt-5 whitespace-nowrap px-8 py-4 bg-[#4c47f5] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 flex items-center gap-2"
            >
              Forward to Sub-Branch
            </button>
          )}

          {filterResponse === StudentResponse.INTERESTED && selectedLeadIds.length > 0 && (
            <button 
              onClick={() => setIsAssignMethodModalOpen(true)}
              className="md:mt-5 whitespace-nowrap px-8 py-4 bg-[#0f172a] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 flex items-center gap-2 animate-in slide-in-from-right-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
              Re-assign Options ({selectedLeadIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
              <tr>
                <th className="p-8 w-10 text-center">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                    className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="p-8">Student Identity</th>
                <th className="p-8">Interested Branch</th>
                <th className="p-8">Counselor Name</th>
                <th className="p-8">Call Outcome</th>
                <th className="p-8 text-right">Analytics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className={`hover:bg-slate-50/80 transition-all group ${selectedLeadIds.includes(lead.id) ? 'bg-indigo-50/50' : ''}`}>
                  <td className="p-8 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={() => handleSelectLead(lead.id)}
                      className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                    />
                  </td>
                  <td className="p-8">
                    <p className="text-[12px] font-black uppercase text-slate-800 leading-tight mb-1">{lead.name}</p>
                    <p className="text-[10px] font-bold text-indigo-600/60 tabular-nums">{lead.phone}</p>
                  </td>
                  <td className="p-8">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{lead.department}</span>
                  </td>
                  <td className="p-8">
                    <p className="text-[11px] font-bold text-slate-700 uppercase">{teacherMap[lead.assignedToTeacher || ''] || 'ADMINISTRATOR'}</p>
                  </td>
                  <td className="p-8">
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${
                      lead.response === StudentResponse.INTERESTED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      lead.response === StudentResponse.GRADE_11_12 ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {lead.response || 'No Response'}
                    </span>
                  </td>
                  <td className="p-8 text-right">
                    <p className="text-[10px] font-black text-slate-800 uppercase tabular-nums">{lead.callTimestamp?.split(',')[0] || '-'}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{lead.callDuration ? `${lead.callDuration}s Talking Time` : 'Log Empty'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAssignMethodModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-900 text-white text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Lead Delegation</p>
              <h3 className="text-xl font-black uppercase">How to Assign {selectedLeadIds.length} Leads?</h3>
            </div>
            <div className="p-10 space-y-4">
              <button onClick={handleSmartReassign} className="w-full p-6 bg-indigo-600 text-white rounded-3xl flex flex-col items-center gap-2 hover:bg-indigo-700 transition-all border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0">
                <span className="text-sm font-black uppercase tracking-widest">Smart Auto Route</span>
                <span className="text-[10px] opacity-70 font-bold uppercase tracking-tighter">Sends students to HOD of their INTERESTED BRANCH</span>
              </button>
              <div className="flex items-center gap-4 py-2"><div className="flex-1 h-px bg-slate-100"></div><span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Or Manual</span><div className="flex-1 h-px bg-slate-100"></div></div>
              <button onClick={() => setIsManualHODPickerOpen(true)} className="w-full p-6 bg-white border-2 border-slate-100 text-slate-800 rounded-3xl flex flex-col items-center gap-2 hover:border-indigo-600 hover:text-indigo-600 transition-all active:scale-[0.98]">
                <span className="text-sm font-black uppercase tracking-widest">Select HOD Manually</span>
                <span className="text-[10px] opacity-40 font-bold uppercase tracking-tighter">Force assign all leads to ONE specific person</span>
              </button>
              <button onClick={() => setIsAssignMethodModalOpen(false)} className="w-full pt-6 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500">Go Back</button>
            </div>
          </div>
        </div>
      )}

      {isManualHODPickerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-tight">Pick Target HOD</h3>
              <button onClick={() => setIsManualHODPickerOpen(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">×</button>
            </div>
            <div className="p-6 space-y-2 max-h-96 overflow-y-auto custom-scroll">
              {hodList.map(hod => (
                <button key={hod.id} onClick={() => handleManualReassign(hod.id)} className="w-full p-5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl text-left transition-all border border-slate-100 flex justify-between items-center group">
                  <div>
                    <p className="text-[11px] font-black uppercase leading-none mb-1">{hod.name}</p>
                    <p className="text-[9px] opacity-60 uppercase font-bold tracking-tight">{hod.department}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLeads;
