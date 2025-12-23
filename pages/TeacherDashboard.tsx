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
    
    // Explicit Trigger of tel: intent
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
      const isVerified = callDuration >= MIN_CALL_THRESHOLD;
      updateLead(callingLead.id, { 
        callVerified: isVerified, 
        callTimestamp: new Date().toLocaleString(),
        callDuration: callDuration
      });
    }
  };

  const handleCategorization = (leadId: string, response: StudentResponse) => {
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

  const progressPercent = Math.min((callDuration / MIN_CALL_THRESHOLD) * 100, 100);

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

        .sound-wave {
          display: flex;
          align-items: center;
          gap: 4px;
          height: 50px;
        }
        .bar {
          width: 4px;
          background: #10b981;
          border-radius: 10px;
          animation: wave 1.2s ease-in-out infinite;
        }
        @keyframes wave {
          0%, 100% { height: 12px; opacity: 0.5; }
          50% { height: 45px; opacity: 1; }
        }
        .bar:nth-child(2) { animation-delay: 0.1s; }
        .bar:nth-child(3) { animation-delay: 0.2s; }
        .bar:nth-child(4) { animation-delay: 0.3s; }
        .bar:nth-child(5) { animation-delay: 0.4s; }

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
      <div className="bg-emerald-600 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-[11px] font-black text-emerald-100 uppercase tracking-[0.3em] mb-2">Faculty Counseling Node</h1>
          <h2 className="text-3xl md:text-6xl font-black tracking-tighter uppercase leading-none">Your Pipeline</h2>
        </div>
        <div className="relative z-10 bg-white/10 px-8 py-6 rounded-[2rem] backdrop-blur-md border border-white/20 text-center w-full md:w-64">
          <p className="text-5xl md:text-7xl font-black leading-none">{stats.completed}</p>
          <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">Verified Targets</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm flex">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}
          >
            Awaiting Interaction ({pendingLeads.length})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
          >
            Resolution History ({stats.completed})
          </button>
        </div>
      </div>

      {/* Interaction Registry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 flex flex-col shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl font-black text-indigo-600 border border-slate-100 shadow-sm">
                {lead.name.charAt(0)}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full border ${lead.callVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                  {lead.callVerified ? 'Verified' : 'Pending Verification'}
                </span>
                {lead.callDuration ? <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{formatTime(lead.callDuration)} Duration</span> : null}
              </div>
            </div>
            
            <div className="flex-1 mb-8">
              <h4 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none mb-1">{lead.name}</h4>
              <p className="text-indigo-600 text-sm font-bold tracking-widest">{lead.phone}</p>
              <div className="flex items-center gap-2 mt-3">
                 <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lead.department}</p>
              </div>
            </div>

            {lead.stage === LeadStage.ASSIGNED || lead.stage === LeadStage.UNASSIGNED ? (
              <button 
                onClick={() => startCallSession(lead)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-600 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 group"
              >
                <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                Launch Dialer
              </button>
            ) : (
              <div className="py-4 bg-slate-50 rounded-2xl text-center border border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{lead.stage}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Immersive Calling Overlay */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col calling-overlay overflow-hidden animate-in fade-in duration-500">
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
             <div className="relative mb-12">
                <svg className="w-40 h-40 transform -rotate-90 filter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                  <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="8" fill="transparent" 
                    strokeDasharray={2 * Math.PI * 74} 
                    strokeDashoffset={2 * Math.PI * 74 * (1 - progressPercent / 100)} 
                    className="text-emerald-500 transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                    <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                  </div>
                </div>
             </div>

             <div className="space-y-4">
                <p className="text-[12px] font-black uppercase tracking-[0.5em] text-emerald-400 opacity-80">Counseling Sync Active</p>
                <h3 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none">{callingLead.name}</h3>
                <div className="flex flex-col items-center gap-6">
                   <p className="text-white/40 font-bold tracking-[0.3em] text-xl md:text-3xl">{callingLead.phone}</p>
                   {isCallActive && (
                     <div className="sound-wave">
                        {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="bar"></div>)}
                     </div>
                   )}
                </div>
             </div>
             
             <div className="mt-16">
               <p className="text-8xl md:text-[14rem] font-black text-white tracking-tighter tabular-nums leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">{formatTime(callDuration)}</p>
               <div className="mt-8 flex items-center justify-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10">
                 <div className={`w-2 h-2 rounded-full ${callDuration >= MIN_CALL_THRESHOLD ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                 <p className="text-[10px] font-black uppercase text-white/50 tracking-[0.2em]">
                   Institutional Verification Threshold: {MIN_CALL_THRESHOLD}s
                 </p>
               </div>
             </div>
          </div>

          <div className="p-10 md:p-16 bg-white rounded-t-[4rem] shadow-[0_-30px_80px_rgba(0,0,0,0.6)] relative overflow-hidden">
             {isCallActive ? (
                <button 
                  onClick={endCallSession}
                  className="w-full py-10 bg-rose-600 hover:bg-rose-500 text-white rounded-[2.5rem] font-black text-2xl uppercase tracking-[0.3em] shadow-3xl shadow-rose-950/20 active:scale-95 transition-all flex items-center justify-center gap-6 group"
                >
                  <div className="w-4 h-4 bg-white rounded-full animate-ping"></div>
                  <span>End Session</span>
                </button>
             ) : (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-20 duration-700">
                  <div className="flex flex-col items-center text-center">
                       <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300 mb-4">Post-Interaction Analysis</p>
                       {callDuration < MIN_CALL_THRESHOLD ? (
                        <div className="bg-amber-50 border-2 border-amber-100 px-8 py-5 rounded-[2.5rem] flex items-center gap-6 shadow-sm max-w-lg">
                           <span className="text-4xl">🔒</span>
                           <div className="text-left">
                              <p className="text-[11px] font-black text-amber-700 uppercase tracking-tight leading-none mb-1">Security Lock Active</p>
                              <p className="text-[10px] font-bold text-amber-600 uppercase opacity-70">Duration ({callDuration}s) is below the audit requirements.</p>
                           </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border-2 border-emerald-100 px-8 py-5 rounded-[2.5rem] flex items-center gap-6 shadow-sm max-w-lg">
                           <span className="text-4xl">🚀</span>
                           <div className="text-left">
                              <p className="text-[11px] font-black text-emerald-700 uppercase tracking-tight leading-none mb-1">Interaction Verified</p>
                              <p className="text-[10px] font-bold text-emerald-600 uppercase opacity-70">Categorization engine initialized for {callingLead.name}.</p>
                           </div>
                        </div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative">
                    {callDuration < MIN_CALL_THRESHOLD && (
                      <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[6px] rounded-[2.5rem] flex flex-col items-center justify-center overflow-hidden border border-slate-50">
                        <div className="lock-shimmer absolute inset-0 opacity-10"></div>
                        <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                        <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">Identity Classification Locked</p>
                      </div>
                    )}
                    
                    <button 
                      disabled={callDuration < MIN_CALL_THRESHOLD}
                      onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)} 
                      className="aspect-square flex flex-col items-center justify-center gap-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[3rem] font-black text-[12px] uppercase shadow-2xl shadow-emerald-100 active:scale-90 disabled:opacity-5 transition-all group"
                    >
                      <span className="text-4xl group-hover:scale-110 transition-transform">💎</span>
                      Interested
                    </button>
                    <button 
                      disabled={callDuration < MIN_CALL_THRESHOLD}
                      onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} 
                      className="aspect-square flex flex-col items-center justify-center gap-4 bg-rose-500 hover:bg-rose-600 text-white rounded-[3rem] font-black text-[12px] uppercase shadow-2xl shadow-rose-100 active:scale-90 disabled:opacity-5 transition-all group"
                    >
                      <span className="text-4xl group-hover:scale-110 transition-transform">💀</span>
                      Discard
                    </button>
                    <button 
                      disabled={callDuration < MIN_CALL_THRESHOLD}
                      onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} 
                      className="aspect-square flex flex-col items-center justify-center gap-4 bg-amber-500 hover:bg-amber-600 text-white rounded-[3rem] font-black text-[12px] uppercase shadow-2xl shadow-amber-100 active:scale-90 disabled:opacity-5 transition-all group"
                    >
                      <span className="text-4xl group-hover:scale-110 transition-transform">🤔</span>
                      Confused
                    </button>
                    <button 
                      disabled={callDuration < MIN_CALL_THRESHOLD}
                      onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} 
                      className="aspect-square flex flex-col items-center justify-center gap-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[3rem] font-black text-[12px] uppercase shadow-2xl shadow-indigo-100 active:scale-90 disabled:opacity-5 transition-all group"
                    >
                      <span className="text-4xl group-hover:scale-110 transition-transform">🏛️</span>
                      Forward
                    </button>
                  </div>
                  
                  <div className="flex justify-center">
                    <button 
                      onClick={() => setCallingLead(null)} 
                      className="px-12 py-5 text-slate-300 hover:text-indigo-600 font-black text-[11px] uppercase tracking-[0.2em] transition-all rounded-full hover:bg-indigo-50 border-2 border-transparent hover:border-indigo-100"
                    >
                      Discard & Reset Interaction
                    </button>
                  </div>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;