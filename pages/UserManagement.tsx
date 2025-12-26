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
    if (formData.name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters.';
    if (!validateEmail(formData.email)) newErrors.email = 'Please enter a valid email address.';

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

  const filteredUsers = users.filter(u => u.role !== UserRole.SUPER_ADMIN);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Institutional Roster</h1>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">User Management</h2>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all"
        >
          Add Faculty
        </button>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
              <tr>
                <th className="px-8 py-6">Faculty Member</th>
                <th className="px-8 py-6">Designation</th>
                <th className="px-8 py-6">Department</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <img src={`https://ui-avatars.com/api/?name=${u.name}&background=random`} className="w-10 h-10 rounded-xl" alt="" />
                      <div>
                        <p className="font-black text-slate-900 text-sm uppercase">{u.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">{getRoleLabel(u.role)}</span>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-400">
                    {u.department || 'OFFICE'}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${u.isApproved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{u.registrationStatus}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenModal(u)}
                      className="text-[9px] font-black uppercase text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                    >
                      Edit
                    </button>
                    {u.id !== currentUser.id && (
                      <button 
                        onClick={() => { if(confirm('Delete user?')) deleteUser(u.id); }}
                        className="text-[9px] font-black uppercase text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
                      >
                        Purge
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{editingUser ? 'Update Profile' : 'New Identity'}</h3>
                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mt-1">Configure institutional access</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:rotate-90 transition-transform">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                <input 
                  type="text" 
                  className={`w-full px-5 py-4 bg-slate-50 border ${errors.name ? 'border-rose-500' : 'border-slate-200'} rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold`} 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
                {errors.name && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institutional Email</label>
                <input 
                  type="email" 
                  className={`w-full px-5 py-4 bg-slate-50 border ${errors.email ? 'border-rose-500' : 'border-slate-200'} rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold`} 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
                {errors.email && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Level</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                    <option value={UserRole.ADMIN}>Student Section</option>
                    <option value={UserRole.HOD}>Department Head</option>
                    <option value={UserRole.TEACHER}>Faculty Staff</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value as Department})}>
                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4">
                {editingUser ? 'Propagate Changes' : 'Initialize Profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;