
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User, Department, UserAction } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, updateLead, showToast, addLog } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const timerRef = useRef<number | null>(null);

  const MIN_VALID_DURATION = 20;

  const myLeads = useMemo(() => leads.filter(l => l.assignedToTeacher === currentUser.id), [leads, currentUser.id]);
  const pendingLeads = useMemo(() => myLeads.filter(l => l.stage === LeadStage.ASSIGNED || l.stage === LeadStage.UNASSIGNED), [myLeads]);
  const completedLeads = useMemo(() => myLeads.filter(l => l.stage !== LeadStage.ASSIGNED && l.stage !== LeadStage.UNASSIGNED), [myLeads]);

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
      showToast(`A minimum interaction of ${MIN_VALID_DURATION} seconds is required for call verification.`, 'error');
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
      case StudentResponse.NOT_RESPONDING:
      case StudentResponse.NOT_REACHABLE:
        newStage = LeadStage.DISCARDED; 
        break;
      case StudentResponse.GRADE_11_12: 
        newStage = LeadStage.FORWARDED; 
        break;
      default:
        newStage = LeadStage.NO_ACTION;
    }

    await updateLead(leadId, { 
      response, 
      stage: newStage, 
      callVerified: true, 
      callTimestamp: new Date().toISOString(), 
      callDuration, 
      department: selectedDept || Department.IT 
    });

    const leadName = callingLead?.name || 'Student';
    addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Classified student ${leadName} as ${response}. Duration: ${callDuration}s`);

    setCallingLead(null);
    setShowDeptPicker(false);
    setCallDuration(0);
    showToast("Student classification recorded successfully.", 'success');
  };

  const isLocked = isCallActive || callDuration < MIN_VALID_DURATION;
  const progressPercent = Math.min((callDuration / MIN_VALID_DURATION) * 100, 100);

  return (
    <div className="space-y-6 font-['Inter']">
      <div className="bg-[#0f172a] p-8 md:p-12 rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">Counselor Dashboard</h2>
          <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Active Session: {currentUser.name}</p>
        </div>
        <div className="relative z-10 flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-indigo-600 px-8 py-5 rounded-3xl text-center shadow-xl shadow-indigo-900/20 border border-white/10">
            <p className="text-3xl font-black">{stats.completed}</p>
            <p className="text-[8px] font-black uppercase tracking-widest mt-1">Processed</p>
          </div>
          <div className="flex-1 md:flex-none bg-white/5 px-8 py-5 rounded-3xl text-center border border-white/10 backdrop-blur-md">
            <p className="text-3xl font-black text-slate-400">{pendingLeads.length}</p>
            <p className="text-[8px] font-black uppercase tracking-widest mt-1">Remaining</p>
          </div>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-max">
        <button onClick={() => setActiveTab('pending')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Assigned Leads</button>
        <button onClick={() => setActiveTab('completed')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Activity History</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 flex flex-col shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-[#f8fafc] rounded-2xl flex items-center justify-center font-black text-indigo-600 border border-slate-100 group-hover:scale-110 transition-transform uppercase">{lead.name.charAt(0)}</div>
              <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${lead.callVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{lead.callVerified ? 'Verified' : 'Pending'}</span>
            </div>
            <h4 className="font-black text-[#0f172a] text-xl uppercase tracking-tighter truncate leading-tight">{lead.name}</h4>
            <p className="text-indigo-600 text-sm font-black tracking-widest mt-1 mb-2">{lead.phone}</p>
            
            <div className="mt-auto pt-6 space-y-3">
              {activeTab === 'completed' && (
                <div className="py-3 px-6 bg-slate-50 rounded-2xl text-center text-[9px] font-black uppercase text-slate-500 border border-slate-100 mb-2">
                  Last Response: {lead.response}
                </div>
              )}
              
              <button 
                onClick={() => startCallSession(lead)} 
                className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg ${activeTab === 'pending' ? 'bg-[#0f172a] text-white hover:bg-slate-800' : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`}
              >
                {activeTab === 'pending' ? 'Initiate Outbound Call' : 'Call Student Back'}
              </button>
            </div>
          </div>
        ))}
        {(activeTab === 'pending' ? pendingLeads : completedLeads).length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">
            No student records found in this category.
          </div>
        )}
      </div>

      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-10 bg-[#0f172a] text-white text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-white/10">
                <div className={`h-full transition-all duration-1000 ${progressPercent < 100 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Live Communication Session</p>
              <h3 className="text-4xl font-black uppercase leading-none mb-4 tracking-tighter">{callingLead.name}</h3>
              <div className="text-6xl font-black tabular-nums my-6 text-white drop-shadow-xl">{Math.floor(callDuration/60)}:{(callDuration%60).toString().padStart(2,'0')}</div>

              {isCallActive ? (
                <button onClick={endCallSession} className="px-12 py-5 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-red-900/40 active:scale-95 transition-all">Terminate Connection</button>
              ) : (
                <div className="px-6 py-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{callDuration < MIN_VALID_DURATION ? `Wait ${MIN_VALID_DURATION - callDuration}s to unlock classification` : 'Recording Ready'}</p>
                </div>
              )}
            </div>
            
            <div className="p-10 space-y-6 bg-white relative">
              {isLocked && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{isCallActive ? 'Finalize Call Session' : `Minimum interaction requirement: ${MIN_VALID_DURATION - callDuration}s remaining`}</p>
                </div>
              )}

              {!showDeptPicker ? (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Classify Outcome</p>
                  <button onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)} disabled={isLocked} className="w-full py-6 bg-[#4c47f5] text-white rounded-[1.5rem] font-black text-[14px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-[0.98] flex items-center justify-center gap-3">
                    Interested
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} disabled={isLocked} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all">Not Interested</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} disabled={isLocked} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition-all">Confused</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} disabled={isLocked} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all">Grade 11/12</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_RESPONDING)} disabled={isLocked} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-all">No Response</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_REACHABLE)} disabled={isLocked} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-all">Not Reachable</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.OTHERS)} disabled={isLocked} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-all">Other Outcome</button>
                  </div>
                  <button onClick={() => setCallingLead(null)} className="w-full py-3 text-slate-300 text-[9px] font-black uppercase tracking-[0.2em] mt-2">Close Session without Saving</button>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                   <div className="text-center">
                     <p className="text-[12px] font-black text-[#0f172a] uppercase tracking-tighter">Academic Interest Area</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Designate preferred department for {callingLead.name}</p>
                   </div>
                   <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-3 custom-scroll">
                      {Object.values(Department).map(d => (
                        <button key={d} onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED, d)} className="w-full p-5 bg-[#f8fafc] hover:bg-indigo-600 hover:text-white rounded-2xl text-[10px] font-black uppercase transition-all border border-slate-100 text-slate-600 text-left flex justify-between items-center group">
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
