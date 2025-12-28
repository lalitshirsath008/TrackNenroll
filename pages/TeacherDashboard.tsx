
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
        callVerified: callDuration >= MIN_CALL_THRESHOLD, 
        callTimestamp: new Date().toLocaleString(),
        callDuration: callDuration
      });
    }
  };

  const handleResponse = (response: StudentResponse) => {
    if (response === StudentResponse.INTERESTED) setShowBranchSelection(true);
    else finalize(callingLead!.id, response);
  };

  const finalize = (leadId: string, response: StudentResponse, branch?: Department) => {
    let newStage = LeadStage.NO_ACTION;
    switch (response) {
      case StudentResponse.INTERESTED:
      case StudentResponse.CONFUSED: newStage = LeadStage.TARGETED; break;
      case StudentResponse.NOT_INTERESTED: newStage = LeadStage.DISCARDED; break;
      case StudentResponse.GRADE_11_12: newStage = LeadStage.FORWARDED; break;
    }
    updateLead(leadId, { 
      response, 
      stage: newStage, 
      department: branch || callingLead?.department || Department.IT 
    });
    setCallingLead(null);
    setShowBranchSelection(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Professional Header */}
      <div className="bg-[#0f172a] p-10 md:p-14 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-3">Counseling Interface</p>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">Admission Desk</h2>
          <div className="flex gap-8 mt-10">
            <div className="flex flex-col">
              <span className="text-4xl font-black text-emerald-500">{stats.completed}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Verified</span>
            </div>
            <div className="flex flex-col border-l border-white/10 pl-8">
              <span className="text-4xl font-black text-indigo-500">{pendingLeads.length}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Awaiting</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex p-1.5 bg-slate-100 rounded-[1.5rem] w-full md:w-auto">
          <button onClick={() => setActiveTab('pending')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white shadow-lg text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Workload</button>
          <button onClick={() => setActiveTab('completed')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white shadow-lg text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Log History</button>
        </div>
        {activeTab === 'completed' && (
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-6 py-4 rounded-2xl border border-slate-200 text-xs font-black uppercase tracking-widest outline-none focus:border-indigo-600" />
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-10 hover:shadow-2xl hover:border-emerald-100 transition-all group flex flex-col min-h-[300px]">
            <div className="flex justify-between items-start mb-8">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-400 border border-slate-100">{lead.name.charAt(0)}</div>
              <span className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl ${lead.callVerified ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                {lead.callVerified ? 'Verified' : 'New'}
              </span>
            </div>
            <div className="mb-8 flex-1">
              <h3 className="font-black text-2xl text-[#1e293b] truncate uppercase tracking-tight">{lead.name}</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">{lead.phone}</p>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-4 inline-block bg-indigo-50 px-3 py-1 rounded-lg">{lead.department}</p>
            </div>
            {activeTab === 'pending' ? (
              <button onClick={() => startCallSession(lead)} className="w-full py-5 bg-[#0f172a] hover:bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-slate-200">
                Establish Link
              </button>
            ) : (
              <div className="w-full py-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center text-slate-500 border border-slate-100">
                Resolution: {lead.stage}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Counseling Overlay */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-4xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px]">
            <div className="md:w-1/2 bg-[#0f172a] p-16 text-center text-white flex flex-col justify-center items-center">
              <div className="w-24 h-24 bg-emerald-600 rounded-3xl flex items-center justify-center mb-10 shadow-2xl shadow-emerald-900/40">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              </div>
              <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-4">Link Established</p>
              <h3 className="text-4xl font-black uppercase tracking-tight">{callingLead.name}</h3>
              <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">{callingLead.phone}</p>
              <p className="text-7xl font-black mt-14 tabular-nums text-white">
                {formatTime(callDuration)}
              </p>
              {isCallActive ? (
                <button onClick={endCallSession} className="mt-14 w-full py-6 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-rose-900/40 transition-all">Terminate Interaction</button>
              ) : (
                <div className="mt-14 w-full py-6 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest border border-emerald-500">Log Captured</div>
              )}
            </div>

            <div className="flex-1 p-16 flex flex-col justify-center bg-white relative">
              {(isCallActive || (callDuration < MIN_CALL_THRESHOLD && !isCallActive)) && !showBranchSelection && (
                <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-16 text-center">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Node Locked</p>
                  <div className="w-24 h-1 bg-slate-100 rounded-full mb-4 overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${Math.min((callDuration / MIN_CALL_THRESHOLD) * 100, 100)}%` }}></div>
                  </div>
                  <p className="text-[10px] font-bold text-[#1e293b] uppercase tracking-widest">Awaiting interaction threshold</p>
                </div>
              )}

              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                {!showBranchSelection ? (
                  <div className="space-y-6">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8">Classification Outcome</p>
                    <div className="grid grid-cols-1 gap-4">
                      <button onClick={() => handleResponse(StudentResponse.INTERESTED)} className="w-full py-5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-2xl border border-emerald-100 font-black text-[11px] uppercase tracking-widest transition-all">Target: Interested</button>
                      <button onClick={() => handleResponse(StudentResponse.CONFUSED)} className="w-full py-5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-2xl border border-indigo-100 font-black text-[11px] uppercase tracking-widest transition-all">Node: Follow Up</button>
                      <button onClick={() => handleResponse(StudentResponse.GRADE_11_12)} className="w-full py-5 bg-slate-50 text-slate-700 hover:bg-slate-900 hover:text-white rounded-2xl border border-slate-200 font-black text-[11px] uppercase tracking-widest transition-all">Future: Schooling</button>
                      <button onClick={() => handleResponse(StudentResponse.NOT_INTERESTED)} className="w-full py-5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-2xl border border-rose-100 font-black text-[11px] uppercase tracking-widest transition-all">Purge: Not Interested</button>
                    </div>
                    <button onClick={() => setCallingLead(null)} className="w-full mt-10 text-[10px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest transition-colors">Abort without Saving</button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-4">Branch Provisioning</p>
                    <h4 className="text-3xl font-black text-[#1e293b] tracking-tight uppercase">Target Branch</h4>
                    <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-3 custom-scroll">
                      {Object.values(Department).map(dept => (
                        <button key={dept} onClick={() => finalize(callingLead.id, StudentResponse.INTERESTED, dept)} className="w-full p-6 bg-slate-50 hover:bg-[#0f172a] hover:text-white rounded-2xl text-[10px] font-black uppercase text-left transition-all border border-slate-100 tracking-widest">
                          {dept}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setShowBranchSelection(false)} className="w-full text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest">Back to Categorization</button>
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
