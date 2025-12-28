
import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User, Department } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { leads, updateLead } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  
  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showBranchSelection, setShowBranchSelection] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const MIN_CALL_THRESHOLD = 10;

  const myLeads = useMemo(() => leads.filter(l => l.assignedToTeacher === currentUser.id), [leads, currentUser.id]);
  const pendingLeads = useMemo(() => myLeads.filter(l => l.stage === LeadStage.ASSIGNED || l.stage === LeadStage.UNASSIGNED), [myLeads]);
  const historyLeads = useMemo(() => myLeads.filter(l => l.stage !== LeadStage.ASSIGNED && l.stage !== LeadStage.UNASSIGNED), [myLeads]);

  const startCall = (lead: StudentLead) => {
    setCallingLead(lead);
    setIsCallActive(true);
    setCallDuration(0);
    window.location.href = `tel:${lead.phone}`;
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setCallDuration(prev => prev + 1), 1000);
  };

  const endCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCallActive(false);
    if (callingLead) {
      updateLead(callingLead.id, { 
        callVerified: callDuration >= MIN_CALL_THRESHOLD, 
        callTimestamp: new Date().toLocaleString(),
        callDuration
      });
    }
  };

  const handleResponse = (response: StudentResponse) => {
    if (response === StudentResponse.INTERESTED) setShowBranchSelection(true);
    else finalize(callingLead!.id, response);
  };

  const finalize = (leadId: string, response: StudentResponse, branch?: Department) => {
    let stage = LeadStage.NO_ACTION;
    if (response === StudentResponse.INTERESTED || response === StudentResponse.CONFUSED) stage = LeadStage.TARGETED;
    else if (response === StudentResponse.NOT_INTERESTED) stage = LeadStage.DISCARDED;
    else if (response === StudentResponse.GRADE_11_12) stage = LeadStage.FORWARDED;
    
    updateLead(leadId, { response, stage, department: branch || callingLead?.department || Department.IT });
    setCallingLead(null);
    setShowBranchSelection(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Card */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Counseling Desk</h2>
          <p className="text-slate-500 font-medium mt-1">Manage and categorize student admissions</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-40 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-600 leading-none">{historyLeads.length}</p>
            <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mt-1">Verified</p>
          </div>
          <div className="flex-1 md:w-40 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-indigo-600 leading-none">{pendingLeads.length}</p>
            <p className="text-[9px] font-bold text-indigo-600/60 uppercase tracking-widest mt-1">Pending</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full md:w-max">
        <button onClick={() => setActiveTab('pending')} className={`px-8 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Awaiting Action</button>
        <button onClick={() => setActiveTab('history')} className={`px-8 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Recent History</button>
      </div>

      {/* List Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(activeTab === 'pending' ? pendingLeads : historyLeads).map(lead => (
          <div key={lead.id} className="bg-white rounded-[1.75rem] border border-slate-100 p-6 hover:shadow-lg hover:border-emerald-100 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-bold text-emerald-600">{lead.name.charAt(0)}</div>
              <span className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg ${lead.callVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {lead.callVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <div className="mb-6">
              <h3 className="font-bold text-slate-900 truncate">{lead.name}</h3>
              <p className="text-sm text-slate-500 font-medium mt-0.5">{lead.phone}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">{lead.department}</p>
            </div>
            {activeTab === 'pending' ? (
              <button onClick={() => startCall(lead)} className="w-full py-3.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                Call Now
              </button>
            ) : (
              <div className="w-full py-3 text-center bg-slate-50 rounded-xl text-[10px] font-bold uppercase tracking-widest text-emerald-600 border border-slate-100">
                {lead.stage}
              </div>
            )}
          </div>
        ))}
        {(activeTab === 'pending' ? pendingLeads : historyLeads).length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
            <p className="text-slate-400 font-bold text-sm">No records found for this section.</p>
          </div>
        )}
      </div>

      {/* Modern Dialer Overlay */}
      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
            {isCallActive ? (
              <div className="p-10 text-center space-y-8">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center relative">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 truncate">{callingLead.name}</h3>
                  <p className="text-slate-500 font-medium">{callingLead.phone}</p>
                </div>
                <p className="text-5xl font-black text-slate-900 tabular-nums">
                  {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                </p>
                <button onClick={endCall} className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-rose-200">End Interaction</button>
              </div>
            ) : (
              <div className="p-10 space-y-8">
                {!showBranchSelection ? (
                  <>
                    <div className="text-center">
                      <h4 className="text-xl font-bold text-slate-900">Categorize Student</h4>
                      <p className="text-sm text-slate-500 mt-1">Select response based on call</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleResponse(StudentResponse.INTERESTED)} className="p-5 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-2xl flex flex-col items-center gap-2 transition-all border border-emerald-100 group">
                        <span className="text-2xl group-hover:scale-110 transition-transform">💎</span>
                        <span className="text-[10px] font-bold uppercase">Interested</span>
                      </button>
                      <button onClick={() => handleResponse(StudentResponse.NOT_INTERESTED)} className="p-5 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-2xl flex flex-col items-center gap-2 transition-all border border-rose-100 group">
                        <span className="text-2xl group-hover:scale-110 transition-transform">❌</span>
                        <span className="text-[10px] font-bold uppercase">No Interest</span>
                      </button>
                      <button onClick={() => handleResponse(StudentResponse.CONFUSED)} className="p-5 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-2xl flex flex-col items-center gap-2 transition-all border border-amber-100 group">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🤔</span>
                        <span className="text-[10px] font-bold uppercase">Confused</span>
                      </button>
                      <button onClick={() => handleResponse(StudentResponse.GRADE_11_12)} className="p-5 bg-indigo-50 hover:bg-indigo-500 hover:text-white rounded-2xl flex flex-col items-center gap-2 transition-all border border-indigo-100 group">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🏛️</span>
                        <span className="text-[10px] font-bold uppercase">Junior/High</span>
                      </button>
                    </div>
                    <button onClick={() => setCallingLead(null)} className="w-full text-slate-400 font-bold text-xs hover:text-slate-600">Close without saving</button>
                  </>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="text-center">
                      <h4 className="text-xl font-bold text-slate-900">Assigned Branch</h4>
                      <p className="text-sm text-slate-500 mt-1">Select preferred engineering branch</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                      {Object.values(Department).map(dept => (
                        <button key={dept} onClick={() => finalize(callingLead.id, StudentResponse.INTERESTED, dept)} className="w-full p-4 bg-slate-50 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all text-left">
                          {dept}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setShowBranchSelection(false)} className="w-full text-slate-400 font-bold text-xs hover:text-emerald-600">Go Back</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
