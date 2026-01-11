import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { StudentLead, StudentResponse, LeadStage, User, Department } from '../types';

const TeacherDashboard: React.FC<{ currentUser: User, initialTab?: 'pending' | 'completed' | 'verification' }> = ({ currentUser, initialTab = 'pending' }) => {
  const { leads, updateLead, showToast, updateUser, uploadFile } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'verification'>(initialTab);
  const [historyFilter, setHistoryFilter] = useState<string>('All');
  const [callingLead, setCallingLead] = useState<StudentLead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [verificationInput, setVerificationInput] = useState('');
  const [verificationDate, setVerificationDate] = useState(new Date().toISOString().split('T')[0]);
  const [showBranchSelection, setShowBranchSelection] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploadedURL, setUploadedURL] = useState<string | null>(null);
  
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const timerRef = useRef<number | null>(null);
  const MIN_VALID_DURATION = 20;

  const isVerificationVisible = currentUser.verification?.status === 'pending' || currentUser.verification?.status === 'rejected';

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isVerificationVisible && activeTab !== 'verification') {
      setActiveTab('verification');
    }
  }, [isVerificationVisible, activeTab]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast("Please select a valid image file.", "error");
      return;
    }

    setScreenshotPreview(URL.createObjectURL(file));
    setUploadingScreenshot(true);

    try {
      const fileName = `verify_${Date.now()}.jpg`;
      const path = `verifications/${currentUser.id}/${fileName}`;
      const finalURL = await uploadFile(path, file);
      
      setUploadedURL(finalURL);
      showToast("Verification proof prepared successfully.", "success");
    } catch (err: any) {
      showToast("Could not process image. Please try a different screenshot.", "error");
      setScreenshotPreview(null);
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationInput || !currentUser.verification || !verificationDate) {
      showToast("Please provide all required audit details.", "error");
      return;
    }
    
    if (!uploadedURL) {
      showToast("Call evidence screenshot is required to proceed.", "error");
      return;
    }
    
    try {
      const baseVerification = { ...currentUser.verification };
      const { rejectionReason, ...cleanVerification } = baseVerification as any;

      await updateUser(currentUser.id, {
        verification: {
          ...cleanVerification,
          status: 'responded',
          teacherResponseDuration: parseInt(verificationInput),
          screenshotURL: uploadedURL,
          verificationDate: verificationDate
        }
      });
      
      setVerificationInput('');
      setScreenshotPreview(null);
      setUploadedURL(null);
      showToast("Audit data submitted for administrative review.", "success");
      setActiveTab('completed');
    } catch (err) {
      showToast("Network error. Please check your connection and try again.", "error");
    }
  };

  const startCallSession = (lead: StudentLead) => {
    // Force reset all session states to ensure the overlay appears correctly
    setCallingLead(null);
    setTimeout(() => {
      setCallingLead(lead);
      setIsCallActive(true);
      setCallDuration(0);
      setShowBranchSelection(false);
      window.location.href = `tel:${lead.phone}`;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => setCallDuration(p => p + 1), 1000);
    }, 50);
  };

  const endCallSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCallActive(false);
  };

  const handleCategorization = async (leadId: string, response: StudentResponse, selectedDept?: Department) => {
    if (callDuration < MIN_VALID_DURATION) {
      showToast(`Minimum required interaction: ${MIN_VALID_DURATION} seconds.`, 'error');
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
      case StudentResponse.OTHERS:
        newStage = LeadStage.NO_ACTION;
        break;
    }
    
    await updateLead(leadId, { 
      response, 
      stage: newStage, 
      callVerified: true, 
      callTimestamp: new Date().toISOString(), 
      callDuration, 
      department: selectedDept || currentUser.department || Department.IT 
    });
    
    setCallingLead(null);
    setShowBranchSelection(false);
    showToast("Feedback recorded successfully.", 'success');
  };

  const myLeads = useMemo(() => leads.filter(l => 
    l.assignedToTeacher === currentUser.id || l.delegatedFromId === currentUser.id
  ), [leads, currentUser.id]);

  const pendingLeads = useMemo(() => myLeads.filter(l => 
    l.assignedToTeacher === currentUser.id && (l.stage === LeadStage.ASSIGNED || l.stage === LeadStage.UNASSIGNED)
  ), [myLeads, currentUser.id]);

  const completedLeads = useMemo(() => {
    let filtered = myLeads.filter(l => {
      const isProcessedByMe = l.assignedToTeacher === currentUser.id && l.stage !== LeadStage.ASSIGNED && l.stage !== LeadStage.UNASSIGNED;
      const isSentByMe = l.delegatedFromId === currentUser.id;
      return isProcessedByMe || isSentByMe;
    });

    if (historyFilter !== 'All') {
      filtered = filtered.filter(l => l.response === historyFilter);
    }

    return filtered;
  }, [myLeads, currentUser.id, historyFilter]);

  const isLocked = isCallActive || callDuration < MIN_VALID_DURATION;
  const progressPercent = Math.min((callDuration / MIN_VALID_DURATION) * 100, 100);

  return (
    <div className="space-y-6 font-['Inter'] pb-12 animate-in fade-in duration-500">
      <div className="bg-[#0f172a] p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none">Counselor Hub</h2>
          <p className="text-indigo-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-3">{currentUser.name}</p>
        </div>
        <div className="relative z-10 flex gap-3 md:gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-indigo-600 px-6 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-3xl text-center shadow-xl">
            <p className="text-2xl md:text-3xl font-black">{completedLeads.length}</p>
            <p className="text-[7px] md:text-[8px] font-black uppercase mt-1">Processed</p>
          </div>
          <div className="flex-1 md:flex-none bg-white/5 px-6 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-3xl text-center border border-white/10">
            <p className="text-2xl md:text-3xl font-black text-slate-400">{pendingLeads.length}</p>
            <p className="text-[7px] md:text-[8px] font-black uppercase mt-1">Pending</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl md:rounded-2xl w-full shadow-inner border border-slate-200 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('pending')} className={`flex-1 px-4 md:px-10 py-3 md:py-3.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>Assigned</button>
          <button onClick={() => setActiveTab('completed')} className={`flex-1 px-4 md:px-10 py-3 md:py-3.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500'}`}>History</button>
          <button onClick={() => setActiveTab('verification')} className={`flex-1 px-4 md:px-10 py-3 md:py-3.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'verification' ? 'bg-white text-rose-500 shadow-sm border border-slate-100' : 'text-slate-500'}`}>
            Audit
            {isVerificationVisible && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>}
          </button>
        </div>

        {activeTab === 'completed' && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">Filter Outcome:</span>
            <select 
              value={historyFilter} 
              onChange={e => setHistoryFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-[9px] md:text-[10px] font-black uppercase text-indigo-600 cursor-pointer w-full"
            >
              <option value="All">All Categories</option>
              {Object.values(StudentResponse).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}
      </div>

      {activeTab === 'verification' ? (
        <div className="animate-in slide-in-from-bottom-6 duration-400 max-w-2xl mx-auto py-4 md:py-12">
          {isVerificationVisible ? (
            <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-12 shadow-2xl border-2 border-slate-100 overflow-hidden relative">
              <div className={`absolute top-0 left-0 w-full h-1.5 md:h-2 ${currentUser.verification?.status === 'rejected' ? 'bg-rose-500' : 'bg-[#ff4d6d]'}`}></div>
              
              {currentUser.verification?.status === 'rejected' && (
                <div className="mb-6 p-4 md:p-6 bg-rose-50 border border-rose-100 rounded-2xl md:rounded-3xl">
                   <div className="flex items-center gap-3 md:gap-4 mb-2">
                     <div className="w-6 h-6 md:w-8 md:h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg font-black italic text-[10px] md:text-base">!</div>
                     <p className="text-[9px] md:text-[11px] font-black text-rose-600 uppercase tracking-widest">Resubmission Required</p>
                   </div>
                   <div className="ml-9 md:ml-12">
                     <p className="text-[10px] md:text-[12px] font-bold text-rose-500 uppercase leading-relaxed tracking-tight">{currentUser.verification?.rejectionReason || "Verification details were incorrect."}</p>
                   </div>
                </div>
              )}

              <div className="text-center mb-8">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-50 text-[#ff4d6d] rounded-[1.5rem] md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-sm border border-rose-100">
                  <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-[#0f172a]">Integrity Audit</h3>
                <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Submit session proof for compliance</p>
              </div>

              <div className="bg-[#f8fafc] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 mb-6 md:mb-8 text-center shadow-inner">
                <p className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-3">Audit Reference Subject</p>
                <h4 className="text-xl md:text-2xl font-black text-[#0f172a] uppercase tracking-tighter leading-none">{currentUser.verification?.randomLeadName}</h4>
                <p className="text-slate-500 font-bold text-base md:text-lg mt-2 tracking-widest">{currentUser.verification?.randomLeadPhone}</p>
              </div>

              <form onSubmit={handleVerificationSubmit} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Call Duration (Seconds)</label>
                    <input 
                      type="number" 
                      value={verificationInput}
                      onChange={e => setVerificationInput(e.target.value)}
                      placeholder="e.g. 120"
                      className="w-full px-6 md:px-8 py-4 md:py-5 bg-[#f8fafc] border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] text-lg md:text-xl font-black outline-none focus:border-indigo-600 focus:bg-white transition-all text-center"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Date of Call Selection</label>
                    <div 
                      onClick={() => dateInputRef.current?.showPicker()}
                      className="w-full px-6 md:px-8 py-4 md:py-5 bg-[#f8fafc] border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-600 hover:bg-white transition-all group"
                    >
                      <p className="text-base md:text-lg font-black text-[#0f172a] tracking-tight">{new Date(verificationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="text-[8px] md:text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">Tap to Change Date</p>
                      <input 
                        ref={dateInputRef}
                        type="date" 
                        value={verificationDate}
                        onChange={e => setVerificationDate(e.target.value)}
                        className="opacity-0 absolute pointer-events-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Evidence Attachment</label>
                  <p className="text-[9px] font-bold text-rose-500 uppercase tracking-tight ml-4 mb-2">Note : Student contact No and duration must be visible!</p>
                  <div 
                    onClick={() => !uploadingScreenshot && fileInputRef.current?.click()}
                    className={`w-full aspect-video rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden bg-slate-50 group relative ${screenshotPreview ? 'border-emerald-500' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'}`}
                  >
                    {uploadingScreenshot ? (
                      <div className="flex flex-col items-center justify-center">
                         <div className="animate-spin w-8 h-8 md:w-10 md:h-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
                         <p className="text-[8px] md:text-[9px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">Processing Evidence...</p>
                      </div>
                    ) : screenshotPreview ? (
                      <div className="w-full h-full relative">
                         <img src={screenshotPreview} alt="Preview" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <p className="text-white text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">Change Screenshot</p>
                         </div>
                      </div>
                    ) : (
                      <>
                        <svg className="w-10 h-10 md:w-12 md:h-12 text-slate-300 group-hover:text-indigo-400 mb-3 md:mb-4 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <p className="text-[9px] md:text-[11px] font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest text-center px-6">Tap to Upload Call Screenshot</p>
                      </>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>

                <button 
                  type="submit" 
                  disabled={uploadingScreenshot || !uploadedURL}
                  className={`w-full py-5 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-[10px] md:text-[12px] uppercase tracking-[0.3em] shadow-2xl transition-all ${uploadingScreenshot || !uploadedURL ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#0f172a] text-white active:scale-95'}`}
                >
                  {uploadingScreenshot ? 'Synchronizing...' : 'Submit Audit Data'}
                </button>
              </form>
            </div>
          ) : currentUser.verification?.status === 'responded' ? (
             <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] p-12 md:p-20 text-center border-2 border-slate-200 shadow-sm">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8">
                   <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h3 className="text-lg md:text-xl font-black uppercase text-slate-800 tracking-tighter">Under Review</h3>
                <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 leading-relaxed max-w-xs mx-auto text-center">Submission awaiting approval from the Student Section. Access will be restored shortly.</p>
             </div>
          ) : (
            <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] p-12 md:p-20 text-center border-2 border-dashed border-slate-200 shadow-sm">
               <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8">
                  <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
               </div>
               <h3 className="text-lg md:text-xl font-black uppercase text-slate-300 tracking-tighter text-center">Compliance Clear</h3>
               <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 leading-relaxed text-center">No pending audit requests. You will be notified if an audit is triggered.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {(activeTab === 'pending' ? pendingLeads : completedLeads).map(lead => {
            const isSentByMe = lead.delegatedFromId === currentUser.id;
            const isSelected = selectedHistoryIds.includes(lead.id);
            
            return (
              <div 
                key={lead.id} 
                onClick={() => activeTab === 'completed' && setSelectedHistoryIds(p => p.includes(lead.id) ? p.filter(x => x !== lead.id) : [...p, lead.id])}
                className={`bg-white rounded-[1.5rem] md:rounded-[2.5rem] border-2 p-6 md:p-8 flex flex-col shadow-sm hover:shadow-xl transition-all group relative cursor-pointer select-none ${isSelected ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100'}`}
              >
                <div className="flex justify-between items-start mb-4 md:mb-6">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-[#f8fafc] rounded-xl md:rounded-2xl flex items-center justify-center font-black text-indigo-600 border border-slate-100 uppercase text-base md:text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    {lead.name.charAt(0)}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 md:gap-2">
                    <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[7px] md:text-[9px] font-black uppercase tracking-widest ${lead.callVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'}`}>
                      {lead.callVerified ? 'Interaction Verified' : 'Awaiting Call'}
                    </span>
                    {lead.response && (
                      <span className="px-2.5 py-1.5 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
                        {lead.response}
                      </span>
                    )}
                  </div>
                </div>
                
                <h4 className="font-black text-[#0f172a] text-lg md:text-xl uppercase tracking-tighter truncate leading-tight mb-1">{lead.name}</h4>
                <p className="text-indigo-600 text-xs md:text-sm font-black tracking-widest mb-4 md:mb-6">{lead.phone}</p>
                
                <div className="mt-auto">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      startCallSession(lead); 
                    }} 
                    disabled={isSentByMe}
                    className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${activeTab === 'pending' ? 'bg-[#0f172a] text-white hover:bg-slate-800' : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`}
                  >
                    {activeTab === 'pending' ? 'Initiate Session' : 'Re-Call Student'}
                  </button>
                </div>
              </div>
            );
          })}
          {(activeTab === 'pending' ? pendingLeads : completedLeads).length === 0 && (
            <div className="col-span-full py-16 md:py-24 text-center">
              <p className="text-slate-300 text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em]">No student records found.</p>
            </div>
          )}
        </div>
      )}

      {callingLead && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center overflow-y-auto">
          <div className="bg-white w-full h-full md:h-auto md:max-w-xl md:rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-10 bg-[#0f172a] text-white text-center relative overflow-hidden shrink-0 flex flex-col items-center justify-center">
              <div className="absolute top-0 left-0 w-full h-1.5 md:h-2 bg-white/10">
                <div className={`h-full transition-all duration-1000 ${progressPercent < 100 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Live Counseling Active</p>
              <h3 className="text-3xl md:text-4xl font-black uppercase leading-none mb-4 tracking-tighter">{callingLead.name}</h3>
              <div className="text-5xl md:text-6xl font-black tabular-nums my-6 text-white">{Math.floor(callDuration/60)}:{(callDuration%60).toString().padStart(2,'0')}</div>
              
              {!isCallActive ? (
                <div className="px-6 py-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-2">
                   <p className="text-[8px] md:text-[9px] font-black text-emerald-400 uppercase tracking-widest">Counseling Verified</p>
                </div>
              ) : (
                <button onClick={endCallSession} className="px-10 md:px-12 py-4 md:py-5 bg-red-600 text-white rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">End Session</button>
              )}
            </div>
            
            <div className="p-8 md:p-10 space-y-4 md:space-y-6 bg-white relative flex-1">
              {isLocked && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 font-bold text-xl">!</div>
                  <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Counseling Locked</p>
                  <p className="text-[7px] md:text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Minimum interaction: {MIN_VALID_DURATION} seconds</p>
                </div>
              )}
              
              {!showBranchSelection ? (
                <div className="space-y-3 md:space-y-4 animate-in fade-in duration-300">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Classify Outcome</p>
                  <button onClick={() => setShowBranchSelection(true)} disabled={isLocked} className="w-full py-5 md:py-6 bg-[#4c47f5] text-white rounded-[1.5rem] md:rounded-3xl font-black text-[12px] md:text-[14px] uppercase tracking-widest shadow-xl transition-all disabled:opacity-50">Interested</button>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_INTERESTED)} disabled={isLocked} className="py-4 md:py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[8px] md:text-[9px] font-black uppercase text-slate-600 disabled:opacity-50">Not Interested</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.CONFUSED)} disabled={isLocked} className="py-4 md:py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[8px] md:text-[9px] font-black uppercase text-slate-600 disabled:opacity-50">Confused</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.GRADE_11_12)} disabled={isLocked} className="py-4 md:py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[8px] md:text-[9px] font-black uppercase text-slate-600 disabled:opacity-50">11th / 12th</button>
                    <button onClick={() => handleCategorization(callingLead.id, StudentResponse.NOT_RESPONDING)} disabled={isLocked} className="py-4 md:py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[8px] md:text-[9px] font-black uppercase text-slate-600 disabled:opacity-50">No Answer</button>
                  </div>
                  <button onClick={() => handleCategorization(callingLead.id, StudentResponse.OTHERS)} disabled={isLocked} className="w-full py-3 md:py-4 bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl font-black text-[8px] md:text-[9px] uppercase tracking-widest disabled:opacity-50">Other Outcome</button>
                  <button onClick={() => setCallingLead(null)} className="w-full py-2 text-slate-300 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-center">Exit Overlay</button>
                </div>
              ) : (
                <div className="space-y-5 md:space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="text-center">
                    <p className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest">Enrollment Details</p>
                    <h4 className="text-base md:text-lg font-black uppercase text-[#0f172a] mt-1 tracking-tight">Preferred Institutional Branch</h4>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[40vh] md:max-h-[300px] overflow-y-auto custom-scroll pr-1">
                    {Object.values(Department)
                      .filter(dept => dept !== Department.SCIENCE_HUMANITIES)
                      .map(dept => (
                        <button 
                          key={dept} 
                          onClick={() => handleCategorization(callingLead.id, StudentResponse.INTERESTED, dept)} 
                          className="w-full p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left hover:bg-indigo-600 hover:text-white transition-all group shadow-sm flex items-center justify-between"
                        >
                          <p className="text-[10px] md:text-[11px] font-black uppercase leading-tight group-hover:text-white">{dept}</p>
                          <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                        </button>
                      ))}
                  </div>
                  <button onClick={() => setShowBranchSelection(false)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl text-[8px] md:text-[9px] font-black uppercase tracking-widest">Return to Outcomes</button>
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