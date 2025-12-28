
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, Department, LeadStage, StudentLead, UserAction } from './types';
import { useData } from './context/DataContext';
import AuthHub from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import UserManagement from './pages/UserManagement';
import ApprovalCenter from './pages/ApprovalCenter';
import ChatSystem from './components/ChatSystem';
import Layout from './components/Layout';
import AIChatbot from './components/AIChatbot';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const { leads, users, logs, loading, batchAddLeads, addLead, addLog } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualLeadModalOpen, setIsManualLeadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    addLog(user.id, user.name, UserAction.LOGIN, 'User authentication verified.');
  };

  const handleLogout = () => {
    if (currentUser) {
      addLog(currentUser.id, currentUser.name, UserAction.LOGOUT, 'User session terminated.');
    }
    localStorage.removeItem('ten_logged_in_user');
    setCurrentUser(null);
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

  const [manualLead, setManualLead] = useState({ name: '', phone: '' });

  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    const newLead: StudentLead = {
      id: `manual-${Date.now()}`,
      name: manualLead.name,
      phone: `+91${manualLead.phone.slice(-10)}`,
      sourceFile: 'MANUAL',
      department: currentUser?.department || Department.IT,
      stage: LeadStage.UNASSIGNED,
      callVerified: false
    };
    addLead(newLead);
    setIsManualLeadModalOpen(false);
    setManualLead({ name: '', phone: '' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, replace: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const newLeads: StudentLead[] = jsonData.map((row: any, index) => ({
        id: `imported-${Date.now()}-${index}`,
        name: row.Name || 'Unknown',
        phone: String(row.Phone || '').replace(/\D/g, '').startsWith('91') ? `+${row.Phone}` : `+91${row.Phone}`,
        sourceFile: file.name,
        department: Department.IT,
        stage: LeadStage.UNASSIGNED,
        callVerified: false
      }));
      batchAddLeads(newLeads, replace);
      setIsImportModalOpen(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const executeExport = (format: 'pdf' | 'csv' | 'excel') => {
    const dataToExport = filteredLeads;
    const fileName = `Report_${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') {
      const headers = "Name,Phone,Department,Status\n";
      const rows = dataToExport.map(l => `"${l.name}","${l.phone}","${l.department}","${l.stage}"`).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${fileName}.csv`; a.click();
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.text("Institutional Status Report", 20, 20);
      dataToExport.slice(0, 25).forEach((l, i) => doc.text(`${i+1}. ${l.name} - ${l.stage}`, 20, 40 + (i*10)));
      doc.save(`${fileName}.pdf`);
    } else {
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
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
        {loading && <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}

        <Routes>
          <Route path="/dashboard" element={
            currentUser.role === UserRole.TEACHER ? (
              <TeacherDashboard currentUser={currentUser} />
            ) : (
              <div className="space-y-10 animate-in fade-in duration-500">
                <header>
                  <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Central Console</p>
                  <h2 className="text-5xl font-black text-[#1e293b] tracking-tighter uppercase leading-none">Administration Hub</h2>
                </header>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                   {[
                     { label: 'Total Leads', value: leads.length },
                     { label: 'Assigned', value: leads.filter(l => l.stage === LeadStage.ASSIGNED).length },
                     { label: 'Targeted', value: leads.filter(l => l.stage === LeadStage.TARGETED).length },
                     { label: 'Verified', value: leads.filter(l => l.callVerified).length }
                   ].map((item, i) => (
                     <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_15px_60px_-15px_rgba(0,0,0,0.03)] group hover:shadow-xl transition-all">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2">{item.label}</p>
                        <p className="text-5xl font-black text-[#1e293b] tracking-tight">{item.value}</p>
                     </div>
                   ))}
                </div>

                <div className="bg-[#0f172a] p-14 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                   <div className="relative z-10">
                     <p className="text-3xl font-black uppercase tracking-tighter mb-10">System Management</p>
                     <div className="flex flex-wrap gap-5">
                        <button onClick={() => setIsExportModalOpen(true)} className="px-12 py-5 bg-white text-[#0f172a] rounded-[1.25rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all">Download Report</button>
                        <button onClick={() => setIsImportModalOpen(true)} className="px-12 py-5 bg-indigo-600 text-white rounded-[1.25rem] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all">Import Dataset</button>
                        <button onClick={() => setIsManualLeadModalOpen(true)} className="px-12 py-5 bg-slate-800 text-white rounded-[1.25rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-700 transition-all">Manual Entry</button>
                     </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <h3 className="text-xl font-black text-[#1e293b] uppercase tracking-tight">Access Logs</h3>
                   <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead className="bg-[#fcfdfe] text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-50">
                          <tr><th className="px-10 py-6">Timestamp</th><th className="px-10 py-6">Identity</th><th className="px-10 py-6">Action</th><th className="px-10 py-6">Metadata</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {logs.slice(0, 10).map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="px-10 py-6 text-[10px] text-slate-400 font-bold">{log.timestamp}</td>
                              <td className="px-10 py-6 font-black text-[#1e293b] text-xs uppercase">{log.userName}</td>
                              <td className="px-10 py-6"><span className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/50">{log.action}</span></td>
                              <td className="px-10 py-6 text-[11px] font-bold text-slate-500 uppercase">{log.details}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                </div>
              </div>
            )
          } />

          <Route path="/users" element={<UserManagement currentUser={currentUser} />} />
          <Route path="/approvals" element={<ApprovalCenter currentUser={currentUser} />} />
          <Route path="/chat" element={<ChatSystem currentUser={currentUser} />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => handleFileUpload(e, true)} />

        {isManualLeadModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
              <div className="p-10 bg-[#0f172a] text-white text-center">
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">Manual Entry</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Single Node Registration</p>
              </div>
              <form onSubmit={handleAddManualLead} className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Full Name</label>
                  <input type="text" value={manualLead.name} onChange={e => setManualLead({ ...manualLead, name: e.target.value })} className="w-full px-6 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 font-bold text-[#1e293b]" placeholder="Identity Name" required />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <input type="tel" value={manualLead.phone} onChange={e => setManualLead({ ...manualLead, phone: e.target.value })} className="w-full px-6 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 font-bold text-[#1e293b]" placeholder="10 Digit Node" required />
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]">Provision Lead</button>
                  <button type="button" onClick={() => setIsManualLeadModalOpen(false)} className="w-full py-4 text-[10px] font-black uppercase text-slate-300 hover:text-slate-500 mt-2 transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isExportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl border border-white/20">
               <div className="p-10 bg-indigo-600 text-white text-center"><h3 className="text-3xl font-black uppercase tracking-tighter">Export Node</h3></div>
               <div className="p-10 space-y-4">
                  {['pdf', 'excel', 'csv'].map(fmt => (
                    <button key={fmt} onClick={() => executeExport(fmt as any)} className="w-full py-5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all">Format: {fmt.toUpperCase()}</button>
                  ))}
                  <button onClick={() => setIsExportModalOpen(false)} className="w-full py-4 text-[10px] font-black uppercase text-slate-300 hover:text-slate-500 transition-colors">Discard</button>
               </div>
            </div>
          </div>
        )}

        {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl border border-white/20">
               <div className="p-10 bg-emerald-600 text-white text-center"><h3 className="text-3xl font-black uppercase tracking-tighter">Bulk Import</h3></div>
               <div className="p-10 space-y-6 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Choose an institutional dataset (XLSX/CSV) to load leads into the central console.</p>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-14 border-2 border-dashed border-slate-200 rounded-[2rem] hover:border-emerald-500 hover:bg-emerald-50 transition-all font-black text-[11px] uppercase tracking-widest text-slate-400">Select Dataset File</button>
                  <button onClick={() => setIsImportModalOpen(false)} className="w-full py-4 text-[10px] font-black uppercase text-slate-300 hover:text-slate-500 transition-colors">Return</button>
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
