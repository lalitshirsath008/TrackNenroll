import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, updateLead } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null);

  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  const MIN_CALL_THRESHOLD = 8; // Slightly reduced for smoother demo

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
    // Open tel: link and stay on current page to track duration
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
      case StudentResponse.CONFUSED: newStage = LeadStage.TARGETED; break;
      case StudentResponse.NOT_INTERESTED: newStage = LeadStage.DISCARDED; break;
      case StudentResponse.GRADE_11_12: newStage = LeadStage.FORWARDED; break;
      case StudentResponse.OTHERS: newStage = LeadStage.NO_ACTION; break;
    }
    setLastCompletedId(leadId);
    updateLead(leadId, { response, stage: newStage });
    setCallingLead(null);
    setTimeout(() => setLastCompletedId(null), 1000);
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
          height: 100dvh; /* Dynamic viewport height for mobile browsers */
        }
      `}</style>

      {/* Responsive Header */}
      <div className="bg-emerald-600 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">Faculty Hub</h1>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight uppercase leading-none">Counselling</h2>
        </div>
        <div className="relative z-10 bg-white/10 px-6 py-4 rounded-[1.5rem] md:rounded-[2rem] backdrop-blur-md border border-white/20 text-center w-full md:w-auto flex flex-col items-center">
          <p className="text-4xl md:text-6xl font-black leading-none">{stats.completed}/{stats.total}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-70">Progress</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-4 rounded-xl md:rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}
        >
          Pending ({pendingLeads.length})
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-4 rounded-xl md:rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
        >
          History ({stats.completed})
        </button>
      </div>

      {/* Lead List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 p-6 md:p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl font-black text-indigo-600 border border-slate-100">
                {lead.name.charAt(0)}
              </div>
              <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full ${lead.callVerified ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                {lead.callVerified ? 'Verified' : 'New'}
              </span>
            </div>
            
            <div className="flex-1 mb-6">
              <h4 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">{lead.name}</h4>
              <p className="text-indigo-600 text-sm font-bold mt-1">{lead.phone}</p>
            </div>

            {lead.stage === LeadStage.ASSIGNED || lead.stage === LeadStage.UNASSIGNED ? (
              <button 
                onClick={() => startCallSession(lead)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200"
              >
                Call Candidate
              </button>
            ) : (
              <div className="py-4 bg-slate-50 rounded-2xl text-center border border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Result: {lead.stage}</span>
              </div>
            )}
          </div>
        ))}

        {(activeTab === 'pending' ? pendingLeads : completedLeads).length === 0 && (
          <div className="col-span-full py-20 text-center">
            <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No entries found</p>
          </div>
        )}
      </div>

      {/* Calling Overlay - Full Screen Mobile Friendly */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/98 backdrop-blur-xl flex flex-col calling-overlay overflow-hidden">
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
             <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse-ring mb-8">
               <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
               </svg>
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">Live Verification</p>
             <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2">{callingLead.name}</h3>
             <p className="text-indigo-400 font-bold tracking-widest">{callingLead.phone}</p>
             
             <div className="mt-12">
               <p className="text-6xl md:text-8xl font-black text-white tracking-tighter tabular-nums">{formatTime(callDuration)}</p>
               <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mt-4">Active Counseling Time</p>
             </div>
          </div>

          <div className="p-6 md:p-12 bg-white rounded-t-[3rem] shadow-2xl relative">
             {isCallActive ? (
                <button 
                  onClick={endCallSession}
                  className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl animate-in slide-in-from-bottom-5"
                >
                  End Session
                </button>
             ) : (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-4">Final Classification</p>
                  
                  {callDuration < MIN_CALL_THRESHOLD && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-4 text-center">
                       <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">⚠️ Short Interaction Detected</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)} className="p-5 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-100">Interested</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} className="p-5 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-rose-100">Not Interested</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} className="p-5 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-amber-100">Requires Counseling</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} className="p-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100">School Candidate</button>
                  </div>
                  
                  <button 
                    onClick={() => setCallingLead(null)} 
                    className="w-full py-4 text-slate-400 font-black text-[9px] uppercase tracking-widest mt-4"
                  >
                    Discard & Return
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