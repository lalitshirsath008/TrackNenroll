
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole, Department, User } from '../types';
import { useData } from '../context/DataContext';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerUser } = useData();
  const [role, setRole] = useState<UserRole | ''>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dept, setDept] = useState<Department | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!role) {
      alert('Please select a role.');
      return;
    }

    if ((role === UserRole.HOD || role === UserRole.TEACHER) && !dept) {
      alert('Please select a department.');
      return;
    }

    const newUser: User = {
      id: 'u' + Date.now(),
      name,
      email,
      role: role as UserRole,
      department: (role === UserRole.HOD || role === UserRole.TEACHER) ? (dept as Department) : undefined,
      isApproved: false,
      registrationStatus: 'pending'
    };

    registerUser(newUser);
    alert('Registration successful! You can now login.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
        <div className="p-8 text-center bg-indigo-600 text-white">
          <h2 className="text-3xl font-black">Join TrackNEnroll</h2>
          <p className="text-indigo-100 mt-2 font-medium">Create your institutional profile</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Select Role</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[UserRole.ADMIN, UserRole.HOD, UserRole.TEACHER].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-3 px-2 text-[10px] font-black uppercase rounded-xl transition-all border-2 ${
                    role === r 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                    : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
              <input 
                type="text" required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                placeholder="Dr. Rajesh Patil"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Institutional Email</label>
              <input 
                type="email" required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                placeholder="rajesh@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {(role === UserRole.HOD || role === UserRole.TEACHER) && (
            <div className="space-y-1 animate-in slide-in-from-top-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Department</label>
              <select 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 appearance-none"
                value={dept}
                onChange={(e) => setDept(e.target.value as Department)}
                required
              >
                <option value="" disabled>Select Department</option>
                {Object.values(Department).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <input 
                type="password" required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Confirm</label>
              <input 
                type="password" required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <button 
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all uppercase tracking-widest"
            >
              Initialize Profile
            </button>
            <p className="text-center text-slate-500 text-sm font-medium">
              Existing faculty? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Sign in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
