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
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0 font-['Inter']">
      <style>{`
        .pulse-ring {
          position: relative;
        }
        .pulse-ring::before {
          content: "";
          position: absolute;
          inset: -6px;
          border: 1px solid #10b981;
          border-radius: 50%;
          animation: ring-anim 2s infinite;
        }
        @keyframes ring-anim {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .sound-wave {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 20px;
        }
        .wave-bar {
          width: 3px;
          background: #10b981;
          border-radius: 10px;
          animation: wave-anim 1s ease-in-out infinite;
        }
        @keyframes wave-anim {
          0%, 100% { height: 4px; opacity: 0.2; }
          50% { height: 16px; opacity: 1; }
        }
        .wave-bar:nth-child(2) { animation-delay: 0.1s; }
        .wave-bar:nth-child(3) { animation-delay: 0.2s; }
        
        .dialer-bg { background-color: #020617; }
        .sharp-card { box-shadow: 0 40px 100px -20px rgba(0,0,0,0.8); }
      `}</style>

      {/* Header */}
      <div className="bg-emerald-600 p-8 md:p-12 rounded-[2rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 text-center md:text-left">
          <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">TrackNEnroll Teacher Hub</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none">Admission Desk</h2>
        </div>
        <div className="relative z-10 bg-white/10 px-8 py-5 rounded-[2rem] border border-white/20 text-center w-full md:w-56">
          <p className="text-4xl md:text-5xl font-black">{stats.completed}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">Verified Calls</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-1.5 rounded-[2rem] border border-slate-200 shadow-sm flex overflow-hidden">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}
        >
          Pending List ({pendingLeads.length})
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
        >
          Call History ({stats.completed})
        </button>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[2rem] border border-slate-200 p-8 flex flex-col shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl font-black text-emerald-600 border border-slate-100">
                {lead.name.charAt(0)}
              </div>
              <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full border ${lead.callVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                {lead.callVerified ? 'Verified' : 'New'}
              </span>
            </div>
            
            <div className="flex-1 mb-8">
              <h4 className="text-xl font-black text-slate-900 leading-tight mb-1">{lead.name}</h4>
              <p className="text-emerald-600 text-sm font-bold tracking-widest">{lead.phone}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{lead.department}</p>
            </div>

            {activeTab === 'pending' ? (
              <button 
                onClick={() => startCallSession(lead)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                Start Call
              </button>
            ) : (
              <div className="py-4 bg-slate-50 rounded-2xl text-center border border-slate-200">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">{lead.stage}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dialer Overlay */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] dialer-bg flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-300 overflow-hidden">
          
          {isCallActive ? (
            <div className="w-full max-w-4xl flex flex-col items-center justify-between h-[80vh]">
              <div className="flex flex-col items-center space-y-10">
                <div className="pulse-ring">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400">Call is live</p>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tight leading-none">{callingLead.name}</h2>
                  <p className="text-white/30 text-lg md:text-xl font-bold tracking-[0.3em]">{callingLead.phone}</p>
                  
                  <div className="sound-wave justify-center mt-6">
                    {[1,2,3,4].map(i => <div key={i} className="wave-bar"></div>)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center">
                <p className="text-[5rem] md:text-[9rem] font-black tracking-tighter tabular-nums leading-none">
                  {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                </p>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-2 rounded-full">
                   <div className={`w-1.5 h-1.5 rounded-full ${callDuration >= MIN_CALL_THRESHOLD ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                   <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">Success after {MIN_CALL_THRESHOLD}s</p>
                </div>
              </div>

              <div className="w-full max-w-sm">
                <button 
                  onClick={endCallSession}
                  className="w-full py-6 bg-rose-600 hover:bg-rose-500 text-white rounded-3xl font-black text-lg uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  End Call
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-2xl animate-in zoom-in-95 duration-500 px-4">
               <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-14 sharp-card text-slate-900 text-center space-y-10">
                  {!showBranchSelection ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Call Report</p>
                        <h4 className="text-3xl font-black">How was the student?</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <button onClick={() => handleInitialResponse(StudentResponse.INTERESTED)} className="p-6 bg-emerald-500 text-white rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
                          <span className="text-3xl">💎</span>
                          <span className="text-[9px] font-black uppercase leading-none">Interested</span>
                        </button>
                        <button onClick={() => handleInitialResponse(StudentResponse.NOT_INTERESTED)} className="p-6 bg-rose-500 text-white rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
                          <span className="text-3xl">💀</span>
                          <span className="text-[9px] font-black uppercase leading-none">No</span>
                        </button>
                        <button onClick={() => handleInitialResponse(StudentResponse.GRADE_11_12)} className="p-6 bg-indigo-600 text-white rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
                          <span className="text-3xl">🏛️</span>
                          <span className="text-[9px] font-black uppercase leading-none">School</span>
                        </button>
                        <button onClick={() => handleInitialResponse(StudentResponse.CONFUSED)} className="p-6 bg-amber-500 text-white rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
                          <span className="text-3xl">🤔</span>
                          <span className="text-[9px] font-black uppercase leading-none">Confused</span>
                        </button>
                        <button onClick={() => handleInitialResponse(StudentResponse.OTHERS)} className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
                          <span className="text-3xl">🧩</span>
                          <span className="text-[9px] font-black uppercase leading-none">Other</span>
                        </button>
                      </div>
                      
                      <button onClick={() => setCallingLead(null)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-rose-500 transition-colors">Cancel Report</button>
                    </>
                  ) : (
                    <div className="space-y-8 animate-in fade-in duration-500">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Select Branch</p>
                        <h4 className="text-3xl font-black">Which branch?</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.values(Department).map(dept => (
                          <button 
                            key={dept} 
                            onClick={() => finalizeCategorization(callingLead.id, StudentResponse.INTERESTED, dept)}
                            className="p-4 md:p-5 bg-slate-50 hover:bg-emerald-600 text-slate-500 hover:text-white border border-slate-200 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                          >
                            {dept}
                          </button>
                        ))}
                      </div>
                      
                      <button onClick={() => setShowBranchSelection(false)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-emerald-500 transition-colors">Go Back</button>
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