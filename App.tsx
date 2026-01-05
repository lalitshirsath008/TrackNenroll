
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, Department, LeadStage, StudentLead, UserAction, StudentResponse } from './types';
import { useData } from './context/DataContext';
import AuthHub from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import HODDashboard from './pages/HODDashboard';
import UserManagement from './pages/UserManagement';
import ApprovalCenter from './pages/ApprovalCenter';
import GlobalAnalytics from './pages/GlobalAnalytics';
import StudentLeads from './pages/StudentLeads';
import ChatSystem from './components/ChatSystem';
import Layout from './components/Layout';
import AIChatbot from './components/AIChatbot';
import * as XLSX from 'xlsx';

const ToastNotification: React.FC = () => {
  const { toast, hideToast } = useData();
  
  if (!toast) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-top-4 duration-300">
      <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md ${
        toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' :
        toast.type === 'error' ? 'bg-rose-600 border-rose-400 text-white' :
        'bg-[#0f172a] border-slate-700 text-white'
      }`}>
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          {toast.type === 'success' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          )}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest">{toast.message}</p>
        <button onClick={hideToast} className="ml-2 hover:opacity-50 transition-opacity">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
};

const RadialProgress: React.FC<{ value: number; label: string; color: string; size?: number; strokeWidth?: number }> = ({
  value,
  label,
  color,
  size = 120,
  strokeWidth = 10,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute top-0 left-0 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        <circle className="text-slate-100" stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
        <circle className={color} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}>
          <animate attributeName="stroke-dashoffset" from={circumference} to={offset} dur="1s" fill="freeze" />
        </circle>
      </svg>
      <div className="relative text-center">
        <p className={`text-2xl font-black ${color.replace('text-', 'text-')}`}>{normalizedValue}%</p>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">{label}</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { leads, users, logs, loading, batchAddLeads, addLead, updateLead, deleteLead, addLog, assignLeadsToHOD, autoDistributeLeadsToHODs, showToast } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isManualLeadModalOpen, setIsManualLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<StudentLead | null>(null);
  const [adminTab, setAdminTab] = useState<'overview' | 'leads' | 'logs'>('overview');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [leadFormData, setLeadFormData] = useState({ name: '', phone: '' });

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
    addLog(user.id, user.name, UserAction.LOGIN, 'User authentication successful.');
    showToast(`Welcome, ${user.name}.`, 'success');
  };

  const handleLogout = () => {
    if (currentUser) {
      addLog(currentUser.id, currentUser.name, UserAction.LOGOUT, 'User session terminated.');
    }
    localStorage.removeItem('ten_logged_in_user');
    setCurrentUser(null);
    showToast("Session terminated successfully.", 'info');
  };

  const stats = useMemo(() => ({
    total: leads.length,
    assigned: leads.filter(l => !!l.assignedToHOD).length,
    interested: leads.filter(l => l.stage === LeadStage.TARGETED).length,
    callsDone: leads.filter(l => l.callVerified).length
  }), [leads]);

  const unassignedLeads = useMemo(() => leads.filter(l => !l.assignedToHOD), [leads]);
  const hodList = useMemo(() => users.filter(u => u.role === UserRole.HOD && u.isApproved), [users]);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (leadFormData.phone.length < 10 || leadFormData.name.length < 3) return;
    const cleanPhone = leadFormData.phone.startsWith('+91') ? leadFormData.phone : `+91${leadFormData.phone}`;

    if (editingLead) {
      await updateLead(editingLead.id, { name: leadFormData.name, phone: cleanPhone });
      setEditingLead(null);
      showToast("Student information updated successfully.");
    } else {
      const newLead: StudentLead = {
        id: `lead-${Date.now()}`,
        name: leadFormData.name,
        phone: cleanPhone,
        sourceFile: 'MANUAL',
        department: Department.IT,
        stage: LeadStage.UNASSIGNED,
        callVerified: false
      };
      await addLead(newLead);
    }
    setIsManualLeadModalOpen(false);
    setLeadFormData({ name: '', phone: '' });
  };

  const handleDeleteLead = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this student record? This action cannot be undone.")) {
      await deleteLead(id);
      if (currentUser) {
        addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Deleted lead record: ${id}.`);
      }
    }
  };

  const handleOpenEdit = (lead: StudentLead) => {
    setEditingLead(lead);
    setLeadFormData({ name: lead.name, phone: lead.phone.replace('+91', '') });
    setIsManualLeadModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const ab = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(ab, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (data.length === 0) {
          showToast("The selected file contains no data.", "error");
          return;
        }

        const newLeads: StudentLead[] = data.map((row, idx) => {
          // Flexible key detection for common column names
          const keys = Object.keys(row);
          const nameKey = keys.find(k => /name|student|fullname/i.test(k));
          const phoneKey = keys.find(k => /phone|mobile|contact|number/i.test(k));

          const rawName = nameKey ? row[nameKey] : 'Unknown Student';
          const rawPhone = phoneKey ? String(row[phoneKey]) : '';
          const cleanPhone = `+91${rawPhone.replace(/\D/g, '').slice(-10)}`;

          return {
            id: `lead-import-${Date.now()}-${idx}`,
            name: String(rawName).trim() || 'Unknown Student',
            phone: cleanPhone,
            sourceFile: file.name,
            department: Department.IT,
            stage: LeadStage.UNASSIGNED,
            callVerified: false
          };
        }).filter(l => l.phone.length >= 13); // +91 + 10 digits

        if (newLeads.length > 0) {
          await batchAddLeads(newLeads, false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          showToast("No valid student records found. Check column headers.", "error");
        }
      } catch (err) {
        console.error("File processing error:", err);
        showToast("An error occurred while processing the Excel file.", "error");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAutoDistribution = async () => {
    if (unassignedLeads.length === 0 || hodList.length === 0) return;
    if (window.confirm(`Initiate automatic distribution of leads to Department Heads?`)) {
      await autoDistributeLeadsToHODs(unassignedLeads.map(l => l.id));
    }
  };

  if (!currentUser) return (
    <Router>
      <ToastNotification />
      <Routes>
        <Route path="*" element={<AuthHub onLogin={handleLogin} />} />
      </Routes>
    </Router>
  );

  return (
    <Router>
      <ToastNotification />
      <Layout user={currentUser} onLogout={handleLogout}>
        {loading && <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[1000] flex items-center justify-center"><div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}
        <Routes>
          <Route path="/dashboard" element={
            currentUser.role === UserRole.TEACHER ? (
              <TeacherDashboard currentUser={currentUser} />
            ) : currentUser.role === UserRole.HOD ? (
              <HODDashboard currentUser={currentUser} />
            ) : (
              <div className="space-y-6">
                <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Administrative Center</p>
                    <h2 className="text-2xl font-black text-slate-800 uppercase">Management Dashboard</h2>
                  </div>
                  <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner overflow-x-auto">
                    {[{ id: 'overview', label: 'Overview' }, ...(currentUser.role === UserRole.ADMIN ? [{ id: 'leads', label: 'Inflow Pool' }] : []), { id: 'logs', label: 'Activity Logs' }].map((tab) => (
                      <button key={tab.id} onClick={() => { setAdminTab(tab.id as any); setSearchTerm(''); }} className={`whitespace-nowrap px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400'}`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </header>
                {adminTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[{ l: 'Total Leads', v: stats.total, v_c: 'text-slate-800' }, { l: 'Allocated', v: stats.assigned, v_c: 'text-indigo-600' }, { l: 'Interested', v: stats.interested, v_c: 'text-emerald-600' }, { l: 'Completed', v: stats.callsDone, v_c: 'text-amber-600' }].map((s, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                          <p className="text-[8px] font-black uppercase text-slate-400 mb-1">{s.l}</p>
                          <p className={`text-2xl font-black ${s.v_c}`}>{s.v}</p>
                        </div>
                      ))}
                    </div>
                    {currentUser.role === UserRole.SUPER_ADMIN && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                          <h3 className="text-xl font-black uppercase mb-8 text-slate-800">Lead Conversion Funnel</h3>
                          <div className="flex flex-wrap gap-x-8 gap-y-6 justify-center">
                            <RadialProgress value={Math.round((leads.filter(l => l.stage === LeadStage.TARGETED).length / Math.max(1, stats.total)) * 100) || 0} label="Targeted" color="text-emerald-600" />
                            <RadialProgress value={Math.round((leads.filter(l => l.stage === LeadStage.DISCARDED).length / Math.max(1, stats.total)) * 100) || 0} label="Discarded" color="text-rose-600" />
                            <RadialProgress value={Math.round((leads.filter(l => l.stage === LeadStage.FORWARDED).length / Math.max(1, stats.total)) * 100) || 0} label="Forwarded" color="text-indigo-600" />
                          </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                          <h3 className="text-xl font-black uppercase mb-8 text-slate-800">Department Performance</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4 justify-items-center">
                            {Object.values(Department).map(dept => {
                              const deptLeads = leads.filter(l => l.department === dept);
                              const targetedCount = deptLeads.filter(l => l.stage === LeadStage.TARGETED).length;
                              const conversionRate = deptLeads.length > 0 ? Math.round((targetedCount / deptLeads.length) * 100) : 0;
                              return <RadialProgress key={dept} value={conversionRate} label={dept.split(' ')[0]} color="text-purple-600" size={100} strokeWidth={8} />;
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                    {currentUser.role === UserRole.ADMIN && (
                      <div className="lg:col-span-2 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10 mb-6">
                          <h3 className="text-xl font-black uppercase relative z-10">Lead Ingestion Pipeline</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Excel uploads must contain 'Name' and 'Contact Number' columns.</p>
                        </div>
                        <div className="flex gap-4 relative z-10">
                          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                          <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-900/40">Import File</button>
                          <button onClick={() => { setEditingLead(null); setLeadFormData({ name: '', phone: '' }); setIsManualLeadModalOpen(true); }} className="px-8 py-4 bg-white/10 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest backdrop-blur-md">Manual Entry</button>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl"></div>
                      </div>
                    )}
                  </div>
                )}
                {adminTab === 'leads' && (
                  <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                    <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="relative flex-1">
                        <input type="text" placeholder="Filter unassigned records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-6 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={handleAutoDistribution} className="flex-1 px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase">Auto-Distribute</button>
                        <button disabled={selectedLeadIds.length === 0} onClick={() => setIsAssignModalOpen(true)} className="flex-1 px-5 py-3 bg-slate-900 disabled:opacity-30 text-white rounded-xl font-black text-[9px] uppercase">Delegate Selection ({selectedLeadIds.length})</button>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#fcfdfe] text-[8px] font-black text-slate-400 uppercase border-b border-slate-50">
                            <tr>
                              <th className="p-5 w-10"><input type="checkbox" onChange={(e) => setSelectedLeadIds(e.target.checked ? unassignedLeads.map(l => l.id) : [])} className="w-4 h-4 rounded border-slate-300" /></th>
                              <th className="p-5">Student Identity</th>
                              <th className="p-5">Contact</th>
                              <th className="p-5">Status</th>
                              <th className="p-5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {unassignedLeads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                              <tr key={lead.id} className="hover:bg-slate-50 transition-all group">
                                <td className="p-5"><input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => setSelectedLeadIds(p => p.includes(lead.id) ? p.filter(i => i !== lead.id) : [...p, lead.id])} className="w-4 h-4 rounded border-slate-300" /></td>
                                <td className="p-5 text-[11px] font-black uppercase text-slate-800">{lead.name}</td>
                                <td className="p-5 text-[10px] font-bold text-slate-500">{lead.phone}</td>
                                <td className="p-5"><span className="text-[8px] font-black uppercase text-amber-500 bg-amber-50 px-2 py-1 rounded-lg">Awaiting Allocation</span></td>
                                <td className="p-5 text-right space-x-2">
                                  <button onClick={() => handleOpenEdit(lead)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                  </button>
                                  <button onClick={() => handleDeleteLead(lead.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                {adminTab === 'logs' && (
                  <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm h-[500px] overflow-y-auto custom-scroll">
                    {logs.map(log => (
                      <div key={log.id} className="p-5 border-b border-slate-50 hover:bg-slate-50 transition-all flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase leading-none mb-1">{log.userName}</p>
                          <p className="text-[9px] font-bold text-indigo-600 uppercase">{log.action}: {log.details}</p>
                        </div>
                        <p className="text-[9px] font-black text-slate-300 uppercase">{log.timestamp}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          } />
          <Route path="/student-leads" element={<StudentLeads />} />
          <Route path="/analytics" element={<GlobalAnalytics />} />
          <Route path="/users" element={<UserManagement currentUser={currentUser} />} />
          <Route path="/approvals" element={<ApprovalCenter currentUser={currentUser} />} />
          <Route path="/chat" element={<ChatSystem currentUser={currentUser} />} />
          <Route path="/support" element={<AIChatbot />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        {isManualLeadModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="p-6 bg-slate-900 text-white text-center font-black uppercase text-sm">{editingLead ? 'Update Information' : 'Register New Student'}</div>
              <form onSubmit={handleLeadSubmit} className="p-8 space-y-4">
                <input type="text" value={leadFormData.name} onChange={e => setLeadFormData(p => ({ ...p, name: e.target.value }))} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold" placeholder="Legal Full Name" required />
                <input type="tel" value={leadFormData.phone} onChange={e => setLeadFormData(p => ({ ...p, phone: e.target.value.slice(0, 10) }))} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold" placeholder="Primary Contact (10 digits)" required />
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px]">{editingLead ? 'Save Changes' : 'Confirm Entry'}</button>
                <button type="button" onClick={() => setIsManualLeadModalOpen(false)} className="w-full text-center text-slate-400 text-[9px] font-black uppercase mt-2">Cancel</button>
              </form>
            </div>
          </div>
        )}
        {isAssignModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 bg-slate-900 text-white text-center font-black uppercase text-sm">Assign Leads to Department Head</div>
              <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                {hodList.map(hod => (
                  <button key={hod.id} onClick={async () => { await assignLeadsToHOD(selectedLeadIds, hod.id); setSelectedLeadIds([]); setIsAssignModalOpen(false); }} className="w-full p-4 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-xl text-left transition-all border border-slate-100 flex justify-between items-center group">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-tight">{hod.name}</p>
                      <p className="text-[8px] opacity-60 uppercase font-bold">{hod.department}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="w-full p-4 text-[9px] font-black uppercase text-slate-400">Cancel</button>
            </div>
          </div>
        )}
      </Layout>
    </Router>
  );
};

export default App;
