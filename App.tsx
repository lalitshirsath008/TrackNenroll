
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, Department, LeadStage, StudentLead, UserAction } from './types';
import { useData } from './context/DataContext';
import AuthHub from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
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

  const unassignedLeads = useMemo(() => 
    leads.filter(l => l.stage === LeadStage.UNASSIGNED || !l.assignedToHOD), 
  [leads]);

  const hodList = useMemo(() => 
    users.filter(u => u.role === UserRole.HOD && u.isApproved), 
  [users]);

  const [manualLead, setManualLead] = useState({ name: '', phone: '' });

  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    const newLead: StudentLead = {
      id: `manual-${Date.now()}`,
      name: manualLead.name,
      phone: `+91${manualLead.phone.slice(-10)}`,
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

  const executeExport = (format: 'pdf' | 'csv' | 'excel') => {
    const dataToExport = leads;
    const dateStr = new Date().toLocaleDateString('en-GB');
    const fileName = `Institutional_Report_${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'pdf') {
      const doc = new jsPDF();
      
      // Professional Header
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text("TRACKNENROLL", 20, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text("INSTITUTIONAL ADMISSION STATUS REPORT", 20, 28);
      doc.text(`DATE: ${dateStr}`, 160, 20);

      // Stats Summary Section
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.text("EXECUTIVE SUMMARY", 20, 55);
      doc.line(20, 58, 190, 58);
      
      doc.setFontSize(10);
      doc.text(`Total Leads: ${dataToExport.length}`, 20, 68);
      doc.text(`Targeted Success: ${dataToExport.filter(l => l.stage === LeadStage.TARGETED).length}`, 70, 68);
      doc.text(`Discarded: ${dataToExport.filter(l => l.stage === LeadStage.DISCARDED).length}`, 130, 68);
      doc.text(`Verified Interactions: ${dataToExport.filter(l => l.callVerified).length}`, 20, 75);

      // Table Header
      const tableTop = 90;
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.rect(15, tableTop - 5, 180, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("SR", 20, tableTop + 1);
      doc.text("STUDENT NAME", 35, tableTop + 1);
      doc.text("CONTACT", 85, tableTop + 1);
      doc.text("BRANCH", 125, tableTop + 1);
      doc.text("STATUS", 165, tableTop + 1);

      // Table Rows
      doc.setFont('helvetica', 'normal');
      let y = tableTop + 12;
      dataToExport.forEach((lead, index) => {
        if (y > 270) {
          doc.addPage();
          y = 30;
        }
        doc.text(`${index + 1}`, 20, y);
        doc.text(lead.name.toUpperCase().substring(0, 25), 35, y);
        doc.text(lead.phone, 85, y);
        doc.text(lead.department.toUpperCase().substring(0, 15), 125, y);
        
        // Status Color Coding logic
        if (lead.stage === LeadStage.TARGETED) doc.setTextColor(16, 185, 129); // Green
        else if (lead.stage === LeadStage.DISCARDED) doc.setTextColor(225, 29, 72); // Red
        else doc.setTextColor(100, 116, 139); // Gray
        
        doc.text(lead.stage.toUpperCase(), 165, y);
        doc.setTextColor(30, 41, 59); // Reset
        
        doc.setDrawColor(241, 245, 249);
        doc.line(15, y + 3, 195, y + 3);
        y += 10;
      });

      doc.save(`${fileName}.pdf`);
    } else if (format === 'excel' || format === 'csv') {
      const worksheetData = dataToExport.map((l, i) => ({
        "Serial No": i + 1,
        "Student Name": l.name,
        "Phone Number": l.phone,
        "Branch/Department": l.department,
        "Current Status": l.stage,
        "Call Verified": l.callVerified ? "YES" : "NO",
        "Last Interaction": l.callTimestamp || "N/A",
        "Source File": l.sourceFile
      }));

      const ws = XLSX.utils.json_to_sheet(worksheetData);
      
      // Auto-size columns (rough approximation)
      const colWidths = [
        { wch: 10 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 20 }
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Admission_Leads");
      
      if (format === 'excel') {
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else {
        XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
      }
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
                         { label: 'Total Leads', value: leads.length },
                         { label: 'Assigned', value: leads.filter(l => l.stage === LeadStage.ASSIGNED).length },
                         { label: 'Targeted', value: leads.filter(l => l.stage === LeadStage.TARGETED).length },
                         { label: 'Verified', value: leads.filter(l => l.callVerified).length }
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
                            <button onClick={() => setIsExportModalOpen(true)} className="px-8 py-4 bg-white text-[#0f172a] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Download Report</button>
                            <button onClick={() => setIsImportModalOpen(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all">Import Dataset</button>
                            <button onClick={() => setIsManualLeadModalOpen(true)} className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Manual Entry</button>
                         </div>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                      <div className="flex-1 w-full">
                        <input type="text" placeholder="Filter imported leads..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold outline-none focus:border-indigo-600" />
                      </div>
                      <button 
                        disabled={selectedLeadIds.length === 0}
                        onClick={() => setIsAssignModalOpen(true)}
                        className="w-full md:w-auto px-10 py-3.5 bg-[#0f172a] disabled:opacity-20 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        Allocate to HOD ({selectedLeadIds.length})
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
                              <th className="px-8 py-5">Candidate Name</th>
                              <th className="px-8 py-5">Phone</th>
                              <th className="px-8 py-5">Origin</th>
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
                                <td className="px-8 py-4"><span className="text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">{lead.sourceFile}</span></td>
                                <td className="px-8 py-4 text-right"><span className="text-[8px] font-black uppercase text-amber-500">Unallocated</span></td>
                              </tr>
                            ))}
                            {unassignedLeads.length === 0 && (
                              <tr><td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No unallocated nodes available</td></tr>
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

          {currentUser.role === UserRole.ADMIN && (
            <>
              <Route path="/users" element={<UserManagement currentUser={currentUser} />} />
              <Route path="/approvals" element={<ApprovalCenter currentUser={currentUser} />} />
            </>
          )}

          {currentUser.role === UserRole.SUPER_ADMIN && (
            <Route path="/analytics" element={<GlobalAnalytics />} />
          )}

          <Route path="/chat" element={<ChatSystem currentUser={currentUser} />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => handleFileUpload(e, true)} />

        {/* Allocate to HOD Modal */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-8 bg-[#0f172a] text-white text-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Allocate Leads</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">To Department Head (HOD)</p>
              </div>
              <div className="p-8 space-y-3 max-h-[400px] overflow-y-auto">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Target Institutional HOD</p>
                {hodList.map(hod => (
                  <button key={hod.id} onClick={() => executeAllocation(hod.id)} className="w-full p-5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl flex items-center justify-between group transition-all border border-slate-100">
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-tight">{hod.name}</p>
                      <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">{hod.department}</p>
                    </div>
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                  </button>
                ))}
                {hodList.length === 0 && (
                  <p className="text-center py-10 text-[10px] font-black text-rose-400 uppercase">No approved HODs found in roster</p>
                )}
                <button onClick={() => setIsAssignModalOpen(false)} className="w-full py-3 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 mt-2">Close</button>
              </div>
            </div>
          </div>
        )}

        {isManualLeadModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 bg-[#0f172a] text-white text-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">Manual Entry</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Single Node Registration</p>
              </div>
              <form onSubmit={handleAddManualLead} className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Full Name</label>
                  <input type="text" value={manualLead.name} onChange={e => setManualLead({ ...manualLead, name: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-indigo-600 font-bold text-sm text-[#1e293b]" placeholder="Identity Name" required />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <input type="tel" value={manualLead.phone} onChange={e => setManualLead({ ...manualLead, phone: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-indigo-600 font-bold text-sm text-[#1e293b]" placeholder="10 Digit Node" required />
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]">Provision Lead</button>
                  <button type="button" onClick={() => setIsManualLeadModalOpen(false)} className="w-full py-3 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 mt-1 transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isExportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-xs rounded-[2.5rem] overflow-hidden shadow-2xl">
               <div className="p-8 bg-indigo-600 text-white text-center"><h3 className="text-2xl font-black uppercase tracking-tighter">Export Report</h3></div>
               <div className="p-8 space-y-3">
                  {['pdf', 'excel', 'csv'].map(fmt => (
                    <button key={fmt} onClick={() => executeExport(fmt as any)} className="w-full py-4 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all">Format: {fmt.toUpperCase()}</button>
                  ))}
                  <button onClick={() => setIsExportModalOpen(false)} className="w-full py-3 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 transition-colors">Discard</button>
               </div>
            </div>
          </div>
        )}

        {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
               <div className="p-8 bg-emerald-600 text-white text-center"><h3 className="text-2xl font-black uppercase tracking-tighter">Bulk Import</h3></div>
               <div className="p-8 space-y-4 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Choose an institutional dataset (XLSX/CSV).</p>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-10 border-2 border-dashed border-slate-200 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50 transition-all font-black text-[10px] uppercase tracking-widest text-slate-400">Select Dataset File</button>
                  <button onClick={() => setIsImportModalOpen(false)} className="w-full py-3 text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 transition-colors">Return</button>
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
