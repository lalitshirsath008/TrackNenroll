
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
  const { leads, users, logs, loading, assignLeadsToHOD, assignLeadsToTeacher, batchAddLeads, addLead, addLog } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualLeadModalOpen, setIsManualLeadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence of login session
  useEffect(() => {
    const saved = localStorage.getItem('ten_logged_in_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Verify user still exists in current staff list
      const exists = users.find(u => u.id === parsed.id && u.isApproved);
      if (exists) setCurrentUser(exists);
    }
  }, [users]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ten_logged_in_user', JSON.stringify(user));
    addLog(user.id, user.name, UserAction.LOGIN, 'User logged into system.');
  };

  const handleLogout = () => {
    if (currentUser) {
      addLog(currentUser.id, currentUser.name, UserAction.LOGOUT, 'User logged out.');
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

  const [manualLead, setManualLead] = useState({ name: '', phone: '', department: Department.IT });

  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    const newLead: StudentLead = {
      id: `manual-${Date.now()}`,
      name: manualLead.name,
      phone: `+91${manualLead.phone.slice(-10)}`,
      sourceFile: 'MANUAL',
      department: manualLead.department,
      stage: LeadStage.UNASSIGNED,
      callVerified: false
    };
    addLead(newLead);
    setIsManualLeadModalOpen(false);
    setManualLead({ name: '', phone: '', department: Department.IT });
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
    const fileName = `TrackNEnroll_Report_${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') {
      const headers = "Name,Phone,Department,Status\n";
      const rows = dataToExport.map(l => `"${l.name}","${l.phone}","${l.department}","${l.stage}"`).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${fileName}.csv`; a.click();
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.text("TrackNEnroll Report", 20, 20);
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
        {loading && <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div></div>}

        <Routes>
          <Route path="/dashboard" element={
            currentUser.role === UserRole.TEACHER ? (
              <TeacherDashboard currentUser={currentUser} />
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">
                <header>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Central Console</p>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Administration Hub</h2>
                </header>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   {[
                     { label: 'Total Leads', value: leads.length, icon: '📊' },
                     { label: 'Assigned', value: leads.filter(l => l.stage === LeadStage.ASSIGNED).length, icon: '⚡' },
                     { label: 'Targeted', value: leads.filter(l => l.stage === LeadStage.TARGETED).length, icon: '🎯' },
                     { label: 'Verified', value: leads.filter(l => l.callVerified).length, icon: '📞' }
                   ].map((item, i) => (
                     <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-lg transition-all">
                        <span className="text-2xl mb-4 block">{item.icon}</span>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{item.label}</p>
                        <p className="text-4xl font-black text-slate-900">{item.value}</p>
                     </div>
                   ))}
                </div>

                <div className="bg-emerald-600 p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                   <div className="relative z-10">
                     <p className="text-3xl font-black uppercase mb-8">Management Actions</p>
                     <div className="flex flex-wrap gap-4">
                        <button onClick={() => setIsExportModalOpen(true)} className="px-10 py-4 bg-white text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Download Report</button>
                        <button onClick={() => setIsImportModalOpen(true)} className="px-10 py-4 bg-emerald-500 text-white border border-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-widest">Import Leads</button>
                        <button onClick={() => setIsManualLeadModalOpen(true)} className="px-10 py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">New Entry</button>
                     </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <h3 className="text-xl font-black text-slate-900 uppercase">System Audit Logs</h3>
                   <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr><th className="px-6 py-4">Time</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Action</th><th className="px-6 py-4">Details</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {logs.slice(0, 10).map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 text-[10px] text-slate-400 font-bold">{log.timestamp}</td>
                              <td className="px-6 py-4 font-bold text-slate-700">{log.userName}</td>
                              <td className="px-6 py-4"><span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-indigo-50 text-indigo-600">{log.action}</span></td>
                              <td className="px-6 py-4 text-slate-500">{log.details}</td>
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="p-8 bg-slate-900 text-white text-center"><h3 className="text-2xl font-black uppercase">Manual Entry</h3></div>
              <form onSubmit={handleAddManualLead} className="p-8 space-y-4">
                <input type="text" value={manualLead.name} onChange={e => setManualLead({ ...manualLead, name: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" placeholder="Student Name" required />
                <input type="text" value={manualLead.phone} onChange={e => setManualLead({ ...manualLead, phone: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" placeholder="Phone Number" required />
                <select value={manualLead.department} onChange={e => setManualLead({ ...manualLead, department: e.target.value as Department })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold">
                  {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">Add Lead</button>
                <button type="button" onClick={() => setIsManualLeadModalOpen(false)} className="w-full py-4 text-xs font-black uppercase text-slate-300">Cancel</button>
              </form>
            </div>
          </div>
        )}

        {isExportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl">
               <div className="p-8 bg-indigo-600 text-white text-center"><h3 className="text-2xl font-black uppercase">Export Report</h3></div>
               <div className="p-8 space-y-3">
                  {['pdf', 'excel', 'csv'].map(fmt => (
                    <button key={fmt} onClick={() => executeExport(fmt as any)} className="w-full py-4 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-xl font-black text-xs uppercase transition-all">Format: {fmt.toUpperCase()}</button>
                  ))}
                  <button onClick={() => setIsExportModalOpen(false)} className="w-full py-4 text-xs font-black uppercase text-slate-300">Cancel</button>
               </div>
            </div>
          </div>
        )}

        {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl">
               <div className="p-8 bg-emerald-600 text-white text-center"><h3 className="text-2xl font-black uppercase">Bulk Import</h3></div>
               <div className="p-8 space-y-4 text-center">
                  <p className="text-xs text-slate-400 font-bold uppercase mb-4">Choose an Excel/CSV file to load leads</p>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-10 border-2 border-dashed border-slate-200 rounded-2xl hover:border-emerald-500 transition-all font-bold text-slate-500">Select File</button>
                  <button onClick={() => setIsImportModalOpen(false)} className="w-full py-4 text-xs font-black uppercase text-slate-300">Back</button>
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
