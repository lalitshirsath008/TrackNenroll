
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
        setError('Your account is not approved by the admin yet.');
      } else {
        onLogin(user);
      }
    } else {
      setError('Wrong email or password. Please try again.');
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (regName.trim().length < 3) {
      setError('Name should be at least 3 letters.');
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
      setError('Passwords do not match.');
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
      setSuccess('Request sent! Please wait for the admin to approve.');
      setTimeout(() => {
        setAuthMode('login');
        setSuccess('');
        setRegName('');
        setRegEmail('');
        setRegPass('');
        setRegConfirmPass('');
      }, 3000);
    } catch (err) {
      setError('Network error. Please try again later.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-['Inter']">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 rounded-[2rem] text-white font-black text-3xl shadow-2xl mb-6">T</div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">TrackNEnroll</h1>
          <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.4em] mt-2">Institutional Node Access</p>
        </div>

        <div className="bg-white rounded-[3rem] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-12">
          {authMode === 'login' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Sign In</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">Institutional Clearance Required</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                {error && <div className="p-5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-rose-100 text-center">{error}</div>}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Work Email</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 transition-all font-bold text-slate-900" placeholder="name@college.edu" required />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Secure Password</label>
                  <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 transition-all font-bold text-slate-900" placeholder="••••••••" required />
                </div>

                <button type="submit" disabled={loading} className="w-full py-6 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-[0.98] mt-6">
                  {loading ? 'Authenticating...' : 'Authorize Login'}
                </button>
              </form>

              <div className="mt-10 pt-10 border-t border-slate-50 text-center">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Unregistered Node? <button onClick={() => setAuthMode('register')} className="text-indigo-600 font-black hover:underline ml-1">Create Access Request</button></p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Request Access</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">Provision Your Staff Profile</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                {success && <div className="p-5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-emerald-100 text-center">{success}</div>}
                {error && <div className="p-5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-rose-100 text-center">{error}</div>}
                
                <div className="grid grid-cols-3 gap-3">
                  {[UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN].map(r => (
                    <button key={r} type="button" onClick={() => setRegRole(r)} className={`py-4 text-[9px] font-black uppercase rounded-2xl border transition-all ${regRole === r ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      {r.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Identity Name</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold" placeholder="Your Name" required />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institutional Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold" placeholder="name@college.edu" required />
                </div>

                {(regRole === UserRole.HOD || regRole === UserRole.TEACHER) && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch (Department)</label>
                    <select value={regDept} onChange={e => setRegDept(e.target.value as Department)} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700 appearance-none">
                      {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                    <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full px-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold" placeholder="••••••" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verify</label>
                    <input type="password" value={regConfirmPass} onChange={e => setRegConfirmPass(e.target.value)} className="w-full px-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold" placeholder="••••••" required />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] transition-all mt-6 shadow-2xl active:scale-[0.98]">
                  Submit Request
                </button>
                <button type="button" onClick={() => setAuthMode('login')} className="w-full text-center text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 mt-6 tracking-widest">Already have an account? Login</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthHub;
