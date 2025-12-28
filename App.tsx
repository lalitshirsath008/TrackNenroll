
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

  // Manual Lead State
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
    targeted: leads.filter(l => l.stage === LeadStage.TARGETED).length,
    verified: leads.filter(l => l.callVerified).length
  }), [leads]);

  const unassignedLeads = useMemo(() => leads.filter(l => !l.assignedToHOD), [leads]);
  const hodList = useMemo(() => users.filter(u => u.role === UserRole.HOD && u.isApproved), [users]);

  // Real-time Validation for Manual Entry
  const handlePhoneInput = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setManualLead(prev => ({ ...prev, phone: cleaned }));
    if (cleaned.length > 0 && cleaned.length < 10) {
      setFormErrors(prev => ({ ...prev, phone: 'Enter exactly 10 digits' }));
    } else {
      setFormErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleNameInput = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z\s]/g, '');
    setManualLead(prev => ({ ...prev, name: cleaned }));
    if (cleaned.length > 0 && cleaned.length < 3) {
      setFormErrors(prev => ({ ...prev, name: 'Name is too short' }));
    } else {
      setFormErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualLead.phone.length !== 10 || manualLead.name.length < 3) return;

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
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Admin Panel</p>
                    <h2 className="text-3xl font-black text-[#1e293b] tracking-tighter uppercase leading-none">Management Hub</h2>
                  </div>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button onClick={() => setAdminTab('overview')} className={`px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Stats</button>
                    <button onClick={() => setAdminTab('leads')} className={`px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === 'leads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Assign Leads ({unassignedLeads.length})</button>
                  </div>
                </header>
                
                {adminTab === 'overview' ? (
                  <div className="space-y-6 md:space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                       {[
                         { label: 'Total Leads', value: stats.total },
                         { label: 'Assigned', value: stats.assigned },
                         { label: 'Interested', value: stats.targeted },
                         { label: 'Verified Calls', value: stats.verified }
                       ].map((item, i) => (
                         <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">{item.label}</p>
                            <p className="text-3xl font-black text-[#1e293b]">{item.value}</p>
                         </div>
                       ))}
                    </div>

                    <div className="bg-[#0f172a] p-8 md:p-12 rounded-[2.5rem] text-white shadow-xl">
                       <p className="text-xl font-black uppercase tracking-tighter mb-8">Quick Actions</p>
                       <div className="flex flex-wrap gap-4">
                          <button onClick={() => setIsImportModalOpen(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700">Import Excel</button>
                          <button onClick={() => setIsManualLeadModalOpen(true)} className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700">Add One Student</button>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                      <input type="text" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold outline-none" />
                      <button disabled={selectedLeadIds.length === 0} onClick={() => setIsAssignModalOpen(true)} className="w-full md:w-auto px-10 py-3.5 bg-[#0f172a] disabled:opacity-20 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Send to HOD ({selectedLeadIds.length})</button>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
                            <tr>
                              <th className="px-8 py-5 w-12 text-center">
                                <input type="checkbox" onChange={(e) => setSelectedLeadIds(e.target.checked ? unassignedLeads.map(l => l.id) : [])} className="w-4 h-4 rounded" />
                              </th>
                              <th className="px-8 py-5">Name</th>
                              <th className="px-8 py-5">Phone</th>
                              <th className="px-8 py-5 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {unassignedLeads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                              <tr key={lead.id} className="hover:bg-slate-50">
                                <td className="px-8 py-4 text-center">
                                  <input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => setSelectedLeadIds(prev => prev.includes(lead.id) ? prev.filter(i => i !== lead.id) : [...prev, lead.id])} className="w-4 h-4 rounded" />
                                </td>
                                <td className="px-8 py-4 font-black text-[#1e293b] text-xs uppercase">{lead.name}</td>
                                <td className="px-8 py-4 font-bold text-slate-500 text-[10px]">{lead.phone}</td>
                                <td className="px-8 py-4 text-right"><span className="text-[8px] font-black uppercase text-amber-500">Unassigned</span></td>
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

          <Route path="/users" element={<UserManagement currentUser={currentUser} />} />
          <Route path="/approvals" element={<ApprovalCenter currentUser={currentUser} />} />
          <Route path="/chat" element={<ChatSystem currentUser={currentUser} />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Manual Lead Modal with Real-time Validation */}
        {isManualLeadModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 bg-[#0f172a] text-white text-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Manual Entry</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Add New Student Lead</p>
              </div>
              <form onSubmit={handleAddManualLead} className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input type="text" value={manualLead.name} onChange={e => handleNameInput(e.target.value)} className={`w-full px-5 py-3.5 bg-slate-50 border ${formErrors.name ? 'border-rose-500' : 'border-slate-100'} rounded-xl outline-none focus:border-indigo-600 font-bold text-sm`} placeholder="Student Name" required />
                  {formErrors.name && <p className="text-rose-500 text-[8px] font-black uppercase mt-1">{formErrors.name}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">+91</span>
                    <input type="text" value={manualLead.phone} onChange={e => handlePhoneInput(e.target.value)} className={`w-full pl-12 pr-5 py-3.5 bg-slate-50 border ${formErrors.phone ? 'border-rose-500' : 'border-slate-100'} rounded-xl outline-none focus:border-indigo-600 font-bold text-sm`} placeholder="10 Digit Number" required />
                  </div>
                  {formErrors.phone && <p className="text-rose-500 text-[8px] font-black uppercase mt-1">{formErrors.phone}</p>}
                </div>
                <div className="pt-4">
                  <button type="submit" disabled={!manualLead.name || manualLead.phone.length !== 10} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all">Save Student</button>
                  <button type="button" onClick={() => setIsManualLeadModalOpen(false)} className="w-full py-3 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 mt-1">Cancel</button>
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
                <h3 className="text-2xl font-black uppercase tracking-tighter">Assign to HOD</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Choose a department head</p>
              </div>
              <div className="p-8 space-y-3 max-h-[400px] overflow-y-auto">
                {hodList.map(hod => (
                  <button key={hod.id} onClick={async () => { await assignLeadsToHOD(selectedLeadIds, hod.id); setSelectedLeadIds([]); setIsAssignModalOpen(false); }} className="w-full p-5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl flex items-center justify-between group transition-all">
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-tight">{hod.name}</p>
                      <p className="text-[9px] font-bold opacity-60 uppercase">{hod.department}</p>
                    </div>
                  </button>
                ))}
                <button onClick={() => setIsAssignModalOpen(false)} className="w-full py-3 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 mt-2">Close</button>
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
