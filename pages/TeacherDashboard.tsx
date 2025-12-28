
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User, Department } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, updateLead, addLog } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const timerRef = useRef<number | null>(null);

  // INSTITUTIONAL PARAMETERS
  const MIN_VALID_DURATION = 15; 
  const MIN_RETRY_DURATION = 10; 

  const myLeads = useMemo(() => leads.filter(l => l.assignedToTeacher === currentUser.id), [leads, currentUser.id]);
  const pendingLeads = useMemo(() => myLeads.filter(l => l.stage === LeadStage.ASSIGNED || l.stage === LeadStage.UNASSIGNED), [myLeads]);
  const completedLeads = useMemo(() => {
    let filtered = myLeads.filter(l => l.stage !== LeadStage.ASSIGNED && l.stage !== LeadStage.UNASSIGNED);
    if (dateFilter) {
      filtered = filtered.filter(l => l.callTimestamp?.startsWith(new Date(dateFilter).toLocaleDateString()));
    }
    return filtered;
  }, [myLeads, dateFilter]);

  const stats = {
    total: myLeads.length,
    completed: myLeads.filter(l => l.stage !== LeadStage.ASSIGNED && l.stage !== LeadStage.UNASSIGNED).length
  };

  const startCallSession = (lead: StudentLead) => {
    setCallingLead(lead);
    setIsCallActive(true);
    setShowDeptPicker(false);
    setCallDuration(0);
    
    window.location.href = `tel:${lead.phone}`;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const endCallSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCallActive(false);
  };

  const handleCategorization = (leadId: string, response: StudentResponse, selectedDept?: Department) => {
    const isInterestedFlow = response === StudentResponse.INTERESTED || response === StudentResponse.CONFUSED;
    const isRetryFlow = response === StudentResponse.NOT_RESPONDING || response === StudentResponse.NOT_REACHABLE;
    
    if (isInterestedFlow && callDuration < MIN_VALID_DURATION) {
      alert(`Institutional Audit Alert: Counseling session too short (${callDuration}s). Min ${MIN_VALID_DURATION}s required for Interested/Confused status.`);
      return;
    }

    if (isRetryFlow && callDuration < MIN_RETRY_DURATION) {
      alert(`Institutional Audit Alert: Interaction duration too low (${callDuration}s). Min ${MIN_RETRY_DURATION}s required for No Response status.`);
      return;
    }

    if (response === StudentResponse.INTERESTED && !selectedDept) {
      setShowDeptPicker(true);
      return;
    }

    let newStage = LeadStage.NO_ACTION;
    switch (response) {
      case StudentResponse.INTERESTED:
      case StudentResponse.CONFUSED: 
        newStage = LeadStage.TARGETED; 
        break;
      case StudentResponse.NOT_INTERESTED: 
        newStage = LeadStage.DISCARDED; 
        break;
      case StudentResponse.GRADE_11_12: 
        newStage = LeadStage.FORWARDED; 
        break;
      default:
        newStage = LeadStage.NO_ACTION;
    }

    const updates: Partial<StudentLead> = { 
      response, 
      stage: newStage,
      callVerified: true, 
      callTimestamp: new Date().toLocaleString(),
      callDuration: callDuration
    };
    if (selectedDept) updates.department = selectedDept;

    updateLead(leadId, updates);
    setCallingLead(null);
    setShowDeptPicker(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0 font-['Inter']">
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .animate-pulse-ring { animation: pulse-ring 2s infinite; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      {/* Roster Header */}
      <div className="bg-[#0f172a] p-8 md:p-14 rounded-[3rem] md:rounded-[5rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full -mr-64 -mt-64 blur-[120px]"></div>
        <div className="relative z-10 text-center md:text-left">
          <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
             <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
               Faculty Node Active
             </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9] mb-4">Counselling<br/>Dashboard</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 justify-center md:justify-start">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
             Faculty: {currentUser.name}
          </p>
        </div>
        <div className="relative z-10 flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-emerald-600 p-8 rounded-[3rem] shadow-2xl shadow-emerald-900/40 text-center min-w-[160px] flex flex-col justify-center border border-emerald-400/20">
            <p className="text-4xl font-black leading-none">{stats.completed}</p>
            <p className="text-[9px] font-black uppercase tracking-widest mt-2 opacity-80">Resolved</p>
          </div>
          <div className="flex-1 md:flex-none bg-white/5 p-8 rounded-[3rem] border border-white/10 text-center min-w-[160px] flex flex-col justify-center backdrop-blur-xl">
            <p className="text-4xl font-black text-indigo-400 leading-none">{pendingLeads.length}</p>
            <p className="text-[9px] font-black uppercase tracking-widest mt-2 opacity-50">Queued</p>
          </div>
        </div>
      </div>

      {/* Tab Control */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex p-2 bg-slate-100 rounded-[2.5rem] w-full md:w-auto">
          <button onClick={() => setActiveTab('pending')} className={`flex-1 md:flex-none px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500'}`}>Assigned Pool</button>
          <button onClick={() => setActiveTab('completed')} className={`flex-1 md:flex-none px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500'}`}>Session History</button>
        </div>
        {activeTab === 'completed' && <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full md:w-auto px-8 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-600 shadow-inner" />}
      </div>

      {/* Leads Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[3.5rem] border-2 p-10 flex flex-col border-slate-100 shadow-sm transition-all hover:border-indigo-200 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-600 transition-all duration-500"></div>
            <div className="flex items-start justify-between mb-8 relative z-10">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-3xl font-black text-indigo-600 border border-slate-100 group-hover:text-indigo-600 transition-all shadow-sm">{lead.name.charAt(0)}</div>
              <span className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border ${lead.callVerified ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{lead.callVerified ? 'AUDITED' : 'PENDING'}</span>
            </div>
            <div className="mb-10 flex-1 relative z-10">
              <h4 className="font-black text-slate-900 text-2xl tracking-tight uppercase truncate leading-tight">{lead.name}</h4>
              <p className="text-indigo-600 text-sm font-black tracking-widest mt-1.5">{lead.phone}</p>
            </div>
            {lead.stage === LeadStage.ASSIGNED || lead.stage === LeadStage.UNASSIGNED ? (
              <button onClick={() => startCallSession(lead)} className="w-full py-6 bg-[#0f172a] text-white rounded-[2rem] flex items-center justify-center gap-3 font-black text-[12px] uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200 active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                Call Now
              </button>
            ) : (
              <div className="py-5 px-8 bg-slate-50 border border-slate-100 rounded-3xl text-center">
                <span className={`text-[11px] font-black uppercase tracking-widest ${lead.response === StudentResponse.INTERESTED ? 'text-emerald-600' : 'text-slate-500'}`}>{lead.response}</span>
              </div>
            )}
          </div>
        ))}
        {(activeTab === 'pending' ? pendingLeads : completedLeads).length === 0 && (
          <div className="col-span-full py-32 text-center bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-200">
            <p className="text-[14px] font-black text-slate-300 uppercase tracking-[0.4em]">No Lead Objects Detected</p>
          </div>
        )}
      </div>

      {/* Call & Categorization Overlay */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-0 md:p-10">
          <div className="bg-white w-full h-full md:h-auto md:max-w-5xl md:rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500 border border-white/10">
            
            {/* Call State Monitoring */}
            <div className="md:w-2/5 bg-[#0a0f1e] p-12 flex flex-col justify-center items-center text-center text-white relative">
              <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.8)]"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">Live Telephony</span>
              </div>
              <div className="w-32 h-32 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center animate-pulse-ring mb-12 shadow-2xl shadow-emerald-500/20">
                <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              </div>
              <h3 className="text-4xl font-black uppercase tracking-tight mb-4 leading-none">{callingLead.name}</h3>
              <p className="text-indigo-400 font-black text-base tracking-[0.1em] mb-12">{callingLead.phone}</p>
              
              <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 w-full mb-12 backdrop-blur-md">
                <p className="text-8xl font-black tracking-tighter tabular-nums leading-none">{formatTime(callDuration)}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-6 italic">Institutional Session Time</p>
              </div>

              {isCallActive ? (
                <button onClick={endCallSession} className="w-full py-7 bg-rose-600 text-white rounded-[2rem] font-black uppercase text-[14px] tracking-[0.2em] shadow-2xl shadow-rose-950/50 active:scale-95 transition-all">Hang Up Link</button>
              ) : (
                <div className="w-full py-6 bg-emerald-500/10 text-emerald-400 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.3em] border border-emerald-500/20 flex items-center justify-center gap-3">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                   Verification Secure
                </div>
              )}
            </div>

            {/* Assessment & Classification */}
            <div className="flex-1 bg-slate-50 p-12 md:p-16 flex flex-col justify-center relative">
              {isCallActive && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-10 flex flex-col items-center justify-center p-12 text-center">
                   <div className="flex gap-2 mb-10">
                      <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                   </div>
                   <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400">Policy Lock Active</p>
                   <p className="text-xl font-black text-slate-900 mt-6 uppercase leading-tight max-w-[320px]">Outcome classification strictly locked during active session</p>
                </div>
              )}

              <div className="max-w-lg mx-auto w-full space-y-6">
                {!showDeptPicker ? (
                  <>
                    <div className="mb-12 text-center md:text-left">
                      <p className="text-[12px] font-black text-indigo-600 uppercase tracking-widest mb-2">Step 1: Session Outcome</p>
                      <h4 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Classification</h4>
                    </div>

                    {/* INTERESTED BUTTON - BOLD, LARGE, HERO-STYLE */}
                    <button 
                      onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)}
                      disabled={callDuration < MIN_VALID_DURATION}
                      className={`w-full p-10 rounded-[2.5rem] font-black text-[14px] uppercase tracking-[0.3em] shadow-2xl transition-all flex justify-between items-center group relative overflow-hidden ${
                        callDuration >= MIN_VALID_DURATION 
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/40 active:scale-[0.98]' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none grayscale opacity-50'
                      }`}
                    >
                      <span className="flex items-center gap-5 relative z-10">
                        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
                        </div>
                        Interested Student
                      </span>
                      <svg className="w-6 h-6 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7"/></svg>
                    </button>

                    <div className="grid grid-cols-2 gap-5">
                      <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} className="p-7 bg-white border-2 border-slate-100 text-slate-500 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:border-rose-500 hover:text-rose-500 transition-all shadow-sm">Not Interested</button>
                      <button onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} disabled={callDuration < MIN_VALID_DURATION} className="p-7 bg-white border-2 border-slate-100 text-slate-500 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:border-amber-500 hover:text-amber-500 transition-all shadow-sm disabled:opacity-30">Still Confused</button>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_RESPONDING)} className="p-7 bg-white border-2 border-slate-100 text-slate-500 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm">No Response</button>
                      <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_REACHABLE)} className="p-7 bg-white border-2 border-slate-100 text-slate-500 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm">Unreachable</button>
                    </div>

                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} className="w-full p-6 bg-white border-2 border-slate-100 text-slate-500 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:border-indigo-900 hover:text-indigo-900 transition-all shadow-sm">11th / 12th Standard</button>
                    
                    <button onClick={() => setCallingLead(null)} className="w-full pt-10 text-slate-300 text-[11px] font-black uppercase tracking-[0.4em] hover:text-slate-500 transition-all">Abort Assessment</button>
                  </>
                ) : (
                  <div className="animate-in slide-in-from-right-8 duration-500">
                    <div className="flex items-center gap-8 mb-14">
                      <button onClick={() => setShowDeptPicker(false)} className="w-16 h-16 bg-white border border-slate-200 rounded-[2rem] flex items-center justify-center hover:bg-slate-100 transition-all shadow-xl shadow-slate-200/50">
                        <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7"/></svg>
                      </button>
                      <div>
                        <p className="text-[12px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-2">Step 2: Department Selection</p>
                        <h4 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Target Branch</h4>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 max-h-[450px] overflow-y-auto pr-6 custom-scroll">
                      {Object.values(Department).map(dept => (
                        <button 
                          key={dept} 
                          onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED, dept)}
                          className="w-full p-7 bg-white border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/50 rounded-[2.5rem] text-left transition-all group flex justify-between items-center shadow-sm"
                        >
                          <p className="text-[12px] font-black uppercase tracking-tight text-slate-700 group-hover:text-indigo-600">{dept}</p>
                          <svg className="w-7 h-7 text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
