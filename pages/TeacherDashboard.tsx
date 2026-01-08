
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User, Department, UserAction, UserRole } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, users, updateLead, assignLeadsToTeacher, showToast, addLog } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  
  // Selection & Delegation States
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');

  const timerRef = useRef<number | null>(null);

  const MIN_VALID_DURATION = 20;

  // Leads that are either currently assigned to me OR were delegated BY me at some point
  const myLeads = useMemo(() => leads.filter(l => 
    l.assignedToTeacher === currentUser.id || l.delegatedFromId === currentUser.id
  ), [leads, currentUser.id]);

  // Pending: Only leads currently assigned to me that haven't been processed
  const pendingLeads = useMemo(() => myLeads.filter(l => 
    l.assignedToTeacher === currentUser.id && (l.stage === LeadStage.ASSIGNED || l.stage === LeadStage.UNASSIGNED)
  ), [myLeads, currentUser.id]);

  // History: Leads I have processed OR leads I have sent to someone else
  const completedLeads = useMemo(() => myLeads.filter(l => {
    const isProcessedByMe = l.assignedToTeacher === currentUser.id && l.stage !== LeadStage.ASSIGNED && l.stage !== LeadStage.UNASSIGNED;
    const isSentByMe = l.delegatedFromId === currentUser.id;
    return isProcessedByMe || isSentByMe;
  }), [myLeads, currentUser.id]);

  // All active teachers except current user for delegation
  const allInstituteTeachers = useMemo(() => 
    users.filter(u => u.role === UserRole.TEACHER && u.isApproved && u.id !== currentUser.id), 
    [users, currentUser.id]
  );

  const filteredTeachers = useMemo(() => 
    allInstituteTeachers.filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase())),
    [allInstituteTeachers, teacherSearch]
  );

  const stats = {
    total: myLeads.length,
    completed: completedLeads.length
  };

  const startCallSession = (lead: StudentLead) => {
    setCallingLead(lead);
    setIsCallActive(true);
    setCallDuration(0);
    window.location.href = `tel:${lead.phone}`;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setCallDuration(p => p + 1), 1000);
  };

  const endCallSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCallActive(false);
  };

  const handleCategorization = async (leadId: string, response: StudentResponse, selectedDept?: Department) => {
    if (callDuration < MIN_VALID_DURATION) {
      showToast(`Minimum ${MIN_VALID_DURATION}s interaction required.`, 'error');
      return;
    }

    if (response === StudentResponse.INTERESTED && !selectedDept) {
      setShowDeptPicker(true);
      return;
    }

    let newStage = LeadStage.NO_ACTION;
    switch (response) {
      case StudentResponse.INTERESTED: 
      case StudentResponse.CONFUSED: newStage = LeadStage.TARGETED; break;
      case StudentResponse.NOT_INTERESTED: 
      case StudentResponse.NOT_RESPONDING:
      case StudentResponse.NOT_REACHABLE: newStage = LeadStage.DISCARDED; break;
      case StudentResponse.GRADE_11_12: newStage = LeadStage.FORWARDED; break;
    }

    await updateLead(leadId, { 
      response, 
      stage: newStage, 
      callVerified: true, 
      callTimestamp: new Date().toISOString(), 
      callDuration, 
      department: selectedDept || Department.IT 
    });

    addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Classified ${callingLead?.name} as ${response}.`);
    setCallingLead(null);
    setShowDeptPicker(false);
    showToast("Classification saved.", 'success');
  };

  const handleBulkDelegate = async (targetTeacherId: string) => {
    if (selectedHistoryIds.length === 0) return;
    
    const targetTeacher = users.find(u => u.id === targetTeacherId);
    if (!targetTeacher) return;

    if (window.confirm(`Delegate ${selectedHistoryIds.length} leads to ${targetTeacher.name}?`)) {
      try {
        const updates = selectedHistoryIds.map(async (leadId) => {
          return updateLead(leadId, {
            assignedToTeacher: targetTeacherId,
            stage: LeadStage.ASSIGNED,
            // Reset fields for the new teacher
            response: undefined,
            callVerified: false,
            // Update tracking
            delegatedFromId: currentUser.id,
            delegatedFromName: currentUser.name,
            delegatedToName: targetTeacher.name
          });
        });

        await Promise.all(updates);
        
        addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Delegated ${selectedHistoryIds.length} leads to ${targetTeacher.name}.`);
        
        setIsDelegateModalOpen(false);
        setSelectedHistoryIds([]);
        showToast(`Transferred ${selectedHistoryIds.length} leads to ${targetTeacher.name}.`, 'success');
      } catch (error) {
        showToast("Delegation failed. Please try again.", "error");
      }
    }
  };

  const toggleSelectAllHistory = () => {
    if (selectedHistoryIds.length === completedLeads.length) {
      setSelectedHistoryIds([]);
    } else {
      setSelectedHistoryIds(completedLeads.map(l => l.id));
    }
  };

  const isLocked = isCallActive || callDuration < MIN_VALID_DURATION;
  const progressPercent = Math.min((callDuration / MIN_VALID_DURATION) * 100, 100);

  return (
    <div className="space-y-6 font-['Inter'] pb-10">
      {/* Header Stat Bar */}
      <div className="bg-[#0f172a] p-8 md:p-12 rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">Counselor Dashboard</h2>
          <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Active: {currentUser.name}</p>
        </div>
        <div className="relative z-10 flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-indigo-600 px-8 py-5 rounded-3xl text-center shadow-xl shadow-indigo-900/20 border border-white/10">
            <p className="text-3xl font-black">{completedLeads.length}</p>
            <p className="text-[8px] font-black uppercase tracking-widest mt-1">History</p>
          </div>
          <div className="flex-1 md:flex-none bg-white/5 px-8 py-5 rounded-3xl text-center border border-white/10 backdrop-blur-md">
            <p className="text-3xl font-black text-slate-400">{pendingLeads.length}</p>
            <p className="text-[8px] font-black uppercase tracking-widest mt-1">Pending</p>
          </div>
        </div>
      </div>

      {/* Navigation and Bulk Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-max shadow-inner">
          <button onClick={() => setActiveTab('pending')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Assigned Leads</button>
          <button onClick={() => setActiveTab('completed')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Activity History</button>
        </div>

        {activeTab === 'completed' && completedLeads.length > 0 && (
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button onClick={toggleSelectAllHistory} className="px-5 py-3 bg-white border border-slate-200 text-[9px] font-black uppercase rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedHistoryIds.length === completedLeads.length && completedLeads.length > 0 ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                   {selectedHistoryIds.length === completedLeads.length && completedLeads.length > 0 && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
                </div>
                {selectedHistoryIds.length === completedLeads.length && completedLeads.length > 0 ? 'Deselect All' : 'Select All'}
             </button>
             {selectedHistoryIds.length > 0 && (
               <button onClick={() => setIsDelegateModalOpen(true)} className="px-8 py-3 bg-[#0f172a] text-white text-[9px] font-black uppercase rounded-xl shadow-lg animate-in slide-in-from-right-2 duration-200">
                  Delegate Selected ({selectedHistoryIds.length})
               </button>
             )}
          </div>
        )}
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => {
          const isSentByMe = lead.delegatedFromId === currentUser.id;
          const isReceivedByMe = lead.assignedToTeacher === currentUser.id && !!lead.delegatedFromName;
          const isSelected = selectedHistoryIds.includes(lead.id);
          
          return (
            <div 
              key={lead.id} 
              onClick={() => {
                if (activeTab === 'completed') {
                  setSelectedHistoryIds(p => p.includes(lead.id) ? p.filter(x => x !== lead.id) : [...p, lead.id]);
                }
              }}
              className={`bg-white rounded-[2.5rem] border-2 p-8 flex flex-col shadow-sm hover:shadow-xl transition-all group relative cursor-pointer select-none ${isSelected ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100'}`}
            >
              {activeTab === 'completed' && (
                <div className="absolute top-6 right-6 z-10 pointer-events-none">
                   <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                      {isSelected && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
                   </div>
                </div>
              )}

              <div className="flex justify-between items-start mb-6 pointer-events-none">
                <div className="w-14 h-14 bg-[#f8fafc] rounded-2xl flex items-center justify-center font-black text-indigo-600 border border-slate-100 group-hover:scale-110 transition-transform uppercase">{lead.name.charAt(0)}</div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${lead.callVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {lead.callVerified ? 'Verified' : 'Pending'}
                  </span>
                  {isSentByMe && <span className="text-[8px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-lg">Delegated Away</span>}
                </div>
              </div>
              
              <h4 className="font-black text-[#0f172a] text-xl uppercase tracking-tighter truncate leading-tight pointer-events-none">{lead.name}</h4>
              <p className="text-indigo-600 text-sm font-black tracking-widest mt-1 mb-4 pointer-events-none">{lead.phone}</p>
              
              {/* Delegation Flow Info */}
              {(isReceivedByMe || isSentByMe) && (
                <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2 pointer-events-none">
                  <div className={`w-2 h-2 rounded-full ${isSentByMe ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-tight">
                    {isSentByMe ? (
                      <span className="flex items-center gap-1">Sent to: <span className="text-indigo-600">{lead.delegatedToName}</span></span>
                    ) : (
                      <span className="flex items-center gap-1">From: <span className="text-emerald-600">{lead.delegatedFromName}</span></span>
                    )}
                  </p>
                </div>
              )}
              
              <div className="mt-auto pt-4 space-y-3">
                {activeTab === 'completed' && !isSentByMe && (
                  <div className="py-3 px-6 bg-slate-100 rounded-2xl text-center text-[9px] font-black uppercase text-slate-500 border border-slate-200 mb-2 pointer-events-none">
                    Result: {lead.response || 'Unclassified'}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); startCallSession(lead); }} 
                    disabled={isSentByMe}
                    className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg disabled:opacity-30 ${activeTab === 'pending' ? 'bg-[#0f172a] text-white hover:bg-slate-800' : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`}
                  >
                    {activeTab === 'pending' ? 'Initiate Call' : isSentByMe ? 'Handed Over' : 'Call Student Back'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {(activeTab === 'pending' ? pendingLeads : completedLeads).length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">
            No student records found in this section.
          </div>
        )}
      </div>

      {/* Delegation Modal */}
      {isDelegateModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center">
              <div className="text-left">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Institutional Transfer</p>
                <h3 className="text-xl font-black uppercase tracking-tighter">Bulk Delegate ({selectedHistoryIds.length})</h3>
              </div>
              <button onClick={() => setIsDelegateModalOpen(false)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-bold">×</button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 p-5 bg-slate-50 border border-slate-100 rounded-3xl flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-xs uppercase">{selectedHistoryIds.length}</div>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Target Selection</p>
                  <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Select teacher to receive these leads</p>
                </div>
              </div>

              <div className="relative mb-4">
                <input 
                  type="text" 
                  placeholder="Search faculty staff..." 
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full pl-5 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scroll">
                {filteredTeachers.map(teacher => (
                  <button 
                    key={teacher.id} 
                    onClick={() => handleBulkDelegate(teacher.id)}
                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-indigo-600 hover:text-white transition-all group shadow-sm"
                  >
                    <div className="text-left">
                      <p className="text-[11px] font-black uppercase tracking-tight group-hover:text-white transition-colors">{teacher.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 group-hover:text-white/70 transition-colors uppercase">{teacher.department}</p>
                    </div>
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
                {filteredTeachers.length === 0 && (
                  <div className="py-10 text-center text-slate-300 text-[10px] font-black uppercase">No teachers found</div>
                )}
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setIsDelegateModalOpen(false)} className="w-full py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cancel Transfer</button>
            </div>
          </div>
        </div>
      )}

      {/* Call UI - Same as before */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-10 bg-[#0f172a] text-white text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-white/10">
                <div className={`h-full transition-all duration-1000 ${progressPercent < 100 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Live Session</p>
              <h3 className="text-4xl font-black uppercase leading-none mb-4 tracking-tighter">{callingLead.name}</h3>
              <div className="text-6xl font-black tabular-nums my-6 text-white drop-shadow-xl">{Math.floor(callDuration/60)}:{(callDuration%60).toString().padStart(2,'0')}</div>

              {isCallActive ? (
                <button onClick={endCallSession} className="px-12 py-5 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-red-900/40 active:scale-95 transition-all">Hang Up</button>
              ) : (
                <div className="px-6 py-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{callDuration < MIN_VALID_DURATION ? `Interaction too short (${callDuration}s)` : 'Call Verified'}</p>
                </div>
              )}
            </div>
            
            <div className="p-10 space-y-6 bg-white relative">
              {isLocked && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{isCallActive ? 'Finalizing Call...' : `Validation: ${MIN_VALID_DURATION - callDuration}s remaining`}</p>
                </div>
              )}

              {!showDeptPicker ? (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Outcome Selection</p>
                  <button onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)} disabled={isLocked} className="w-full py-6 bg-[#4c47f5] text-white rounded-[1.5rem] font-black text-[14px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-[0.98] flex items-center justify-center gap-3">
                    Interested
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} disabled={isLocked} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all">Not Interested</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} disabled={isLocked} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition-all">Confused</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} disabled={isLocked} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all">11th/12th</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_RESPONDING)} disabled={isLocked} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-all">No Response</button>
                  </div>
                  <button onClick={() => setCallingLead(null)} className="w-full py-3 text-slate-300 text-[9px] font-black uppercase mt-2">Dismiss</button>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                   <div className="text-center">
                     <p className="text-[12px] font-black text-[#0f172a] uppercase tracking-tighter">Interest Area</p>
                   </div>
                   <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-3 custom-scroll">
                      {Object.values(Department).map(d => (
                        <button key={d} onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED, d)} className="w-full p-5 bg-[#f8fafc] hover:bg-indigo-600 hover:text-white rounded-2xl text-[10px] font-black uppercase transition-all border border-slate-100 text-slate-600 text-left">
                          {d}
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
