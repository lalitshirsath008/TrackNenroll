
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { User, UserRole, Department } from '../types';

const UserManagement: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { users, deleteUser, addUser, updateUser } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Changed initial state to empty strings for placeholders
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: UserRole | '';
    department: Department | '';
  }>({ name: '', email: '', role: '', department: '' });

  const handleOpenModal = (user?: User) => {
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
      setFormData({ name: '', email: '', role: '', department: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role || !formData.department) {
      alert('Please select both Role and Branch.');
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, formData as Partial<User>);
    } else {
      addUser({ 
        ...(formData as any), 
        id: 'u' + Date.now(), 
        isApproved: true, 
        registrationStatus: 'approved' 
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-['Inter']">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div>
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Faculty Management</p>
          <h2 className="text-xl font-black text-slate-800 uppercase">Staff Portal</h2>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="px-6 py-2.5 bg-[#0f172a] text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95"
        >
          Add Faculty
        </button>
      </header>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#fcfdfe] text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
              <tr>
                <th className="px-8 py-5">Identity</th>
                <th className="px-8 py-5">Designation</th>
                <th className="px-8 py-5">Branch</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-all group">
                  <td className="px-8 py-4">
                    <div className="flex flex-col">
                      <p className="font-black text-slate-800 text-[11px] uppercase truncate tracking-tight">{u.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 lowercase">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-[8px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                      {u.role === UserRole.SUPER_ADMIN ? 'Principal' : u.role === UserRole.ADMIN ? 'Student Section' : u.role}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-tight">{u.department || 'CENTRAL'}</td>
                  <td className="px-8 py-4 text-right space-x-2">
                    <button onClick={() => handleOpenModal(u)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    {u.id !== currentUser.id && (
                      <button onClick={() => deleteUser(u.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tighter">{editingUser ? 'Edit Node' : 'Add Faculty'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-indigo-500 focus:bg-white transition-all" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Full Name"
                  required 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input 
                  type="email" 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-indigo-500 focus:bg-white transition-all" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="email@college.edu"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-bold appearance-none focus:border-indigo-500 focus:bg-white transition-all" 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                    required
                  >
                    <option value="" disabled>Select Role</option>
                    <option value={UserRole.ADMIN}>Student Section</option>
                    <option value={UserRole.HOD}>Department Head</option>
                    <option value={UserRole.TEACHER}>Faculty Staff</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-bold appearance-none focus:border-indigo-500 focus:bg-white transition-all" 
                    value={formData.department} 
                    onChange={e => setFormData({...formData, department: e.target.value as Department})}
                    required
                  >
                    <option value="" disabled>Select Branch</option>
                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-5 bg-[#5c4df2] text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 mt-6 transition-all hover:bg-indigo-700 active:scale-95"
              >
                Authorize Identity
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
