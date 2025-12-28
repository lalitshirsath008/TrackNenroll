
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
  const { leads, users, loading, batchAddLeads, addLead, addLog, assignLeadsToHOD } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualLeadModalOpen, setIsManualLeadModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'overview' | 'leads'>('overview');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Lead Form State & Errors
  const [manualLead, setManualLead] = useState({ name: '', phone: '' });
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');

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

  // Real-time Dashboard Stats for Admin
  const stats = useMemo(() => ({
    total: leads.length,
    assigned: leads.filter(l => !!l.assignedToHOD).length,
    targeted: leads.filter(l => l.stage === LeadStage.TARGETED).length,
    verified: leads.filter(l => l.callVerified).length
  }), [leads]);

  const unassignedLeads = useMemo(() => leads.filter(l => !l.assignedToHOD), [leads]);
  const hodList = useMemo(() => users.filter(u => u.role === UserRole.HOD && u.isApproved), [users]);

  // Validation Logic
  const handlePhoneChange = (val: string) => {
    const onlyNums = val.replace(/\D/g, ''); // Remove non-numbers
    if (onlyNums.length <= 10) {
      setManualLead(prev => ({ ...prev, phone: onlyNums }));
      if (onlyNums.length < 10 && onlyNums.length > 0) setPhoneError('Pura 10 digit number likhein');
      else setPhoneError('');
    }
  };

  const handleNameChange = (val: string) => {
    const onlyLetters = val.replace(/[^a-zA-Z\s]/g, '');
    setManualLead(prev => ({ ...prev, name: onlyLetters }));
    if (onlyLetters.length < 3 && onlyLetters.length > 0) setNameError('Naam thoda bada likhein');
    else setNameError('');
  };

  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualLead.phone.length !== 10) {
      setPhoneError('Sahi 10 digit number chahiye');
      return;
    }
    if (manualLead.name.length < 3) {
      setNameError('Sahi naam likhein');
      return;
    }

    const newLead: StudentLead = {
      id: `manual-${Date.now()}`,
      name: manualLead.name,
      phone: `+91${manualLead.phone}`,
      sourceFile: 'MANUAL',
      department: Department.IT,
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

  const executeAllocation = async (hodId: string) => {
    if (selectedLeadIds.length === 0) return;
    await assignLeadsToHOD(selectedLeadIds, hodId);
    setSelectedLeadIds([]);
    setIsAssignModalOpen(false);
  };

  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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
            ) : currentUser.role === UserRole.HOD ? (
              <HODDashboard currentUser={currentUser} />
            ) : (
              <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Central Console</p>
                    <h2 className="text-3xl font-black text-[#1e293b] tracking-tighter uppercase leading-none">Administration Hub</h2>
                  </div>
                  <div className="flex p-1 bg-slate-100 rounded-xl md:rounded-2xl">
                    <button onClick={() => setAdminTab('overview')} className={`px-6 py-2.5 rounded-lg md:rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Overview</button>
                    <button onClick={() => setAdminTab('leads')} className={`px-6 py-2.5 rounded-lg md:rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === 'leads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Allocation Hub ({unassignedLeads.length})</button>
                  </div>
                </header>
                
                {adminTab === 'overview' ? (
                  <div className="space-y-6 md:space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                       {[
                         { label: 'Kul Leads (Total)', value: stats.total },
                         { label: 'Baante Gaye (Assigned)', value: stats.assigned },
                         { label: 'Targeted Leads', value: stats.targeted },
                         { label: 'Sahi Call (Verified)', value: stats.verified }
                       ].map((item, i) => (
                         <div key={i} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-md transition-all">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2">{item.label}</p>
                            <p className="text-3xl md:text-4xl font-black text-[#1e293b] tracking-tight">{item.value}</p>
                         </div>
                       ))}
                    </div>

                    <div className="bg-[#0f172a] p-8 md:p-12 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                       <div className="relative z-10">
                         <p className="text-xl font-black uppercase tracking-tighter mb-8">System Management</p>
                         <div className="flex flex-wrap gap-4">
                            <button onClick={() => setIsImportModalOpen(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all">Naye Leads Dalein (Import)</button>
                            <button onClick={() => setIsManualLeadModalOpen(true)} className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Ek Lead Dalein (Manual)</button>
                         </div>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    {/* Allocation List View */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                      <div className="flex-1 w-full">
                        <input type="text" placeholder="Naam se search karein..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold outline-none focus:border-indigo-600" />
                      </div>
                      <button 
                        disabled={selectedLeadIds.length === 0}
                        onClick={() => setIsAssignModalOpen(true)}
                        className="w-full md:w-auto px-10 py-3.5 bg-[#0f172a] disabled:opacity-20 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        HOD ko dein ({selectedLeadIds.length})
                      </button>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <tr>
                              <th className="px-8 py-5 w-12 text-center">
                                <input type="checkbox" onChange={(e) => {
                                  if (e.target.checked) setSelectedLeadIds(unassignedLeads.map(l => l.id));
                                  else setSelectedLeadIds([]);
                                }} className="w-4 h-4 rounded border-slate-200" />
                              </th>
                              <th className="px-8 py-5">Student Name</th>
                              <th className="px-8 py-5">Phone</th>
                              <th className="px-8 py-5 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {unassignedLeads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                              <tr key={lead.id} className={`hover:bg-slate-50/50 transition-all ${selectedLeadIds.includes(lead.id) ? 'bg-indigo-50/30' : ''}`}>
                                <td className="px-8 py-4 text-center">
                                  <input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => toggleLeadSelection(lead.id)} className="w-4 h-4 rounded border-slate-200" />
                                </td>
                                <td className="px-8 py-4 font-black text-[#1e293b] text-xs uppercase">{lead.name}</td>
                                <td className="px-8 py-4 font-bold text-slate-500 text-[10px]">{lead.phone}</td>
                                <td className="px-8 py-4 text-right"><span className="text-[8px] font-black uppercase text-amber-500">Unallocated</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          } />

          <Route path="/chat" element={<ChatSystem currentUser={currentUser} />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {currentUser.role === UserRole.ADMIN && (
            <>
              <Route path="/users" element={<UserManagement currentUser={currentUser} />} />
              <Route path="/approvals" element={<ApprovalCenter currentUser={currentUser} />} />
            </>
          )}
        </Routes>

        {/* Manual Lead Modal with Strict Validation */}
        {isManualLeadModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 bg-[#0f172a] text-white text-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">Manual Entry</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Ek Naya Lead Register Karein</p>
              </div>
              <form onSubmit={handleAddManualLead} className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Full Name</label>
                  <input 
                    type="text" 
                    value={manualLead.name} 
                    onChange={e => handleNameChange(e.target.value)} 
                    className={`w-full px-5 py-3.5 bg-slate-50 border ${nameError ? 'border-rose-500' : 'border-slate-100'} rounded-xl outline-none focus:border-indigo-600 font-bold text-sm text-[#1e293b]`} 
                    placeholder="Poora naam likhein" 
                    required 
                  />
                  {nameError && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest mt-1 ml-1">{nameError}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">+91</span>
                    <input 
                      type="text" 
                      value={manualLead.phone} 
                      onChange={e => handlePhoneChange(e.target.value)} 
                      className={`w-full pl-12 pr-5 py-3.5 bg-slate-50 border ${phoneError ? 'border-rose-500' : 'border-slate-100'} rounded-xl outline-none focus:border-indigo-600 font-bold text-sm text-[#1e293b]`} 
                      placeholder="10 Digits ka number" 
                      required 
                    />
                  </div>
                  {phoneError && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest mt-1 ml-1">{phoneError}</p>}
                </div>
                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={!!phoneError || !!nameError || !manualLead.phone || !manualLead.name}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]"
                  >
                    Lead Save Karein
                  </button>
                  <button type="button" onClick={() => { setIsManualLeadModalOpen(false); setPhoneError(''); setNameError(''); }} className="w-full py-3 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 mt-1 transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Allocate to HOD Modal */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-8 bg-[#0f172a] text-white text-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Allocate Leads</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Kis HOD ko dena hai?</p>
              </div>
              <div className="p-8 space-y-3 max-h-[400px] overflow-y-auto custom-scroll">
                {hodList.map(hod => (
                  <button key={hod.id} onClick={() => executeAllocation(hod.id)} className="w-full p-5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl flex items-center justify-between group transition-all border border-slate-100">
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-tight">{hod.name}</p>
                      <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">{hod.department}</p>
                    </div>
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                  </button>
                ))}
                <button onClick={() => setIsAssignModalOpen(false)} className="w-full py-3 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 mt-2">Band Karein</button>
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
