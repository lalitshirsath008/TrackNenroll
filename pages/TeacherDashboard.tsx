
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User, Department } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, updateLead } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  
  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const timerRef = useRef<number | null>(null);

  const MIN_VALID_DURATION = 10; 

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

  const handleCategorization = (leadId: string, response: StudentResponse, selectedDept?: Department) => {
    // If student is interested, we must pick a branch
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
    }

    updateLead(leadId, { 
      response, 
      stage: newStage, 
      callVerified: true, 
      callTimestamp: new Date().toLocaleString(), 
      callDuration, 
      department: selectedDept || Department.IT 
    });

    setCallingLead(null);
    setShowDeptPicker(false);
  };

  return (
    <div className="space-y-6 font-['Inter']">
      {/* Enhanced Hero Stats */}
      <div className="bg-[#0f172a] p-8 md:p-12 rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">Teacher Dashboard</h2>
          <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Welcome, {currentUser.name}</p>
        </div>
        <div className="relative z-10 flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-indigo-600 px-8 py-5 rounded-3xl text-center shadow-xl shadow-indigo-900/20 border border-white/10">
            <p className="text-3xl font-black">{stats.completed}</p>
            <p className="text-[8px] font-black uppercase tracking-widest mt-1">Calls Done</p>
          </div>
          <div className="flex-1 md:flex-none bg-white/5 px-8 py-5 rounded-3xl text-center border border-white/10 backdrop-blur-md">
            <p className="text-3xl font-black text-slate-400">{pendingLeads.length}</p>
            <p className="text-[8px] font-black uppercase tracking-widest mt-1">Remaining</p>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-max">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
        >
          New Leads
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
        >
          History
        </button>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 flex flex-col shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-[#f8fafc] rounded-2xl flex items-center justify-center font-black text-indigo-600 border border-slate-100 group-hover:scale-110 transition-transform">
                {lead.name.charAt(0)}
              </div>
              <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${lead.callVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {lead.callVerified ? 'Done' : 'Pending'}
              </span>
            </div>
            <h4 className="font-black text-[#0f172a] text-xl uppercase tracking-tighter truncate leading-tight">{lead.name}</h4>
            <p className="text-indigo-600 text-sm font-black tracking-widest mt-1 mb-8">{lead.phone}</p>
            
            {lead.stage === LeadStage.ASSIGNED || lead.stage === LeadStage.UNASSIGNED ? (
              <button 
                onClick={() => startCallSession(lead)}
                className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-100"
              >
                Start Calling
              </button>
            ) : (
              <div className="py-4 px-6 bg-slate-50 rounded-2xl text-center text-[10px] font-black uppercase text-slate-500 border border-slate-100">
                {lead.response}
              </div>
            )}
          </div>
        ))}
        {(activeTab === 'pending' ? pendingLeads : completedLeads).length === 0 && (
          <div className="col-span-full py-32 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 8-8-8"/></svg>
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Everything is handled for now.</p>
          </div>
        )}
      </div>

      {/* Call & Classification Modal */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header / Timer Section */}
            <div className="p-12 bg-[#0f172a] text-white text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min((callDuration / MIN_VALID_DURATION) * 100, 100)}%` }}></div>
              </div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Calling Now</p>
              <h3 className="text-4xl font-black uppercase leading-none mb-8 tracking-tighter">{callingLead.name}</h3>
              <div className="text-6xl font-black tabular-nums my-6 text-white drop-shadow-xl">
                {Math.floor(callDuration/60)}:{(callDuration%60).toString().padStart(2,'0')}
              </div>
              {isCallActive ? (
                <button onClick={endCallSession} className="mt-4 px-12 py-5 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-red-900/40 active:scale-95 transition-all">
                  Finish Call
                </button>
              ) : (
                <div className="mt-4 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] bg-emerald-400/10 py-3 rounded-xl border border-emerald-400/20">Call Recorded - Select Outcome</div>
              )}
            </div>
            
            {/* Classification Buttons */}
            <div className="p-12 space-y-4 bg-white">
              {!showDeptPicker ? (
                <>
                  <button 
                    onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)} 
                    disabled={isCallActive}
                    className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-widest shadow-2xl shadow-indigo-100 disabled:opacity-20 transition-all hover:bg-indigo-700 active:scale-[0.98]"
                  >
                    Student Interested
                  </button>

                  <button 
                    onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} 
                    disabled={isCallActive}
                    className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest disabled:opacity-20 transition-all active:scale-[0.98]"
                  >
                    11th / 12th Standard
                  </button>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} 
                      disabled={isCallActive}
                      className="py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 disabled:opacity-20 transition-all"
                    >
                      Not Interested
                    </button>
                    <button 
                      onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} 
                      disabled={isCallActive}
                      className="py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 disabled:opacity-20 transition-all"
                    >
                      Confused
                    </button>
                  </div>
                  
                  <button onClick={() => setCallingLead(null)} className="w-full py-3 text-slate-300 text-[9px] font-black uppercase tracking-[0.2em] mt-6">Cancel Log</button>
                </>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                   <div className="text-center">
                     <p className="text-[12px] font-black text-[#0f172a] uppercase tracking-tighter">Preferred Branch</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select the branch student is interested in</p>
                   </div>
                   <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-3 custom-scroll">
                      {Object.values(Department).map(d => (
                        <button 
                          key={d} 
                          onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED, d)} 
                          className="w-full p-5 bg-[#f8fafc] hover:bg-indigo-600 hover:text-white rounded-2xl text-[10px] font-black uppercase transition-all border border-slate-100 text-slate-600 text-left flex justify-between items-center group"
                        >
                          {d}
                          <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                        </button>
                      ))}
                   </div>
                   <button onClick={() => setShowDeptPicker(false)} className="w-full py-3 text-indigo-600 text-[10px] font-black uppercase tracking-widest">Back to Options</button>
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
