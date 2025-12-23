import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, Department, LeadStage, StudentLead } from './types';
import { useData } from './context/DataContext';
import AuthHub from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import UserManagement from './pages/UserManagement';
import ApprovalCenter from './pages/ApprovalCenter';
import ChatSystem from './components/ChatSystem';
import Layout from './components/Layout';
import AIChatbot from './components/AIChatbot';
import { generateSummaryReport } from './services/geminiService';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const { leads, users, loading, assignLeadsToHOD, assignLeadsToTeacher, batchAddLeads, addLead } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualLeadModalOpen, setIsManualLeadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual Lead Form State
  const [manualLead, setManualLead] = useState({
    name: '',
    phone: '',
    department: Department.IT
  });

  // Lead Assignment State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>('');

  useEffect(() => {
    const savedUser = localStorage.getItem('tracknenroll_current_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      const freshUser = users.find(u => u.id === parsed.id);
      if (freshUser && freshUser.isApproved) setCurrentUser(freshUser);
      else handleLogout();
    }
  }, [users]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('tracknenroll_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tracknenroll_current_user');
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (currentUser?.role === UserRole.HOD) {
      result = result.filter(l => l.department === currentUser.department);
    } else if (currentUser?.role === UserRole.TEACHER) {
      result = result.filter(l => l.assignedToTeacher === currentUser.id);
    }
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(l => l.name.toLowerCase().includes(lowerSearch) || l.phone.includes(searchTerm));
    }
    return result;
  }, [leads, currentUser, searchTerm]);

  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleAssignLeads = async () => {
    if (!targetUserId || selectedLeadIds.length === 0) return;

    try {
      if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN) {
        await assignLeadsToHOD(selectedLeadIds, targetUserId);
      } else if (currentUser?.role === UserRole.HOD) {
        await assignLeadsToTeacher(selectedLeadIds, targetUserId);
      }
      setSelectedLeadIds([]);
      setTargetUserId('');
      alert("Institutional leads successfully reassigned.");
    } catch (err) {
      alert("Security protocol: Reassignment failed.");
    }
  };

  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLead.name || !manualLead.phone) return;

    const newLead: StudentLead = {
      id: `manual-${Date.now()}`,
      name: manualLead.name,
      phone: manualLead.phone.startsWith('+') ? manualLead.phone : `+91${manualLead.phone.replace(/\D/g, '')}`,
      sourceFile: 'MANUAL_ENTRY',
      department: manualLead.department,
      stage: LeadStage.UNASSIGNED,
      callVerified: false
    };

    addLead(newLead);
    setManualLead({ name: '', phone: '', department: Department.IT });
    setIsManualLeadModalOpen(false);
    alert("New candidate lead registered in registry.");
  };

  const availableAssignees = useMemo(() => {
    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN) {
      return users.filter(u => u.role === UserRole.HOD && u.isApproved);
    } else if (currentUser?.role === UserRole.HOD) {
      return users.filter(u => u.role === UserRole.TEACHER && u.department === currentUser.department && u.isApproved);
    }
    return [];
  }, [users, currentUser]);

  const generateAIReport = async () => {
    const report = await generateSummaryReport(leads);
    setAiAnalysis(report);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, replace: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const newLeads: StudentLead[] = jsonData.map((row: any, index) => {
          const name = row.Name || row.name || row['Full Name'] || 'Unknown';
          const phone = String(row.Phone || row.phone || row['Mobile'] || '').replace(/\D/g, '');
          const deptRaw = row.Department || row.department || row['Branch'] || 'IT';
          
          const department = Object.values(Department).find(d => 
            d.toLowerCase().includes(String(deptRaw).toLowerCase())
          ) || Department.IT;

          return {
            id: `imported-${Date.now()}-${index}`,
            name,
            phone: phone.startsWith('91') ? `+${phone}` : `+91${phone}`,
            sourceFile: file.name,
            department: department as Department,
            stage: LeadStage.UNASSIGNED,
            callVerified: false
          };
        }).filter(l => l.phone.length > 5);

        if (newLeads.length === 0) throw new Error("File format invalid or no leads found.");

        batchAddLeads(newLeads, replace);
        setIsImportModalOpen(false);
        alert(`${newLeads.length} leads successfully synchronized with registry.`);
      } catch (err) {
        alert(`Ingestion Error: ${err instanceof Error ? err.message : 'Unknown failure'}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const executeExport = (format: 'pdf' | 'csv' | 'excel') => {
    const dataToExport = filteredLeads;
    if (dataToExport.length === 0) { alert("Data scope empty. Export aborted."); return; }
    const fileName = `Institutional_Audit_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      const headers = "Name,Phone,Department,Stage,Verified,Call Duration(s)\n";
      const rows = dataToExport.map(l => `"${l.name}","${l.phone}","${l.department}","${l.stage}",${l.callVerified},${l.callDuration || 0}`).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${fileName}.csv`; a.click();
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      const margin = 15;
      const primaryColor = [79, 70, 229]; 
      const secondaryColor = [30, 41, 59]; 
      const accentColor = [16, 185, 129]; 
      
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(0, 0, 210, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("INSTITUTIONAL AUDIT", margin, 25);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("TRACKNENROLL INTELLIGENCE REPORT v4.0", margin, 32);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 38);
      doc.text(`Authorized by: ${currentUser?.name || 'System'}`, margin, 43);

      let y = 65;
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("EXECUTIVE METRICS", margin, y);
      
      y += 8;
      const stats = [
        { label: 'TOTAL LEADS', val: dataToExport.length },
        { label: 'TARGETED', val: dataToExport.filter(l => l.stage === LeadStage.TARGETED).length },
        { label: 'VERIFIED', val: dataToExport.filter(l => l.callVerified).length },
        { label: 'DISCARDED', val: dataToExport.filter(l => l.stage === LeadStage.DISCARDED).length }
      ];

      const cardW = 42;
      stats.forEach((s, i) => {
        const x = margin + (i * (cardW + 4));
        doc.setFillColor(248, 250, 252);
        doc.rect(x, y, cardW, 25, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(x, y, cardW, 25, 'S');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(14);
        doc.text(`${s.val}`, x + (cardW/2), y + 12, { align: 'center' });
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.text(s.label, x + (cardW/2), y + 18, { align: 'center' });
      });

      y += 40;
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("OPERATIONAL DATA GRID", margin, y);
      
      y += 8;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, y, 180, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text("CANDIDATE NAME", margin + 4, y + 6.5);
      doc.text("CONTACT", margin + 60, y + 6.5);
      doc.text("DEPARTMENT", margin + 100, y + 6.5);
      doc.text("PIPELINE STATUS", margin + 150, y + 6.5);

      y += 10;
      dataToExport.forEach((l, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(margin, y, 180, 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.text("CANDIDATE NAME", margin + 4, y + 6.5);
          doc.text("CONTACT", margin + 60, y + 6.5);
          doc.text("DEPARTMENT", margin + 100, y + 6.5);
          doc.text("PIPELINE STATUS", margin + 150, y + 6.5);
          y += 10;
        }

        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        if (i % 2 === 0) {
          doc.setFillColor(252, 252, 252);
          doc.rect(margin, y, 180, 10, 'F');
        }

        doc.setFont("helvetica", "bold");
        doc.text(l.name.toUpperCase(), margin + 4, y + 6.5);
        doc.setFont("helvetica", "normal");
        doc.text(l.phone, margin + 60, y + 6.5);
        doc.text(l.department.length > 25 ? l.department.slice(0, 22) + '...' : l.department, margin + 100, y + 6.5);
        
        if (l.stage === LeadStage.TARGETED) doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        else if (l.stage === LeadStage.DISCARDED) doc.setTextColor(244, 63, 94);
        else doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        
        doc.setFont("helvetica", "bold");
        doc.text(l.stage.toUpperCase(), margin + 150, y + 6.5);
        y += 10;
      });

      const totalPages = doc.internal.pages.length - 1;
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "italic");
      doc.text(`CONFIDENTIAL AUDIT LOG • TrackNEnroll v4 • Page 1 of ${totalPages}`, 105, 285, { align: "center" });
      doc.save(`${fileName}.pdf`);
    } else {
      const sheetData = dataToExport.map(l => ({
        "Candidate Name": l.name,
        "Mobile Number": l.phone,
        "Target Department": l.department,
        "Current Status": l.stage,
        "Verification Status": l.callVerified ? "VERIFIED" : "PENDING",
        "Call Duration (sec)": l.callDuration || 0,
        "Counselor Feedback": l.response || "No Action",
        "Timestamp": l.callTimestamp || "N/A"
      }));

      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      const wscols = [
        {wch: 25}, {wch: 15}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}, {wch: 20}
      ];
      ws['!cols'] = wscols;
      XLSX.utils.book_append_sheet(wb, ws, "Institutional Audit");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    }
    setIsExportModalOpen(false);
  };

  if (!currentUser) return (
    <Router>
      <Routes>
        <Route path="*" element={<AuthHub onLogin={handleLogin} />} />
      </Routes>
    </Router>
  );

  const canAssign = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HOD;

  return (
    <Router>
      <Layout user={currentUser} onLogout={handleLogout}>
        {loading && <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}

        <Routes>
          <Route path="/dashboard" element={
            currentUser.role === UserRole.TEACHER ? (
              <TeacherDashboard currentUser={currentUser} />
            ) : currentUser.role === UserRole.SUPER_ADMIN ? (
              <div className="space-y-8 animate-in fade-in duration-700">
                <header>
                  <h1 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Executive Summary</h1>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight uppercase leading-none">Institutional Overview</h2>
                </header>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   {[
                     { label: 'Global Registry', value: leads.length, icon: '📊', color: 'indigo' },
                     { label: 'Active Pipeline', value: leads.filter(l => l.stage === LeadStage.ASSIGNED).length, icon: '⚡', color: 'amber' },
                     { label: 'Targeted Pool', value: leads.filter(l => l.stage === LeadStage.TARGETED).length, icon: '🎯', color: 'emerald' },
                     { label: 'Interactions', value: leads.filter(l => l.callVerified).length, icon: '📞', color: 'teal' }
                   ].map((item, i) => (
                     <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${item.color}-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110`}></div>
                        <div className="relative z-10">
                          <span className="text-2xl mb-4 block">{item.icon}</span>
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{item.label}</p>
                          <p className={`text-4xl font-black text-${item.color}-600 tracking-tighter`}>{item.value}</p>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="bg-indigo-600 p-10 md:p-14 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                   <div className="relative z-10 max-w-2xl">
                     <h3 className="text-sm font-black uppercase tracking-[0.3em] opacity-60 mb-4">Strategic Vision</h3>
                     <p className="text-2xl md:text-4xl font-medium leading-tight italic">"Empowering institutional growth through high-precision data categorization and counselor accountability."</p>
                     <div className="flex flex-wrap gap-4 mt-10">
                        <button onClick={() => setIsExportModalOpen(true)} className="px-10 py-4 bg-white text-indigo-600 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Download Audit</button>
                        <button onClick={() => setIsImportModalOpen(true)} className="px-10 py-4 bg-indigo-500 text-white border border-indigo-400 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Sync Real Data</button>
                     </div>
                   </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 relative pb-24">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Lead Management</h1>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight uppercase">Operational Grid</h2>
                  </div>
                  <div className="flex w-full md:w-auto gap-2">
                    <input 
                      type="text" 
                      placeholder="Search leads..." 
                      className="flex-1 md:w-48 lg:w-64 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all" 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                    />
                    {currentUser.role === UserRole.ADMIN && (
                      <button 
                        onClick={() => setIsImportModalOpen(true)} 
                        className="p-3 bg-white border border-slate-200 text-indigo-600 rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                        title="Import Batch"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                      </button>
                    )}
                    {canAssign && (
                       <button 
                        onClick={() => setIsManualLeadModalOpen(true)} 
                        className="px-5 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                        Add Lead
                      </button>
                    )}
                    <button 
                      onClick={() => setIsExportModalOpen(true)} 
                      className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    </button>
                  </div>
                </header>

                <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[850px]">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                        <tr>
                          {canAssign && (
                            <th className="px-6 py-5 w-12 text-center">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                                checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                                onChange={toggleSelectAll}
                              />
                            </th>
                          )}
                          <th className="px-6 py-5">Candidate Name</th>
                          <th className="px-6 py-5">Phone</th>
                          <th className="px-6 py-5">Department / Branch</th>
                          <th className="px-6 py-5">Pipeline Status</th>
                          <th className="px-6 py-5 text-right">Assignee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredLeads.map(l => {
                          const assignee = users.find(u => u.id === (l.assignedToTeacher || l.assignedToHOD));
                          return (
                            <tr key={l.id} className={`hover:bg-indigo-50/20 transition-all ${selectedLeadIds.includes(l.id) ? 'bg-indigo-50/40' : ''}`}>
                              {canAssign && (
                                <td className="px-6 py-5 w-12 text-center">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                                    checked={selectedLeadIds.includes(l.id)}
                                    onChange={() => toggleLeadSelection(l.id)}
                                  />
                                </td>
                              )}
                              <td className="px-6 py-5">
                                <p className="font-black text-slate-900 text-sm uppercase">{l.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">File: {l.sourceFile}</p>
                              </td>
                              <td className="px-6 py-5 text-[11px] font-bold text-slate-500">{l.phone}</td>
                              <td className="px-6 py-5 text-[9px] font-black uppercase text-slate-400">{l.department}</td>
                              <td className="px-6 py-5">
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${
                                  l.stage === LeadStage.TARGETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                  l.stage === LeadStage.ASSIGNED ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                  'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                  {l.stage}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-right">
                                {assignee ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[150px]">{assignee.name}</span>
                                    <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">{assignee.role}</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-black text-rose-300 uppercase italic">Unassigned</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {canAssign && selectedLeadIds.length > 0 && (
                  <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-[500] animate-in slide-in-from-bottom-5">
                    <div className="bg-slate-900 text-white rounded-[2rem] p-4 md:p-6 shadow-2xl flex flex-col md:flex-row items-center gap-4 border border-white/10">
                       <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                            {selectedLeadIds.length}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 leading-none mb-1">Batch Active</p>
                            <h4 className="text-sm font-bold uppercase tracking-tight">Lead Delegation Pad</h4>
                          </div>
                       </div>
                       <div className="flex w-full md:w-auto items-center gap-3">
                         <select 
                           value={targetUserId}
                           onChange={(e) => setTargetUserId(e.target.value)}
                           className="flex-1 md:w-64 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                         >
                           <option value="" className="text-slate-900">Choose Personnel...</option>
                           {availableAssignees.map(u => (
                             <option key={u.id} value={u.id} className="text-slate-900">{u.name.toUpperCase()} ({u.role === UserRole.HOD ? 'HOD' : 'FACULTY'})</option>
                           ))}
                         </select>
                         <button 
                           onClick={handleAssignLeads}
                           disabled={!targetUserId}
                           className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
                         >
                           Delegate
                         </button>
                         <button onClick={() => setSelectedLeadIds([])} className="p-3 text-white/30 hover:text-white transition-colors">✕</button>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )
          } />

          {(currentUser.role === UserRole.SUPER_ADMIN) && (
            <Route path="/analytics" element={
              <div className="space-y-6 md:space-y-10">
                 <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                      <h1 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2">Metrics Engine</h1>
                      <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none uppercase">Institutional Health</h2>
                    </div>
                    <div className="flex w-full md:w-auto gap-2">
                      <button onClick={generateAIReport} className="flex-1 md:flex-none px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl">AI Sync</button>
                      <button onClick={() => setIsExportModalOpen(true)} className="flex-1 md:flex-none px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg">Export Reports</button>
                    </div>
                 </header>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Pool', value: leads.length, color: 'text-indigo-600' },
                      { label: 'Pipeline', value: leads.filter(l => l.stage === LeadStage.ASSIGNED).length, color: 'text-amber-500' },
                      { label: 'Targets', value: leads.filter(l => l.stage === LeadStage.TARGETED).length, color: 'text-emerald-500' },
                      { label: 'Discards', value: leads.filter(l => l.stage === LeadStage.DISCARDED).length, color: 'text-rose-500' }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                        <p className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
                      </div>
                    ))}
                 </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm overflow-hidden">
                      <h3 className="text-xl font-black text-slate-900 uppercase mb-6">Branch Distribution</h3>
                      <div className="space-y-6">
                         {Object.values(Department).map(dept => {
                           const count = leads.filter(l => l.department === dept).length;
                           const percentage = leads.length > 0 ? (count / leads.length) * 100 : 0;
                           return (
                             <div key={dept} className="space-y-2">
                                <div className="flex justify-between text-[9px] font-black uppercase text-slate-500"><span>{dept}</span><span>{count}</span></div>
                                <div className="h-2 bg-slate-50 rounded-full border border-slate-100"><div className="h-full bg-indigo-600 rounded-full" style={{ width: `${percentage}%` }}></div></div>
                             </div>
                           );
                         })}
                      </div>
                    </div>
                    {aiAnalysis && <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white flex flex-col justify-center shadow-2xl transition-all"><h4 className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-4">Strategic AI Intelligence</h4><p className="text-xl font-medium leading-relaxed italic">"{aiAnalysis}"</p></div>}
                 </div>
              </div>
            } />
          )}

          <Route path="/users" element={<UserManagement currentUser={currentUser} />} />
          <Route path="/approvals" element={<ApprovalCenter currentUser={currentUser} />} />
          <Route path="/chat" element={<ChatSystem currentUser={currentUser} />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".xlsx, .xls, .csv" 
          onChange={(e) => handleFileUpload(e, true)} 
        />
        <input 
          type="file" 
          id="append-file"
          className="hidden" 
          accept=".xlsx, .xls, .csv" 
          onChange={(e) => handleFileUpload(e, false)} 
        />

        {/* Manual Lead Modal */}
        {isManualLeadModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-500 shadow-2xl">
               <div className="p-8 bg-indigo-600 text-white">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-70">Entry Node</p>
                 <h3 className="text-2xl font-black uppercase leading-none">Manual Registry</h3>
               </div>
               <form onSubmit={handleAddManualLead} className="p-8 space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Candidate Name</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" 
                      placeholder="e.g. John Doe"
                      value={manualLead.name}
                      onChange={e => setManualLead({...manualLead, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Contact</label>
                    <input 
                      required 
                      type="tel" 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" 
                      placeholder="+91 XXXXXXXXXX"
                      value={manualLead.phone}
                      onChange={e => setManualLead({...manualLead, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Department</label>
                    <select 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold cursor-pointer"
                      value={manualLead.department}
                      onChange={e => setManualLead({...manualLead, department: e.target.value as Department})}
                    >
                      {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsManualLeadModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                    <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Submit Entry</button>
                  </div>
               </form>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3rem] overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-500 shadow-2xl">
               <div className="p-10 bg-emerald-600 text-white">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-70">Ingestion Engine</p>
                 <h3 className="text-3xl font-black uppercase leading-none">Import<br/>Registry Data</h3>
               </div>
               <div className="p-8 md:p-10 space-y-4">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Standard Template</p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase leading-relaxed">Ensure your file contains headers: <span className="text-indigo-600">Name, Phone, Department</span></p>
                  </div>
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full p-6 bg-white hover:bg-emerald-600 hover:text-white rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-emerald-600 flex items-center gap-4 group transition-all"
                  >
                     <span className="text-2xl">⚡</span>
                     <div className="text-left flex-1">
                        <p className="font-black text-[10px] uppercase tracking-widest">Flush & Replace</p>
                        <p className="text-[9px] opacity-50 uppercase font-bold">Wipes current registry with file data</p>
                     </div>
                  </button>

                  <button 
                    onClick={() => document.getElementById('append-file')?.click()} 
                    className="w-full p-6 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-[2rem] border border-slate-100 flex items-center gap-4 group transition-all"
                  >
                     <span className="text-2xl">➕</span>
                     <div className="text-left flex-1">
                        <p className="font-black text-[10px] uppercase tracking-widest">Append Leads</p>
                        <p className="text-[9px] opacity-50 uppercase font-bold">Adds data to current registry</p>
                     </div>
                  </button>
                  
                  <button onClick={() => setIsImportModalOpen(false)} className="w-full py-4 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 transition-colors">Discard Request</button>
               </div>
            </div>
          </div>
        )}

        {isExportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3rem] overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-500 shadow-2xl">
               <div className="p-10 bg-indigo-600 text-white">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-70">Audit Engine</p>
                 <h3 className="text-3xl font-black uppercase leading-none">Generate<br/>Institutional Report</h3>
               </div>
               <div className="p-8 md:p-10 space-y-4">
                  {[
                    {id: 'pdf', icon: '📄', desc: 'High-Fidelity Branded Audit'},
                    {id: 'excel', icon: '📊', desc: 'Comprehensive Operational Spreadsheet'},
                    {id: 'csv', icon: '📎', desc: 'Raw Data Interoperability File'}
                  ].map(fmt => (
                    <button key={fmt.id} onClick={() => executeExport(fmt.id as any)} className="w-full p-6 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-[2rem] border border-slate-100 flex items-center gap-4 group transition-all">
                       <span className="text-2xl">{fmt.icon}</span>
                       <div className="text-left flex-1">
                          <p className="font-black text-[10px] uppercase tracking-widest">Download {fmt.id}</p>
                          <p className="text-[9px] opacity-50 uppercase font-bold group-hover:text-white transition-colors">{fmt.desc}</p>
                       </div>
                       <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                  ))}
                  <button onClick={() => setIsExportModalOpen(false)} className="w-full py-4 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 transition-colors">Discard Request</button>
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