
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
        setError('Your account is not approved yet.');
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

    if (regRole === UserRole.HOD) {
      const existingHOD = users.find(u => u.role === UserRole.HOD && u.department === regDept);
      if (existingHOD) {
        setError(`HOD for ${regDept} already exists.`);
        return;
      }
    }

    setLoading(true);
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
      setSuccess('Request sent! Wait for approval.');
      setTimeout(() => {
        setAuthMode('login');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError('Error occurred.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 rounded-2xl text-white font-black text-xl shadow-xl mb-4">T</div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">TrackNEnroll</h1>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">Institutional Node</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-10">
          {authMode === 'login' ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-black text-slate-900 uppercase text-center mb-6">Sign In</h2>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {error && <div className="p-3 bg-rose-50 text-rose-600 text-[9px] font-black uppercase text-center rounded-xl">{error}</div>}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold" required />
                </div>
                <button type="submit" className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg mt-4 transition-all active:scale-95">
                  {loading ? 'Processing...' : 'Authorize'}
                </button>
              </form>
              <button onClick={() => setAuthMode('register')} className="w-full text-center text-[9px] font-black text-indigo-600 uppercase mt-6 tracking-widest hover:underline">New Request Access</button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-black text-slate-900 uppercase text-center mb-6">Register</h2>
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                {success && <div className="p-3 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase text-center rounded-xl">{success}</div>}
                {error && <div className="p-3 bg-rose-50 text-rose-600 text-[9px] font-black uppercase text-center rounded-xl">{error}</div>}
                
                <div className="grid grid-cols-3 gap-2">
                  {[UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN].map(r => (
                    <button key={r} type="button" onClick={() => setRegRole(r)} className={`py-2.5 text-[8px] font-black uppercase rounded-lg border ${regRole === r ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                      {r.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold" required />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold" required />
                </div>

                {(regRole === UserRole.HOD || regRole === UserRole.TEACHER) && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                    <select value={regDept} onChange={e => setRegDept(e.target.value as Department)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold">
                      {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold" placeholder="Password" required />
                  <input type="password" value={regConfirmPass} onChange={e => setRegConfirmPass(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold" placeholder="Confirm" required />
                </div>

                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase mt-4">Submit</button>
                <button type="button" onClick={() => setAuthMode('login')} className="w-full text-center text-[9px] font-black text-slate-400 uppercase mt-4 tracking-widest">Back to Login</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthHub;
