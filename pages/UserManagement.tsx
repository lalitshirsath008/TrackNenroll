
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { User, UserRole, Department } from '../types';

const UserManagement: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { users, deleteUser, addUser, updateUser } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const getRoleLabel = (role: UserRole) => {
    if (role === UserRole.SUPER_ADMIN) return 'Principal';
    if (role === UserRole.ADMIN) return 'Student Section';
    return role;
  };

  const getRoleColor = (role: UserRole) => {
    switch(role) {
      case UserRole.SUPER_ADMIN: return 'bg-purple-50 text-purple-600 border-purple-100';
      case UserRole.ADMIN: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case UserRole.HOD: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: UserRole.TEACHER,
    department: Department.IT
  });

  // Validation State
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleOpenModal = (user?: User) => {
    setErrors({});
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || Department.IT
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        role: UserRole.TEACHER,
        department: Department.IT
      });
    }
    setIsModalOpen(true);
  };

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: { [key: string]: string } = {};
    if (formData.name.trim().length < 3) newErrors.name = 'Name is too short.';
    if (!validateEmail(formData.email)) newErrors.email = 'Invalid institutional email.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, formData);
    } else {
      addUser({
        ...formData,
        id: 'u' + Date.now(),
        isApproved: true,
        registrationStatus: 'approved'
      });
    }
    setIsModalOpen(false);
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === UserRole.SUPER_ADMIN) return -1;
    if (b.role === UserRole.SUPER_ADMIN) return 1;
    if (a.role === UserRole.ADMIN && b.role !== UserRole.ADMIN) return -1;
    return 0;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-full overflow-hidden">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-2">
        <div>
          <h1 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Institutional Roster</h1>
          <h2 className="text-3xl md:text-5xl font-black text-[#0f172a] tracking-tight uppercase">Staff Portal</h2>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto px-10 py-6 bg-[#0f172a] text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4"/></svg>
          Add New Faculty
        </button>
      </header>

      {/* Roster Table Container */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto custom-scroll">
          <table className="w-full text-left table-auto">
            <thead className="bg-[#f8fafc] text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-10 py-7">Faculty Member</th>
                <th className="px-10 py-7">Designation</th>
                <th className="px-10 py-7">Department</th>
                <th className="px-10 py-7 text-center">Security</th>
                <th className="px-10 py-7 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="shrink-0 w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-white font-black text-xs shadow-inner overflow-hidden border border-slate-200">
                         <img 
                          src={`https://ui-avatars.com/api/?name=${u.name}&background=f1f5f9&color=64748b&bold=true`} 
                          alt="" 
                          className="w-full h-full object-cover"
                         />
                      </div>
                      <div className="flex flex-col min-w-[150px]">
                        <p className="font-black text-[#1e293b] text-sm uppercase tracking-tight leading-tight mb-1">{u.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 tracking-tight lowercase">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`inline-block whitespace-nowrap text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border ${getRoleColor(u.role)}`}>
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                      {u.department || 'CENTRAL OFFICE'}
                    </p>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className={`w-2.5 h-2.5 rounded-full ${u.isApproved ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-400 animate-pulse'}`}></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                        {u.registrationStatus === 'approved' ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-3 items-center">
                      <button 
                        onClick={() => handleOpenModal(u)}
                        className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                        title="Edit Node"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      
                      {u.id !== currentUser.id && u.role !== UserRole.SUPER_ADMIN && (
                        <button 
                          onClick={() => { if(window.confirm(`PERMANENTLY DELETE: ${u.name}?`)) deleteUser(u.id); }}
                          className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                          title="Purge Node"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal - Upgraded to match IMAGE Design */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 bg-[#0f172a] text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <div className="relative z-10">
                <h3 className="text-3xl font-black uppercase tracking-tight">
                  {editingUser ? 'Edit Node' : 'Add Node'}
                </h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Institutional Access Controller</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-rose-500 flex items-center justify-center transition-all relative z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Name</label>
                <input 
                  type="text" 
                  className={`w-full px-6 py-5 bg-slate-50 border ${errors.name ? 'border-rose-300' : 'border-slate-100'} rounded-2xl outline-none focus:border-indigo-600 transition-all font-bold text-sm text-[#0f172a] shadow-sm`} 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Dr. Rajesh Patil"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institutional Email</label>
                <input 
                  type="email" 
                  className={`w-full px-6 py-5 bg-slate-50 border ${errors.email ? 'border-rose-300' : 'border-slate-100'} rounded-2xl outline-none focus:border-indigo-600 transition-all font-bold text-sm text-[#0f172a] shadow-sm`} 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="name@college.edu"
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                  <select 
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 font-bold text-sm text-[#0f172a] appearance-none shadow-sm" 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  >
                    <option value={UserRole.ADMIN}>Student Section</option>
                    <option value={UserRole.HOD}>Department Head</option>
                    <option value={UserRole.TEACHER}>Faculty Staff</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Branch</label>
                  <select 
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 font-bold text-sm text-[#0f172a] appearance-none shadow-sm" 
                    value={formData.department} 
                    onChange={e => setFormData({...formData, department: e.target.value as Department})}
                  >
                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all active:scale-[0.98]">
                  {editingUser ? 'Authorize Update' : 'Authorize Identity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
