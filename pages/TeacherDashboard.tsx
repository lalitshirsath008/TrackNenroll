import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User, Department } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, updateLead } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showBranchSelection, setShowBranchSelection] = useState(false);
  const [tempResponse, setTempResponse] = useState<StudentResponse | null>(null);
  
  const timerRef = useRef<number | null>(null);

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
    setShowBranchSelection(false);
    setTempResponse(null);
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
    
    if (callingLead) {
      const isVerified = callDuration >= MIN_CALL_THRESHOLD;
      updateLead(callingLead.id, { 
        callVerified: isVerified, 
        callTimestamp: new Date().toLocaleString(),
        callDuration: callDuration
      });
    }
  };

  const handleInitialResponse = (response: StudentResponse) => {
    if (response === StudentResponse.INTERESTED) {
      setTempResponse(response);
      setShowBranchSelection(true);
    } else {
      finalizeCategorization(callingLead!.id, response);
    }
  };

  const finalizeCategorization = (leadId: string, response: StudentResponse, branch?: Department) => {
    let newStage = LeadStage.NO_ACTION;
    switch (response) {
      case StudentResponse.INTERESTED:
      case StudentResponse.CONFUSED: newStage = LeadStage.TARGETED; break;
      case StudentResponse.NOT_INTERESTED: newStage = LeadStage.DISCARDED; break;
      case StudentResponse.GRADE_11_12: newStage = LeadStage.FORWARDED; break;
      case StudentResponse.OTHERS: newStage = LeadStage.NO_ACTION; break;
    }
    
    updateLead(leadId, { 
      response, 
      stage: newStage,
      department: branch || callingLead?.department || Department.IT
    });
    
    setCallingLead(null);
    setShowBranchSelection(false);
    setTempResponse(null);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .pulse-circle {
          position: relative;
        }
        .pulse-circle::before {
          content: "";
          position: absolute;
          inset: -10px;
          border: 2px solid #10b981;
          border-radius: 50%;
          animation: pulse-ring 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
        }
        
        .sound-wave {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 24px;
        }
        .wave-bar {
          width: 3px;
          background: #10b981;
          border-radius: 10px;
          animation: wave-anim 1.2s ease-in-out infinite;
        }
        @keyframes wave-anim {
          0%, 100% { height: 6px; opacity: 0.3; }
          50% { height: 20px; opacity: 1; }
        }
        .wave-bar:nth-child(2) { animation-delay: 0.1s; }
        .wave-bar:nth-child(3) { animation-delay: 0.2s; }
        .wave-bar:nth-child(4) { animation-delay: 0.3s; }
        .wave-bar:nth-child(5) { animation-delay: 0.4s; }

        .calling-screen {
          background-color: #020617;
        }
        
        .cat-card {
          box-shadow: 0 10px 80px -15px rgba(0,0,0,0.8);
          max-width: 90vw;
          width: 700px;
        }
      `}</style>

      {/* Dashboard Stats */}
      <div className="bg-emerald-600 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-[11px] font-black text-emerald-100 uppercase tracking-[0.3em] mb-2">Faculty Hub</h1>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">Admission Desk</h2>
        </div>
        <div className="relative z-10 bg-white/10 px-8 py-6 rounded-[2rem] backdrop-blur-md border border-white/20 text-center w-full md:w-64">
          <p className="text-5xl md:text-6xl font-black leading-none">{stats.completed}</p>
          <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">Verified Targets</p>
        </div>
      </div>

      {/* List / Tabs */}
      <div className="bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm flex overflow-hidden">
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

      {/* Leads Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 flex flex-col shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl font-black text-indigo-600 border border-slate-100 group-hover:scale-110 transition-transform">
                {lead.name.charAt(0)}
              </div>
              <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full border ${lead.callVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                {lead.callVerified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
            
            <div className="flex-1 mb-8">
              <h4 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none mb-1">{lead.name}</h4>
              <p className="text-indigo-600 text-sm font-bold tracking-[0.2em]">{lead.phone.split('').join(' ')}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{lead.department}</p>
            </div>

            {activeTab === 'pending' ? (
              <button 
                onClick={() => startCallSession(lead)}
                className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-600 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
              >
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

      {/* Immersive Overlay */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] calling-screen flex flex-col items-center justify-center text-white p-6 md:p-12 animate-in fade-in duration-500 overflow-hidden">
          
          {isCallActive ? (
            <div className="w-full h-full flex flex-col items-center justify-between">
              {/* Header Info */}
              <div className="w-full flex flex-col items-center mt-8 space-y-12">
                <div className="pulse-circle">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.3)]">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  </div>
                </div>

                <div className="space-y-4 text-center px-4">
                  <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-emerald-400">Counseling Sync Active</p>
                  <h2 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter leading-none uppercase max-w-4xl mx-auto">{callingLead.name}</h2>
                  <p className="text-white/40 text-lg md:text-xl font-bold tracking-[0.4em]">{callingLead.phone.split('').join(' ')}</p>
                  
                  <div className="sound-wave justify-center mt-4">
                    {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="wave-bar"></div>)}
                  </div>
                </div>
              </div>

              {/* Central Chronometer */}
              <div className="flex flex-col items-center justify-center">
                <p className="text-[6rem] md:text-[10rem] lg:text-[12rem] font-black tracking-tighter tabular-nums leading-none">
                  {Math.floor(callDuration / 60)}•{(callDuration % 60).toString().padStart(2, '0')}
                </p>
                <div className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 px-5 py-2 rounded-full mt-2">
                   <div className={`w-1.5 h-1.5 rounded-full ${callDuration >= MIN_CALL_THRESHOLD ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Verified Threshold: {MIN_CALL_THRESHOLD}s</p>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full max-w-xl mb-12 px-6">
                <button 
                  onClick={endCallSession}
                  className="w-full py-6 md:py-8 bg-rose-600 hover:bg-rose-500 text-white rounded-[2.5rem] font-black text-lg md:text-xl uppercase tracking-[0.3em] shadow-3xl shadow-rose-950/40 active:scale-95 transition-all flex items-center justify-center gap-6"
                >
                  End Session
                </button>
              </div>
            </div>
          ) : (
            /* Outcome Visualization */
            <div className="w-full flex items-center justify-center animate-in zoom-in-95 duration-500 px-4">
               <div className="bg-white rounded-[3rem] md:rounded-[4rem] p-8 md:p-14 cat-card text-slate-900 text-center space-y-10">
                  {!showBranchSelection ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-[10px] md:text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em]">Interrogation Outcome</p>
                        <h4 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Categorize Student Identity</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <button onClick={() => handleInitialResponse(StudentResponse.INTERESTED)} className="p-6 md:p-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95">
                          <span className="text-3xl">💎</span>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-none">Interested</span>
                        </button>
                        <button onClick={() => handleInitialResponse(StudentResponse.NOT_INTERESTED)} className="p-6 md:p-8 bg-rose-500 hover:bg-rose-600 text-white rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95">
                          <span className="text-3xl">💀</span>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-none">Not Int.</span>
                        </button>
                        <button onClick={() => handleInitialResponse(StudentResponse.GRADE_11_12)} className="p-6 md:p-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95">
                          <span className="text-3xl">🏛️</span>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-none">11th/12th</span>
                        </button>
                        <button onClick={() => handleInitialResponse(StudentResponse.CONFUSED)} className="p-6 md:p-8 bg-amber-500 hover:bg-amber-600 text-white rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95">
                          <span className="text-3xl">🤔</span>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-none">Confused</span>
                        </button>
                        <button onClick={() => handleInitialResponse(StudentResponse.OTHERS)} className="p-6 md:p-8 bg-slate-900 hover:bg-black text-white rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95">
                          <span className="text-3xl">🧩</span>
                          <span className="text-[9px] font-black uppercase tracking-widest leading-none">Others</span>
                        </button>
                      </div>
                      
                      <button onClick={() => setCallingLead(null)} className="text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-rose-500 transition-colors">Discard Interaction</button>
                    </>
                  ) : (
                    /* The target Selection card requested */
                    <div className="space-y-8 animate-in fade-in duration-500">
                      <div className="space-y-1">
                        <p className="text-[10px] md:text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em]">Target Selection</p>
                        <h4 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Which Branch is Preferred?</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.values(Department).map(dept => (
                          <button 
                            key={dept} 
                            onClick={() => finalizeCategorization(callingLead.id, StudentResponse.INTERESTED, dept)}
                            className="p-4 md:p-5 bg-slate-50 hover:bg-emerald-600 text-slate-500 hover:text-white border border-slate-100 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                          >
                            {dept}
                          </button>
                        ))}
                      </div>
                      
                      <button onClick={() => setShowBranchSelection(false)} className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors">Back to Categories</button>
                    </div>
                  )}
               </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;