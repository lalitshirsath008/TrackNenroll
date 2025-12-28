
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
        setError('Account awaiting institutional approval.');
      } else {
        onLogin(user);
      }
    } else {
      setError('Invalid credentials.');
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const existing = users.find(u => u.email.toLowerCase() === regEmail.toLowerCase());
    if (existing) {
      setError('Email already exists in the roster.');
      setLoading(false);
      return;
    }

    const newUser: User = {
      // Use more robust unique ID generation
      id: `u-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: regName,
      email: regEmail,
      role: regRole,
      department: (regRole === UserRole.HOD || regRole === UserRole.TEACHER) ? regDept : undefined,
      isApproved: false,
      registrationStatus: 'pending'
    };

    try {
      await registerUser(newUser);
      setSuccess('Institutional registration request transmitted.');
      setTimeout(() => {
        setAuthMode('login');
        setSuccess('');
        setRegName('');
        setRegEmail('');
      }, 3000);
    } catch (err) {
      setError('Transmission failed. Network error.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-['Inter']">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl text-white font-black text-2xl shadow-lg mb-4">T</div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">TrackNEnroll</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Institutional Access Node</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 p-10">
          {authMode === 'login' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Login</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Enter your credentials</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {(error || success) && (
                  <div className={`p-4 text-[10px] font-black uppercase tracking-widest rounded-xl border text-center ${error ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                    {error || success}
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email ID</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 transition-all font-bold" placeholder="name@college.edu" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Key</label>
                  <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 transition-all font-bold" placeholder="••••••••" required />
                </div>

                <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-[0.98] mt-4">
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New faculty? <button onClick={() => setAuthMode('register')} className="text-indigo-600 font-black hover:underline ml-1">Request Account</button></p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Register</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Profile Provisioning</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {success && <div className="p-4 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-100 text-center">{success}</div>}
                {error && <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-rose-100 text-center">{error}</div>}
                
                <div className="grid grid-cols-3 gap-2">
                  {[UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN].map(r => (
                    <button key={r} type="button" onClick={() => setRegRole(r)} className={`py-3 text-[9px] font-black uppercase rounded-xl border transition-all ${regRole === r ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      {r.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold" placeholder="Full Name" required />
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold" placeholder="Institutional Email" required />

                {(regRole === UserRole.HOD || regRole === UserRole.TEACHER) && (
                  <select value={regDept} onChange={e => setRegDept(e.target.value as Department)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700 appearance-none">
                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}

                <button type="submit" disabled={loading} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all mt-4 active:scale-[0.98]">
                  Submit Request
                </button>
                <button type="button" onClick={() => setAuthMode('login')} className="w-full text-center text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 mt-4">Back to Login</button>
              </form>
            </div>
          )}
        </div>
        
        <p className="text-center mt-10 text-[9px] text-slate-400 uppercase tracking-[0.3em] font-black">Data Synchronized • Secure Institutional Network</p>
      </div>
    </div>
  );
};

export default AuthHub;
