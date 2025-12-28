
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
    updateLead(leadId, { response, stage: newStage });
    setCallingLead(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-emerald-600 p-6 md:p-10 rounded-[2rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-80">Faculty Hub</h1>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight uppercase leading-none">Student Call List</h2>
        </div>
        <div className="bg-white/10 px-6 py-4 rounded-2xl backdrop-blur-md border border-white/20 text-center w-full md:w-auto">
          <p className="text-3xl md:text-5xl font-black">{stats.completed}/{stats.total}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-70">Calls Finished</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          <button onClick={() => setActiveTab('pending')} className={`flex-1 md:flex-none px-10 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-500'}`}>Pending ({pendingLeads.length})</button>
          <button onClick={() => setActiveTab('completed')} className={`flex-1 md:flex-none px-10 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500'}`}>History ({stats.completed})</button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[2rem] border p-8 flex flex-col shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl font-black text-indigo-600 border">{lead.name.charAt(0)}</div>
              <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${lead.callVerified ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                {lead.callVerified ? 'DONE' : 'NEW'}
              </span>
            </div>
            <div className="mb-6 flex-1">
              <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight leading-tight">{lead.name}</h4>
              <p className="text-indigo-600 text-xs font-black uppercase tracking-widest mt-1">{lead.phone}</p>
            </div>
            {lead.stage === LeadStage.ASSIGNED || lead.stage === LeadStage.UNASSIGNED ? (
              <button onClick={() => startCallSession(lead)} className="w-full py-4 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg">Call Student</button>
            ) : (
              <div className="py-3 px-4 bg-slate-50 border rounded-xl text-center">
                <span className="text-[9px] font-black uppercase text-emerald-600">Status: {lead.stage}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Call Overlay */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-lg flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
            <div className="md:w-1/2 p-12 bg-slate-900 text-white flex flex-col justify-center items-center text-center">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg></div>
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">Calling...</h3>
              <p className="text-2xl font-black uppercase">{callingLead.name}</p>
              <p className="text-5xl font-black tracking-tighter my-8 tabular-nums">{formatTime(callDuration)}</p>
              {isCallActive ? (
                <button onClick={endCallSession} className="w-full py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase">Finish Call</button>
              ) : (
                <div className="py-3 px-6 bg-emerald-500/20 border border-emerald-500 rounded-xl text-emerald-400 font-bold text-[10px] uppercase">Call Finished</div>
              )}
            </div>
            <div className="flex-1 p-12 flex flex-col justify-center bg-white relative">
              {isCallActive && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8 text-center">
                   <p className="text-[10px] font-black text-slate-800 uppercase">Call is active</p>
                   <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Please finish the call to save status</p>
                </div>
              )}
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Call Status</p>
                 <button onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED)} className="w-full p-4 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase">Interested</button>
                 <button onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} className="w-full p-4 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase">Confused / Follow up</button>
                 <button onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} className="w-full p-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase">11th / 12th Student</button>
                 <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} className="w-full p-4 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase">Not Interested</button>
                 <button onClick={() => setCallingLead(null)} className="w-full p-3 text-slate-400 text-[9px] font-black uppercase">Close Window</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
