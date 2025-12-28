
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole, Department } from '../types';
import { useData } from '../context/DataContext';

interface LoginProps {
  onLogin: (user: User) => void;
}

const AuthHub: React.FC<LoginProps> = ({ onLogin }) => {
  const { users, registerUser } = useData();
  const location = useLocation();
  
  const [authMode, setAuthMode] = useState<'login' | 'register'>(
    location.pathname === '/register' ? 'register' : 'login'
  );
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.TEACHER);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDept, setRegDept] = useState<Department>(Department.IT);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const user = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
    
    if (user && (loginPass === 'admin123' || loginPass === 'password')) {
      if (!user.isApproved) {
        setError('Your account is awaiting approval from Admin.');
      } else {
        onLogin(user);
      }
    } else {
      setError('Invalid email or password.');
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const existing = users.find(u => u.email === regEmail);
    if (existing) {
      setError('Email already exists.');
      setLoading(false);
      return;
    }
    
    const newUser: User = {
      id: 'u' + Date.now(),
      name: regName,
      email: regEmail,
      role: regRole,
      department: (regRole === UserRole.HOD || regRole === UserRole.TEACHER) ? regDept : undefined,
      isApproved: false,
      registrationStatus: 'pending'
    };

    await registerUser(newUser);
    setSuccess('Registration request sent! Please wait for approval.');
    setTimeout(() => {
      setAuthMode('login');
      setSuccess('');
    }, 3000);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-['Inter']">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl text-white font-black text-2xl shadow-lg mb-4">T</div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">TrackNEnroll</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Institutional Admission Management</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 md:p-10">
          {authMode === 'login' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
                <p className="text-slate-400 text-sm">Please enter your credentials</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {error && <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 text-center">{error}</div>}
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Work Email</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder="name@college.edu" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Password</label>
                  <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder="••••••••" required />
                </div>

                <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98]">
                  {loading ? 'Logging in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                <p className="text-sm text-slate-500">New faculty member? <button onClick={() => setAuthMode('register')} className="text-emerald-600 font-bold hover:underline">Register Profile</button></p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
                <p className="text-slate-400 text-sm">Join the institutional network</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {success && <div className="p-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 text-center">{success}</div>}
                
                <div className="grid grid-cols-2 gap-2">
                  {[UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN].map(r => (
                    <button key={r} type="button" onClick={() => setRegRole(r)} className={`py-3 text-[10px] font-bold uppercase rounded-xl border transition-all ${regRole === r ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                      {r.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm" placeholder="Full Name" required />
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm" placeholder="Work Email" required />

                {(regRole === UserRole.HOD || regRole === UserRole.TEACHER) && (
                  <select value={regDept} onChange={e => setRegDept(e.target.value as Department)} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm text-slate-600">
                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}

                <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all mt-2 active:scale-[0.98]">
                  Request Registration
                </button>
                <button type="button" onClick={() => setAuthMode('login')} className="w-full text-center text-sm font-medium text-slate-400 hover:text-slate-600 mt-2">Back to Login</button>
              </form>
            </div>
          )}
        </div>
        
        {/* Footer Info */}
        <p className="text-center mt-10 text-[10px] text-slate-400 uppercase tracking-widest font-bold">TrackNEnroll v4.5.0-PRO • No Card Required</p>
      </div>
    </div>
  );
};

export default AuthHub;
