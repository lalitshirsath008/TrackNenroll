
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
    sm: 'w-20 h-20 md:w-24 md:h-24',
    md: 'w-28 h-28 md:w-32 md:h-32',
    lg: 'w-36 h-36 md:w-40 md:h-40'
  };

  const textClasses = {
    sm: 'text-[11px] font-black',
    md: 'text-lg font-black',
    lg: 'text-2xl font-black'
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${containerClasses[size]} flex items-center justify-center`}>
        <svg 
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} 
          className="w-full h-full transform -rotate-90 overflow-visible"
        >
          {/* Background Circle */}
          <circle 
            cx={center} 
            cy={center} 
            r={radius} 
            stroke="#f1f5f9" 
            strokeWidth={strokeWidth} 
            fill="transparent" 
          />
          {/* Progress Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 1s ease-out'
            }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${textClasses[size]} text-slate-800 tabular-nums`}>{percentage}%</span>
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 text-center truncate w-full px-2">{label}</p>
    </div>
  );
};

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
      return {
        name: dept.split(' ')[0], // Short name
        percentage: deptLeads.length > 0 ? Math.round((successful / deptLeads.length) * 100) : 0
      };
    });
  }, [leads]);

  const inflowLeads = useMemo(() => {
    return leads.filter(l => !l.assignedToHOD && (l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone.includes(searchTerm)));
  }, [leads, searchTerm]);

  const hods = useMemo(() => users.filter(u => u.role === UserRole.HOD && u.isApproved), [users]);

  // Filter logic for verification staff
  const teachersWithVerification = useMemo(() => {
    return users
      .filter(u => u.role === UserRole.TEACHER && u.isApproved)
      .map(teacher => ({ teacher }));
  }, [users]);

  const completedStaff = useMemo(() => 
    teachersWithVerification.filter(item => 
      !item.teacher.verification || 
      item.teacher.verification.status === 'none' || 
      item.teacher.verification.status === 'rejected'
    )
  , [teachersWithVerification]);

  const respondedStaff = useMemo(() => 
    teachersWithVerification.filter(item => item.teacher.verification?.status === 'responded')
  , [teachersWithVerification]);

  const approvedStaff = useMemo(() => 
    teachersWithVerification.filter(item => item.teacher.verification?.status === 'approved')
  , [teachersWithVerification]);

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
      } catch (err) {
        showToast("Error processing file format.", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleManualEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLead.name || !manualLead.phone) return;
    if (manualLead.phone.length !== 10) {
      showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }
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
    if (editingLead.phone.length !== 10) {
      showToast("Mobile number must be exactly 10 digits.", "error");
      return;
    }
    await updateLead(editingLead.id, {
      name: editingLead.name.toUpperCase(),
      phone: editingLead.phone
    });
    addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Updated lead info for: ${editingLead.name}`);
    showToast("Student information updated successfully.", "success");
    setEditingLead(null);
    setShowEditLeadModal(false);
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
    if (window.confirm(`Smart Distribute ${inflowLeads.length} leads among ${hods.length} HODs using round-robin?`)) {
      await autoDistributeLeadsToHODs(inflowLeads.map(l => l.id));
      addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Smart Distributed ${inflowLeads.length} leads to HODs.`);
      setSelectedLeadIds([]);
    }
  };

  const handleManualDelegation = async (hodId: string) => {
    if (selectedLeadIds.length === 0) return;
    const targetHOD = hods.find(h => h.id === hodId);
    if (!targetHOD) return;
    await assignLeadsToHOD(selectedLeadIds, hodId);
    showToast(`${selectedLeadIds.length} leads delegated to ${targetHOD.name}.`, "success");
    addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Manually delegated ${selectedLeadIds.length} leads to HOD ${targetHOD.name}`);
    setSelectedLeadIds([]);
    setShowHODPickerModal(false);
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

  const handleApproveVerification = async (teacherId: string) => {
    const teacher = users.find(u => u.id === teacherId);
    if (!teacher || !teacher.verification) return;
    await updateUser(teacherId, {
      verification: { ...teacher.verification, status: 'approved' }
    });
    showToast("Verification approved.", "success");
    addLog(currentUser.id, currentUser.name, UserAction.VERIFICATION, `Approved verification for ${teacher.name}`);
  };

  const handleRejectVerification = async (teacherId: string) => {
    const teacher = users.find(u => u.id === teacherId);
    if (!teacher || !teacher.verification) return;
    if (window.confirm(`Reject this verification? Staff member ${teacher.name} will have to re-submit the form.`)) {
      await updateUser(teacherId, {
        verification: {
          ...teacher.verification,
          status: 'rejected',
          screenshotURL: undefined,
          teacherResponseDuration: undefined
        }
      });
      showToast("Verification rejected. Request sent back to staff.", "info");
      addLog(currentUser.id, currentUser.name, UserAction.VERIFICATION, `Rejected verification for ${teacher.name}`);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Administrative Center</p>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Management Dashboard</h2>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-max shadow-inner border border-slate-200 overflow-x-auto">
          <button onClick={() => setAdminTab('overview')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>Overview</button>
          {!isPrincipal && (
            <>
              <button onClick={() => setAdminTab('leads')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'leads' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>Inflow Pool</button>
              <button onClick={() => setAdminTab('verification')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'verification' ? 'bg-white text-rose-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>Verification</button>
            </>
          )}
          <button onClick={() => setAdminTab('logs')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>Activity Logs</button>
        </div>
      </header>

      {adminTab === 'overview' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
           {/* Stat Cards */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             {[
               { label: 'TOTAL LEADS', value: dashboardStats.total, color: 'text-slate-800' },
               { label: 'ALLOCATED', value: dashboardStats.allocated, color: 'text-[#4c47f5]' },
               { label: 'INTERESTED', value: dashboardStats.interested, color: 'text-emerald-500' },
               { label: 'COMPLETED', value: dashboardStats.completed, color: 'text-amber-500' }
             ].map((stat, i) => (
               <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center h-44 hover:shadow-xl transition-all">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                 <p className={`text-6xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
               </div>
             ))}
           </div>

           {isPrincipal ? (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lead Conversion Funnel */}
                <div className="bg-white p-10 md:p-12 rounded-[3.5rem] border border-slate-50 shadow-sm flex flex-col items-center">
                   <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 mb-12 self-start">Lead Conversion Funnel</h3>
                   <div className="flex flex-wrap justify-center gap-10 md:gap-12 w-full">
                      <CircularProgress percentage={funnelStats.targeted} label="Targeted" color="#059669" size="md" />
                      <CircularProgress percentage={funnelStats.discarded} label="Discarded" color="#e11d48" size="md" />
                      <CircularProgress percentage={funnelStats.forwarded} label="Forwarded" color="#4f46e5" size="md" />
                   </div>
                </div>

                {/* Department Performance */}
                <div className="bg-white p-10 md:p-12 rounded-[3.5rem] border border-slate-50 shadow-sm flex flex-col">
                   <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 mb-12">Department Performance</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-12 gap-x-6">
                      {deptPerformance.map((dept, i) => (
                        <CircularProgress 
                          key={i} 
                          percentage={dept.percentage} 
                          label={dept.name} 
                          color="#6366f1" 
                          size="sm"
                          strokeWidth={7}
                        />
                      ))}
                   </div>
                </div>
             </div>
           ) : (
             <div className="bg-[#0f172a] rounded-[3.5rem] p-12 md:p-20 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -mr-64 -mt-64 blur-[120px]"></div>
               <div className="relative z-10">
                 <h3 className="text-3xl font-black uppercase tracking-tight mb-2">LEAD INGESTION PIPELINE</h3>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-12">EXCEL UPLOADS MUST CONTAIN 'NAME' AND 'CONTACT NUMBER' COLUMNS.</p>
                 <div className="flex flex-wrap gap-4">
                   <label className="px-12 py-5 bg-[#4c47f5] text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-900/40 cursor-pointer hover:bg-indigo-600 active:scale-95 transition-all text-center">
                     IMPORT FILE
                     <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                   </label>
                   <button onClick={() => setShowManualEntryModal(true)} className="px-12 py-5 bg-[#1e293b] text-white rounded-3xl font-black text-[11px] uppercase tracking-widest border border-white/5 hover:bg-slate-700 active:scale-95 transition-all shadow-xl">MANUAL ENTRY</button>
                 </div>
               </div>
             </div>
           )}
        </div>
      ) : adminTab === 'leads' ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
            <input type="text" placeholder="Search unallocated pool..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600" />
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button onClick={handleAutoDistribute} className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100">Smart Distribute</button>
              <button disabled={selectedLeadIds.length === 0} onClick={() => setShowHODPickerModal(true)} className="flex-1 px-8 py-4 bg-emerald-600 disabled:opacity-20 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 transition-all">Delegate ({selectedLeadIds.length})</button>
              <button onClick={() => setShowManualEntryModal(true)} className="flex-1 px-8 py-4 bg-white border border-slate-200 text-slate-800 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm">Manual Add</button>
              <label className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg cursor-pointer hover:bg-slate-800 text-center">Excel Import<input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} /></label>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                  <tr>
                    <th className="p-8 w-10 text-center"><input type="checkbox" onChange={(e) => setSelectedLeadIds(e.target.checked ? inflowLeads.map(l => l.id) : [])} checked={inflowLeads.length > 0 && selectedLeadIds.length === inflowLeads.length} className="w-4 h-4 rounded border-slate-300 accent-indigo-600" /></th>
                    <th className="p-8">Raw Student Identity</th>
                    <th className="p-8">Source Identity</th>
                    <th className="p-8 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {inflowLeads.map(lead => (
                    <tr key={lead.id} className={`hover:bg-slate-50/80 transition-all group ${selectedLeadIds.includes(lead.id) ? 'bg-indigo-50/50' : ''}`}>
                      <td className="p-8 text-center"><input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => setSelectedLeadIds(p => p.includes(lead.id) ? p.filter(i => i !== lead.id) : [...p, lead.id])} className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer" /></td>
                      <td className="p-8"><p className="text-[12px] font-black uppercase text-slate-800 leading-tight mb-1">{lead.name}</p><p className="text-[10px] font-bold text-indigo-600/60 tabular-nums">{lead.phone}</p></td>
                      <td className="p-8 text-[10px] font-bold text-slate-500 uppercase">{lead.sourceFile}</td>
                      <td className="p-8 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { setEditingLead({...lead}); setShowEditLeadModal(true); }} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                         <button onClick={() => { if(window.confirm('Erase this lead record permanently?')) deleteLead(lead.id); }} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : adminTab === 'logs' ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm animate-in fade-in duration-500">
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase border-b border-slate-50 tracking-widest">
                 <tr>
                   <th className="p-8">Personnel Identity</th>
                   <th className="p-8">Action Category</th>
                   <th className="p-8">Transaction Details</th>
                   <th className="p-8 text-right">Timestamp</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {logs.map(log => (
                   <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                     <td className="p-8"><p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1">{log.userName}</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ID: {log.userId.slice(0, 6)}</p></td>
                     <td className="p-8"><span className="text-[8px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">{log.action}</span></td>
                     <td className="p-8 text-[11px] font-bold text-slate-600">{log.details}</td>
                     <td className="p-8 text-right text-[10px] font-black text-slate-400 uppercase tabular-nums">{new Date(log.timestamp).toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
           <div className="flex p-1 bg-slate-100 rounded-2xl w-max">
             <button onClick={() => setVerificationSubTab('completed')} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${verificationSubTab === 'completed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Awaiting Challenge ({completedStaff.length})</button>
             <button onClick={() => setVerificationSubTab('responded')} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${verificationSubTab === 'responded' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}>Review Pending ({respondedStaff.length})</button>
             <button onClick={() => setVerificationSubTab('approved')} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${verificationSubTab === 'approved' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Audit History ({approvedStaff.length})</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {(verificationSubTab === 'completed' ? completedStaff : verificationSubTab === 'responded' ? respondedStaff : approvedStaff).map(item => (
               <div key={item.teacher.id} className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-sm flex flex-col hover:shadow-2xl transition-all group animate-in zoom-in-95 duration-300">
                 <div className="flex justify-between items-start mb-8">
                   <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center font-black text-indigo-600 border border-indigo-100 uppercase text-lg">{item.teacher.name.charAt(0)}</div>
                   <span className="px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-500 border border-amber-100">
                     {item.teacher.verification?.status || 'Active'}
                   </span>
                 </div>
                 <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-1">{item.teacher.name}</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10">{item.teacher.department}</p>
                 <div className="border-t border-dashed border-slate-100 pt-10 space-y-5">
                   {verificationSubTab === 'responded' && item.teacher.verification && (
                     <>
                       <div className="bg-[#f8fafc] p-6 rounded-[2rem] border border-slate-50">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Target Lead Reference</p>
                          <p className="text-[13px] font-black text-slate-800 uppercase mb-1">{item.teacher.verification.randomLeadName}</p>
                          <p className="text-[11px] font-bold text-indigo-500 tabular-nums">+{item.teacher.verification.randomLeadPhone}</p>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="p-5 bg-indigo-50/50 rounded-[1.5rem] border border-indigo-100/30">
                           <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Actual</p>
                           <p className="text-lg font-black text-indigo-600 tabular-nums">{item.teacher.verification.actualDuration}s</p>
                         </div>
                         <div className="p-5 bg-rose-50/50 rounded-[1.5rem] border border-rose-100/30">
                           <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-1">Reported</p>
                           <p className="text-lg font-black text-rose-600 tabular-nums">{item.teacher.verification.teacherResponseDuration}s</p>
                         </div>
                       </div>
                       <div className="bg-[#f8fafc] p-5 rounded-[1.5rem] border border-slate-50">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Date of Calling</p>
                          <p className="text-[11px] font-black text-slate-800 tracking-tight">{item.teacher.verification.verificationDate || 'N/A'}</p>
                       </div>
                       <button onClick={() => setViewingScreenshot(item.teacher.verification?.screenshotURL || null)} className="w-full py-4 bg-white border border-indigo-100 rounded-2xl text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>View Proof Screenshot</button>
                       <div className="grid grid-cols-2 gap-4 pt-4">
                          <button onClick={() => handleRejectVerification(item.teacher.id)} className="py-5 bg-[#ff4d6d] text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl shadow-rose-100 active:scale-95 hover:bg-rose-600 transition-all">Reject</button>
                          <button onClick={() => handleApproveVerification(item.teacher.id)} className="py-5 bg-[#00c49a] text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95 hover:bg-emerald-600 transition-all">Approve</button>
                       </div>
                     </>
                   )}
                   {verificationSubTab === 'completed' && <button onClick={() => handleTriggerVerification(item.teacher.id)} className="w-full py-5 bg-[#0f172a] text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95">Trigger Audit</button>}
                   {verificationSubTab === 'approved' && <div className="w-full py-5 px-6 bg-emerald-50 border border-emerald-100 rounded-[1.5rem] text-center"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Audit Passed & Archived</p></div>}
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Modals */}
      {showManualEntryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-[#0f172a] text-white text-center"><p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Direct Pool Entry</p><h3 className="text-xl font-black uppercase">Add New Student</h3></div>
            <form onSubmit={handleManualEntrySubmit} className="p-10 space-y-5">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label><input type="text" value={manualLead.name} onChange={e => setManualLead({...manualLead, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold" placeholder="RAHUL KHANNA" required /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label><input type="tel" maxLength={10} value={manualLead.phone} onChange={e => setManualLead({...manualLead, phone: e.target.value.replace(/\D/g, '')})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold" placeholder="10-digit number" required /></div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all mt-4">Save to Pool</button>
              <button type="button" onClick={() => setShowManualEntryModal(false)} className="w-full py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {showEditLeadModal && editingLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-[#4c47f5] text-white text-center"><p className="text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-2">Database Correction</p><h3 className="text-xl font-black uppercase">Edit Student Info</h3></div>
            <form onSubmit={handleEditLeadSubmit} className="p-10 space-y-5">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label><input type="text" value={editingLead.name} onChange={e => setEditingLead({...editingLead, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold" required /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label><input type="tel" maxLength={10} value={editingLead.phone} onChange={e => setEditingLead({...editingLead, phone: e.target.value.replace(/\D/g, '')})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold" required /></div>
              <button type="submit" className="w-full py-5 bg-[#4c47f5] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all mt-4">Update Record</button>
              <button type="button" onClick={() => setShowEditLeadModal(false)} className="w-full py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500">Discard</button>
            </form>
          </div>
        </div>
      )}

      {showHODPickerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center shrink-0"><h3 className="text-lg font-black uppercase tracking-tight">Select Department Head</h3><button onClick={() => setShowHODPickerModal(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-all hover:bg-white/20">×</button></div>
            <div className="p-6 space-y-2 max-h-96 overflow-y-auto custom-scroll">
              {hods.map(hod => (
                <button key={hod.id} onClick={() => handleManualDelegation(hod.id)} className="w-full p-5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl text-left transition-all border border-slate-100 flex justify-between items-center group shadow-sm active:scale-95">
                  <div className="flex-1"><p className="text-[11px] font-black uppercase leading-none mb-1 group-hover:text-white">{hod.name}</p><p className="text-[9px] opacity-60 uppercase font-bold tracking-tight group-hover:text-indigo-100">{hod.department}</p></div>
                  <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingScreenshot && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[3000] flex items-center justify-center p-4 sm:p-10" onClick={() => setViewingScreenshot(null)}>
          <div className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center gap-6" onClick={e => e.stopPropagation()}>
             <p className="text-white text-[10px] font-black uppercase tracking-[0.5em] mb-4">Verification Proof Preview</p>
             <div className="relative bg-white p-2 rounded-[2rem] shadow-2xl overflow-hidden max-h-[80vh] w-auto"><img src={viewingScreenshot} alt="Proof" className="max-w-full max-h-[75vh] rounded-[1.5rem] object-contain shadow-inner" /></div>
             <button onClick={() => setViewingScreenshot(null)} className="px-12 py-5 bg-white text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Close View</button>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const { loading } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ten_logged_in_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ten_logged_in_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ten_logged_in_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-1000">
        <div className="w-16 h-16 bg-[#0f172a] rounded-[1.5rem] flex items-center justify-center font-black text-2xl text-white shadow-2xl animate-bounce mb-8">T</div>
        <h2 className="text-3xl font-black text-[#0f172a] uppercase tracking-tighter">TrackNEnroll</h2>
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mt-4">Initializing Institutional Core...</p>
      </div>
    );
  }

  return (
    <Router>
      <ToastNotification />
      <Routes>
        <Route path="/login" element={!currentUser ? <AuthHub onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!currentUser ? <AuthHub onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={currentUser ? <Layout user={currentUser} onLogout={handleLogout}>{currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN ? <AdminDashboard initialTab="overview" /> : currentUser.role === UserRole.HOD ? <HODDashboard currentUser={currentUser} /> : <TeacherDashboard currentUser={currentUser} initialTab="pending" />}</Layout> : <Navigate to="/login" />} />
        <Route path="/verification" element={currentUser && currentUser.role === UserRole.TEACHER ? <Layout user={currentUser} onLogout={handleLogout}><TeacherDashboard currentUser={currentUser} initialTab="verification" /></Layout> : <Navigate to="/login" />} />
        <Route path="/student-leads" element={currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN) ? <Layout user={currentUser} onLogout={handleLogout}><StudentLeads /></Layout> : <Navigate to="/login" />} />
        <Route path="/staff-audit" element={currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN) ? <Layout user={currentUser} onLogout={handleLogout}><AdminDashboard initialTab="verification" /></Layout> : <Navigate to="/login" />} />
        <Route path="/users" element={currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN) ? <Layout user={currentUser} onLogout={handleLogout}><UserManagement currentUser={currentUser} /></Layout> : <Navigate to="/login" />} />
        <Route path="/approvals" element={currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.HOD) ? <Layout user={currentUser} onLogout={handleLogout}><ApprovalCenter currentUser={currentUser} /></Layout> : <Navigate to="/login" />} />
        <Route path="/analytics" element={currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN) ? <Layout user={currentUser} onLogout={handleLogout}><GlobalAnalytics /></Layout> : <Navigate to="/login" />} />
        <Route path="/chat" element={currentUser ? <Layout user={currentUser} onLogout={handleLogout}><ChatSystem currentUser={currentUser} /></Layout> : <Navigate to="/login" />} />
        <Route path="/support" element={currentUser ? <Layout user={currentUser} onLogout={handleLogout}><AIChatbot /></Layout> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
};

export default App;
