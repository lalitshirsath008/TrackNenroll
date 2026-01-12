import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { User, UserRole, Department, UserAction } from '../types';

const MALE_FACULTY = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam&backgroundColor=b6e3f4&eyebrows=default&mouth=smile&top=shortHair',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Noah&backgroundColor=c0aede&eyebrows=default&mouth=smile&top=shortFlat',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=James&backgroundColor=d1d4f9&eyebrows=up&mouth=smile&top=turban',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&backgroundColor=ffd5dc&eyebrows=default&mouth=smile&top=shortCurly',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=ffdfbf&eyebrows=default&mouth=smile&top=shortWaved'
];

const FEMALE_FACULTY = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=b6e3f4&eyebrows=default&mouth=smile&top=longHair',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ava&backgroundColor=c0aede&eyebrows=default&mouth=smile&top=bob',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&backgroundColor=d1d4f9&eyebrows=up&mouth=smile&top=hijab',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Isabella&backgroundColor=ffd5dc&eyebrows=default&mouth=smile&top=bun',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&backgroundColor=ffdfbf&eyebrows=default&mouth=smile&top=curly'
];

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
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[75vh] overflow-y-auto custom-scroll">
              {/* Profile Photo Area */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Identity Photo</label>
                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center gap-8 w-full justify-center">
                    <div 
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      className={`w-28 h-28 rounded-[2.5rem] bg-slate-50 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${formData.photoURL ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50'}`}
                    >
                      {isUploading ? (
                        <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                      ) : formData.photoURL ? (
                        <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <svg className="w-6 h-6 text-slate-300 group-hover:text-indigo-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                          <span className="text-[7px] font-black uppercase text-slate-400 group-hover:text-indigo-600">Upload Photo</span>
                        </>
                      )}
                    </div>
                    
                    {formData.photoURL && (
                      <button 
                        type="button" 
                        onClick={removePhoto} 
                        className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all shadow-sm"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>

                  {/* Professional Avatar Picker */}
                  <div className="w-full space-y-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Institutional Avatar Library</p>
                    
                    {/* Male Avatars */}
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest ml-1">Male Faculty</p>
                      <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 custom-scroll no-scrollbar justify-start">
                        {MALE_FACULTY.map((url, idx) => (
                          <button 
                            key={idx} 
                            type="button" 
                            onClick={() => selectAvatar(url)}
                            className={`w-12 h-12 rounded-[1.2rem] overflow-hidden shrink-0 border-2 transition-all hover:scale-110 active:scale-90 ${formData.photoURL === url ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-100 shadow-sm bg-slate-50'}`}
                          >
                            <img src={url} alt={`Male Avatar ${idx}`} className="w-full h-full" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Female Avatars */}
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest ml-1">Female Faculty</p>
                      <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 custom-scroll no-scrollbar justify-start">
                        {FEMALE_FACULTY.map((url, idx) => (
                          <button 
                            key={idx} 
                            type="button" 
                            onClick={() => selectAvatar(url)}
                            className={`w-12 h-12 rounded-[1.2rem] overflow-hidden shrink-0 border-2 transition-all hover:scale-110 active:scale-90 ${formData.photoURL === url ? 'border-rose-500 ring-4 ring-rose-50' : 'border-slate-100 shadow-sm bg-slate-50'}`}
                          >
                            <img src={url} alt={`Female Avatar ${idx}`} className="w-full h-full" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>

              {/* Form Fields */}
              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-indigo-500 focus:bg-white transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full Name" required />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email Address</label>
                <input type="email" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-indigo-500 focus:bg-white transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="name@college.edu" required />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Password</label>
                <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:border-indigo-500 focus:bg-white transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Enter Password" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Role</label>
                  <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-bold appearance-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} required>
                    <option value="" disabled>Select Role</option>
                    <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.HOD}>Department Head</option>
                    <option value={UserRole.TEACHER}>Faculty Staff</option>
                  </select>
                </div>
                {!isCentralRole && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Branch</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-bold appearance-none" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value as Department})} required>
                      <option value="" disabled>Select Branch</option>
                      {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all mt-6">
                {editingUser ? 'Save Profile Changes' : 'Initialize Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;