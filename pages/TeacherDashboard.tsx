
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, updateLead } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null);

  // Call Tracking States
  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  const MIN_CALL_THRESHOLD = 10; // Seconds required to unlock categorization

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
    setCallDuration(0);
    window.location.href = `tel:${lead.phone}`;
    
    timerRef.current = window.setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const endCallSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCallActive(false);
    
    if (callingLead) {
      updateLead(callingLead.id, { 
        callVerified: true, 
        callTimestamp: new Date().toLocaleString(),
        callDuration: callDuration
      });
    }
  };

  const handleCategorization = (leadId: string, response: StudentResponse) => {
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
      case StudentResponse.OTHERS:
        newStage = LeadStage.NO_ACTION;
        break;
    }

    setLastCompletedId(leadId);
    updateLead(leadId, { response, stage: newStage });
    setCallingLead(null); // Clear the session view
    
    setTimeout(() => setLastCompletedId(null), 1000);
  };

  const handleForward = (leadId: string) => {
    updateLead(leadId, { stage: LeadStage.FORWARDED });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <style>{`
        @keyframes checkmark-pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-checkmark {
          animation: checkmark-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s infinite;
        }
      `}</style>

      {/* Hero Header */}
      <div className="bg-emerald-600 p-6 md:p-10 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-emerald-800 transition-all relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.3em] mb-2">TrackNEnroll : Faculty Terminal</h1>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight uppercase leading-none">Admission Calling</h2>
          <p className="opacity-80 mt-3 font-bold tracking-widest text-[10px] uppercase">Classify Student Leads based on Phone Counseling</p>
        </div>
        <div className="relative z-10 bg-white/10 px-8 py-5 rounded-[2rem] backdrop-blur-md border border-white/20 text-center shadow-inner w-full md:w-auto">
          <p className="text-4xl md:text-6xl font-black">{stats.completed}/{stats.total}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">Interaction Target</p>
        </div>
      </div>

      {/* Navigation and Filters Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex p-1.5 bg-[#F1F5F9] rounded-[2rem] w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 md:flex-none px-10 py-4 rounded-[1.75rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-emerald-600 shadow-xl shadow-slate-200' : 'text-[#64748B] hover:text-slate-700'}`}
          >
            PENDING ({pendingLeads.length})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`flex-1 md:flex-none px-10 py-4 rounded-[1.75rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-xl shadow-slate-200' : 'text-[#64748B] hover:text-slate-700'}`}
          >
            COMPLETED ({stats.completed})
          </button>
        </div>

        {activeTab === 'completed' && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Interaction Date Filter</label>
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-200 rounded-[1.25rem] px-5 py-3 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full md:w-auto"
            />
          </div>
        )}
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => {
          const isJustCompleted = lastCompletedId === lead.id;
          const isFinished = lead.stage !== LeadStage.ASSIGNED && lead.stage !== LeadStage.UNASSIGNED;

          return (
            <div key={lead.id} className={`bg-white rounded-[2.5rem] border-2 p-8 transition-all hover:scale-[1.01] flex flex-col ${
              lead.stage === LeadStage.FORWARDED ? 'border-indigo-500 shadow-xl shadow-indigo-50' : 
              lead.stage === LeadStage.DISCARDED ? 'border-red-100 opacity-70' : 
              lead.stage === LeadStage.TARGETED ? 'border-emerald-500 shadow-xl shadow-emerald-50' : 'border-slate-100 shadow-sm'
            }`}>
              <div className="flex items-start justify-between mb-6">
                <div className="relative">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl font-black text-indigo-600 border border-slate-100 shadow-inner">
                    {lead.name.charAt(0)}
                  </div>
                  {isFinished && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg animate-checkmark">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm transition-colors ${
                    lead.callVerified ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {lead.callVerified ? 'CONTACTED' : 'NOT CALLED'}
                  </span>
                  {lead.callDuration && (
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                      Dur: {lead.callDuration}s
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-6 flex-1">
                <h4 className="font-black text-slate-900 text-2xl leading-tight tracking-tight"> {lead.name}</h4>
                <p className="text-indigo-600 text-sm font-black uppercase tracking-widest mt-2">{lead.phone}</p>
              </div>

              <div className="space-y-4">
                {lead.stage === LeadStage.ASSIGNED || lead.stage === LeadStage.UNASSIGNED ? (
                  <button 
                    onClick={() => startCallSession(lead)}
                    className="group w-full py-5 bg-[#0F172A] text-white rounded-2xl flex items-center justify-center gap-3 font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-[10px]"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                    INITIATE VERIFIED CALL
                  </button>
                ) : (
                  <div className={`p-6 rounded-[2rem] border flex flex-col items-center text-center gap-3 bg-slate-50 border-slate-100 shadow-inner`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">ARCHIVED OUTCOME</p>
                    <span className={`w-full py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                      lead.stage === LeadStage.TARGETED ? 'bg-emerald-500 text-white' : 
                      lead.stage === LeadStage.DISCARDED ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'
                    }`}>
                      {lead.stage}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Call Tracking Overlay (Prevention System) */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 md:p-10 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden relative border-4 border-slate-800 flex flex-col md:flex-row">
            
            {/* Call Stats Panel */}
            <div className="md:w-1/2 p-10 bg-slate-900 text-white flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-r border-white/10">
              <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse-ring mb-8">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m8 0h-3m4-8a3 3 0 01-3 3H9a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v4z"/>
                </svg>
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">Active Verification Session</h3>
              <p className="text-3xl font-black mb-1">{callingLead.name}</p>
              <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs">{callingLead.phone}</p>
              
              <div className="mt-12 space-y-2">
                <p className="text-5xl font-black tracking-tighter text-white/90">{formatTime(callDuration)}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Total Call Time Recorded</p>
              </div>

              {isCallActive ? (
                <button 
                  onClick={endCallSession}
                  className="mt-12 w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-xl"
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                  END AND CATEGORIZE
                </button>
              ) : (
                <div className="mt-12 p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500">
                   <p className="text-[10px] font-black uppercase tracking-widest">Session Concluded</p>
                   <p className="text-xs font-bold mt-1">Duration Captured: {callDuration} Seconds</p>
                </div>
              )}
            </div>

            {/* Categorization Panel (Locked by Duration) */}
            <div className="md:w-1/2 p-10 flex flex-col justify-center bg-white relative">
              {isCallActive || callDuration < MIN_CALL_THRESHOLD ? (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Categorization Locked</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Complete at least {MIN_CALL_THRESHOLD}s interaction to enable reporting</p>
                  
                  {isCallActive && (
                    <div className="mt-6 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-1000" 
                        style={{ width: `${Math.min((callDuration / MIN_CALL_THRESHOLD) * 100, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="space-y-6">
                 <div className="text-center">
                   <h3 className="text-xl font-black text-slate-900 uppercase">Lead Classification</h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select the most accurate response</p>
                 </div>

                 <div className="grid grid-cols-1 gap-3">
                   <button onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)} className="p-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100">Highly Interested</button>
                   <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} className="p-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-100">Not Interested</button>
                   <button onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} className="p-4 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-amber-600 transition-all">Requires Counseling</button>
                   <button onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} className="p-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-700 transition-all">School Candidate (11th/12th)</button>
                   <button onClick={() => handleCategorization(callingLead.id, StudentResponse.OTHERS)} className="p-4 bg-slate-400 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-slate-500 transition-all">Others</button>
                 </div>

                 <button 
                  onClick={() => { setCallingLead(null); endCallSession(); }}
                  className="w-full text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors pt-4"
                 >
                   Discard this session
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
