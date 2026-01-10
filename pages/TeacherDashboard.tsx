
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User, Department } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User, initialTab?: 'pending' | 'completed' | 'verification' }> = ({ currentUser, initialTab = 'pending' }) => {
  const { leads, updateLead, showToast, updateUser } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'verification'>(initialTab);
  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [verificationInput, setVerificationInput] = useState('');
  const [showBranchSelection, setShowBranchSelection] = useState(false);
  
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);

  const timerRef = useRef<number | null>(null);
  const MIN_VALID_DURATION = 20;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (currentUser.verification?.status === 'pending' && activeTab !== 'verification') {
      setActiveTab('verification');
    }
  }, [currentUser.verification?.status, activeTab]);

  const myLeads = useMemo(() => leads.filter(l => 
    l.assignedToTeacher === currentUser.id || l.delegatedFromId === currentUser.id
  ), [leads, currentUser.id]);

  const pendingLeads = useMemo(() => myLeads.filter(l => 
    l.assignedToTeacher === currentUser.id && (l.stage === LeadStage.ASSIGNED || l.stage === LeadStage.UNASSIGNED)
  ), [myLeads, currentUser.id]);

  const completedLeads = useMemo(() => myLeads.filter(l => {
    const isProcessedByMe = l.assignedToTeacher === currentUser.id && l.stage !== LeadStage.ASSIGNED && l.stage !== LeadStage.UNASSIGNED;
    const isSentByMe = l.delegatedFromId === currentUser.id;
    return isProcessedByMe || isSentByMe;
  }), [myLeads, currentUser.id]);

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationInput || !currentUser.verification) return;
    
    await updateUser(currentUser.id, {
      verification: {
        ...currentUser.verification,
        status: 'responded',
        teacherResponseDuration: parseInt(verificationInput),
      }
    });
    setVerificationInput('');
    showToast("Verification response submitted to admin.", "success");
    setActiveTab('completed');
  };

  const startCallSession = (lead: StudentLead) => {
    setCallingLead(lead);
    setIsCallActive(true);
    setCallDuration(0);
    setShowBranchSelection(false);
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
      showToast(`Minimum ${MIN_VALID_DURATION}s call required.`, 'error');
      return;
    }
    
    let newStage = LeadStage.NO_ACTION;
    switch (response) {
      case StudentResponse.INTERESTED: 
      case StudentResponse.CONFUSED: 
        newStage = LeadStage.TARGETED; 
        break;
      case StudentResponse.NOT_INTERESTED: 
      case StudentResponse.NOT_RESPONDING:
      case StudentResponse.NOT_REACHABLE: 
        newStage = LeadStage.DISCARDED; 
        break;
      case StudentResponse.GRADE_11_12: 
        newStage = LeadStage.FORWARDED; 
        break;
      case StudentResponse.OTHERS:
        newStage = LeadStage.NO_ACTION;
        break;
    }
    
    await updateLead(leadId, { 
      response, 
      stage: newStage, 
      callVerified: true, 
      callTimestamp: new Date().toISOString(), 
      callDuration, 
      department: selectedDept || currentUser.department || Department.IT 
    });
    
    setCallingLead(null);
    setShowBranchSelection(false);
    showToast("Classification recorded successfully.", 'success');
  };

  const isLocked = isCallActive || callDuration < MIN_VALID_DURATION;
  const progressPercent = Math.min((callDuration / MIN_VALID_DURATION) * 100, 100);

  return (
    <div className="space-y-6 font-['Inter'] pb-12 animate-in fade-in duration-500">
      <div className="bg-[#0f172a] p-8 md:p-12 rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">Counselor Hub</h2>
          <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">{currentUser.name}</p>
        </div>
        <div className="relative z-10 flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-indigo-600 px-8 py-5 rounded-3xl text-center shadow-xl">
            <p className="text-3xl font-black">{completedLeads.length}</p>
            <p className="text-[8px] font-black uppercase mt-1">Processed</p>
          </div>
          <div className="flex-1 md:flex-none bg-white/5 px-8 py-5 rounded-3xl text-center border border-white/10">
            <p className="text-3xl font-black text-slate-400">{pendingLeads.length}</p>
            <p className="text-[8px] font-black uppercase mt-1">Pending</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-max shadow-inner border border-slate-200">
          <button onClick={() => setActiveTab('pending')} className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>Assigned</button>
          <button onClick={() => setActiveTab('completed')} className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>History</button>
          <button onClick={() => setActiveTab('verification')} className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'verification' ? 'bg-white text-rose-500 shadow-sm border border-slate-100' : 'text-slate-500'}`}>
            Verification
            {currentUser.verification?.status === 'pending' && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>}
          </button>
        </div>
      </div>

      {activeTab === 'verification' ? (
        <div className="animate-in slide-in-from-bottom-6 duration-400 max-w-2xl mx-auto py-12">
          {currentUser.verification?.status === 'pending' ? (
            <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border-2 border-slate-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-[#ff4d6d]"></div>
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-rose-50 text-[#ff4d6d] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-100">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-[#0f172a]">Integrity Check</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Submit verification to complete process</p>
              </div>

              <div className="bg-[#f8fafc] p-10 rounded-[2.5rem] border border-slate-100 mb-8 text-center shadow-inner">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-3">Staff Target Reference</p>
                <h4 className="text-3xl font-black text-[#0f172a] uppercase tracking-tighter leading-none">{currentUser.verification.randomLeadName}</h4>
                <p className="text-slate-500 font-bold text-lg mt-2 tracking-widest">{currentUser.verification.randomLeadPhone}</p>
              </div>

              <form onSubmit={handleVerificationSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Exact Call Duration (Seconds)</label>
                  <input 
                    type="number" 
                    value={verificationInput}
                    onChange={e => setVerificationInput(e.target.value)}
                    placeholder="Duration"
                    className="w-full px-10 py-6 bg-[#f8fafc] border border-slate-200 rounded-3xl text-2xl font-black outline-none focus:border-rose-500 focus:bg-white transition-all text-center placeholder:text-slate-200"
                    required
                  />
                </div>
                <button type="submit" className="w-full py-6 bg-[#0f172a] text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">Complete Verification</button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-[3.5rem] p-20 text-center border-2 border-dashed border-slate-200 shadow-sm">
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
               </div>
               <h3 className="text-xl font-black uppercase text-slate-300 tracking-tighter">No Verification Pending</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 leading-relaxed">System will notify you once a random audit is triggered by Administration.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                <tr>
                  <th className="p-8">Student Identity</th>
                  <th className="p-8">Contact Information</th>
                  <th className="p-8">Status</th>
                  <th className="p-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => {
                  const isSentByMe = lead.delegatedFromId === currentUser.id;
                  const isSelected = selectedHistoryIds.includes(lead.id);
                  
                  return (
                    <tr 
                      key={lead.id} 
                      onClick={() => activeTab === 'completed' && setSelectedHistoryIds(p => p.includes(lead.id) ? p.filter(x => x !== lead.id) : [...p, lead.id])}
                      className={`hover:bg-slate-50 transition-all cursor-pointer group ${isSelected ? 'bg-indigo-50/50' : ''}`}
                    >
                      <td className="p-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#f8fafc] rounded-xl flex items-center justify-center font-black text-indigo-600 border border-slate-100 text-xs uppercase group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            {lead.name.charAt(0)}
                          </div>
                          <p className="text-[12px] font-black uppercase text-slate-800 tracking-tight">{lead.name}</p>
                        </div>
                      </td>
                      <td className="p-8">
                        <p className="text-indigo-600 text-[11px] font-black tracking-widest tabular-nums">{lead.phone}</p>
                      </td>
                      <td className="p-8">
                        <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${lead.callVerified ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {lead.callVerified ? 'Verified' : 'Uncalled'}
                        </span>
                        {lead.response && (
                           <span className="ml-2 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
                             {lead.response}
                           </span>
                        )}
                      </td>
                      <td className="p-8 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); startCallSession(lead); }} 
                          disabled={isSentByMe}
                          className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md active:scale-95 ${activeTab === 'pending' ? 'bg-[#0f172a] text-white hover:bg-slate-800' : 'bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`}
                        >
                          {activeTab === 'pending' ? 'Initiate Call' : 'Follow Up'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Call Interface */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 my-8">
            <div className="p-10 bg-[#0f172a] text-white text-center relative overflow-hidden shrink-0">
              <div className="absolute top-0 left-0 w-full h-2 bg-white/10">
                <div className={`h-full transition-all duration-1000 ${progressPercent < 100 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Live Session Active</p>
              <h3 className="text-4xl font-black uppercase leading-none mb-4 tracking-tighter">{callingLead.name}</h3>
              <div className="text-6xl font-black tabular-nums my-6 text-white">{Math.floor(callDuration/60)}:{(callDuration%60).toString().padStart(2,'0')}</div>
              
              {!isCallActive ? (
                <div className="px-6 py-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-2">
                   <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Call Session Verified</p>
                </div>
              ) : (
                <button onClick={endCallSession} className="px-12 py-5 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">End Session</button>
              )}
            </div>
            
            <div className="p-10 space-y-6 bg-white relative flex-1">
              {isLocked && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 font-bold text-xl">!</div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session in progress...</p>
                  <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Please complete {MIN_VALID_DURATION}s to unlock</p>
                </div>
              )}
              
              {!showBranchSelection ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Outcome Classification</p>
                  <button onClick={() => setShowBranchSelection(true)} disabled={isLocked} className="w-full py-6 bg-[#4c47f5] text-white rounded-3xl font-black text-[14px] uppercase tracking-widest shadow-xl transition-all hover:bg-indigo-700 active:scale-98 disabled:opacity-50">Interested</button>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} disabled={isLocked} className="py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[9px] font-black uppercase text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50">Not Interested</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} disabled={isLocked} className="py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[9px] font-black uppercase text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50">Confused</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} disabled={isLocked} className="py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[9px] font-black uppercase text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50">11th / 12th</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_RESPONDING)} disabled={isLocked} className="py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[9px] font-black uppercase text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50">Not Responding</button>
                  </div>
                  <button onClick={() => handleCategorization(callingLead.id, StudentResponse.OTHERS)} disabled={isLocked} className="w-full py-4 bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50">Others / Outside Scope</button>
                  <button onClick={() => setCallingLead(null)} className="w-full py-3 text-slate-300 text-[9px] font-black uppercase tracking-widest hover:text-slate-500">Dismiss</button>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Enrollment Details</p>
                    <h4 className="text-lg font-black uppercase text-[#0f172a] mt-1 tracking-tight">Select Preferred Branch</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.values(Department)
                      .filter(dept => dept !== Department.SCIENCE_HUMANITIES)
                      .map(dept => (
                        <button key={dept} onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED, dept)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left hover:bg-indigo-600 hover:text-white transition-all group">
                          <p className="text-[9px] font-black uppercase leading-tight group-hover:text-white">{dept}</p>
                        </button>
                      ))}
                  </div>
                  <button onClick={() => setShowBranchSelection(false)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest">Back to Outcomes</button>
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
