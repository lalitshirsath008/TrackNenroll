
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, Department, UserAction } from '../types';
import * as XLSX from 'xlsx';

const StudentLeads: React.FC = () => {
  const { leads, users, addLog } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResponse, setFilterResponse] = useState<string>('All');
  const [filterDept, setFilterDept] = useState<string>('All');

  const currentUser = JSON.parse(localStorage.getItem('ten_logged_in_user') || '{}');

  // Map users to names for easy lookup
  const teacherMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => map[u.id] = u.name);
    return map;
  }, [users]);

  // Only show leads that have some action taken
  const processedLeads = useMemo(() => {
    return leads.filter(l => l.stage !== 'Unassigned' && l.stage !== 'Assigned');
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

  const handleForwardToSubBranch = () => {
    if (filteredLeads.length === 0) {
      alert("No students found in the current filtered list.");
      return;
    }

    // 1. Prepare Excel Data
    const excelData = filteredLeads.map((l, index) => ({
      'SR NO.': index + 1,
      'STUDENT NAME': l.name.toUpperCase(),
      'CONTACT': l.phone,
      'INTERESTED BRANCH': l.department,
      'COUNSELOR': teacherMap[l.assignedToTeacher || ''] || 'SYSTEM ENTRY',
      'TIMESTAMP': l.callTimestamp || 'N/A',
      'DURATION (SEC)': l.callDuration || 0,
      'RESPONSE': l.response
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Forwarded_Students");

    // Format column widths
    ws['!cols'] = [
      { wch: 8 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, 
      { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 18 }
    ];

    // 2. Download Excel
    const fileName = `SubBranch_Forwarded_Leads_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    // 3. Prepare and trigger Gmail Compose in Browser
    const subject = encodeURIComponent(`Action Required: Forwarded 11th/12th Student Leads for Branch Processing`);
    const body = encodeURIComponent(
      `Hello Sub-Branch Team,\n\nWe are forwarding a list of ${filteredLeads.length} student leads categorized as "${filterResponse}". These students have been contacted by our counselors and require immediate attention for the next phase of admissions.\n\nSummary:\n- Total Leads: ${filteredLeads.length}\n- Category: ${filterResponse}\n- Exported on: ${new Date().toLocaleString()}\n\nNote: PLEASE ATTACH THE DOWNLOADED EXCEL FILE "${fileName}" MANUALLY TO THIS GMAIL DRAFT.\n\nRegards,\nInstitutional Admin`
    );

    // Opening Gmail Compose window in a new tab
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
    
    setTimeout(() => {
      window.open(gmailUrl, '_blank');
    }, 1000);

    if (currentUser.id) {
      addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Forwarded ${filteredLeads.length} leads to sub-branch via Gmail Desktop.`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Admissions Pool</p>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Student Leads</h2>
        </div>
      </header>

      {/* Filters Card */}
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
              onChange={e => setFilterResponse(e.target.value)} 
              className="px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-600 appearance-none shadow-sm"
            >
              <option value="All">All Responses</option>
              {Object.values(StudentResponse).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch Filter</label>
            <select 
              value={filterDept} 
              onChange={e => setFilterDept(e.target.value)} 
              className="px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-600 appearance-none shadow-sm"
            >
              <option value="All">All Branches</option>
              {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          
          {filterResponse === StudentResponse.GRADE_11_12 && (
            <button 
              onClick={handleForwardToSubBranch}
              className="md:mt-5 whitespace-nowrap px-8 py-4 bg-[#4c47f5] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 flex items-center gap-2 animate-in slide-in-from-right-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              Forward to Sub-Branch
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
              <tr>
                <th className="p-8">Student Identity</th>
                <th className="p-8">Assigned Branch</th>
                <th className="p-8">Counselor Name</th>
                <th className="p-8">Call Outcome</th>
                <th className="p-8 text-right">Analytics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50/80 transition-all group">
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
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic">The leads pool is empty for this selection</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentLeads;
