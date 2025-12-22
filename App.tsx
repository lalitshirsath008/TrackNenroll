
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, StudentLead, Department, LeadStage } from './types';
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
  const { 
    leads, users, loading, 
    assignLeadsToHOD, assignLeadsToTeacher, 
    addLead, refreshData 
  } = useData();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reportDeptFilter, setReportDeptFilter] = useState<string>('All');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('tracknenroll_current_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      const freshUser = users.find(u => u.id === parsed.id);
      if (freshUser && freshUser.isApproved) {
        setCurrentUser(freshUser);
      } else {
        handleLogout();
      }
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

  const assignmentCandidates = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SUPER_ADMIN) return [];
    if (currentUser.role === UserRole.ADMIN) {
      return users.filter(u => u.role === UserRole.HOD && u.isApproved);
    }
    if (currentUser.role === UserRole.HOD) {
      return users.filter(u => u.role === UserRole.TEACHER && u.department === currentUser.department && u.isApproved);
    }
    return [];
  }, [currentUser, users]);

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (currentUser?.role === UserRole.HOD) {
      result = result.filter(l => l.department === currentUser.department);
    }
    if (reportDeptFilter !== 'All') {
      result = result.filter(l => l.department === reportDeptFilter);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(l => l.name.toLowerCase().includes(lowerSearch) || l.phone.includes(searchTerm));
    }
    return result;
  }, [leads, currentUser, reportDeptFilter, searchTerm]);

  const handleAssign = async () => {
    if (!assigneeId || selectedLeads.length === 0) return;
    if (currentUser?.role === UserRole.ADMIN) {
      await assignLeadsToHOD(selectedLeads, assigneeId);
    } else if (currentUser?.role === UserRole.HOD) {
      await assignLeadsToTeacher(selectedLeads, assigneeId);
    }
    setSelectedLeads([]);
    setAssigneeId('');
  };

  const generateAIReport = async () => {
    setAnalyzing(true);
    const report = await generateSummaryReport(leads);
    setAiAnalysis(report);
    setAnalyzing(false);
  };

  const simulateFileUpload = () => {
    const timestamp = Date.now();
    const mockNewLeads: StudentLead[] = [
      {
        id: `bulk-${timestamp}-1`,
        name: 'Karan Mehra',
        phone: '+919811223344',
        sourceFile: 'Bulk_Import_April.xlsx',
        department: Department.IT,
        stage: LeadStage.UNASSIGNED,
        callVerified: false
      },
      {
        id: `bulk-${timestamp}-2`,
        name: 'Anjali Desai',
        phone: '+919811223355',
        sourceFile: 'Bulk_Import_April.xlsx',
        department: Department.COMPUTER,
        stage: LeadStage.UNASSIGNED,
        callVerified: false
      }
    ];
    mockNewLeads.forEach(lead => addLead(lead));
    alert('Simulated Bulk Upload: 2 leads added to the repository.');
  };

  const executeExport = (format: 'pdf' | 'csv' | 'excel') => {
    const currentFilteredLeads = (reportDeptFilter === 'All' ? leads : leads.filter(l => l.department === reportDeptFilter));
    
    if (currentFilteredLeads.length === 0) {
      alert("No data available for the selected scope.");
      return;
    }

    const dataToExport = currentFilteredLeads.map(l => ({
      'Student Name': l.name,
      'Contact Number': l.phone,
      'Target Branch': l.department,
      'Current Pipeline Stage': l.stage,
      'Verified': l.callVerified ? 'Yes' : 'No'
    }));
    
    const fileName = `TrackNEnroll_Audit_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      const headers = Object.keys(dataToExport[0]).join(",");
      const rows = dataToExport.map(row => Object.values(row).map(v => `"${v}"`).join(",")).join("\n");
      const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(wb, ws, "Audit");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(79, 70, 229);
      doc.setFont("helvetica", "bold");
      doc.text("TrackNEnroll : Institutional Audit", 14, 25);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 33);
      doc.text(`Filter Scope: ${reportDeptFilter}`, 14, 38);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 45, 195, 45);
      let y = 55;
      doc.setFontSize(9);
      doc.setTextColor(30);
      doc.setFont("helvetica", "bold");
      doc.text("STUDENT NAME", 14, y);
      doc.text("CONTACT", 60, y);
      doc.text("TARGET BRANCH", 100, y);
      doc.text("PIPELINE STAGE", 145, y);
      doc.text("VER.", 185, y);
      doc.line(14, y + 2, 195, y + 2);
      y += 10;
      doc.setFont("helvetica", "normal");
      currentFilteredLeads.forEach((l, i) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(l.name.substring(0, 22), 14, y);
        doc.text(l.phone, 60, y);
        doc.text(l.department.split(' ')[0], 100, y);
        doc.text(l.stage, 145, y);
        doc.text(l.callVerified ? "YES" : "NO", 185, y);
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 5, 181, 7, 'F');
          doc.text(l.name.substring(0, 22), 14, y);
          doc.text(l.phone, 60, y);
          doc.text(l.department.split(' ')[0], 100, y);
          doc.text(l.stage, 145, y);
          doc.text(l.callVerified ? "YES" : "NO", 185, y);
        }
        y += 7;
      });
      doc.save(`${fileName}.pdf`);
    }
    setIsExportModalOpen(false);
  };

  if (!currentUser) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<AuthHub onLogin={handleLogin} />} />
          <Route path="/register" element={<AuthHub onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Layout user={currentUser} onLogout={handleLogout}>
        {loading && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-600">Syncing Pipeline...</p>
          </div>
        )}

        <Routes>
          <Route path="/analytics" element={
            currentUser.role === UserRole.SUPER_ADMIN ? (
              <div className="space-y-8 pb-12 animate-in fade-in duration-700">
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                      </div>
                      <h1 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Audit Intelligence</h1>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-tight">Institutional Metrics</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={generateAIReport} disabled={analyzing} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all flex items-center gap-2 active:scale-95">
                      {analyzing ? 'Thinking...' : 'AI Strategic Sync'}
                    </button>
                    <button onClick={() => setIsExportModalOpen(true)} className="px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:border-indigo-600 hover:text-indigo-600 transition-all active:scale-95">Download PDF/CSV</button>
                  </div>
                </header>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Institution Pool', value: leads.length, color: 'text-indigo-600', icon: '📥' },
                    { label: 'Unassigned Pipeline', value: leads.filter(l => l.stage === LeadStage.UNASSIGNED).length, color: 'text-amber-500', icon: '⏳' },
                    { label: 'Targeted Potential', value: leads.filter(l => l.stage === LeadStage.TARGETED).length, color: 'text-emerald-500', icon: '🎯' },
                    { label: 'System Discards', value: leads.filter(l => l.stage === LeadStage.DISCARDED).length, color: 'text-rose-500', icon: '🗑️' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform text-2xl">{stat.icon}</div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{stat.label}</p>
                      <p className={`text-5xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-8">Verification Efficiency</h3>
                       <div className="flex flex-col items-center py-4">
                          <div className="relative w-40 h-40 flex items-center justify-center">
                             <svg className="w-full h-full transform -rotate-90">
                                <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                                <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-emerald-400" strokeDasharray={452.16} strokeDashoffset={452.16 - (452.16 * (leads.filter(l => l.callVerified).length / (leads.length || 1)))} strokeLinecap="round" />
                             </svg>
                             <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black">{Math.round((leads.filter(l => l.callVerified).length / (leads.length || 1)) * 100)}%</span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Verified</span>
                             </div>
                          </div>
                       </div>
                    </div>
                    <div className={`${aiAnalysis ? 'bg-indigo-600' : 'bg-white border-2 border-dashed border-slate-200'} rounded-[3rem] p-8 min-h-[200px] flex flex-col justify-center shadow-lg transition-all`}>
                       {aiAnalysis ? (
                         <div className="text-white space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Strategic AI Insight</h4>
                            <p className="text-lg font-medium leading-relaxed italic pr-6">"{aiAnalysis}"</p>
                         </div>
                       ) : (
                         <div className="text-center space-y-2">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Strategic Feed</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Synchronize with AI for Insights</p>
                         </div>
                       )}
                    </div>
                  </div>
                  <div className="lg:col-span-8 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                       <div>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Inquiry Heatmap</h3>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Branch-wise prospective student distribution</p>
                       </div>
                       <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase border border-indigo-100">Live Load</div>
                    </div>
                    <div className="space-y-7">
                       {Object.values(Department).map((dept) => {
                         const count = leads.filter(l => l.department === dept).length;
                         const percentage = leads.length > 0 ? (count / leads.length) * 100 : 0;
                         return (
                           <div key={dept} className="group">
                              <div className="flex justify-between items-end mb-2.5">
                                 <span className="text-xs font-black text-slate-800 uppercase group-hover:text-indigo-600 transition-colors">{dept}</span>
                                 <span className="text-[10px] font-bold text-slate-400">{count} Inquiries ({Math.round(percentage)}%)</span>
                              </div>
                              <div className="h-4 bg-slate-50 rounded-full border border-slate-100 p-1 overflow-hidden">
                                 <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-indigo-100" style={{ width: `${percentage}%` }}></div>
                              </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                </div>
              </div>
            ) : <Navigate to="/dashboard" />
          } />
          <Route path="/dashboard" element={
            currentUser.role === UserRole.TEACHER ? <TeacherDashboard currentUser={currentUser} /> : (
              <div className="space-y-6 animate-in fade-in duration-500">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Inquiry Pipeline</h1>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight uppercase leading-none">{currentUser.role === UserRole.SUPER_ADMIN ? 'Principal Monitor' : 'Admission Dashboard'}</h2>
                  </div>
                  <div className="flex gap-3">
                    {currentUser.role === UserRole.ADMIN && <button onClick={simulateFileUpload} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95">Bulk Upload</button>}
                    <button onClick={() => setIsExportModalOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95">Export Audit</button>
                  </div>
                </header>
                {currentUser.role === UserRole.SUPER_ADMIN && (
                   <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer group hover:bg-indigo-700 transition-all active:scale-[0.99]" onClick={() => window.location.hash = '#/analytics'}>
                     <div className="flex items-center gap-6">
                       <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📈</div>
                       <div><p className="font-black text-indigo-100 text-xs uppercase tracking-[0.2em] mb-1">Institutional Intelligence</p><h3 className="text-2xl font-black uppercase tracking-tight">Access Executive Monitoring Terminal</h3><p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-2">View Heatmaps, Conversion Stats, and Branch Distributions</p></div>
                     </div>
                     <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-indigo-600 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg></div>
                   </div>
                )}
                {currentUser.role !== UserRole.SUPER_ADMIN && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 space-y-2 w-full"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Student Registry</label><input type="text" placeholder="Search by name or phone..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    <div className="w-full md:w-64 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Allocate Selected To</label><select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none appearance-none cursor-pointer" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}><option value="">Select Assignee</option>{assignmentCandidates.map(u => (<option key={u.id} value={u.id}>{u.name} ({u.department ? u.department.split(' ')[0] : (u.role === UserRole.ADMIN ? 'Admin' : u.role)})</option>))}</select></div>
                    <button disabled={selectedLeads.length === 0 || !assigneeId} onClick={handleAssign} className="w-full md:w-auto px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all shadow-xl shadow-emerald-50 active:scale-95">Allocate ({selectedLeads.length})</button>
                  </div>
                )}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left min-w-[1000px]"><thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><tr>{currentUser.role !== UserRole.SUPER_ADMIN && (<th className="px-8 py-6 w-10"><input type="checkbox" className="w-5 h-5 rounded accent-indigo-600 cursor-pointer" onChange={(e) => { if (e.target.checked) setSelectedLeads(filteredLeads.map(l => l.id)); else setSelectedLeads([]); }} checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0} /></th>)}<th className="px-8 py-6">Inquiry Profile</th><th className="px-8 py-6">Current Pipeline Stage</th><th className="px-8 py-6">Verification</th><th className="px-8 py-6 text-right">Source Metadata</th></tr></thead><tbody className="divide-y divide-slate-50">{filteredLeads.map(l => (<tr key={l.id} className="hover:bg-indigo-50/10 transition-all group">{currentUser.role !== UserRole.SUPER_ADMIN && (<td className="px-8 py-6"><input type="checkbox" className="w-5 h-5 rounded accent-indigo-600 cursor-pointer" checked={selectedLeads.includes(l.id)} onChange={() => { setSelectedLeads(prev => prev.includes(l.id) ? prev.filter(id => id !== l.id) : [...prev, l.id]); }} /></td>)}<td className="px-8 py-6"><div className="flex flex-col"><p className="font-black text-slate-900 text-sm uppercase group-hover:text-indigo-600 transition-colors tracking-tight">{l.name}</p><div className="flex flex-wrap items-center gap-2 mt-1.5"><span className="text-[10px] font-bold text-slate-400">{l.phone}</span><span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">Target: {l.department}</span></div></div></td><td className="px-8 py-6"><span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border ${l.stage === LeadStage.UNASSIGNED ? 'bg-slate-100 text-slate-500 border-slate-200' : l.stage === LeadStage.TARGETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : l.stage === LeadStage.DISCARDED ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{l.stage}</span></td><td className="px-8 py-6"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${l.callVerified ? 'bg-emerald-500' : 'bg-amber-400'}`}></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{l.callVerified ? 'Verified Contact' : 'Awaiting Call'}</span></div></td><td className="px-8 py-6 text-right"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{l.sourceFile}</p></td></tr>))}</tbody></table></div></div>
              </div>
            )
          } />
          <Route path="/users" element={ (currentUser.role === UserRole.ADMIN) ? <UserManagement currentUser={currentUser} /> : <Navigate to="/dashboard" /> } />
          <Route path="/approvals" element={ (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HOD) ? <ApprovalCenter currentUser={currentUser} /> : <Navigate to="/dashboard" /> } />
          <Route path="/chat" element={ <ChatSystem currentUser={currentUser} /> } />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>

        {isExportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[2000] flex items-center justify-center p-4 overflow-hidden">
            <div className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden border border-white/20">
              <div className="p-10 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10"><svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/></svg></div>
                <h3 className="text-3xl font-black uppercase tracking-tight relative z-10 leading-none">Institutional<br/>Audit Export</h3>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.3em] mt-3 relative z-10 opacity-70">Secure Regulatory Extraction Node</p>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Analytical Scope Filter</label><select className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-bold text-slate-700 cursor-pointer appearance-none shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all" value={reportDeptFilter} onChange={e => setReportDeptFilter(e.target.value)}><option value="All">Full Institutional Dataset</option>{Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                 <div className="grid grid-cols-1 gap-4">
                    <button onClick={() => executeExport('pdf')} className="w-full group flex items-center justify-between p-6 bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200 rounded-[2rem] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-200"><div className="flex items-center gap-5"><span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">📄</span><div className="text-left"><span className="block font-black text-[10px] uppercase tracking-widest">Generate PDF Report</span><span className="text-[9px] font-bold opacity-50">Portable Document Format (.pdf)</span></div></div><span className="text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all">→</span></button>
                    <button onClick={() => executeExport('excel')} className="w-full group flex items-center justify-between p-6 bg-slate-50 hover:bg-emerald-600 hover:text-white border border-slate-200 rounded-[2rem] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-200"><div className="flex items-center gap-5"><span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">📊</span><div className="text-left"><span className="block font-black text-[10px] uppercase tracking-widest">Excel Spreadsheet</span><span className="text-[9px] font-bold opacity-50">Microsoft Excel Document (.xlsx)</span></div></div><span className="text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all">→</span></button>
                    <button onClick={() => executeExport('csv')} className="w-full group flex items-center justify-between p-6 bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-200 rounded-[2rem] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300"><div className="flex items-center gap-5"><span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">📜</span><div className="text-left"><span className="block font-black text-[10px] uppercase tracking-widest">Raw CSV Dataset</span><span className="text-[9px] font-bold opacity-50">Comma Separated Values (.csv)</span></div></div><span className="text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all">→</span></button>
                 </div>
                 <button onClick={() => setIsExportModalOpen(false)} className="w-full py-4 text-[10px] font-black uppercase text-slate-300 hover:text-rose-500 transition-colors tracking-[0.2em] mt-2">Discard Request Sequence</button>
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
