
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

  const MIN_VALID_DURATION = 15; 

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
    if (response === StudentResponse.INTERESTED && !selectedDept) {
      setShowDeptPicker(true);
      return;
    }
    let newStage = LeadStage.NO_ACTION;
    switch (response) {
      case StudentResponse.INTERESTED: case StudentResponse.CONFUSED: newStage = LeadStage.TARGETED; break;
      case StudentResponse.NOT_INTERESTED: newStage = LeadStage.DISCARDED; break;
      case StudentResponse.GRADE_11_12: newStage = LeadStage.FORWARDED; break;
    }
    updateLead(leadId, { response, stage: newStage, callVerified: true, callTimestamp: new Date().toLocaleString(), callDuration, department: selectedDept || Department.IT });
    setCallingLead(null);
    setShowDeptPicker(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0f172a] p-8 md:p-10 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Staff Dashboard</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Hello, {currentUser.name}</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-emerald-600 px-8 py-4 rounded-2xl text-center min-w-[120px] shadow-lg shadow-emerald-900/20">
            <p className="text-2xl font-black">{stats.completed}</p>
            <p className="text-[8px] font-black uppercase tracking-widest">Calls Done</p>
          </div>
          <div className="bg-white/5 px-8 py-4 rounded-2xl text-center min-w-[120px] border border-white/10">
            <p className="text-2xl font-black text-indigo-400">{pendingLeads.length}</p>
            <p className="text-[8px] font-black uppercase tracking-widest">Pending</p>
          </div>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex-1 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500'}`}
        >
          New Leads
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`flex-1 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500'}`}
        >
          Completed
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-indigo-600 border border-slate-100">
                {lead.name.charAt(0)}
              </div>
              <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${lead.callVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {lead.callVerified ? 'Done' : 'Call Now'}
              </span>
            </div>
            <h4 className="font-black text-[#0f172a] text-lg uppercase tracking-tight truncate">{lead.name}</h4>
            <p className="text-indigo-600 text-sm font-black tracking-widest mb-6">{lead.phone}</p>
            
            {lead.stage === LeadStage.ASSIGNED || lead.stage === LeadStage.UNASSIGNED ? (
              <button 
                onClick={() => startCallSession(lead)}
                className="w-full py-4 bg-[#0f172a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                Call Student
              </button>
            ) : (
              <div className="py-3 px-4 bg-slate-50 rounded-2xl text-center text-[10px] font-black uppercase text-slate-500 border border-slate-100">
                {lead.response}
              </div>
            )}
          </div>
        ))}
        {(activeTab === 'pending' ? pendingLeads : completedLeads).length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Empty List.</div>
        )}
      </div>

      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-10 bg-[#0f172a] text-white text-center">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">Live Session</p>
              <h3 className="text-3xl font-black uppercase leading-none mb-6">{callingLead.name}</h3>
              <p className="text-5xl font-black tabular-nums my-8 text-indigo-400">
                {Math.floor(callDuration/60)}:{(callDuration%60).toString().padStart(2,'0')}
              </p>
              {isCallActive ? (
                <button onClick={endCallSession} className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all">
                  End Call
                </button>
              ) : (
                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] animate-pulse">Call Saved - Choose Result Below</div>
              )}
            </div>
            
            <div className="p-10 space-y-4 bg-white">
              {!showDeptPicker ? (
                <>
                  <button onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)} disabled={callDuration < MIN_VALID_DURATION && isCallActive} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-100 disabled:opacity-30 transition-all active:scale-[0.98]">Interested</button>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100 transition-all">Not Interested</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100 transition-all">Confused</button>
                  </div>
                  <button onClick={() => setCallingLead(null)} className="w-full py-2 text-slate-300 text-[9px] font-black uppercase tracking-widest mt-4">Close</button>
                </>
              ) : (
                <div className="space-y-4">
                   <p className="text-[11px] font-black text-slate-400 uppercase text-center tracking-widest mb-4">Choose Branch</p>
                   <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-2 custom-scroll">
                      {Object.values(Department).map(d => (
                        <button key={d} onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED, d)} className="w-full p-4 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl text-[10px] font-black uppercase transition-all border border-slate-100 text-slate-600">{d}</button>
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
