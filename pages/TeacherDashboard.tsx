
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User, Department } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, updateLead } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null);

  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const timerRef = useRef<number | null>(null);

  const MIN_CALL_THRESHOLD = 3; // Minimal threshold for system logging

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
    
    // Immediate execution of call protocol
    const telLink = `tel:${lead.phone}`;
    window.location.href = telLink;

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

  const handleCategorization = (leadId: string, response: StudentResponse, selectedDept?: Department) => {
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
      case StudentResponse.NOT_RESPONDING:
      case StudentResponse.NOT_REACHABLE:
      case StudentResponse.OTHERS: 
        newStage = LeadStage.NO_ACTION; 
        break;
    }

    setLastCompletedId(leadId);
    const updates: Partial<StudentLead> = { response, stage: newStage };
    if (selectedDept) updates.department = selectedDept;

    updateLead(leadId, updates);
    setCallingLead(null);
    setShowDeptPicker(false);
    setTimeout(() => setLastCompletedId(null), 1000);
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
        .animate-checkmark { animation: checkmark-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .animate-pulse-ring { animation: pulse-ring 2s infinite; }
      `}</style>

      {/* Hero Header */}
      <div className="bg-emerald-600 p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-[9px] font-black text-emerald-100 uppercase tracking-widest mb-1">Institutional Faculty Hub</h1>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight uppercase leading-none">Lead Counseling</h2>
        </div>
        <div className="relative z-10 bg-white/10 px-6 py-4 rounded-2xl md:rounded-[2rem] backdrop-blur-md border border-white/20 text-center w-full md:w-auto">
          <p className="text-3xl md:text-5xl font-black">{stats.completed}/{stats.total}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-70">Target Progression</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex p-1 bg-slate-100 rounded-xl md:rounded-[2rem] w-full md:w-auto">
          <button 
            onClick={() => { setActiveTab('pending'); setDateFilter(''); }}
            className={`flex-1 md:flex-none px-6 md:px-10 py-3 md:py-4 rounded-lg md:rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-500'}`}
          >
            PENDING ({pendingLeads.length})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`flex-1 md:flex-none px-6 md:px-10 py-3 md:py-4 rounded-lg md:rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500'}`}
          >
            HISTORY ({stats.completed})
          </button>
        </div>
        {activeTab === 'completed' && (
           <input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-slate-100 rounded-xl text-[10px] font-black uppercase outline-none focus:border-indigo-600"
           />
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border-2 p-6 md:p-8 flex flex-col border-slate-100 shadow-sm transition-all hover:border-emerald-100">
            <div className="flex items-start justify-between mb-4 md:mb-6">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black text-indigo-600 border border-slate-100">
                {lead.name.charAt(0)}
              </div>
              <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${lead.callVerified ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                {lead.callVerified ? 'VERIFIED' : 'PENDING'}
              </span>
            </div>
            <div className="mb-4 md:mb-6 flex-1">
              <h4 className="font-black text-slate-900 text-lg md:text-2xl leading-tight uppercase tracking-tight">{lead.name}</h4>
              <p className="text-indigo-600 text-xs md:text-sm font-black uppercase tracking-widest mt-1">{lead.phone}</p>
              {lead.callTimestamp && (
                <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Last Interaction: {lead.callTimestamp}</p>
              )}
            </div>
            {lead.stage === LeadStage.ASSIGNED || lead.stage === LeadStage.UNASSIGNED ? (
              <button 
                onClick={() => startCallSession(lead)}
                className="w-full py-4 md:py-5 bg-[#0f172a] text-white rounded-xl md:rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                Place Call
              </button>
            ) : (
              <div className="py-3 px-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <span className={`text-[9px] font-black uppercase tracking-widest ${lead.response === StudentResponse.INTERESTED ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {lead.response}: {lead.department.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        ))}
        {(activeTab === 'pending' ? pendingLeads : completedLeads).length === 0 && (
          <div className="col-span-full py-32 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching leads in this category</p>
          </div>
        )}
      </div>

      {/* Call Overlay */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/98 backdrop-blur-lg flex items-center justify-center p-0 md:p-10">
          <div className="bg-white w-full h-full md:h-auto md:max-w-4xl md:rounded-[3rem] shadow-2xl overflow-y-auto flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
            {/* Left Session Panel */}
            <div className="md:w-[40%] p-8 md:p-12 bg-[#0f172a] text-white flex flex-col justify-center items-center text-center">
              <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse-ring mb-8">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L9.148 3.684A1 1 0 008.2 3H5z"/></svg>
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-2">Ongoing Interaction</h3>
              <p className="text-3xl font-black uppercase tracking-tight">{callingLead.name}</p>
              <p className="text-6xl font-black tracking-tighter my-10 tabular-nums text-white/90">{formatTime(callDuration)}</p>
              {isCallActive ? (
                <button onClick={endCallSession} className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-rose-900/40 active:scale-95 transition-all">End Interaction</button>
              ) : (
                <div className="py-4 px-8 bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                   Data Captured
                </div>
              )}
            </div>
            
            {/* Right Action Panel */}
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-center relative bg-slate-50 min-h-[500px]">
              {isCallActive && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-10 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                   <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Interaction in Progress</p>
                   <p className="text-xs font-bold text-slate-800 mt-2 uppercase">Classification locked until call completion</p>
                </div>
              )}

              <div className="space-y-3">
                {!showDeptPicker ? (
                  <>
                    <div className="mb-6">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Counselling Results</p>
                      <h4 className="text-lg font-black text-slate-900 uppercase">Classify Student Intent</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <button onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)} className="w-full p-4.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all text-left flex justify-between items-center group">
                        <span>Interested (Requires Branch)</span>
                        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                      </button>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:border-rose-500 hover:text-rose-500 transition-all">Not Interested</button>
                        <button onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:border-amber-500 hover:text-amber-500 transition-all">Confused</button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_RESPONDING)} className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all">Not Responding</button>
                        <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_REACHABLE)} className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all">Not Reachable</button>
                      </div>

                      <button onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} className="w-full p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all">11th / 12th Standard</button>
                      
                      <button onClick={() => handleCategorization(callingLead.id, StudentResponse.OTHERS)} className="w-full p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 transition-all">Other Category</button>
                    </div>

                    <button onClick={() => setCallingLead(null)} className="w-full mt-6 p-3 text-slate-300 text-[9px] font-black uppercase hover:text-slate-500 transition-all">Discard Session</button>
                  </>
                ) : (
                  <div className="animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-4 mb-8">
                      <button onClick={() => setShowDeptPicker(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                      </button>
                      <div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Step 2</p>
                        <h4 className="text-lg font-black text-slate-900 uppercase">Select Target Branch</h4>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-3 custom-scroll">
                      {Object.values(Department).map(dept => (
                        <button 
                          key={dept} 
                          onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED, dept)}
                          className="w-full p-5 bg-white border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 rounded-2xl text-left transition-all group flex justify-between items-center"
                        >
                          <p className="text-[10px] font-black uppercase tracking-tight text-slate-700 group-hover:text-indigo-600">{dept}</p>
                          <svg className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
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
