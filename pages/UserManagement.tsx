import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { User, UserRole, Department, UserAction } from '../types';

// Updated high-quality SVG URLs that strictly follow the visual reference (Flat style, specific colors)
const MALE_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&top=shortHair&hairColor=4a312c&clothing=sweater&clothingColor=3b82f6&backgroundColor=e0f2fe&backgroundType=circle';
const FEMALE_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&top=longHair&hairColor=4a312c&clothing=sweater&clothingColor=ec4899&backgroundColor=e0f2fe&backgroundType=circle';

const UserManagement: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { users, deleteUser, addUser, updateUser, showToast, addLog, uploadProfileImage } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password?: string;
    role: UserRole | '';
    department: Department | '';
    photoURL?: string;
  }>({ name: '', email: '', password: '', role: '', department: '', photoURL: '' });

  const isCentralRole = formData.role === UserRole.ADMIN || formData.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (isCentralRole) {
      setFormData(prev => ({ ...prev, department: '' }));
    }
  }, [formData.role, isCentralRole]);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({ 
        name: user.name, 
        email: user.email, 
        password: user.password || '',
        role: user.role, 
        department: (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) ? '' : (user.department || ''),
        photoURL: user.photoURL || ''
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: '', department: '', photoURL: '' });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const tempId = editingUser?.id || `temp-${Date.now()}`;
      const url = await uploadProfileImage(tempId, file);
      setFormData(prev => ({ ...prev, photoURL: url }));
      showToast("Profile image uploaded successfully.", "success");
    } catch (err) {
      showToast("Failed to upload image.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, photoURL: '' }));
    showToast("Profile image removed locally. Save to confirm.", "info");
  };

  const selectAvatar = (url: string) => {
    setFormData(prev => ({ ...prev, photoURL: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.role) {
      showToast('Validation failed: A valid designation must be selected.', 'error');
      return;
    }

    if (!isCentralRole && !formData.department) {
      showToast('Validation failed: A branch must be selected for faculty roles.', 'error');
      return;
    }

    const finalDepartment = isCentralRole ? null : (formData.department as Department);

    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role as UserRole,
      department: finalDepartment,
      photoURL: formData.photoURL || ''
    };

    if (editingUser) {
      await updateUser(editingUser.id, payload as any);
      addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Updated staff profile: ${editingUser.name}`);
    } else {
      const newUser = { 
        ...payload, 
        id: 'u' + Date.now(), 
        isApproved: true, 
        registrationStatus: 'approved' 
      };
      await addUser(newUser as any as User);
      addLog(currentUser.id, currentUser.name, UserAction.MANUAL_ADD, `Created new staff account: ${newUser.name} (${newUser.role})`);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-['Inter']">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div>
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Administrative Control</p>
          <h2 className="text-xl font-black text-slate-800 uppercase">Personnel Management</h2>
        </div>
        <button onClick={() => handleOpenModal()} className="px-6 py-2.5 bg-[#0f172a] text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95">Add Faculty Member</button>
      </header>
      
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#fcfdfe] text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
              <tr>
                <th className="px-8 py-5">Personnel Identity</th>
                <th className="px-8 py-5">Designation</th>
                <th className="px-8 py-5">Branch</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => {
                const userIsCentral = u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN;
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-all group">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-black text-indigo-600 text-[10px] uppercase">{u.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <p className="font-black text-slate-800 text-[11px] uppercase truncate tracking-tight">{u.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 lowercase">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-[8px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-tight">
                      {userIsCentral ? (
                        <span className="text-indigo-600">Central Administration</span>
                      ) : (
                        u.department || 'Branch Not Assigned'
                      )}
                    </td>
                    <td className="px-8 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenModal(u)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                      </button>
                      {u.id !== currentUser.id && (
                        <button onClick={() => { if(window.confirm('Are you sure you want to permanently remove this faculty member? This will revoke all access privileges.')) deleteUser(u.id); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tighter">{editingUser ? 'Update Profile' : 'Add New Faculty'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scroll">
              {/* Profile Photo Area */}
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block w-full">Staff Identity Photo</label>
                
                <div className="flex flex-col items-center gap-8">
                  {/* Preview and Remove Row */}
                  <div className="flex items-center justify-center gap-8 w-full">
                    <div 
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      className={`w-32 h-32 rounded-[2.5rem] bg-slate-50 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${formData.photoURL ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-inner' : 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50'}`}
                    >
                      {isUploading ? (
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                      ) : formData.photoURL ? (
                        <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <svg className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                          <span className="text-[8px] font-black uppercase">Upload Photo</span>
                        </div>
                      )}
                    </div>
                    
                    {formData.photoURL && (
                      <button 
                        type="button" 
                        onClick={removePhoto} 
                        className="px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all shadow-sm active:scale-95"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>

                  {/* Clean Selection Library */}
                  <div className="w-full space-y-4 pt-4 border-t border-slate-50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Select Institutional Persona</p>
                    
                    <div className="flex justify-center gap-12">
                      {/* Male Option */}
                      <div className="flex flex-col items-center gap-3">
                        <button 
                          type="button" 
                          onClick={() => selectAvatar(MALE_AVATAR)}
                          className={`w-20 h-20 rounded-3xl overflow-hidden border-4 transition-all hover:scale-110 active:scale-90 shadow-md ${formData.photoURL === MALE_AVATAR ? 'border-indigo-500 ring-8 ring-indigo-50' : 'border-white bg-slate-50 hover:border-slate-200'}`}
                        >
                          <img src={MALE_AVATAR} alt="Male Faculty" className="w-full h-full" />
                        </button>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${formData.photoURL === MALE_AVATAR ? 'text-indigo-600' : 'text-slate-400'}`}>Male</p>
                      </div>

                      {/* Female Option */}
                      <div className="flex flex-col items-center gap-3">
                        <button 
                          type="button" 
                          onClick={() => selectAvatar(FEMALE_AVATAR)}
                          className={`w-20 h-20 rounded-3xl overflow-hidden border-4 transition-all hover:scale-110 active:scale-90 shadow-md ${formData.photoURL === FEMALE_AVATAR ? 'border-rose-500 ring-8 ring-rose-50' : 'border-white bg-slate-50 hover:border-slate-200'}`}
                        >
                          <img src={FEMALE_AVATAR} alt="Female Faculty" className="w-full h-full" />
                        </button>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${formData.photoURL === FEMALE_AVATAR ? 'text-rose-600' : 'text-slate-400'}`}>Female</p>
                      </div>
                    </div>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>

              {/* Form Fields */}
              <div className="space-y-5 pt-4 border-t border-slate-50">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Enter Full Name" required />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email Address</label>
                  <input type="email" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="name@college.edu" required />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Password</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Role</label>
                    <div className="relative">
                      <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-bold appearance-none cursor-pointer" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} required>
                        <option value="" disabled>Select Role</option>
                        <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                        <option value={UserRole.HOD}>Department Head</option>
                        <option value={UserRole.TEACHER}>Faculty Staff</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                      </div>
                    </div>
                  </div>
                  {!isCentralRole && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Branch</label>
                      <div className="relative">
                        <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-bold appearance-none cursor-pointer" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value as Department})} required>
                          <option value="" disabled>Select Branch</option>
                          {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all mt-6">
                  {editingUser ? 'Save Profile Changes' : 'Initialize Account'}
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