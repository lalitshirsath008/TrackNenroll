
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
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
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
    
    if (user && (loginPass === 'admin123' || loginPass === 'password' || loginPass === '123456')) {
      if (!user.isApproved) {
        setError('Your account is not approved by Admin yet.');
      } else {
        onLogin(user);
      }
    } else {
      setError('Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (regName.trim().length < 3) {
      setError('Please enter your full name (min 3 letters).');
      return;
    }

    if (!regEmail.includes('@') || !regEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (regPass.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (regPass !== regConfirmPass) {
      setError('Passwords do not match. Please check again.');
      return;
    }

    setLoading(true);
    
    const existing = users.find(u => u.email.toLowerCase() === regEmail.toLowerCase());
    if (existing) {
      setError('This email is already registered.');
      setLoading(false);
      return;
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      role: regRole,
      department: (regRole === UserRole.HOD || regRole === UserRole.TEACHER) ? regDept : undefined,
      isApproved: false,
      registrationStatus: 'pending'
    };

    try {
      await registerUser(newUser);
      setSuccess('Request sent! Please wait for Admin approval.');
      setTimeout(() => {
        setAuthMode('login');
        setSuccess('');
        setRegName('');
        setRegEmail('');
        setRegPass('');
        setRegConfirmPass('');
      }, 3000);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-['Inter']">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl text-white font-black text-2xl shadow-lg mb-4">T</div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">TrackNEnroll</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Staff Access Portal</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10">
          {authMode === 'login' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Login</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Enter your details</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {error && <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-xl border border-rose-100 text-center">{error}</div>}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email ID</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 transition-all font-bold" placeholder="name@college.edu" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 transition-all font-bold" placeholder="••••••••" required />
                </div>

                <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] mt-4">
                  {loading ? 'Checking...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New here? <button onClick={() => setAuthMode('register')} className="text-indigo-600 font-black hover:underline ml-1">Create Account</button></p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Register</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Create your profile</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {success && <div className="p-4 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-xl border border-emerald-100 text-center">{success}</div>}
                {error && <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-xl border border-rose-100 text-center">{error}</div>}
                
                <div className="grid grid-cols-3 gap-2">
                  {[UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN].map(r => (
                    <button key={r} type="button" onClick={() => setRegRole(r)} className={`py-3 text-[9px] font-black uppercase rounded-xl border transition-all ${regRole === r ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      {r.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold" placeholder="Your Name" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email ID</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold" placeholder="name@college.edu" required />
                </div>

                {(regRole === UserRole.HOD || regRole === UserRole.TEACHER) && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                    <select value={regDept} onChange={e => setRegDept(e.target.value as Department)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700 appearance-none">
                      {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                    <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold" placeholder="••••••" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm</label>
                    <input type="password" value={regConfirmPass} onChange={e => setRegConfirmPass(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold" placeholder="••••••" required />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all mt-4 active:scale-[0.98]">
                  Submit Request
                </button>
                <button type="button" onClick={() => setAuthMode('login')} className="w-full text-center text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 mt-4">Back to Login</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthHub;
