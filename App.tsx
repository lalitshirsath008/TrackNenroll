
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, Department, LeadStage } from './types';
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
  const { leads, users, loading } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reportDeptFilter] = useState<string>('All');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

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
    if (currentUser?.role === UserRole.HOD) result = result.filter(l => l.department === currentUser.department);
    if (reportDeptFilter !== 'All') result = result.filter(l => l.department === reportDeptFilter);
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(l => l.name.toLowerCase().includes(lowerSearch) || l.phone.includes(searchTerm));
    }
    return result;
  }, [leads, currentUser, reportDeptFilter, searchTerm]);

  const generateAIReport = async () => {
    const report = await generateSummaryReport(leads);
    setAiAnalysis(report);
  };

  const executeExport = (format: 'pdf' | 'csv' | 'excel') => {
    const currentFilteredLeads = (reportDeptFilter === 'All' ? leads : leads.filter(l => l.department === reportDeptFilter));
    if (currentFilteredLeads.length === 0) { alert("No data scope."); return; }
    const fileName = `Audit_${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') {
      const data = currentFilteredLeads.map(l => `${l.name},${l.phone},${l.department},${l.stage}`).join("\n");
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${fileName}.csv`; a.click();
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(20); doc.text("Institutional Audit", 10, 20);
      currentFilteredLeads.forEach((l, i) => doc.text(`${l.name} | ${l.stage}`, 10, 30 + (i * 10)));
      doc.save(`${fileName}.pdf`);
    } else {
      const ws = XLSX.utils.json_to_sheet(currentFilteredLeads);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Audit");
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

  return (
    <Router>
      <Layout user={currentUser} onLogout={handleLogout}>
        {loading && <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}

        <Routes>
          <Route path="/analytics" element={
            <div className="space-y-6 md:space-y-10">
               <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div>
                    <h1 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2">Metrics Engine</h1>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none uppercase">Global Status</h2>
                  </div>
                  <div className="flex w-full md:w-auto gap-2">
                    <button onClick={generateAIReport} className="flex-1 md:flex-none px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl">AI Sync</button>
                    <button onClick={() => setIsExportModalOpen(true)} className="flex-1 md:flex-none px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg">Export</button>
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
                  {aiAnalysis && <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white flex flex-col justify-center shadow-2xl"><h4 className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-4">Strategic AI Intelligence</h4><p className="text-xl font-medium leading-relaxed italic">"{aiAnalysis}"</p></div>}
               </div>
            </div>
          } />
          <Route path="/dashboard" element={
            <div className="space-y-6">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight uppercase">Dashboard</h2>
                <div className="flex w-full md:w-auto gap-2">
                  <input type="text" placeholder="Search leads..." className="flex-1 md:w-64 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  <button onClick={() => setIsExportModalOpen(true)} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
                </div>
              </header>
              <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                      <tr><th className="px-6 py-5">Student Profile</th><th className="px-6 py-5">Pipeline Stage</th><th className="px-6 py-5 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredLeads.map(l => (
                        <tr key={l.id} className="hover:bg-indigo-50/20 transition-all">
                          <td className="px-6 py-5"><div><p className="font-black text-slate-900 text-sm uppercase">{l.name}</p><p className="text-[9px] font-bold text-slate-400">{l.phone}</p></div></td>
                          <td className="px-6 py-5"><span className="text-[9px] font-black uppercase px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-500">{l.stage}</span></td>
                          <td className="px-6 py-5 text-right"><button className="text-[9px] font-black uppercase text-indigo-600">Details</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          } />
          <Route path="/users" element={<UserManagement currentUser={currentUser} />} />
          <Route path="/approvals" element={<ApprovalCenter currentUser={currentUser} />} />
          <Route path="/chat" element={<ChatSystem currentUser={currentUser} />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>

        {isExportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3rem] overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-500">
               <div className="p-10 bg-indigo-600 text-white"><h3 className="text-3xl font-black uppercase leading-none">Audit<br/>Export</h3></div>
               <div className="p-8 md:p-10 space-y-4">
                  {['pdf', 'excel', 'csv'].map(fmt => (
                    <button key={fmt} onClick={() => executeExport(fmt as any)} className="w-full p-6 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-[2rem] border border-slate-100 flex items-center justify-between group transition-all">
                       <span className="font-black text-[10px] uppercase tracking-widest">Download {fmt} Report</span>
                       <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                  ))}
                  <button onClick={() => setIsExportModalOpen(false)} className="w-full py-4 text-[9px] font-black uppercase text-slate-300">Discard Request</button>
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
