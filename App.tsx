
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
        <p className="text-[10px] font-black uppercase tracking-widest">{toast.message}</p>
        <button onClick={hideToast} className="ml-2 hover:opacity-50 transition-opacity">×</button>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<{ initialTab?: 'overview' | 'leads' | 'logs' | 'verification' }> = ({ initialTab = 'overview' }) => {
  const { leads, users, logs, showToast, updateUser, updateLead, deleteLead, addLog, batchAddLeads, addLead, autoDistributeLeadsToHODs, assignLeadsToHOD } = useData();
  const [adminTab, setAdminTab] = useState<'overview' | 'leads' | 'logs' | 'verification'>(initialTab);
  const [verificationSubTab, setVerificationSubTab] = useState<'completed' | 'responded'>('completed');
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [manualLead, setManualLead] = useState({ name: '', phone: '' });
  const [editingLead, setEditingLead] = useState<StudentLead | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const currentUser = JSON.parse(localStorage.getItem('ten_logged_in_user') || '{}');

  useEffect(() => {
    setAdminTab(initialTab);
  }, [initialTab]);

  const dashboardStats = useMemo(() => {
    const total = leads.length;
    const allocated = leads.filter(l => l.assignedToHOD || l.assignedToTeacher).length;
    const interested = leads.filter(l => l.response === StudentResponse.INTERESTED).length;
    const completed = leads.filter(l => l.stage !== LeadStage.UNASSIGNED && l.stage !== LeadStage.ASSIGNED).length;
    return { total, allocated, interested, completed };
  }, [leads]);

  const inflowLeads = useMemo(() => {
    return leads.filter(l => !l.assignedToHOD && (l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone.includes(searchTerm)));
  }, [leads, searchTerm]);

  const hods = useMemo(() => users.filter(u => u.role === UserRole.HOD && u.isApproved), [users]);

  const staffStats = useMemo(() => {
    return users.filter(u => u.role === UserRole.TEACHER && u.isApproved).map(teacher => {
      const teacherLeads = leads.filter(l => l.assignedToTeacher === teacher.id);
      const pending = teacherLeads.filter(l => l.stage === LeadStage.ASSIGNED || l.stage === LeadStage.UNASSIGNED).length;
      const completed = teacherLeads.length > 0 && pending === 0;
      return { teacher, total: teacherLeads.length, completed, pending };
    });
  }, [users, leads]);

  const completedStaff = useMemo(() => staffStats.filter(s => s.completed && s.teacher.verification?.status !== 'responded'), [staffStats]);
  const respondedStaff = useMemo(() => staffStats.filter(s => s.teacher.verification?.status === 'responded'), [staffStats]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        
        const newLeads: StudentLead[] = data.map((item, idx) => ({
          id: `l-${Date.now()}-${idx}`,
          name: (item.NAME || item.name || 'Unknown Student').toString().toUpperCase(),
          phone: (item['CONTACT NUMBER'] || item.CONTACT || item.phone || '').toString(),
          sourceFile: file.name,
          stage: LeadStage.UNASSIGNED,
          department: Department.IT,
          callVerified: false
        })).filter(l => l.phone.length > 0);

        if (newLeads.length > 0) {
          await batchAddLeads(newLeads, false);
          addLog(currentUser.id, currentUser.name, UserAction.IMPORT_LEADS, `Imported ${newLeads.length} leads from ${file.name}`);
        }
      } catch (err) {
        showToast("Error processing file format.", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleManualEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLead.name || !manualLead.phone) return;
    await addLead({
      id: `l-${Date.now()}`,
      name: manualLead.name.toUpperCase(),
      phone: manualLead.phone,
      sourceFile: 'Manual Entry',
      stage: LeadStage.UNASSIGNED,
      department: Department.IT,
      callVerified: false
    });
    addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Manually added student: ${manualLead.name}`);
    setManualLead({ name: '', phone: '' });
    setShowManualEntryModal(false);
  };

  const handleEditLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    await updateLead(editingLead.id, { name: editingLead.name, phone: editingLead.phone });
    showToast("Student information updated.", "success");
    setShowEditLeadModal(false);
    setEditingLead(null);
  };

  const handleAutoDistribute = async () => {
    if (inflowLeads.length === 0) {
      showToast("No leads available in the pool for distribution.", "error");
      return;
    }
    if (hods.length === 0) {
      showToast("No approved HODs available to receive leads.", "error");
      return;
    }
    if (window.confirm(`Auto-distribute ${inflowLeads.length} leads among ${hods.length} HODs?`)) {
      await autoDistributeLeadsToHODs(inflowLeads.map(l => l.id));
      addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Auto-distributed ${inflowLeads.length} leads to HODs.`);
    }
  };

  const handleDelegateToHOD = async (hodId: string) => {
    if (selectedLeadIds.length === 0) return;
    await assignLeadsToHOD(selectedLeadIds, hodId);
    setSelectedLeadIds([]);
    setShowDelegateModal(false);
  };

  const handleTriggerVerification = async (teacherId: string) => {
    const teacherLeads = leads.filter(l => l.assignedToTeacher === teacherId && l.callVerified);
    if (teacherLeads.length === 0) {
      showToast("Teacher has no verified calls to check.", "error");
      return;
    }
    const randomLead = teacherLeads[Math.floor(Math.random() * teacherLeads.length)];
    await updateUser(teacherId, {
      verification: {
        status: 'pending',
        randomLeadId: randomLead.id,
        randomLeadName: randomLead.name,
        randomLeadPhone: randomLead.phone,
        actualDuration: randomLead.callDuration || 0,
        timestamp: new Date().toISOString()
      }
    });
    addLog(currentUser?.id || 'admin', currentUser?.name || 'Admin', UserAction.VERIFICATION, `Triggered verification for ${teacherId}`);
    showToast("Verification challenge sent to teacher.", "success");
  };

  const handleResetVerification = async (teacherId: string) => {
    await updateUser(teacherId, { verification: { status: 'none' } });
    showToast("Verification status reset.", "info");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Administrative Center</p>
          <h2 className="text-2xl font-black text-slate-800 uppercase">Management Dashboard</h2>
        </div>
      </header>

      {adminTab !== 'verification' ? (
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-max shadow-inner border border-slate-200">
          <button onClick={() => setAdminTab('overview')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>Overview</button>
          <button onClick={() => setAdminTab('leads')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'leads' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>Inflow Pool</button>
          <button onClick={() => setAdminTab('logs')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>Activity Logs</button>
        </div>
      ) : (
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-max shadow-inner border border-slate-200">
          <button onClick={() => setVerificationSubTab('completed')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${verificationSubTab === 'completed' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>Staff Completed Work ({completedStaff.length})</button>
          <button onClick={() => setVerificationSubTab('responded')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${verificationSubTab === 'responded' ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>Responded Staff ({respondedStaff.length})</button>
        </div>
      )}

      {adminTab === 'overview' && (
        <div className="animate-in fade-in duration-500 space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-40">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Leads</p>
               <p className="text-5xl font-black text-slate-800 tracking-tighter">{dashboardStats.total}</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-40">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Allocated</p>
               <p className="text-5xl font-black text-indigo-600 tracking-tighter">{dashboardStats.allocated}</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-40">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Interested</p>
               <p className="text-5xl font-black text-emerald-500 tracking-tighter">{dashboardStats.interested}</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-40">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Completed</p>
               <p className="text-5xl font-black text-amber-500 tracking-tighter">{dashboardStats.completed}</p>
            </div>
          </div>

          <div className="bg-[#0f172a] p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10 mb-10">
              <h3 className="text-3xl font-black uppercase tracking-tighter">Lead Ingestion Pipeline</h3>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Excel uploads must contain 'NAME' and 'CONTACT NUMBER' columns.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
               <label className="flex-1">
                 <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                 <div className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl shadow-indigo-900/20 active:scale-95">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    Import File
                 </div>
               </label>
               <button onClick={() => setShowManualEntryModal(true)} className="flex-1 py-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95">
                 Manual Entry
               </button>
            </div>
          </div>
        </div>
      )}

      {adminTab === 'leads' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-4">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <input 
                  type="text" 
                  placeholder="Filter unassigned records..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600 transition-all shadow-inner" 
                />
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={handleAutoDistribute} className="flex-1 md:flex-none px-8 py-4 bg-[#4c47f5] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95">
                  Auto-Distribute
                </button>
                <button 
                  disabled={selectedLeadIds.length === 0} 
                  onClick={() => setShowDelegateModal(true)}
                  className={`flex-1 md:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${selectedLeadIds.length > 0 ? 'bg-slate-300 text-slate-700 shadow-md' : 'bg-slate-100 text-slate-400'}`}
                >
                  Delegate Selection ({selectedLeadIds.length})
                </button>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                   <tr>
                     <th className="p-8 w-10 text-center">
                       <input 
                        type="checkbox" 
                        onChange={e => setSelectedLeadIds(e.target.checked ? inflowLeads.map(l => l.id) : [])}
                        checked={inflowLeads.length > 0 && selectedLeadIds.length === inflowLeads.length}
                        className="w-4 h-4 rounded border-slate-300 accent-indigo-600" 
                       />
                     </th>
                     <th className="p-8">Student Identity</th>
                     <th className="p-8">Contact</th>
                     <th className="p-8">Status</th>
                     <th className="p-8 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {inflowLeads.map(lead => (
                     <tr key={lead.id} className="hover:bg-slate-50 transition-all group">
                       <td className="p-8 text-center">
                         <input 
                           type="checkbox" 
                           checked={selectedLeadIds.includes(lead.id)}
                           onChange={() => setSelectedLeadIds(prev => prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id])}
                           className="w-4 h-4 rounded border-slate-300 accent-indigo-600" 
                         />
                       </td>
                       <td className="p-8"><p className="text-[11px] font-black uppercase text-slate-800">{lead.name}</p></td>
                       <td className="p-8"><p className="text-[10px] font-black text-slate-400 tabular-nums">{lead.phone}</p></td>
                       <td className="p-8">
                         <span className="text-[8px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-500 border border-amber-100">
                           Awaiting Allocation
                         </span>
                       </td>
                       <td className="p-8 text-right space-x-2">
                         <button onClick={() => { setEditingLead(lead); setShowEditLeadModal(true); }} className="p-2.5 bg-slate-100 rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                         </button>
                         <button onClick={() => { if(window.confirm('Delete this lead permanently?')) deleteLead(lead.id); }} className="p-2.5 bg-slate-100 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                         </button>
                       </td>
                     </tr>
                   ))}
                   {inflowLeads.length === 0 && (
                     <tr>
                       <td colSpan={5} className="py-24 text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">No unallocated leads in the pool.</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}

      {adminTab === 'logs' && (
        <div className="animate-in fade-in duration-500 space-y-4">
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tighter">System Activity Logs</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{logs.length} Operations logged</span>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                   <tr>
                     <th className="px-8 py-5">Timestamp</th>
                     <th className="px-8 py-5">Personnel</th>
                     <th className="px-8 py-5">Action</th>
                     <th className="px-8 py-5">Operation Details</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {logs.map(log => (
                     <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                       <td className="px-8 py-4 text-[10px] font-black text-slate-400 tabular-nums uppercase">{new Date(log.timestamp).toLocaleString()}</td>
                       <td className="px-8 py-4"><p className="text-[11px] font-black text-slate-800 uppercase">{log.userName}</p></td>
                       <td className="px-8 py-4"><span className="text-[8px] font-black uppercase px-2 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200">{log.action}</span></td>
                       <td className="px-8 py-4 text-[10px] font-bold text-slate-500 italic">{log.details}</td>
                     </tr>
                   ))}
                   {logs.length === 0 && (
                     <tr>
                       <td colSpan={4} className="py-24 text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">No activity records found.</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}

      {adminTab === 'verification' && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(verificationSubTab === 'completed' ? completedStaff : respondedStaff).map(({ teacher, total }) => (
              <div key={teacher.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col group transition-all hover:shadow-xl relative overflow-hidden">
                {verificationSubTab === 'responded' && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12"></div>
                )}
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600 text-sm uppercase">{teacher.name.charAt(0)}</div>
                  <span className={`px-3 py-1.5 text-[8px] font-black uppercase rounded-lg border ${verificationSubTab === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                    {verificationSubTab === 'completed' ? 'Work Completed' : 'Audit Submitted'}
                  </span>
                </div>
                
                <h4 className="text-sm font-black text-slate-800 uppercase mb-1 relative z-10">{teacher.name}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6 relative z-10">{teacher.department}</p>
                
                {teacher.verification?.status === 'responded' ? (
                  <div className="space-y-4 mb-6 animate-in zoom-in-95 relative z-10">
                    <div className="p-5 bg-[#f8fafc] rounded-3xl border border-slate-100 shadow-inner">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-3 text-center tracking-widest">Verification Result</p>
                      
                      {teacher.verification.verificationDate && (
                         <p className="text-[10px] font-black text-indigo-600 uppercase text-center mb-4 tracking-widest">Verified on: {teacher.verification.verificationDate}</p>
                      )}

                      <div className="flex justify-between items-center px-2">
                        <div className="text-center">
                          <p className="text-2xl font-black text-slate-800 leading-none">{teacher.verification.teacherResponseDuration}s</p>
                          <p className="text-[7px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">Reported</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="text-center">
                          <p className={`text-2xl font-black leading-none ${Math.abs((teacher.verification.actualDuration || 0) - (teacher.verification.teacherResponseDuration || 0)) < 5 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {teacher.verification.actualDuration}s
                          </p>
                          <p className="text-[7px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">Actual Log</p>
                        </div>
                      </div>
                      
                      {teacher.verification.screenshotURL && (
                        <div className="mt-6">
                           <button 
                             onClick={() => setViewingScreenshot(teacher.verification?.screenshotURL || null)}
                             className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                           >
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                             View Call Proof
                           </button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleResetVerification(teacher.id)} className="w-full py-4 bg-white border border-slate-100 text-slate-400 text-[8px] font-black uppercase rounded-xl hover:bg-slate-50 transition-all">Archive Audit</button>
                  </div>
                ) : teacher.verification?.status === 'pending' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-indigo-100 rounded-3xl mb-6 bg-indigo-50/20">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping mb-4"></div>
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Awaiting Staff Form</p>
                    <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase italic leading-none">Target: {teacher.verification.randomLeadName}</p>
                  </div>
                ) : (
                  <div className="flex-1 mb-6 relative z-10">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">Finished processing all {total} leads. Ready for random verification audit.</p>
                    </div>
                  </div>
                )}

                {(!teacher.verification || teacher.verification.status === 'none') && (
                  <button onClick={() => handleTriggerVerification(teacher.id)} className="w-full py-5 bg-[#0f172a] text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all relative z-10">Trigger Verification</button>
                )}
              </div>
            ))}
            
            {(verificationSubTab === 'completed' ? completedStaff : respondedStaff).length === 0 && (
              <div className="col-span-full py-32 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                   <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">No staff members found in this category.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {viewingScreenshot && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 md:p-12">
          <div className="relative max-w-5xl w-full bg-white rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
             <button 
               onClick={() => setViewingScreenshot(null)}
               className="absolute top-6 right-6 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white font-black text-xl transition-all z-10"
             >
               ×
             </button>
             <div className="p-4 bg-[#0f172a] text-white text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Call Proof Screenshot</p>
             </div>
             <div className="aspect-video overflow-y-auto bg-slate-100 flex items-start justify-center">
                <img src={viewingScreenshot} alt="Call Proof" className="max-w-full" />
             </div>
          </div>
        </div>
      )}

      {showManualEntryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-[#0f172a] text-white text-center">
              <h3 className="text-xl font-black uppercase tracking-tighter">Manual Enrollment</h3>
              <p className="text-indigo-400 text-[9px] font-black uppercase tracking-widest mt-2">New student entry</p>
            </div>
            <form onSubmit={handleManualEntrySubmit} className="p-10 space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Name</label>
                 <input type="text" value={manualLead.name} onChange={e => setManualLead({...manualLead, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-indigo-500 transition-all" placeholder="Enter Full Name" required />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                 <input type="tel" value={manualLead.phone} onChange={e => setManualLead({...manualLead, phone: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-indigo-500 transition-all" placeholder="Enter Phone Number" required />
               </div>
               <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">Submit Entry</button>
               <button type="button" onClick={() => setShowManualEntryModal(false)} className="w-full text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {showEditLeadModal && editingLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-[#0f172a] text-white text-center">
              <h3 className="text-xl font-black uppercase tracking-tighter">Edit Record</h3>
              <p className="text-indigo-400 text-[9px] font-black uppercase tracking-widest mt-2">Update student information</p>
            </div>
            <form onSubmit={handleEditLeadSubmit} className="p-10 space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Name</label>
                 <input type="text" value={editingLead.name} onChange={e => setEditingLead({...editingLead, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-indigo-500 transition-all" required />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                 <input type="tel" value={editingLead.phone} onChange={e => setEditingLead({...editingLead, phone: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-indigo-500 transition-all" required />
               </div>
               <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">Save Changes</button>
               <button type="button" onClick={() => { setShowEditLeadModal(false); setEditingLead(null); }} className="w-full text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {showDelegateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-tight">Delegate to HOD</h3>
              <button onClick={() => setShowDelegateModal(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">×</button>
            </div>
            <div className="p-6 space-y-2 max-h-96 overflow-y-auto custom-scroll">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Select Target Department Head</p>
              {hods.map(hod => (
                <button key={hod.id} onClick={() => handleDelegateToHOD(hod.id)} className="w-full p-5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl text-left transition-all border border-slate-100 flex justify-between items-center group">
                  <div>
                    <p className="text-[11px] font-black uppercase leading-none mb-1">{hod.name}</p>
                    <p className="text-[9px] opacity-60 uppercase font-bold tracking-tight">{hod.department}</p>
                  </div>
                  <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                </button>
              ))}
              {hods.length === 0 && (
                <div className="p-10 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">No active HODs available for delegation.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-50">
              <button onClick={() => setShowDelegateModal(false)} className="w-full py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-600">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const { users, addLog, showToast } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
    if (currentUser) addLog(currentUser.id, currentUser.name, UserAction.LOGOUT, 'User session terminated.');
    localStorage.removeItem('ten_logged_in_user');
    setCurrentUser(null);
  };

  if (!currentUser) return <Router><ToastNotification /><Routes><Route path="*" element={<AuthHub onLogin={handleLogin} />} /></Routes></Router>;

  return (
    <Router>
      <ToastNotification />
      <Layout user={currentUser} onLogout={handleLogout}>
        <Routes>
          <Route path="/dashboard" element={
            currentUser.role === UserRole.TEACHER ? (
              <TeacherDashboard currentUser={currentUser} initialTab="pending" />
            ) : currentUser.role === UserRole.HOD ? (
              <HODDashboard currentUser={currentUser} />
            ) : (
              <AdminDashboard initialTab="overview" />
            )
          } />
          <Route path="/staff-audit" element={
            currentUser.role === UserRole.ADMIN ? (
              <AdminDashboard initialTab="verification" />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          } />
          <Route path="/verification" element={<TeacherDashboard currentUser={currentUser} initialTab="verification" />} />
          <Route path="/student-leads" element={<StudentLeads />} />
          <Route path="/analytics" element={<GlobalAnalytics />} />
          <Route path="/users" element={<UserManagement currentUser={currentUser} />} />
          <Route path="/approvals" element={<ApprovalCenter currentUser={currentUser} />} />
          <Route path="/chat" element={<ChatSystem currentUser={currentUser} />} />
          <Route path="/support" element={<AIChatbot />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
