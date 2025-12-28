
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
  const [regDept, setRegDept] = useState<Department | ''>('');

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
        setError('Your account is not approved yet. Please wait.');
      } else {
        onLogin(user);
      }
    } else {
      setError('Wrong email or password.');
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (regName.trim().length < 3) {
      setError('Name is too short.');
      return;
    }

    if ((regRole === UserRole.HOD || regRole === UserRole.TEACHER) && !regDept) {
      setError('Please select your branch.');
      return;
    }

    if (regPass !== regConfirmPass) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      role: regRole,
      department: (regRole === UserRole.HOD || regRole === UserRole.TEACHER) ? (regDept as Department) : undefined,
      isApproved: false,
      registrationStatus: 'pending'
    };

    try {
      await registerUser(newUser);
      setSuccess('Request sent! Please wait for admin to approve.');
      setTimeout(() => {
        setAuthMode('login');
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Something went wrong. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-['Inter']">
      <div className="w-full max-w-sm">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0f172a] rounded-2xl text-white font-black text-2xl shadow-xl mb-4">T</div>
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">TrackNEnroll</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Staff Login Portal</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 p-10">
          {authMode === 'login' ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
              <h2 className="text-2xl font-black text-[#0f172a] uppercase text-center mb-8 tracking-tighter">Sign In</h2>
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black uppercase text-center rounded-2xl border border-red-100">{error}</div>}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                  <input 
                    type="email" 
                    value={loginEmail} 
                    onChange={e => setLoginEmail(e.target.value)} 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white text-sm font-bold transition-all" 
                    placeholder="email@college.com"
                    required 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input 
                    type="password" 
                    value={loginPass} 
                    onChange={e => setLoginPass(e.target.value)} 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white text-sm font-bold transition-all" 
                    placeholder="••••••••"
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 mt-6 transition-all active:scale-[0.98]"
                >
                  {loading ? 'Please Wait...' : 'Login'}
                </button>
              </form>
              
              <button 
                onClick={() => setAuthMode('register')} 
                className="w-full text-center text-[10px] font-black text-indigo-600 uppercase mt-8 tracking-widest hover:text-indigo-700 transition-colors"
              >
                Register / Create Account
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
              <h2 className="text-2xl font-black text-[#0f172a] uppercase text-center mb-8 tracking-tighter">Register</h2>
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {success && <div className="p-4 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase text-center rounded-2xl border border-emerald-100">{success}</div>}
                {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black uppercase text-center rounded-2xl border border-red-100">{error}</div>}
                
                <div className="grid grid-cols-3 gap-2">
                  {[UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN].map(r => (
                    <button 
                      key={r} 
                      type="button" 
                      onClick={() => setRegRole(r)} 
                      className={`py-3 text-[9px] font-black uppercase rounded-xl border transition-all ${
                        regRole === r 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}
                    >
                      {r === UserRole.TEACHER ? 'Teacher' : r === UserRole.HOD ? 'HOD' : 'Admin'}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold" placeholder="Your Name" required />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold" placeholder="name@college.com" required />
                </div>

                {(regRole === UserRole.HOD || regRole === UserRole.TEACHER) && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch / Department</label>
                    <select value={regDept} onChange={e => setRegDept(e.target.value as Department)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold appearance-none" required>
                      <option value="" disabled>Select Branch</option>
                      {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold" placeholder="Password" required />
                  <input type="password" value={regConfirmPass} onChange={e => setRegConfirmPass(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold" placeholder="Confirm" required />
                </div>

                <button type="submit" disabled={loading} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 mt-4 transition-all active:scale-[0.98]">
                  {loading ? 'Processing...' : 'Register Now'}
                </button>
                
                <button type="button" onClick={() => setAuthMode('login')} className="w-full text-center text-[10px] font-black text-slate-400 uppercase mt-4 tracking-widest">Back to Login</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthHub;
