
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, Department, LeadStage, StudentLead, UserAction } from './types';
import { useData } from './context/DataContext';
import AuthHub from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import HODDashboard from './pages/HODDashboard';
import UserManagement from './pages/UserManagement';
import ApprovalCenter from './pages/ApprovalCenter';
import GlobalAnalytics from './pages/GlobalAnalytics';
import ChatSystem from './components/ChatSystem';
import Layout from './components/Layout';
import AIChatbot from './components/AIChatbot';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const { leads, users, logs, loading, batchAddLeads, addLead, addLog, assignLeadsToHOD, autoDistributeLeadsToHODs } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isManualLeadModalOpen, setIsManualLeadModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'overview' | 'leads' | 'logs'>('overview');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [manualLead, setManualLead] = useState({ name: '', phone: '' });
  const [formErrors, setFormErrors] = useState({ name: '', phone: '' });

  useEffect(() => {
    const saved = localStorage.getItem('ten_logged_in_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      const exists = users.find(u => u.id === parsed.id && u.isApproved);
      if (exists) setCurrentUser(exists);
    }
  }, [users]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ten_logged_in_user', JSON.stringify(user));
    addLog(user.id, user.name, UserAction.LOGIN, 'User logged in.');
  };

  const handleLogout = () => {
    if (currentUser) {
      addLog(currentUser.id, currentUser.name, UserAction.LOGOUT, 'User logged out.');
    }
    localStorage.removeItem('ten_logged_in_user');
    setCurrentUser(null);
  };

  const stats = useMemo(() => ({
    total: leads.length,
    assigned: leads.filter(l => !!l.assignedToHOD).length,
    interested: leads.filter(l => l.stage === LeadStage.TARGETED).length,
    callsDone: leads.filter(l => l.callVerified).length
  }), [leads]);

  const unassignedLeads = useMemo(() => leads.filter(l => !l.assignedToHOD), [leads]);
  const hodList = useMemo(() => users.filter(u => u.role === UserRole.HOD && u.isApproved), [users]);
  const recentLeads = useMemo(() => [...leads].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5), [leads]);

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setManualLead(prev => ({ ...prev, phone: val }));
    setFormErrors(prev => ({ ...prev, phone: val.length > 0 && val.length < 10 ? 'Enter 10 digits' : '' }));
  };

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setManualLead(prev => ({ ...prev, name: val }));
    setFormErrors(prev => ({ ...prev, name: val.length > 0 && val.length < 3 ? 'Name too short' : '' }));
  };

  const handleAddManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualLead.phone.length !== 10 || manualLead.name.length < 3) return;
    const newLead: StudentLead = {
      id: `lead-${Date.now()}`,
      name: manualLead.name,
      phone: `+91${manualLead.phone}`,
      sourceFile: 'MANUAL',
      department: Department.IT,
      stage: LeadStage.UNASSIGNED,
      callVerified: false
    };
    await addLead(newLead);
    addLog(currentUser?.id || 'manual', currentUser?.name || 'Admin', UserAction.MANUAL_ADD, `Manually added student: ${manualLead.name}`);
    setIsManualLeadModalOpen(false);
    setManualLead({ name: '', phone: '' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      const newLeads: StudentLead[] = data.map((row, idx) => ({
        id: `lead-import-${Date.now()}-${idx}`,
        name: row.Name || row.name || 'Unknown Student',
        phone: String(row.Phone || row.phone || row.Mobile || '').startsWith('+91') 
          ? String(row.Phone || row.phone || row.Mobile || '') 
          : `+91${String(row.Phone || row.phone || row.Mobile || '').replace(/\D/g, '').slice(-10)}`,
        sourceFile: file.name,
        department: Department.IT,
        stage: LeadStage.UNASSIGNED,
        callVerified: false
      })).filter(l => l.phone.length >= 10);

      if (newLeads.length > 0) {
        await batchAddLeads(newLeads, false);
        addLog(currentUser?.id || 'system', currentUser?.name || 'Admin', UserAction.IMPORT_LEADS, `Imported ${newLeads.length} leads from file: ${file.name}`);
        alert(`Successfully imported ${newLeads.length} leads!`);
      } else {
        alert("No valid student data found in file. Ensure columns are named 'Name' and 'Phone'.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAutoDistribution = async () => {
    if (unassignedLeads.length === 0) {
      alert("No unassigned leads found in pool.");
      return;
    }
    if (hodList.length === 0) {
      alert("No active HOD nodes found for distribution.");
      return;
    }
    if (window.confirm(`Auto-distribute ${unassignedLeads.length} leads equally among ${hodList.length} HODs?`)) {
      await autoDistributeLeadsToHODs(unassignedLeads.map(l => l.id));
      addLog(currentUser?.id || 'admin', currentUser?.name || 'Admin', UserAction.IMPORT_LEADS, `Auto-distributed ${unassignedLeads.length} leads equally across HODs.`);
      alert("Equal distribution completed successfully!");
    }
  };

  const downloadInstitutionalReport = (format: 'pdf' | 'excel') => {
    const dateStr = new Date().toLocaleDateString('en-GB');
    const fileName = `Institutional_Report_${new Date().toISOString().split('T')[0]}`;

    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text("TRACKNENROLL: INSTITUTIONAL REPORT", 20, 25);
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.text(`Generated On: ${dateStr}`, 160, 50);
      
      doc.setFontSize(12);
      doc.text("GLOBAL METRICS", 20, 60);
      doc.line(20, 62, 190, 62);
      
      doc.setFontSize(10);
      doc.text(`Total Student Leads: ${stats.total}`, 20, 72);
      doc.text(`Assigned to HODs: ${stats.assigned}`, 80, 72);
      doc.text(`Conversion (Interested): ${stats.interested}`, 140, 72);

      let y = 90;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 5, 180, 10, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text("NAME", 20, y); 
      doc.text("PHONE", 70, y); 
      doc.text("DEPARTMENT", 110, y); 
      doc.text("CURRENT STAGE", 160, y);
      
      doc.setFont('helvetica', 'normal');
      leads.slice(0, 100).forEach((l, i) => {
        y += 10;
        if (y > 270) { doc.addPage(); y = 30; }
        doc.text(l.name.substring(0, 25).toUpperCase(), 20, y);
        doc.text(l.phone, 70, y);
        doc.text(l.department.split(' ')[0], 110, y);
        doc.text(l.stage.toUpperCase(), 160, y);
        doc.line(15, y + 2, 195, y + 2);
      });
      doc.save(`${fileName}.pdf`);
    } else {
      const worksheetData = leads.map((l, i) => ({
        "Sr No": i + 1,
        "Student Name": l.name,
        "Phone": l.phone,
        "Department": l.department,
        "Stage": l.stage,
        "Verified": l.callVerified ? "YES" : "NO",
        "Timestamp": l.callTimestamp || "N/A"
      }));
      const ws = XLSX.utils.json_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Institutional_Data");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    }
  };

  if (!currentUser) return (
    <Router>
      <Routes>
        <Route path="*" element={<AuthHub onLogin={handleLogin} />} />
      </Routes>
    </Router>
  );

  return (
    <Router>
      <Layout user={currentUser} onLogout={handleLogout}>
        {loading && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        <Routes>
          <Route path="/dashboard" element={
            currentUser.role === UserRole.TEACHER ? (
              <TeacherDashboard currentUser={currentUser} />
            ) : currentUser.role === UserRole.HOD ? (
              <HODDashboard currentUser={currentUser} />
            ) : (
              <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">
                      {currentUser.role === UserRole.SUPER_ADMIN ? 'Principal Console' : 'Admin Panel'}
                    </p>
                    <h2 className="text-4xl font-black text-[#1e293b] tracking-tighter uppercase leading-none">Management Hub</h2>
                  </div>
                  {currentUser.role !== UserRole.SUPER_ADMIN && (
                    <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner overflow-x-auto max-w-full">
                      <button onClick={() => setAdminTab('overview')} className={`whitespace-nowrap px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'overview' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}>Overview</button>
                      <button onClick={() => setAdminTab('leads')} className={`whitespace-nowrap px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'leads' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}>Leads ({unassignedLeads.length})</button>
                      <button onClick={() => setAdminTab('logs')} className={`whitespace-nowrap px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'logs' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}>System Logs</button>
                    </div>
                  )}
                </header>
                
                {adminTab === 'overview' ? (
                  <div className="space-y-6 md:space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                       <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Total Leads</p>
                          <p className="text-4xl font-black text-[#1e293b] tracking-tighter">{stats.total}</p>
                       </div>
                       <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Allocated</p>
                          <p className="text-4xl font-black text-indigo-600 tracking-tighter">{stats.assigned}</p>
                       </div>
                       <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Interested</p>
                          <p className="text-4xl font-black text-emerald-600 tracking-tighter">{stats.interested}</p>
                       </div>
                       <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Verified</p>
                          <p className="text-4xl font-black text-amber-600 tracking-tighter">{stats.callsDone}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className={`lg:col-span-2 ${currentUser.role === UserRole.SUPER_ADMIN ? 'bg-indigo-600' : 'bg-[#0f172a]'} p-10 md:p-14 rounded-[4rem] text-white shadow-2xl relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-32 -mt-32 blur-[100px]"></div>
                        <p className="text-2xl font-black uppercase tracking-tight mb-6 relative z-10">
                          {currentUser.role === UserRole.SUPER_ADMIN ? 'Institutional Oversight' : 'Student Data Portal'}
                        </p>
                        <p className="text-xs font-bold opacity-70 mb-12 max-w-md leading-relaxed relative z-10">
                          {currentUser.role === UserRole.SUPER_ADMIN 
                            ? 'Review global conversion metrics and departmental efficiency across all active counseling nodes.' 
                            : 'Upload institutional dataset files or manually register new student identities into the counseling pipeline.'}
                        </p>
                        
                        <div className="flex flex-wrap gap-5 relative z-10">
                          {currentUser.role === UserRole.SUPER_ADMIN ? (
                            <>
                              <button onClick={() => downloadInstitutionalReport('pdf')} className="px-10 py-5 bg-white/10 border border-white/20 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-indigo-600 transition-all shadow-xl">Global PDF Report</button>
                              <button onClick={() => downloadInstitutionalReport('excel')} className="px-10 py-5 bg-white/10 border border-white/20 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-indigo-600 transition-all shadow-xl">Export Excel</button>
                            </>
                          ) : (
                            <>
                              <input 
                                type="file" 
                                accept=".xlsx, .xls, .csv" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                              />
                              <button onClick={() => fileInputRef.current?.click()} className="px-10 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-[0_20px_40px_rgba(79,70,229,0.4)]">Import Dataset</button>
                              <button onClick={() => setIsManualLeadModalOpen(true)} className="px-10 py-5 bg-white/10 border border-white/10 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all backdrop-blur-md">Register Student</button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm">
                        <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] mb-8">Node Activity</p>
                        <div className="space-y-5">
                          {recentLeads.map(l => (
                            <div key={l.id} className="flex items-center justify-between border-b border-slate-50 pb-4">
                              <div><p className="text-xs font-black uppercase text-slate-800 truncate max-w-[130px]">{l.name}</p></div>
                              <div className="text-right"><span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-xl">{l.stage}</span></div>
                            </div>
                          ))}
                          {leads.length === 0 && <p className="text-[10px] text-slate-300 font-bold uppercase py-14 text-center">Empty Records</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : adminTab === 'leads' ? (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                      <div className="relative flex-1 w-full">
                        <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" placeholder="Search unassigned pool..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-bold outline-none focus:border-indigo-600 transition-all shadow-sm" />
                      </div>
                      <div className="flex gap-4 w-full md:w-auto">
                        <button onClick={handleAutoDistribution} className="flex-1 md:flex-none px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                           Auto-Distribute
                        </button>
                        <button disabled={selectedLeadIds.length === 0} onClick={() => setIsAssignModalOpen(true)} className="flex-1 md:flex-none px-12 py-5 bg-[#0f172a] disabled:opacity-30 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">
                          Delegate ({selectedLeadIds.length})
                        </button>
                      </div>
                    </div>
                    <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#fcfdfe] text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-50">
                            <tr>
                              <th className="px-10 py-7 w-12 text-center">
                                <input type="checkbox" onChange={(e) => setSelectedLeadIds(e.target.checked ? unassignedLeads.map(l => l.id) : [])} className="w-5 h-5 rounded border-slate-300" />
                              </th>
                              <th className="px-10 py-7">Student Identity</th>
                              <th className="px-10 py-7">Contact Node</th>
                              <th className="px-10 py-7">Source Origin</th>
                              <th className="px-10 py-7 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {unassignedLeads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                              <tr key={lead.id} className={`hover:bg-slate-50/50 transition-all ${selectedLeadIds.includes(lead.id) ? 'bg-indigo-50/20' : ''}`}>
                                <td className="px-10 py-6 text-center">
                                  <input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => setSelectedLeadIds(prev => prev.includes(lead.id) ? prev.filter(i => i !== lead.id) : [...prev, lead.id])} className="w-5 h-5 rounded border-slate-300" />
                                </td>
                                <td className="px-10 py-6 font-black text-[#1e293b] text-sm uppercase tracking-tight">{lead.name}</td>
                                <td className="px-10 py-6 font-bold text-slate-500 text-[11px] tracking-[0.1em]">{lead.phone}</td>
                                <td className="px-10 py-6 font-black text-slate-300 text-[10px] uppercase tracking-widest">{lead.sourceFile}</td>
                                <td className="px-10 py-6 text-right"><span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100/50">Pool Pending</span></td>
                              </tr>
                            ))}
                            {unassignedLeads.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-24 text-center">
                                   <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                                      <svg className="w-6 h-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                                   </div>
                                   <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">Pool Empty: No Records Found</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-sm min-h-[500px]">
                      <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-[#fcfdfe]">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Institutional Logs</h3>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 px-5 py-2.5 rounded-2xl border border-indigo-100/50">Audit Trail Active</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                            <tr>
                              <th className="px-10 py-7">Timestamp</th>
                              <th className="px-10 py-7">Staff Member</th>
                              <th className="px-10 py-7">Operation</th>
                              <th className="px-10 py-7">Assessment Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {logs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                                <td className="px-10 py-6 whitespace-nowrap text-[10px] font-bold text-slate-500 uppercase">{log.timestamp}</td>
                                <td className="px-10 py-6 whitespace-nowrap font-black text-[#1e293b] text-sm uppercase tracking-tight">{log.userName}</td>
                                <td className="px-10 py-6 whitespace-nowrap">
                                  <span className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-xl border ${
                                    log.action === UserAction.IMPORT_LEADS ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                    log.action === UserAction.LOGIN ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_0_8px_rgba(16,185,129,0.2)]' :
                                    log.action === UserAction.LOGOUT ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                    'bg-slate-50 text-slate-400 border-slate-100'
                                  }`}>
                                    {log.action}
                                  </span>
                                </td>
                                <td className="px-10 py-6 text-[10px] font-bold text-slate-600 italic leading-relaxed">{log.details}</td>
                              </tr>
                            ))}
                            {logs.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-24 text-center text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">No activity logs provisioned</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          } />

          <Route path="/analytics" element={<GlobalAnalytics />} />
          <Route path="/users" element={<UserManagement currentUser={currentUser} />} />
          <Route path="/approvals" element={<ApprovalCenter currentUser={currentUser} />} />
          <Route path="/chat" element={<ChatSystem currentUser={currentUser} />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Modal: Manual Student Input - Upgraded Buttons */}
        {isManualLeadModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 border border-white/10">
              <div className="p-10 bg-[#0f172a] text-white text-center relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mt-10 blur-2xl"></div>
                <h3 className="text-3xl font-black uppercase tracking-tighter relative z-10">Register Student</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3 relative z-10">Node Provisioning</p>
              </div>
              <form onSubmit={handleAddManualLead} className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Name</label>
                  <input type="text" value={manualLead.name} onChange={handleNameInput} className={`w-full px-6 py-5 bg-slate-50 border ${formErrors.name ? 'border-rose-500' : 'border-slate-200'} rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-900 shadow-sm`} placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Contact Link</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">+91</span>
                    <input type="text" value={manualLead.phone} onChange={handlePhoneInput} className={`w-full pl-14 pr-6 py-5 bg-slate-50 border ${formErrors.phone ? 'border-rose-500' : 'border-slate-200'} rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-900 shadow-sm`} placeholder="9876543210" required />
                  </div>
                </div>
                <div className="pt-6">
                  <button type="submit" disabled={!manualLead.name || manualLead.phone.length !== 10} className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 transition-all active:scale-[0.98]">
                    Authorize Registration
                  </button>
                  <button type="button" onClick={() => setIsManualLeadModalOpen(false)} className="w-full py-5 text-[11px] font-black uppercase text-slate-300 mt-2 tracking-[0.2em] hover:text-slate-500 transition-all">Abort Action</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: HOD Allocation - Upgraded Buttons */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-xl rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
              <div className="p-10 bg-[#0f172a] text-white text-center relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <h3 className="text-3xl font-black uppercase tracking-tight relative z-10">Allocation Node</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3 relative z-10">Provisioning {selectedLeadIds.length} Identity Blocks</p>
              </div>
              <div className="p-10 space-y-4 max-h-[450px] overflow-y-auto custom-scroll">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Target HOD Unit</p>
                {hodList.map(hod => (
                  <button key={hod.id} onClick={async () => { await assignLeadsToHOD(selectedLeadIds, hod.id); setSelectedLeadIds([]); setIsAssignModalOpen(false); }} className="w-full p-7 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-[2rem] flex items-center justify-between group transition-all border border-slate-200 shadow-sm">
                    <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-tight leading-none mb-1 group-hover:text-white">{hod.name}</p>
                      <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.1em] group-hover:text-white/80">{hod.department}</p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-white/20">
                       <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </button>
                ))}
                {hodList.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-[12px] font-black text-rose-500 uppercase tracking-[0.4em]">No Authorized HOD Nodes Detected</p>
                  </div>
                )}
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
                <button onClick={() => setIsAssignModalOpen(false)} className="w-full py-5 text-[11px] font-black uppercase text-slate-400 hover:text-rose-500 tracking-[0.4em] transition-all">Abort Allocation</button>
              </div>
            </div>
          </div>
        )}
        <AIChatbot />
      </Layout>
    </Router>
  );
};

export default App;
