
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { User, UserRole } from '../types';

const ApprovalCenter: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { users, handleUserApproval } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const approvalCandidates = useMemo(() => {
    return users.filter(u => {
      // Logic: Principal/Admin see all pending registrations. 
      // HOD only sees teachers of their own department.
      if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) {
        return u.role !== UserRole.SUPER_ADMIN && u.id !== currentUser.id;
      }
      if (currentUser.role === UserRole.HOD) {
        return u.role === UserRole.TEACHER && u.department === currentUser.department;
      }
      return false;
    });
  }, [users, currentUser]);

  const pendingRequests = approvalCandidates.filter(u => u.registrationStatus === 'pending');
  const historyRequests = approvalCandidates.filter(u => u.registrationStatus !== 'pending');

  const getRoleLabel = (role: UserRole) => {
    if (role === UserRole.SUPER_ADMIN) return 'Principal';
    if (role === UserRole.ADMIN) return 'Student Section';
    return role;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Professional Header */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Authorization Gateway</h1>
          <h2 className="text-5xl font-black text-[#1e293b] tracking-tighter uppercase">Faculty Verification</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-4 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            Reviewing Access Requests for Institutional Nodes
          </p>
        </div>
      </header>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] overflow-hidden min-h-[550px] flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex bg-[#fcfdfe] border-b border-slate-50 p-3">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pending Requests ({pendingRequests.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Resolution History ({historyRequests.length})
          </button>
        </div>

        <div className="flex-1 overflow-x-auto">
          {activeTab === 'pending' ? (
            <table className="w-full text-left">
              <thead className="bg-[#fcfdfe] text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.15em] border-b border-slate-50">
                <tr>
                  <th className="px-10 py-7">Faculty Identity</th>
                  <th className="px-10 py-7">Provisioned Role</th>
                  <th className="px-10 py-7">Assigned Branch</th>
                  <th className="px-10 py-7 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingRequests.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-inner">
                          <img src={`https://ui-avatars.com/api/?name=${u.name}&background=6366f1&color=fff&bold=true`} className="w-full h-full object-cover rounded-2xl" alt="" />
                        </div>
                        <div>
                          <p className="font-black text-[#1e293b] text-sm uppercase tracking-tight leading-none mb-1">{u.name}</p>
                          <p className="text-[10px] font-bold text-[#94a3b8] tracking-tight">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50/60 px-4 py-2 rounded-xl border border-indigo-100/50">
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-[11px] font-black text-[#94a3b8] uppercase tracking-widest">
                        {u.department || 'CENTRAL'}
                      </p>
                    </td>
                    <td className="px-10 py-6 text-right space-x-4">
                      <button 
                        onClick={() => handleUserApproval(u.id, currentUser.id, 'rejected')}
                        className="px-6 py-3 rounded-xl border border-rose-100 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
                      >
                        Decline
                      </button>
                      <button 
                        onClick={() => handleUserApproval(u.id, currentUser.id, 'approved')}
                        className="px-8 py-3 rounded-xl bg-[#0f172a] text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95"
                      >
                        Authorize
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingRequests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-40 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                         <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">All Node Access Requests Resolved</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[#fcfdfe] text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.15em] border-b border-slate-50">
                <tr>
                  <th className="px-10 py-7">Faculty Identity</th>
                  <th className="px-10 py-7">Status</th>
                  <th className="px-10 py-7">Department</th>
                  <th className="px-10 py-7 text-right">Verification Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyRequests.map(u => (
                  <tr key={u.id} className="opacity-70 group hover:opacity-100 transition-all">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <img src={`https://ui-avatars.com/api/?name=${u.name}&background=e2e8f0&color=64748b`} className="w-10 h-10 rounded-xl" alt="" />
                        <div>
                          <p className="font-black text-[#1e293b] text-xs uppercase tracking-tight">{u.name}</p>
                          <p className="text-[10px] font-bold text-[#94a3b8]">{u.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                        u.registrationStatus === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {u.registrationStatus}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{u.department || 'CENTRAL'}</p>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase">Resolved: {u.approvalDate || 'Manual'}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">ID: {u.id.slice(0, 12)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalCenter;
