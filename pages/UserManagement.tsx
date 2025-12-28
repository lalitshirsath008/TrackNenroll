
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

  // Sort: Super Admin (current) first, then admins, then others
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === UserRole.SUPER_ADMIN) return -1;
    if (b.role === UserRole.SUPER_ADMIN) return 1;
    return 0;
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Header */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Institutional Roster</h1>
          <h2 className="text-5xl font-black text-[#1e293b] tracking-tighter uppercase">User Management</h2>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="px-10 py-4 bg-[#0f172a] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-[0_10px_30px_-10px_rgba(15,23,42,0.4)] hover:bg-slate-800 transition-all active:scale-95"
        >
          Add Faculty
        </button>
      </header>

      {/* Roster Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_15px_60px_-15px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-[#fcfdfe] text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.15em] border-b border-slate-50">
              <tr>
                <th className="px-10 py-8">Faculty Member</th>
                <th className="px-10 py-8">Designation</th>
                <th className="px-10 py-8">Department</th>
                <th className="px-10 py-8 text-center">Status</th>
                <th className="px-10 py-8 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-inner overflow-hidden">
                         <img 
                          src={`https://ui-avatars.com/api/?name=${u.name}&background=${u.role === UserRole.ADMIN ? '059669' : '2563eb'}&color=fff&bold=true`} 
                          alt="" 
                          className="w-full h-full object-cover"
                         />
                      </div>
                      <div className="flex flex-col">
                        <p className="font-black text-[#1e293b] text-sm uppercase tracking-tight leading-none mb-1">{u.name}</p>
                        <p className="text-[10px] font-bold text-[#94a3b8] tracking-tight">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50/60 px-4 py-2 rounded-xl border border-indigo-100/50">
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-10 py-7">
                    <p className="text-[11px] font-black text-[#94a3b8] uppercase tracking-widest">
                      {u.department || 'OFFICE'}
                    </p>
                  </td>
                  <td className="px-10 py-7 text-center">
                    <div className="inline-flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${u.isApproved ? 'bg-[#10b981]' : 'bg-[#f59e0b] animate-pulse'}`}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#475569]">
                        {u.registrationStatus === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <div className="flex justify-end gap-6 items-center">
                      <button 
                        onClick={() => handleOpenModal(u)}
                        className="text-[10px] font-black uppercase tracking-[0.1em] text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        Edit
                      </button>
                      
                      {/* Realtime Delete Action */}
                      {u.id !== currentUser.id && u.role !== UserRole.SUPER_ADMIN && (
                        <button 
                          onClick={() => { if(window.confirm(`PERMANENTLY DELETE: Are you sure you want to remove ${u.name}? This cannot be undone.`)) deleteUser(u.id); }}
                          className="text-[10px] font-black uppercase tracking-[0.1em] text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1.5 group"
                        >
                          <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          Delete
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

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 bg-[#0f172a] text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <div className="relative z-10">
                <h3 className="text-3xl font-black uppercase tracking-tighter">
                  {editingUser ? 'Edit Profile' : 'New Identity'}
                </h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Faculty Provisioning Node</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all relative z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Identity Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Prof. Arvind Kulkarni"
                  className={`w-full px-6 py-4.5 bg-slate-50 border-2 ${errors.name ? 'border-rose-200 focus:border-rose-500' : 'border-slate-100 focus:border-indigo-600'} rounded-2xl outline-none transition-all font-bold text-[#1e293b]`} 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
                {errors.name && <p className="text-rose-500 text-[9px] font-black uppercase tracking-tighter ml-1">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institutional Work Email</label>
                <input 
                  type="email" 
                  placeholder="name@college.edu"
                  className={`w-full px-6 py-4.5 bg-slate-50 border-2 ${errors.email ? 'border-rose-200 focus:border-rose-500' : 'border-slate-100 focus:border-indigo-600'} rounded-2xl outline-none transition-all font-bold text-[#1e293b]`} 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
                {errors.email && <p className="text-rose-500 text-[9px] font-black uppercase tracking-tighter ml-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Designation</label>
                  <select 
                    className="w-full px-6 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-600 font-bold text-[#1e293b] appearance-none" 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  >
                    <option value={UserRole.ADMIN}>Student Section</option>
                    <option value={UserRole.HOD}>Department Head</option>
                    <option value={UserRole.TEACHER}>Faculty Staff</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Branch</label>
                  <select 
                    className="w-full px-6 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-600 font-bold text-[#1e293b] appearance-none" 
                    value={formData.department} 
                    onChange={e => setFormData({...formData, department: e.target.value as Department})}
                  >
                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" className="w-full py-5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 transition-all active:scale-95">
                  {editingUser ? 'Save Roster Changes' : 'Initialize Profile'}
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
