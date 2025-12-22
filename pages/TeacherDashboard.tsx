import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, updateLead } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Strict institutional requirement for valid counseling session (minimum 10 seconds)
  const MIN_CALL_THRESHOLD = 10;

  const myLeads = useMemo(() => leads.filter(l => l.assignedToTeacher === currentUser.id), [leads, currentUser.id]);
  const pendingLeads = useMemo(() => myLeads.filter(l => l.stage === LeadStage.ASSIGNED || l.stage === LeadStage.UNASSIGNED), [myLeads]);
  const completedLeads = useMemo(() => {
    let filtered = myLeads.filter(l => l.stage !== LeadStage.ASSIGNED && l.stage !== LeadStage.UNASSIGNED);
    if (dateFilter) {
      filtered = filtered.filter(l => l.callTimestamp?.includes(new Date(dateFilter).toLocaleDateString()));
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
    
    // Automatically trigger native dialer intent
    window.location.href = `tel:${lead.phone}`;
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const endCallSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCallActive(false);
    
    if (callingLead) {
      // Record verification metadata: only verified if threshold is met
      updateLead(callingLead.id, { 
        callVerified: callDuration >= MIN_CALL_THRESHOLD, 
        callTimestamp: new Date().toLocaleString(),
        callDuration: callDuration
      });
    }
  };

  const handleCategorization = (leadId: string, response: StudentResponse) => {
    // Extra safety check: categorization only unlocked if call duration met threshold
    if (callDuration < MIN_CALL_THRESHOLD) return;

    let newStage = LeadStage.NO_ACTION;
    switch (response) {
      case StudentResponse.INTERESTED:
      case StudentResponse.CONFUSED: newStage = LeadStage.TARGETED; break;
      case StudentResponse.NOT_INTERESTED: newStage = LeadStage.DISCARDED; break;
      case StudentResponse.GRADE_11_12: newStage = LeadStage.FORWARDED; break;
      case StudentResponse.OTHERS: newStage = LeadStage.NO_ACTION; break;
    }
    
    updateLead(leadId, { response, stage: newStage });
    setCallingLead(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .animate-pulse-ring { animation: pulse-ring 2s infinite; }
        .calling-overlay {
          height: 100vh;
          height: 100dvh;
        }
        .lock-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Hero Header */}
      <div className="bg-emerald-600 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">Counselling Terminal</h1>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight uppercase leading-none">Counsellor Hub</h2>
        </div>
        <div className="relative z-10 bg-white/10 px-6 py-4 rounded-[1.5rem] md:rounded-[2rem] backdrop-blur-md border border-white/20 text-center w-full md:w-auto">
          <p className="text-4xl md:text-6xl font-black leading-none">{stats.completed}/{stats.total}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-70">Interaction Progress</p>
        </div>
      </div>

      {/* Filters & Navigation */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white p-2 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-4 rounded-xl md:rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            Awaiting ({pendingLeads.length})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-4 rounded-xl md:rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            Verified ({stats.completed})
          </button>
        </div>
        {activeTab === 'completed' && (
          <input 
            type="date" 
            className="px-6 py-4 bg-white rounded-2xl border border-slate-100 text-xs font-black uppercase outline-none shadow-sm"
            onChange={(e) => setDateFilter(e.target.value)}
          />
        )}
      </div>

      {/* Grid of Student Leads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 p-6 md:p-8 flex flex-col shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl font-black text-indigo-600 border border-slate-100">
                {lead.name.charAt(0)}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full ${lead.callVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {lead.callVerified ? 'Verified Interaction' : 'Interaction Pending'}
                </span>
                {lead.callDuration ? <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Time: {formatTime(lead.callDuration)}</span> : null}
              </div>
            </div>
            
            <div className="flex-1 mb-6">
              <h4 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">{lead.name}</h4>
              <p className="text-indigo-600 text-sm font-bold mt-1">{lead.phone}</p>
              {lead.callTimestamp && <p className="text-[9px] text-slate-400 font-medium mt-2 italic">Last Touch: {lead.callTimestamp}</p>}
            </div>

            {lead.stage === LeadStage.ASSIGNED || lead.stage === LeadStage.UNASSIGNED ? (
              <button 
                onClick={() => startCallSession(lead)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                Start Counseling
              </button>
            ) : (
              <div className="py-4 bg-slate-50 rounded-2xl text-center border border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{lead.stage}</span>
              </div>
            )}
          </div>
        ))}

        {(activeTab === 'pending' ? pendingLeads : completedLeads).length === 0 && (
          <div className="col-span-full py-32 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-30">∅</div>
            <p className="text-slate-300 font-black uppercase tracking-widest text-xs">Queue is currently empty</p>
          </div>
        )}
      </div>

      {/* Robust Call Verification Overlay */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/98 backdrop-blur-2xl flex flex-col calling-overlay overflow-hidden">
          {/* Active Call Status */}
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
             <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse-ring mb-8 shadow-2xl shadow-emerald-500/20">
               <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
               </svg>
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-2">Institutional Call Session</p>
             <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2">{callingLead.name}</h3>
             <p className="text-indigo-400 font-bold tracking-widest text-lg">{callingLead.phone}</p>
             
             <div className="mt-12 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
               <p className="text-7xl md:text-9xl font-black text-white tracking-tighter tabular-nums leading-none">{formatTime(callDuration)}</p>
               <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mt-6">Audit Requirement: {MIN_CALL_THRESHOLD}s Minimum Interaction</p>
             </div>
          </div>

          {/* Categorization & Session Control Pad */}
          <div className="p-6 md:p-12 bg-white rounded-t-[3rem] shadow-2xl relative">
             {isCallActive ? (
                <button 
                  onClick={endCallSession}
                  className="w-full py-6 md:py-8 bg-rose-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                  Terminate Session
                </button>
             ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Final Classification</p>
                    {callDuration < MIN_CALL_THRESHOLD ? (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-center gap-3">
                         <span className="text-[18px]">⚠️</span>
                         <p className="text-[10px] font-black text-amber-700 uppercase tracking-tight text-left">Short Interaction ({callDuration}s).<br/>Options locked for data integrity.</p>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-center gap-3">
                         <span className="text-[18px]">✅</span>
                         <p className="text-[10px] font-black text-emerald-700 uppercase tracking-tight text-left">Verified Interaction Complete.<br/>Response mapping unlocked.</p>
                      </div>
                    )}
                  </div>

                  {/* Classification Buttons (Locked until threshold met) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                    {callDuration < MIN_CALL_THRESHOLD && (
                      <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[2px] rounded-2xl flex items-center justify-center overflow-hidden">
                        <div className="lock-shimmer absolute inset-0 opacity-20"></div>
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                      </div>
                    )}
                    <button 
                      disabled={callDuration < MIN_CALL_THRESHOLD}
                      onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)} 
                      className="p-5 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
                    >
                      Interested
                    </button>
                    <button 
                      disabled={callDuration < MIN_CALL_THRESHOLD}
                      onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} 
                      className="p-5 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-rose-100 active:scale-95 disabled:opacity-50"
                    >
                      Not Interested
                    </button>
                    <button 
                      disabled={callDuration < MIN_CALL_THRESHOLD}
                      onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} 
                      className="p-5 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-amber-100 active:scale-95 disabled:opacity-50"
                    >
                      Confused / Follow-up
                    </button>
                    <button 
                      disabled={callDuration < MIN_CALL_THRESHOLD}
                      onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} 
                      className="p-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
                    >
                      Forward to School Team
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setCallingLead(null)} 
                    className="w-full py-4 text-slate-400 font-black text-[9px] uppercase tracking-widest mt-2 hover:text-slate-600 transition-colors"
                  >
                    Abort Verification & Return
                  </button>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;