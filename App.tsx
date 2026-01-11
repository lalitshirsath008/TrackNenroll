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

const CircularProgress: React.FC<{ 
  percentage: number; 
  label: string; 
  color: string; 
  size?: 'sm' | 'md' | 'lg';
  strokeWidth?: number;
}> = ({ percentage, label, color, size = 'md', strokeWidth = 8 }) => {
  const radius = 40;
  const viewBoxSize = 100;
  const center = viewBoxSize / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const containerClasses = {
    sm: 'w-16 h-16 md:w-24 md:h-24',
    md: 'w-24 h-24 md:w-32 md:h-32',
    lg: 'w-32 h-32 md:w-40 md:h-40'
  };

  const textClasses = {
    sm: 'text-[9px] font-black',
    md: 'text-base font-black',
    lg: 'text-xl font-black'
  };

  return (
    <div className="flex flex-col items-center shrink-0">
      <div className={`relative ${containerClasses[size]} flex items-center justify-center`}>
        <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="w-full h-full transform -rotate-90 overflow-visible">
          <circle cx={center} cy={center} r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
          <circle cx={center} cy={center} r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-out' }} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${textClasses[size]} text-slate-800 tabular-nums`}>{percentage}%</span>
        </div>
      </div>
      <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 text-center truncate w-full px-1">{label}</p>
    </div>
  );
};

const ToastNotification: React.FC = () => {
  const { toast, hideToast } = useData();
  if (!toast) return null;
  return (
    <div className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-top-4 duration-300 w-[90%] md:w-auto">
      <div className={`px-5 py-3.5 md:px-6 md:py-4 rounded-xl md:rounded-2xl shadow-2xl flex items-center justify-between gap-3 border backdrop-blur-md ${
        toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' :
        toast.type === 'error' ? 'bg-rose-600 border-rose-400 text-white' :
        'bg-[#0f172a] border-slate-700 text-white'
      }`}>
        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-tight">{toast.message}</p>
        <button onClick={hideToast} className="hover:opacity-50 transition-opacity p-1">×</button>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<{ initialTab?: 'overview' | 'leads' | 'logs' | 'verification' }> = ({ initialTab = 'overview' }) => {
  const { leads, users, logs, showToast, updateUser, updateLead, deleteLead, addLog, batchAddLeads, addLead, autoDistributeLeadsToHODs, assignLeadsToHOD } = useData();
  const [adminTab, setAdminTab] = useState<'overview' | 'leads' | 'logs' | 'verification'>(initialTab);
  const [verificationSubTab, setVerificationSubTab] = useState<'completed' | 'responded' | 'approved'>('completed');
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<StudentLead | null>(null);
  const [showHODPickerModal, setShowHODPickerModal] = useState(false);
  const [manualLead, setManualLead] = useState({ name: '', phone: '' });
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const currentUser = JSON.parse(localStorage.getItem('ten_logged_in_user') || '{}');
  const isPrincipal = currentUser.role === UserRole.SUPER_ADMIN;

  useEffect(() => { setAdminTab(initialTab); }, [initialTab]);

  const dashboardStats = useMemo(() => {
    const total = leads.length;
    const allocated = leads.filter(l => l.assignedToHOD || l.assignedToTeacher).length;
    const interested = leads.filter(l => l.response === StudentResponse.INTERESTED).length;
    const completed = leads.filter(l => l.stage !== LeadStage.UNASSIGNED && l.stage !== LeadStage.ASSIGNED).length;
    return { total, allocated, interested, completed };
  }, [leads]);

  const funnelStats = useMemo(() => {
    const total = leads.length || 1;
    return {
      targeted: Math.round((leads.filter(l => l.stage === LeadStage.TARGETED).length / total) * 100),
      discarded: Math.round((leads.filter(l => l.stage === LeadStage.DISCARDED).length / total) * 100),
      forwarded: Math.round((leads.filter(l => l.stage === LeadStage.FORWARDED).length / total) * 100)
    };
  }, [leads]);

  const deptPerformance = useMemo(() => {
    return Object.values(Department).map(dept => {
      const deptLeads = leads.filter(l => l.department === dept);
      const successful = deptLeads.filter(l => l.stage === LeadStage.TARGETED).length;
      return { name: dept.split(' ')[0], percentage: deptLeads.length > 0 ? Math.round((successful / deptLeads.length) * 100) : 0 };
    });
  }, [leads]);

  const inflowLeads = useMemo(() => {
    return leads.filter(l => !l.assignedToHOD && (l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone.includes(searchTerm)));
  }, [leads, searchTerm]);

  const hods = useMemo(() => users.filter(u => u.role === UserRole.HOD && u.isApproved), [users]);

  const staffStats = useMemo(() => {
    return users.filter(u => u.role === UserRole.TEACHER && u.isApproved).map(teacher => {
      const teacherLeads = leads.filter(l => l.assignedToTeacher === teacher.id);
      const pendingWork = teacherLeads.filter(l => l.stage === LeadStage.ASSIGNED || l.stage === LeadStage.UNASSIGNED).length;
      const workFinished = teacherLeads.length > 0 && pendingWork === 0;
      return { teacher, totalLeads: teacherLeads.length, workFinished, pendingWork };
    });
  }, [users, leads]);

  const completedStaff = staffStats.filter(s => s.workFinished && (!s.teacher.verification || s.teacher.verification.status === 'none' || s.teacher.verification.status === 'rejected'));
  const respondedStaff = staffStats.filter(s => s.teacher.verification?.status === 'responded');
  const approvedStaff = staffStats.filter(s => s.teacher.verification?.status === 'approved');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        const newLeads: StudentLead[] = data.map((item, idx) => ({
          id: `l-${Date.now()}-${idx}`,
          name: (item.NAME || item.name || 'Unknown Student').toString().toUpperCase(),
          phone: (item['CONTACT NUMBER'] || item.CONTACT || item.phone || '').toString().replace(/\D/g, '').slice(0, 10),
          sourceFile: file.name,
          stage: LeadStage.UNASSIGNED,
          department: Department.IT,
          callVerified: false
        })).filter(l => l.phone.length > 0);
        if (newLeads.length > 0) {
          await batchAddLeads(newLeads, false);
          addLog(currentUser.id, currentUser.name, UserAction.IMPORT_LEADS, `Imported ${newLeads.length} leads from ${file.name}`);
        }
      } catch (err) { showToast("Error processing file format.", "error"); }
    };
    reader.readAsBinaryString(file);
  };

  const handleManualEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLead.name || !manualLead.phone) return;
    if (manualLead.phone.length !== 10) { showToast("Please enter a valid 10-digit mobile number.", "error"); return; }
    await addLead({ id: `l-${Date.now()}`, name: manualLead.name.toUpperCase(), phone: manualLead.phone, sourceFile: 'Manual Entry', stage: LeadStage.UNASSIGNED, department: Department.IT, callVerified: false });
    addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Manually added student: ${manualLead.name}`);
    setManualLead({ name: '', phone: '' });
    setShowManualEntryModal(false);
  };

  const handleAutoDistribute = async () => {
    if (inflowLeads.length === 0) {
      showToast("No leads available to distribute.", "info");
      return;
    }
    if (window.confirm(`Distribute ${inflowLeads.length} leads among available HODs?`)) {
      await autoDistributeLeadsToHODs(inflowLeads.map(l => l.id));
      addLog(currentUser.id, currentUser.name, UserAction.IMPORT_LEADS, `Distributed ${inflowLeads.length} leads to HODs.`);
      showToast("Leads distributed successfully.", "success");
    }
  };

  const handleTriggerVerification = async (teacherId: string) => {
    const teacherLeads = leads.filter(l => l.assignedToTeacher === teacherId && l.callVerified);
    if (teacherLeads.length === 0) { showToast("Teacher has no verified calls to audit.", "error"); return; }
    const randomLead = teacherLeads[Math.floor(Math.random() * teacherLeads.length)];
    await updateUser(teacherId, { verification: { status: 'pending', randomLeadId: randomLead.id, randomLeadName: randomLead.name, randomLeadPhone: randomLead.phone, actualDuration: randomLead.callDuration || 0, timestamp: randomLead.callTimestamp || new Date().toISOString() } });
    showToast("Audit challenge sent successfully.", "success");
  };

  const handleApproveVerification = async (teacherId: string) => {
    const teacher = users.find(u => u.id === teacherId);
    if (!teacher || !teacher.verification) return;
    await updateUser(teacherId, { verification: { ...teacher.verification, status: 'approved' } });
    showToast("Audit data approved.", "success");
  };

  const handleRejectVerification = async (teacherId: string) => {
    const teacher = users.find(u => u.id === teacherId);
    if (!teacher || !teacher.verification) return;
    const reason = window.prompt("Institutional Reason for Rejection:", "Evidence provided is insufficient.");
    if (reason !== null) {
      await updateUser(teacherId, { verification: { ...teacher.verification, status: 'rejected', rejectionReason: reason, screenshotURL: undefined, teacherResponseDuration: undefined } });
      showToast("Audit rejected. Staff notified.", "info");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return 'Invalid';
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {viewingScreenshot && (
        <div className="fixed inset-0 z-[5000] bg-black/90 flex items-center justify-center p-4" onClick={() => setViewingScreenshot(null)}>
           <div className="max-w-4xl w-full bg-white rounded-3xl overflow-hidden p-2 relative">
              <button className="absolute top-4 right-4 bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center font-black" onClick={() => setViewingScreenshot(null)}>×</button>
              <img src={viewingScreenshot} alt="Evidence" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl" />
           </div>
        </div>
      )}

      <header className="flex flex-col gap-4">
        <div>
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Administrative Center</p>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight leading-none mt-1">Institutional Oversight</h2>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl md:rounded-2xl w-full shadow-inner border border-slate-200 overflow-x-auto no-scrollbar">
          <button onClick={() => setAdminTab('overview')} className={`flex-1 px-4 md:px-8 py-3 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${adminTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Overview</button>
          {!isPrincipal && (
            <>
              <button onClick={() => setAdminTab('leads')} className={`flex-1 px-4 md:px-8 py-3 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${adminTab === 'leads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Inflow Pool</button>
              <button onClick={() => setAdminTab('verification')} className={`flex-1 px-4 md:px-8 py-3 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${adminTab === 'verification' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>Audits</button>
            </>
          )}
          <button onClick={() => setAdminTab('logs')} className={`flex-1 px-4 md:px-8 py-3 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${adminTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Activity</button>
        </div>
      </header>

      {adminTab === 'overview' ? (
        <div className="space-y-6 md:space-y-10">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
             {[
               { label: 'TOTAL LEADS', value: dashboardStats.total, color: 'text-slate-800' },
               { label: 'ALLOCATED', value: dashboardStats.allocated, color: 'text-[#4c47f5]' },
               { label: 'INTERESTED', value: dashboardStats.interested, color: 'text-emerald-500' },
               { label: 'COMPLETED', value: dashboardStats.completed, color: 'text-amber-500' }
             ].map((stat, i) => (
               <div key={i} className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center h-32 md:h-44">
                 <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                 <p className={`text-3xl md:text-5xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
               </div>
             ))}
           </div>
           {isPrincipal ? (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-50 shadow-sm flex flex-col items-center">
                   <h3 className="text-sm md:text-lg font-black uppercase tracking-tighter text-slate-800 mb-8 md:mb-12 self-start">Admission Conversion Funnel</h3>
                   <div className="flex flex-wrap justify-center gap-8 md:gap-12 w-full">
                      <CircularProgress percentage={funnelStats.targeted} label="Targeted" color="#059669" size="md" />
                      <CircularProgress percentage={funnelStats.discarded} label="Discarded" color="#e11d48" size="md" />
                      <CircularProgress percentage={funnelStats.forwarded} label="Forwarded" color="#4f46e5" size="md" />
                   </div>
                </div>
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-50 shadow-sm flex flex-col">
                   <h3 className="text-sm md:text-lg font-black uppercase tracking-tighter text-slate-800 mb-8 md:mb-12">Institutional Yield (By Branch)</h3>
                   <div className="grid grid-cols-3 sm:grid-cols-4 gap-y-8 gap-x-4">
                      {deptPerformance.map((dept, i) => <CircularProgress key={i} percentage={dept.percentage} label={dept.name} color="#6366f1" size="sm" strokeWidth={6} />)}
                   </div>
                </div>
             </div>
           ) : (
             <div className="bg-[#0f172a] rounded-[2rem] md:rounded-[3.5rem] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-[80px]"></div>
               <div className="relative z-10 text-center md:text-left">
                 <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-2">Lead Ingestion Portal</h3>
                 <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8 md:mb-10">Upload student records via Excel or Manual Entry for institutional processing.</p>
                 <div className="flex flex-col sm:flex-row gap-3">
                   <label className="flex-1 py-4 md:py-5 bg-indigo-600 text-white rounded-2xl md:rounded-3xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl cursor-pointer hover:bg-indigo-700 text-center">IMPORT EXCEL POOL<input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} /></label>
                   <button onClick={() => setShowManualEntryModal(true)} className="flex-1 py-4 md:py-5 bg-[#1e293b] text-white rounded-2xl md:rounded-3xl font-black text-[9px] md:text-[10px] uppercase tracking-widest border border-white/5 shadow-xl">MANUAL ADMISSION</button>
                 </div>
               </div>
             </div>
           )}
        </div>
      ) : adminTab === 'leads' ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <input type="text" placeholder="Search pool..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" />
            <button onClick={handleAutoDistribute} className="w-full md:w-auto px-8 py-3.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Smart Distribute</button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#fcfdfe] text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <tr><th className="p-5 w-10 text-center"><input type="checkbox" onChange={(e) => setSelectedLeadIds(e.target.checked ? inflowLeads.map(l => l.id) : [])} className="w-4 h-4 rounded" /></th><th className="p-5">Identity</th><th className="p-5">Inflow Source</th><th className="p-5 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {inflowLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="p-5 text-center"><input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => setSelectedLeadIds(p => p.includes(lead.id) ? p.filter(i => i !== lead.id) : [...p, lead.id])} className="w-4 h-4 rounded" /></td>
                      <td className="p-5"><p className="text-[11px] font-black uppercase text-slate-800 leading-none mb-1">{lead.name}</p><p className="text-[9px] font-bold text-indigo-600/60">{lead.phone}</p></td>
                      <td className="p-5 text-[9px] font-bold text-slate-400 uppercase">{lead.sourceFile}</td>
                      <td className="p-5 text-right"><button onClick={() => { if(window.confirm('Erase this record?')) deleteLead(lead.id); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : adminTab === 'logs' ? (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
             <table className="w-full text-left min-w-[600px]">
               <thead className="bg-[#fcfdfe] text-[8px] font-black text-slate-400 uppercase border-b border-slate-50 tracking-widest">
                 <tr><th className="p-6">Staff Personnel</th><th className="p-6">Transaction</th><th className="p-6">Details</th><th className="p-6 text-right">Time</th></tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {logs.map(log => (
                   <tr key={log.id} className="hover:bg-slate-50/50">
                     <td className="p-6"><p className="text-[10px] font-black text-slate-800 uppercase leading-none">{log.userName}</p></td>
                     <td className="p-6"><span className="text-[8px] font-black uppercase px-2 py-1 rounded bg-indigo-50 text-indigo-600">{log.action}</span></td>
                     <td className="p-6 text-[10px] font-bold text-slate-500">{log.details}</td>
                     <td className="p-6 text-right text-[9px] font-black text-slate-300 uppercase">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="flex bg-slate-100 p-1 rounded-xl w-max shadow-inner overflow-x-auto no-scrollbar">
             <button onClick={() => setVerificationSubTab('completed')} className={`px-5 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${verificationSubTab === 'completed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Target List ({completedStaff.length})</button>
             <button onClick={() => setVerificationSubTab('responded')} className={`px-5 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${verificationSubTab === 'responded' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}>Review ({respondedStaff.length})</button>
             <button onClick={() => setVerificationSubTab('approved')} className={`px-5 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${verificationSubTab === 'approved' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>History ({approvedStaff.length})</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {(verificationSubTab === 'completed' ? completedStaff : verificationSubTab === 'responded' ? respondedStaff : approvedStaff).map(item => (
               <div key={item.teacher.id} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col hover:shadow-xl transition-all">
                 <div className="flex justify-between items-start mb-6">
                   <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center font-black text-indigo-600 uppercase text-base">{item.teacher.name.charAt(0)}</div>
                   <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-500">{item.teacher.verification?.status || 'Awaiting'}</span>
                 </div>
                 <h4 className="text-base font-black text-slate-800 uppercase tracking-tight mb-1 truncate">{item.teacher.name}</h4>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-8">{item.teacher.department}</p>
                 <div className="border-t border-slate-50 pt-8 space-y-4">
                   {verificationSubTab === 'responded' && item.teacher.verification && (
                     <>
                       <div className="bg-slate-50 p-4 rounded-xl">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Subject</p>
                          <p className="text-[11px] font-black text-slate-800 uppercase">{item.teacher.verification.randomLeadName}</p>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-3">
                         <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                           <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Actual Duration</p>
                           <p className="text-sm font-black text-indigo-600">{item.teacher.verification.actualDuration}s</p>
                         </div>
                         <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                           <p className="text-[7px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Reported Duration</p>
                           <p className="text-sm font-black text-rose-600">{item.teacher.verification.teacherResponseDuration}s</p>
                         </div>
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                         <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                           <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Actual Date</p>
                           <p className="text-[10px] font-black text-indigo-600 uppercase">{formatDate(item.teacher.verification.timestamp)}</p>
                         </div>
                         <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                           <p className="text-[7px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Reported Date</p>
                           <p className="text-[10px] font-black text-rose-600 uppercase">{formatDate(item.teacher.verification.verificationDate)}</p>
                         </div>
                       </div>

                       <button onClick={() => setViewingScreenshot(item.teacher.verification?.screenshotURL || null)} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[8px] font-black uppercase text-indigo-600 hover:bg-indigo-50 transition-colors">Inspect Evidence Attachment</button>
                       <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleRejectVerification(item.teacher.id)} className="py-4 bg-rose-500 text-white rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 transition-all">Reject Proof</button>
                          <button onClick={() => handleApproveVerification(item.teacher.id)} className="py-4 bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 transition-all">Approve Session</button>
                       </div>
                     </>
                   )}
                   {verificationSubTab === 'completed' && <button onClick={() => handleTriggerVerification(item.teacher.id)} className="w-full py-4 bg-[#0f172a] text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl">Initiate Audit</button>}
                   {verificationSubTab === 'approved' && <div className="w-full py-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center"><p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Audit Passed</p></div>}
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ten_logged_in_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (u: User) => {
    localStorage.setItem('ten_logged_in_user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('ten_logged_in_user');
    setUser(null);
  };

  if (!user) {
    return (
      <Router>
        <ToastNotification />
        <Routes>
          <Route path="/login" element={<AuthHub onLogin={handleLogin} />} />
          <Route path="/register" element={<AuthHub onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <ToastNotification />
        <Routes>
          {/* Dashboard Route */}
          <Route path="/dashboard" element={
            user.role === UserRole.TEACHER ? <TeacherDashboard currentUser={user} /> :
            user.role === UserRole.HOD ? <HODDashboard currentUser={user} /> :
            <AdminDashboard />
          } />

          {/* Role specific routes */}
          {(user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) && (
            <>
              <Route path="/users" element={<UserManagement currentUser={user} />} />
              <Route path="/approvals" element={<ApprovalCenter currentUser={user} />} />
              <Route path="/student-leads" element={<StudentLeads />} />
              <Route path="/staff-audit" element={<AdminDashboard initialTab="verification" />} />
            </>
          )}

          {user.role === UserRole.SUPER_ADMIN && (
            <Route path="/analytics" element={<GlobalAnalytics />} />
          )}

          {user.role === UserRole.TEACHER && (
            <Route path="/verification" element={<TeacherDashboard currentUser={user} initialTab="verification" />} />
          )}

          {/* Common routes */}
          <Route path="/chat" element={<ChatSystem currentUser={user} />} />
          <Route path="/support" element={<AIChatbot />} />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;