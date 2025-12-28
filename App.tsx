
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
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      const newLeads: StudentLead[] = data.map((row, idx) => ({
        id: `lead-import-${Date.now()}-${idx}`,
        name: row.Name || row.name || 'Unknown Student',
        phone: `+91${String(row.Phone || row.phone || row.Mobile || '').replace(/\D/g, '').slice(-10)}`,
        sourceFile: file.name,
        department: Department.IT,
        stage: LeadStage.UNASSIGNED,
        callVerified: false
      })).filter(l => l.phone.length >= 10);

      if (newLeads.length > 0) {
        await batchAddLeads(newLeads, false);
        alert(`Imported ${newLeads.length} leads!`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAutoDistribution = async () => {
    if (unassignedLeads.length === 0 || hodList.length === 0) return;
    if (window.confirm(`Auto-distribute leads?`)) {
      await autoDistributeLeadsToHODs(unassignedLeads.map(l => l.id));
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
        {loading && <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[1000] flex items-center justify-center"><div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}

        <Routes>
          <Route path="/dashboard" element={
            currentUser.role === UserRole.TEACHER ? (
              <TeacherDashboard currentUser={currentUser} />
            ) : currentUser.role === UserRole.HOD ? (
              <HODDashboard currentUser={currentUser} />
            ) : (
              <div className="space-y-4 md:space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Administrative Hub</p>
                    <h2 className="text-2xl font-black text-slate-800 uppercase">Management</h2>
                  </div>
                  <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner overflow-x-auto">
                    {['overview', 'leads', 'logs'].map((t) => (
                      <button key={t} onClick={() => setAdminTab(t as any)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{t}</button>
                    ))}
                  </div>
                </header>
                
                {adminTab === 'overview' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {[{ l: 'Total', v: stats.total, c: 'text-slate-800' }, { l: 'Allocated', v: stats.assigned, c: 'text-indigo-600' }, { l: 'Interested', v: stats.interested, c: 'text-emerald-600' }, { l: 'Verified', v: stats.callsDone, c: 'text-amber-600' }].map((s, i) => (
                         <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1">{s.l}</p>
                            <p className={`text-xl font-black ${s.c}`}>{s.v}</p>
                         </div>
                       ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2 bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                        <h3 className="text-lg font-black uppercase mb-4 relative z-10">Data Pipeline</h3>
                        <div className="flex gap-3 relative z-10">
                           <input type="file" accept=".xlsx,.xls,.csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                           <button onClick={() => fileInputRef.current?.click()} className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">Import</button>
                           <button onClick={() => setIsManualLeadModalOpen(true)} className="px-5 py-3 bg-white/10 border border-white/10 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">Add Student</button>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-4">Activity</p>
                        <div className="space-y-3">
                          {recentLeads.map(l => (
                            <div key={l.id} className="flex items-center justify-between border-b border-slate-50 pb-2">
                              <p className="text-[10px] font-black uppercase text-slate-800 truncate">{l.name}</p>
                              <span className="text-[8px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-lg">{l.stage}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : adminTab === 'leads' ? (
                  <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                    <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <input type="text" placeholder="Search pool..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-600" />
                      <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={handleAutoDistribution} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg">Auto-Distribute</button>
                        <button disabled={selectedLeadIds.length === 0} onClick={() => setIsAssignModalOpen(true)} className="flex-1 px-4 py-2.5 bg-slate-900 disabled:opacity-30 text-white rounded-lg font-black text-[9px] uppercase tracking-widest">Delegate ({selectedLeadIds.length})</button>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead className="bg-[#fcfdfe] text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                          <tr>
                            <th className="p-4 w-10"><input type="checkbox" onChange={(e) => setSelectedLeadIds(e.target.checked ? unassignedLeads.map(l => l.id) : [])} className="w-4 h-4 rounded" /></th>
                            <th className="p-4">Student</th>
                            <th className="p-4">Phone</th>
                            <th className="p-4">Source</th>
                            <th className="p-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {unassignedLeads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                            <tr key={lead.id} className="hover:bg-slate-50 transition-all">
                              <td className="p-4"><input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => setSelectedLeadIds(p => p.includes(lead.id) ? p.filter(i => i !== lead.id) : [...p, lead.id])} className="w-4 h-4 rounded" /></td>
                              <td className="p-4 text-[11px] font-black uppercase text-slate-800">{lead.name}</td>
                              <td className="p-4 text-[10px] font-bold text-slate-500">{lead.phone}</td>
                              <td className="p-4 text-[9px] font-black text-slate-300 uppercase">{lead.sourceFile}</td>
                              <td className="p-4 text-right"><span className="text-[8px] font-black uppercase tracking-widest text-amber-500">Pending</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm h-[400px]">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center"><h3 className="text-sm font-black uppercase">System Logs</h3></div>
                    <div className="overflow-y-auto h-full p-2 space-y-2">
                       {logs.map(log => (
                         <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1">
                            <p className="text-[8px] font-black text-slate-400">{log.timestamp}</p>
                            <p className="text-[10px] font-black text-slate-800 uppercase">{log.userName} - {log.action}</p>
                            <p className="text-[9px] font-bold text-slate-500 italic">{log.details}</p>
                         </div>
                       ))}
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

        {isManualLeadModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-slate-900 text-white text-center"><h3 className="text-lg font-black uppercase">Add Student</h3></div>
              <form onSubmit={handleAddManualLead} className="p-6 space-y-4">
                <input type="text" value={manualLead.name} onChange={e => setManualLead(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold" placeholder="Name" required />
                <input type="text" value={manualLead.phone} onChange={e => setManualLead(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold" placeholder="Phone (10 digits)" required />
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">Save</button>
                <button type="button" onClick={() => setIsManualLeadModalOpen(false)} className="w-full text-center text-[9px] font-black uppercase text-slate-400">Cancel</button>
              </form>
            </div>
          </div>
        )}

        {isAssignModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-slate-900 text-white text-center"><h3 className="text-lg font-black uppercase tracking-tight">Allocate Node</h3></div>
              <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                {hodList.map(hod => (
                  <button key={hod.id} onClick={async () => { await assignLeadsToHOD(selectedLeadIds, hod.id); setSelectedLeadIds([]); setIsAssignModalOpen(false); }} className="w-full p-4 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-xl text-left border border-slate-100 transition-all">
                    <p className="text-[10px] font-black uppercase tracking-tight">{hod.name}</p>
                    <p className="text-[8px] font-bold opacity-60 uppercase">{hod.department}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="w-full p-4 text-[9px] font-black uppercase text-slate-400">Cancel</button>
            </div>
          </div>
        )}
        <AIChatbot />
      </Layout>
    </Router>
  );
};

export default App;
