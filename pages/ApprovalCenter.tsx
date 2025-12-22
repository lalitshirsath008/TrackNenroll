
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { User, UserRole } from '../types';

const ApprovalCenter: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { users, handleUserApproval } = useData();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const approvalCandidates = useMemo(() => {
    return users.filter(u => {
      // Logic: Admin approves HODs. HOD approves Teachers of their dept.
      if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN) {
        return u.role === UserRole.HOD;
      }
      if (currentUser.role === UserRole.HOD) {
        return u.role === UserRole.TEACHER && u.department === currentUser.department;
      }
      return false;
    });
  }, [users, currentUser]);

  const pendingRequests = approvalCandidates.filter(u => u.registrationStatus === 'pending');
  const historyRequests = approvalCandidates.filter(u => u.registrationStatus !== 'pending');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Authorization Hub</h1>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Faculty Verification</h2>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
          {currentUser.role === UserRole.HOD 
            ? `Reviewing Teachers for ${currentUser.department}` 
            : "Reviewing Departmental HOD Applications"}
        </p>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {/* Tab Header */}
        <div className="flex border-b border-slate-50 bg-slate-50/30 p-2">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 md:flex-none px-10 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pending ({pendingRequests.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-none px-10 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Audit Trail ({historyRequests.length})
          </button>
        </div>

        <div className="flex-1 overflow-x-auto">
          {activeTab === 'pending' ? (
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5">Profile</th>
                  <th className="px-8 py-5">Department</th>
                  <th className="px-8 py-5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingRequests.map(u => (
                  <tr key={u.id} className="hover:bg-indigo-50/20 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <img src={`https://ui-avatars.com/api/?name=${u.name}&background=6366f1&color=fff`} className="w-12 h-12 rounded-2xl shadow-sm" alt="" />
                        <div>
                          <p className="font-black text-slate-900 text-sm uppercase">{u.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{u.email}</p>
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mt-1 inline-block">{u.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {u.department}
                    </td>
                    <td className="px-8 py-6 text-right space-x-3">
                      <button 
                        onClick={() => handleUserApproval(u.id, currentUser.id, 'rejected')}
                        className="px-6 py-2.5 rounded-xl border-2 border-red-100 text-red-500 text-[9px] font-black uppercase hover:bg-red-50 transition-all"
                      >
                        Decline
                      </button>
                      <button 
                        onClick={() => handleUserApproval(u.id, currentUser.id, 'approved')}
                        className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-[9px] font-black uppercase hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
                      >
                        Authorize
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingRequests.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-32 text-center text-slate-300">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">✓</div>
                      <p className="text-[10px] font-black uppercase tracking-widest">All authorization requests resolved</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5">Profile</th>
                  <th className="px-8 py-5">Resolution Status</th>
                  <th className="px-8 py-5 text-right">Audit Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyRequests.map(u => (
                  <tr key={u.id} className="opacity-80 grayscale-[0.5] hover:grayscale-0 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <img src={`https://ui-avatars.com/api/?name=${u.name}&background=random`} className="w-10 h-10 rounded-xl" alt="" />
                        <div>
                          <p className="font-black text-slate-900 text-xs uppercase">{u.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{u.role} • {u.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        u.registrationStatus === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {u.registrationStatus}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase">Handled: {u.approvalDate}</p>
                      <p className="text-[8px] font-bold text-slate-400 italic">Auth Token: {u.id.slice(0, 8)}...</p>
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
