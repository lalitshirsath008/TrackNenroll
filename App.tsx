
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
  const { leads, users, logs, loading, batchAddLeads, addLead, addLog, assignLeadsToHOD } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isManualLeadModalOpen, setIsManualLeadModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'overview' | 'leads' | 'logs'>('overview');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    interested: leads.filter(l => l.stage === LeadStage.TARGETED).length,
    callsDone: leads.filter(l => l.callVerified).length
  }), [leads]);

  const unassignedLeads = useMemo(() => leads.filter(l => !l.assignedToHOD), [leads]);
  const hodList = useMemo(() => users.filter(u => u.role === UserRole.HOD && u.isApproved), [users]);
  const recentLeads = useMemo(() => [...leads].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5), [leads]);

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setManualLead(prev => ({ ...prev, phone: val }));
    setFormErrors(prev => ({ ...prev, phone: val.length > 0 && val.length < 10 ? 'Enter 10 digits' : '' }));
  };

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setManualLead(prev => ({ ...prev, name: val }));
    setFormErrors(prev => ({ ...prev, name: val.length > 0 && val.length < 3 ? 'Name too short' : '' }));
  };

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
    addLog(currentUser?.id || 'manual', currentUser?.name || 'Admin', UserAction.MANUAL_ADD, `Manually added student: ${manualLead.name}`);
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
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      const newLeads: StudentLead[] = data.map((row, idx) => ({
        id: `lead-import-${Date.now()}-${idx}`,
        name: row.Name || row.name || 'Unknown Student',
        phone: String(row.Phone || row.phone || row.Mobile || '').startsWith('+91') 
          ? String(row.Phone || row.phone || row.Mobile || '') 
          : `+91${String(row.Phone || row.phone || row.Mobile || '').replace(/\D/g, '').slice(-10)}`,
        sourceFile: file.name,
        department: Department.IT,
        stage: LeadStage.UNASSIGNED,
        callVerified: false
      })).filter(l => l.phone.length >= 10);

      if (newLeads.length > 0) {
        await batchAddLeads(newLeads, false);
        addLog(currentUser?.id || 'system', currentUser?.name || 'Admin', UserAction.IMPORT_LEADS, `Imported ${newLeads.length} leads from file: ${file.name}`);
        alert(`Successfully imported ${newLeads.length} leads!`);
      } else {
        alert("No valid student data found in file. Ensure columns are named 'Name' and 'Phone'.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadInstitutionalReport = (format: 'pdf' | 'excel') => {
    const dateStr = new Date().toLocaleDateString('en-GB');
    const fileName = `Institutional_Report_${new Date().toISOString().split('T')[0]}`;

    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text("TRACKNENROLL: INSTITUTIONAL REPORT", 20, 25);
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.text(`Generated On: ${dateStr}`, 160, 50);
      
      doc.setFontSize(12);
      doc.text("GLOBAL METRICS", 20, 60);
      doc.line(20, 62, 190, 62);
      
      doc.setFontSize(10);
      doc.text(`Total Student Leads: ${stats.total}`, 20, 72);
      doc.text(`Assigned to HODs: ${stats.assigned}`, 80, 72);
      doc.text(`Conversion (Interested): ${stats.interested}`, 140, 72);

      let y = 90;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 5, 180, 10, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text("NAME", 20, y); 
      doc.text("PHONE", 70, y); 
      doc.text("DEPARTMENT", 110, y); 
      doc.text("CURRENT STAGE", 160, y);
      
      doc.setFont('helvetica', 'normal');
      leads.slice(0, 100).forEach((l, i) => {
        y += 10;
        if (y > 270) { doc.addPage(); y = 30; }
        doc.text(l.name.substring(0, 25).toUpperCase(), 20, y);
        doc.text(l.phone, 70, y);
        doc.text(l.department.split(' ')[0], 110, y);
        doc.text(l.stage.toUpperCase(), 160, y);
        doc.line(15, y + 2, 195, y + 2);
      });
      doc.save(`${fileName}.pdf`);
    } else {
      const worksheetData = leads.map((l, i) => ({
        "Sr No": i + 1,
        "Student Name": l.name,
        "Phone": l.phone,
        "Department": l.department,
        "Stage": l.stage,
        "Verified": l.callVerified ? "YES" : "NO",
        "Timestamp": l.callTimestamp || "N/A"
      }));
      const ws = XLSX.utils.json_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Institutional_Data");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
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
        {loading && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

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
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">
                      {currentUser.role === UserRole.SUPER_ADMIN ? 'Principal Console' : 'Admin Panel'}
                    </p>
                    <h2 className="text-3xl font-black text-[#1e293b] tracking-tighter uppercase leading-none">Management Hub</h2>
                  </div>
                  {currentUser.role !== UserRole.SUPER_ADMIN && (
                    <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full">
                      <button onClick={() => setAdminTab('overview')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Overview</button>
                      <button onClick={() => setAdminTab('leads')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === 'leads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Leads ({unassignedLeads.length})</button>
                      <button onClick={() => setAdminTab('logs')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${adminTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Logs</button>
                    </div>
                  )}
                </header>
                
                {adminTab === 'overview' ? (
                  <div className="space-y-6 md:space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                       <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Total Leads</p>
                          <p className="text-3xl font-black text-[#1e293b]">{stats.total}</p>
                       </div>
                       <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Assigned</p>
                          <p className="text-3xl font-black text-indigo-600">{stats.assigned}</p>
                       </div>
                       <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Interested</p>
                          <p className="text-3xl font-black text-emerald-600">{stats.interested}</p>
                       </div>
                       <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Verified</p>
                          <p className="text-3xl font-black text-amber-600">{stats.callsDone}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className={`lg:col-span-2 ${currentUser.role === UserRole.SUPER_ADMIN ? 'bg-indigo-600' : 'bg-[#0f172a]'} p-8 md:p-12 rounded-[2.5rem] text-white shadow-xl`}>
                        <p className="text-xl font-black uppercase tracking-tighter mb-4">
                          {currentUser.role === UserRole.SUPER_ADMIN ? 'Principal Summary' : 'Student Data Portal'}
                        </p>
                        <p className="text-xs font-bold opacity-60 mb-8 max-w-md">
                          {currentUser.role === UserRole.SUPER_ADMIN 
                            ? 'As Principal, you have complete oversight of all departmental counseling activities and admission conversion metrics.' 
                            : 'Upload new data files (Excel/CSV) or manually add individual student records to populate the admission list.'}
                        </p>
                        
                        <div className="flex flex-wrap gap-4">
                          {currentUser.role === UserRole.SUPER_ADMIN ? (
                            <>
                              <button onClick={() => downloadInstitutionalReport('pdf')} className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-indigo-600 transition-all">Download PDF Report</button>
                              <button onClick={() => downloadInstitutionalReport('excel')} className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-indigo-600 transition-all">Download Excel Report</button>
                            </>
                          ) : (
                            <>
                              <input 
                                type="file" 
                                accept=".xlsx, .xls, .csv" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                              />
                              <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all">Import Data (Excel/CSV)</button>
                              <button onClick={() => setIsManualLeadModalOpen(true)} className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Add Student</button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Latest Updates</p>
                        <div className="space-y-4">
                          {recentLeads.map(l => (
                            <div key={l.id} className="flex items-center justify-between border-b border-slate-50 pb-3">
                              <div><p className="text-xs font-black uppercase text-slate-800 truncate max-w-[120px]">{l.name}</p></div>
                              <div className="text-right"><span className="text-[8px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-lg">{l.stage}</span></div>
                            </div>
                          ))}
                          {leads.length === 0 && <p className="text-[9px] text-slate-300 font-bold uppercase py-10 text-center">No Records Found</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : adminTab === 'leads' ? (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                      <input type="text" placeholder="Search unassigned leads..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold outline-none" />
                      <button disabled={selectedLeadIds.length === 0} onClick={() => setIsAssignModalOpen(true)} className="w-full md:w-auto px-10 py-3.5 bg-[#0f172a] disabled:opacity-20 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Assign to HOD ({selectedLeadIds.length})</button>
                    </div>
                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <tr>
                              <th className="px-8 py-5 w-12 text-center">
                                <input type="checkbox" onChange={(e) => setSelectedLeadIds(e.target.checked ? unassignedLeads.map(l => l.id) : [])} className="w-4 h-4 rounded" />
                              </th>
                              <th className="px-8 py-5">Student Identity</th>
                              <th className="px-8 py-5">Phone</th>
                              <th className="px-8 py-5">Source</th>
                              <th className="px-8 py-5 text-right">Action</th>
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
                                <td className="px-8 py-4 font-bold text-slate-400 text-[9px] uppercase">{lead.sourceFile}</td>
                                <td className="px-8 py-4 text-right"><span className="text-[8px] font-black uppercase text-amber-500 bg-amber-50 px-2 py-1 rounded">Pending Allocation</span></td>
                              </tr>
                            ))}
                            {unassignedLeads.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Pool is currently empty</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                      <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase tracking-tighter">System Activity Logs</h3>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl">Audit Trail</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <tr>
                              <th className="px-8 py-5">Timestamp</th>
                              <th className="px-8 py-5">User</th>
                              <th className="px-8 py-5">Action</th>
                              <th className="px-8 py-5">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {logs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50">
                                <td className="px-8 py-4 whitespace-nowrap text-[10px] font-bold text-slate-500">{log.timestamp}</td>
                                <td className="px-8 py-4 whitespace-nowrap font-black text-[#1e293b] text-xs uppercase">{log.userName}</td>
                                <td className="px-8 py-4 whitespace-nowrap">
                                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${
                                    log.action === UserAction.IMPORT_LEADS ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                    log.action === UserAction.LOGIN ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    log.action === UserAction.LOGOUT ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                    'bg-slate-50 text-slate-400 border-slate-100'
                                  }`}>
                                    {log.action}
                                  </span>
                                </td>
                                <td className="px-8 py-4 text-[10px] font-bold text-slate-600 italic">{log.details}</td>
                              </tr>
                            ))}
                            {logs.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No activities recorded</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 bg-[#0f172a] text-white text-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Add Student</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Manual Input</p>
              </div>
              <form onSubmit={handleAddManualLead} className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input type="text" value={manualLead.name} onChange={handleNameInput} className={`w-full px-5 py-3.5 bg-slate-50 border ${formErrors.name ? 'border-rose-500' : 'border-slate-100'} rounded-xl outline-none focus:border-indigo-600 font-bold text-sm`} placeholder="John Doe" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">+91</span>
                    <input type="text" value={manualLead.phone} onChange={handlePhoneInput} className={`w-full pl-12 pr-5 py-3.5 bg-slate-50 border ${formErrors.phone ? 'border-rose-500' : 'border-slate-100'} rounded-xl outline-none focus:border-indigo-600 font-bold text-sm`} placeholder="9876543210" required />
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" disabled={!manualLead.name || manualLead.phone.length !== 10} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">Save Lead</button>
                  <button type="button" onClick={() => setIsManualLeadModalOpen(false)} className="w-full py-3 text-[9px] font-black uppercase text-slate-300 mt-1">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isAssignModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-8 bg-[#0f172a] text-white text-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Choose HOD</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Allocating {selectedLeadIds.length} Nodes</p>
              </div>
              <div className="p-8 space-y-3 max-h-[400px] overflow-y-auto">
                {hodList.map(hod => (
                  <button key={hod.id} onClick={async () => { await assignLeadsToHOD(selectedLeadIds, hod.id); setSelectedLeadIds([]); setIsAssignModalOpen(false); }} className="w-full p-5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl flex items-center justify-between group transition-all border border-slate-100">
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-tight">{hod.name}</p>
                      <p className="text-[9px] font-bold opacity-60 uppercase">{hod.department}</p>
                    </div>
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                  </button>
                ))}
                {hodList.length === 0 && <p className="text-[10px] font-black text-slate-400 uppercase py-10 text-center">No authorized HOD nodes found</p>}
                <button onClick={() => setIsAssignModalOpen(false)} className="w-full py-3 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 mt-2">Abort</button>
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
