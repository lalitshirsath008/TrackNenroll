import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, Department, LeadStage, StudentLead } from './types';
import { useData } from './context/DataContext';
import AuthHub from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import UserManagement from './pages/UserManagement';
import ApprovalCenter from './pages/ApprovalCenter';
import ChatSystem from './components/ChatSystem';
import Layout from './components/Layout';
import AIChatbot from './components/AIChatbot';
import { generateSummaryReport } from './services/geminiService';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const { leads, users, loading, assignLeadsToHOD, assignLeadsToTeacher, batchAddLeads, addLead } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualLeadModalOpen, setIsManualLeadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Lead State & Errors
  const [manualLead, setManualLead] = useState({
    name: '',
    phone: '',
    department: Department.IT
  });
  const [manualLeadErrors, setManualLeadErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const savedUser = localStorage.getItem('tracknenroll_current_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      const freshUser = users.find(u => u.id === parsed.id);
      if (freshUser && freshUser.isApproved) setCurrentUser(freshUser);
      else handleLogout();
    }
  }, [users]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('tracknenroll_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tracknenroll_current_user');
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

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>('');

  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleAssignLeads = async () => {
    if (!targetUserId || selectedLeadIds.length === 0) return;

    try {
      if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN) {
        await assignLeadsToHOD(selectedLeadIds, targetUserId);
      } else if (currentUser?.role === UserRole.HOD) {
        await assignLeadsToTeacher(selectedLeadIds, targetUserId);
      }
      setSelectedLeadIds([]);
      setTargetUserId('');
      alert("Done! Leads assigned.");
    } catch (err) {
      alert("Error: Assignment failed.");
    }
  };

  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    setManualLeadErrors({});
    const newErrors: { [key: string]: string } = {};

    if (manualLead.name.trim().length < 3) newErrors.name = 'Name is too short.';
    const cleanPhone = manualLead.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) newErrors.phone = 'Phone must be at least 10 digits.';

    if (Object.keys(newErrors).length > 0) {
      setManualLeadErrors(newErrors);
      return;
    }

    const newLead: StudentLead = {
      id: `manual-${Date.now()}`,
      name: manualLead.name,
      phone: `+91${cleanPhone.slice(-10)}`,
      sourceFile: 'MANUAL',
      department: manualLead.department,
      stage: LeadStage.UNASSIGNED,
      callVerified: false
    };

    addLead(newLead);
    setManualLead({ name: '', phone: '', department: Department.IT });
    setIsManualLeadModalOpen(false);
    alert("New lead added successfully.");
  };

  const availableAssignees = useMemo(() => {
    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN) {
      return users.filter(u => u.role === UserRole.HOD && u.isApproved);
    } else if (currentUser?.role === UserRole.HOD) {
      return users.filter(u => u.role === UserRole.TEACHER && u.department === currentUser.department && u.isApproved);
    }
    return [];
  }, [users, currentUser]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, replace: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const newLeads: StudentLead[] = jsonData.map((row: any, index) => {
          const name = row.Name || row.name || row['Full Name'] || 'Unknown';
          const phone = String(row.Phone || row.phone || row['Mobile'] || '').replace(/\D/g, '');
          const deptRaw = row.Department || row.department || row['Branch'] || 'IT';
          
          const department = Object.values(Department).find(d => 
            d.toLowerCase().includes(String(deptRaw).toLowerCase())
          ) || Department.IT;

          return {
            id: `imported-${Date.now()}-${index}`,
            name,
            phone: phone.startsWith('91') ? `+${phone}` : `+91${phone}`,
            sourceFile: file.name,
            department: department as Department,
            stage: LeadStage.UNASSIGNED,
            callVerified: false
          };
        }).filter(l => l.phone.length > 5);

        batchAddLeads(newLeads, replace);
        setIsImportModalOpen(false);
        alert(`Finished! ${newLeads.length} leads imported.`);
      } catch (err) {
        alert("Oops! File upload failed.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const executeExport = (format: 'pdf' | 'csv' | 'excel') => {
    const dataToExport = filteredLeads;
    if (dataToExport.length === 0) { alert("Nothing to export."); return; }
    const fileName = `TrackNEnroll_Report_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      const headers = "Name,Phone,Department,Status,Verified\n";
      const rows = dataToExport.map(l => `"${l.name}","${l.phone}","${l.department}","${l.stage}",${l.callVerified}`).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${fileName}.csv`; a.click();
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("TrackNEnroll Report", 20, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
      
      let y = 45;
      dataToExport.slice(0, 20).forEach((l, i) => {
        doc.text(`${i+1}. ${l.name} - ${l.phone} (${l.stage})`, 20, y);
        y += 10;
      });
      doc.save(`${fileName}.pdf`);
    } else {
      const sheetData = dataToExport.map(l => ({
        "Name": l.name,
        "Phone": l.phone,
        "Department": l.department,
        "Status": l.stage,
        "Verified": l.callVerified ? "Yes" : "No"
      }));
      const ws = XLSX.utils.json_to_sheet(sheetData);
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
        {loading && <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}

        <Routes>
          <Route path="/dashboard" element={
            currentUser.role === UserRole.TEACHER ? (
              <TeacherDashboard currentUser={currentUser} />
            ) : currentUser.role === UserRole.SUPER_ADMIN ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                <header>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Overview</p>
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">TrackNEnroll Dashboard</h2>
                </header>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   {[
                     { label: 'Total Leads', value: leads.length, icon: '📊' },
                     { label: 'Assigned', value: leads.filter(l => l.stage === LeadStage.ASSIGNED).length, icon: '⚡' },
                     { label: 'Targeted', value: leads.filter(l => l.stage === LeadStage.TARGETED).length, icon: '🎯' },
                     { label: 'Calls Done', value: leads.filter(l => l.callVerified).length, icon: '📞' }
                   ].map((item, i) => (
                     <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="relative z-10">
                          <span className="text-2xl mb-4 block">{item.icon}</span>
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{item.label}</p>
                          <p className={`text-4xl font-black text-slate-900 tracking-tighter`}>{item.value}</p>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="bg-indigo-600 p-10 md:p-14 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                   <div className="relative z-10 max-w-2xl">
                     <p className="text-3xl md:text-4xl font-black leading-tight uppercase mb-8">Download Reports & Sync</p>
                     <div className="flex flex-wrap gap-4">
                        <button onClick={() => setIsExportModalOpen(true)} className="px-10 py-4 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Get Report</button>
                        <button onClick={() => setIsImportModalOpen(true)} className="px-10 py-4 bg-indigo-500 text-white border border-indigo-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Import Leads</button>
                        <button onClick={() => setIsManualLeadModalOpen(true)} className="px-10 py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Add Single Lead</button>
                     </div>
                   </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 relative pb-24">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Management</p>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Active Leads</h2>
                  </div>
                  <div className="flex w-full md:w-auto gap-2">
                    <input 
                      type="text" 
                      placeholder="Search name..." 
                      className="flex-1 md:w-64 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none shadow-sm focus:border-indigo-600 transition-all" 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                    />
                    <button 
                      onClick={() => setIsExportModalOpen(true)} 
                      className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    </button>
                  </div>
                </header>

                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[850px]">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                        <tr>
                          {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HOD) && (
                            <th className="px-6 py-5 w-12 text-center">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                                checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                                onChange={toggleSelectAll}
                              />
                            </th>
                          )}
                          <th className="px-6 py-5">Name</th>
                          <th className="px-6 py-5">Phone</th>
                          <th className="px-6 py-5">Department</th>
                          <th className="px-6 py-5">Status</th>
                          <th className="px-6 py-5 text-right">Owner</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLeads.map(l => {
                          const assignee = users.find(u => u.id === (l.assignedToTeacher || l.assignedToHOD));
                          return (
                            <tr key={l.id} className={`hover:bg-indigo-50/10 transition-all ${selectedLeadIds.includes(l.id) ? 'bg-indigo-50/20' : ''}`}>
                              {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HOD) && (
                                <td className="px-6 py-5 w-12 text-center">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                                    checked={selectedLeadIds.includes(l.id)}
                                    onChange={() => toggleLeadSelection(l.id)}
                                  />
                                </td>
                              )}
                              <td className="px-6 py-5">
                                <p className="font-bold text-slate-900 text-sm">{l.name}</p>
                              </td>
                              <td className="px-6 py-5 text-xs text-slate-500">{l.phone}</td>
                              <td className="px-6 py-5 text-[10px] font-black uppercase text-slate-400">{l.department}</td>
                              <td className="px-6 py-5">
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${
                                  l.stage === LeadStage.TARGETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                  'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                  {l.stage}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <span className="text-[10px] font-bold text-slate-600 uppercase">{assignee?.name || 'Unassigned'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HOD) && selectedLeadIds.length > 0 && (
                  <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-[500]">
                    <div className="bg-slate-900 text-white rounded-[2rem] p-4 shadow-2xl flex flex-col md:flex-row items-center gap-4 border border-white/10">
                       <div className="flex items-center gap-4 flex-1 ml-4">
                          <p className="text-sm font-bold">{selectedLeadIds.length} Selected</p>
                       </div>
                       <div className="flex w-full md:w-auto items-center gap-2">
                         <select 
                           value={targetUserId}
                           onChange={(e) => setTargetUserId(e.target.value)}
                           className="flex-1 md:w-56 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black uppercase outline-none"
                         >
                           <option value="" className="text-slate-900">Choose person...</option>
                           {availableAssignees.map(u => (
                             <option key={u.id} value={u.id} className="text-slate-900">{u.name}</option>
                           ))}
                         </select>
                         <button 
                           onClick={handleAssignLeads}
                           disabled={!targetUserId}
                           className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white rounded-xl font-black text-[10px] uppercase transition-all"
                         >
                           Assign
                         </button>
                         <button onClick={() => setSelectedLeadIds([])} className="p-2 text-white/30 hover:text-white">✕</button>
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

        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => handleFileUpload(e, true)} />

        {/* Manual Lead Modal */}
        {isManualLeadModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="p-8 bg-slate-900 text-white text-center">
                <h3 className="text-2xl font-black uppercase">Add Single Lead</h3>
              </div>
              <form onSubmit={handleAddManualLead} className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Name</label>
                  <input 
                    type="text" 
                    value={manualLead.name} 
                    onChange={e => setManualLead({ ...manualLead, name: e.target.value })}
                    className={`w-full px-5 py-4 bg-slate-50 border ${manualLeadErrors.name ? 'border-rose-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-1 focus:ring-slate-900 font-bold`} 
                    placeholder="Enter name" 
                  />
                  {manualLeadErrors.name && <p className="text-rose-500 text-[10px] font-bold ml-1">{manualLeadErrors.name}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={manualLead.phone} 
                    onChange={e => setManualLead({ ...manualLead, phone: e.target.value })}
                    className={`w-full px-5 py-4 bg-slate-50 border ${manualLeadErrors.phone ? 'border-rose-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-1 focus:ring-slate-900 font-bold`} 
                    placeholder="10-digit mobile" 
                  />
                  {manualLeadErrors.phone && <p className="text-rose-500 text-[10px] font-bold ml-1">{manualLeadErrors.phone}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                  <select 
                    value={manualLead.department} 
                    onChange={e => setManualLead({ ...manualLead, department: e.target.value as Department })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold appearance-none cursor-pointer"
                  >
                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all mt-4">
                  Save Lead
                </button>
                <button type="button" onClick={() => setIsManualLeadModalOpen(false)} className="w-full py-4 text-xs font-black uppercase text-slate-300 hover:text-slate-500 transition-colors">Cancel</button>
              </form>
            </div>
          </div>
        )}

        {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl">
               <div className="p-8 bg-emerald-600 text-white text-center">
                 <h3 className="text-2xl font-black uppercase">Import Leads</h3>
               </div>
               <div className="p-8 space-y-4">
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-emerald-500 transition-all font-bold text-slate-500">
                    Pick Excel or CSV File
                  </button>
                  <button onClick={() => setIsImportModalOpen(false)} className="w-full py-4 text-xs font-black uppercase text-slate-300">Close</button>
               </div>
            </div>
          </div>
        )}

        {isExportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl">
               <div className="p-8 bg-indigo-600 text-white text-center">
                 <h3 className="text-2xl font-black uppercase">Export Data</h3>
               </div>
               <div className="p-8 space-y-3">
                  {['pdf', 'excel', 'csv'].map(fmt => (
                    <button key={fmt} onClick={() => executeExport(fmt as any)} className="w-full py-4 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-xl font-black text-xs uppercase transition-all">
                      As {fmt.toUpperCase()}
                    </button>
                  ))}
                  <button onClick={() => setIsExportModalOpen(false)} className="w-full py-4 text-xs font-black uppercase text-slate-300">Close</button>
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