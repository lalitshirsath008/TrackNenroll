
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
    <div className="space-y-4">
      <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Counselling</h2>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">Staff: {currentUser.name}</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-emerald-600 px-6 py-3 rounded-2xl text-center min-w-[100px]"><p className="text-lg font-black">{stats.completed}</p><p className="text-[7px] font-black uppercase tracking-widest">Done</p></div>
          <div className="bg-white/5 px-6 py-3 rounded-2xl text-center min-w-[100px] border border-white/10"><p className="text-lg font-black text-indigo-400">{pendingLeads.length}</p><p className="text-[7px] font-black uppercase tracking-widest">Queue</p></div>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
        <button onClick={() => setActiveTab('pending')} className={`flex-1 px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Pool</button>
        <button onClick={() => setActiveTab('completed')} className={`flex-1 px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>History</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-indigo-600 border border-slate-100">{lead.name.charAt(0)}</div>
              <span className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest ${lead.callVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{lead.callVerified ? 'AUDITED' : 'PENDING'}</span>
            </div>
            <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight truncate">{lead.name}</h4>
            <p className="text-indigo-600 text-xs font-black tracking-widest mb-4">{lead.phone}</p>
            {lead.stage === LeadStage.ASSIGNED || lead.stage === LeadStage.UNASSIGNED ? (
              <button onClick={() => startCallSession(lead)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95">Call Now</button>
            ) : (
              <div className="py-2.5 bg-slate-50 rounded-xl text-center text-[9px] font-black uppercase text-slate-500">{lead.response}</div>
            )}
          </div>
        ))}
      </div>

      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white text-center">
              <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-2">In Session</p>
              <h3 className="text-xl font-black uppercase leading-none">{callingLead.name}</h3>
              <p className="text-4xl font-black tabular-nums my-4">{Math.floor(callDuration/60)}:{(callDuration%60).toString().padStart(2,'0')}</p>
              {isCallActive ? (
                <button onClick={endCallSession} className="px-8 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase">Finish Call</button>
              ) : <div className="text-[9px] font-black text-emerald-400 uppercase">Call Verified</div>}
            </div>
            <div className="p-6 space-y-3">
              {!showDeptPicker ? (
                <>
                  <button onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)} disabled={callDuration < MIN_VALID_DURATION && isCallActive} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase disabled:opacity-30">Interested</button>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} className="py-3 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black uppercase">Not Interested</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} className="py-3 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black uppercase">Confused</button>
                  </div>
                  <button onClick={() => setCallingLead(null)} className="w-full py-2 text-slate-300 text-[8px] font-black uppercase text-center">Close</button>
                </>
              ) : (
                <div className="space-y-2">
                   <p className="text-[9px] font-black uppercase text-center mb-2">Select Branch</p>
                   <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
                      {Object.values(Department).map(d => (
                        <button key={d} onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED, d)} className="w-full p-3 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all">{d}</button>
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
