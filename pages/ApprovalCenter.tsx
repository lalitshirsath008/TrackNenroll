
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { User, UserRole } from '../types';

const ApprovalCenter: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { users, handleUserApproval } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const approvalCandidates = useMemo(() => {
    return users.filter(u => {
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
    if (role === UserRole.ADMIN) return 'Admin';
    return role;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Staff Control</h1>
          <h2 className="text-4xl font-black text-[#1e293b] tracking-tighter uppercase">Approve Teachers</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-4">
            Verify and approve new staff accounts here.
          </p>
        </div>
      </header>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[550px] flex flex-col">
        <div className="flex bg-[#fcfdfe] border-b border-slate-50 p-3">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100' : 'text-slate-400'}`}
          >
            Pending ({pendingRequests.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100' : 'text-slate-400'}`}
          >
            History ({historyRequests.length})
          </button>
        </div>

        <div className="flex-1 overflow-x-auto">
          {activeTab === 'pending' ? (
            <table className="w-full text-left">
              <thead className="bg-[#fcfdfe] text-[10px] font-black text-[#94a3b8] uppercase border-b border-slate-50">
                <tr>
                  <th className="px-10 py-7">Name</th>
                  <th className="px-10 py-7">Role</th>
                  <th className="px-10 py-7">Branch</th>
                  <th className="px-10 py-7 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingRequests.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-all">
                    <td className="px-10 py-6">
                      <p className="font-black text-[#1e293b] text-sm uppercase">{u.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {u.department || 'CENTRAL'}
                      </p>
                    </td>
                    <td className="px-10 py-6 text-right space-x-3">
                      <button onClick={() => handleUserApproval(u.id, currentUser.id, 'rejected')} className="px-4 py-2 text-rose-500 text-[9px] font-black uppercase border border-rose-100 rounded-lg">Reject</button>
                      <button onClick={() => handleUserApproval(u.id, currentUser.id, 'approved')} className="px-6 py-2 bg-[#0f172a] text-white text-[9px] font-black uppercase rounded-lg">Approve</button>
                    </td>
                  </tr>
                ))}
                {pendingRequests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-40 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">No pending requests.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[#fcfdfe] text-[10px] font-black text-[#94a3b8] uppercase border-b border-slate-50">
                <tr>
                  <th className="px-10 py-7">Name</th>
                  <th className="px-10 py-7">Status</th>
                  <th className="px-10 py-7">Branch</th>
                  <th className="px-10 py-7 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyRequests.map(u => (
                  <tr key={u.id} className="opacity-70 hover:opacity-100 transition-all">
                    <td className="px-10 py-6">
                       <p className="font-black text-[#1e293b] text-xs uppercase">{u.name}</p>
                       <p className="text-[10px] font-bold text-slate-400">{u.role}</p>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border ${u.registrationStatus === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {u.registrationStatus}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase">{u.department || 'CENTRAL'}</td>
                    <td className="px-10 py-6 text-right text-[9px] font-black text-slate-500 uppercase">Date: {u.approvalDate || '-'}</td>
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
