import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole, Department } from '../types';
import { useData } from '../context/DataContext';

interface LoginProps {
  onLogin: (user: User) => void;
}

const AuthHub: React.FC<LoginProps> = ({ onLogin }) => {
  const { users, registerUser } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isRegistering, setIsRegistering] = useState(location.pathname === '/register');
  
  // Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.TEACHER);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDept, setRegDept] = useState<Department>(Department.IT);

  // Error States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    setIsRegistering(location.pathname === '/register');
    setErrors({});
    setGeneralError('');
  }, [location.pathname]);

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    const newMode = !isRegistering;
    setIsRegistering(newMode);
    navigate(newMode ? '/register' : '/login', { replace: true });
  };

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleQuickLogin = (role: UserRole) => {
    const user = users.find(u => u.role === role && u.isApproved);
    if (user) onLogin(user);
    else setGeneralError(`No approved user found for: ${role}`);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    const newErrors: { [key: string]: string } = {};
    if (!validateEmail(loginEmail)) newErrors.loginEmail = 'Please enter a valid email address.';
    if (loginPass.length < 6) newErrors.loginPass = 'Password must be at least 6 characters.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const user = users.find(u => u.email === loginEmail);
    if (user) {
      if (!user.isApproved) {
        setGeneralError('Your account is still waiting for approval.');
        return;
      }
      if (loginPass === 'admin123') onLogin(user);
      else setGeneralError('Wrong password. Please use "admin123" for demo.');
    } else {
      setGeneralError('We could not find an account with this email.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    const newErrors: { [key: string]: string } = {};
    if (regName.trim().length < 3) newErrors.regName = 'Name is too short.';
    if (!validateEmail(regEmail)) newErrors.regEmail = 'Invalid email format.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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
    registerUser(newUser);
    alert('Request sent! Please wait for an admin to approve your profile.');
    setIsRegistering(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 font-['Inter']">
      <div className="w-full max-w-[950px] flex flex-col md:flex-row bg-[#0f172a] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Branding Side */}
        <div className="w-full md:w-[40%] bg-emerald-600 p-10 md:p-14 flex flex-col justify-between text-white border-r border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div>
            <div className="w-14 h-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center font-black text-3xl shadow-md mb-10">T</div>
            <h1 className="text-5xl font-black tracking-tight leading-tight">
              TrackNEnroll
            </h1>
            <div className="h-1.5 w-16 bg-white/30 mt-6 rounded-full"></div>
            <p className="text-white/90 text-base font-medium mt-8 leading-relaxed">
              Managing student admissions is now easy and clean.
            </p>
          </div>
          <div className="hidden md:block">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">High Pixel Definition v4.1</p>
          </div>
        </div>

        {/* Form Side */}
        <div className="flex-1 p-8 md:p-14 bg-slate-900 flex flex-col justify-center overflow-y-auto">
          {!isRegistering ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-4xl font-black text-white tracking-tight">Login</h2>
              <p className="text-sm text-slate-400 mt-2 mb-10">Welcome back! Please sign in.</p>

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                {generalError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-xl">
                    {generalError}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                  <input 
                    type="email" 
                    value={loginEmail} 
                    onChange={e => setLoginEmail(e.target.value)}
                    className={`w-full px-6 py-4 bg-white/[0.03] border ${errors.loginEmail ? 'border-rose-500' : 'border-white/10'} rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm`}
                    placeholder="you@college.com" 
                  />
                  {errors.loginEmail && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.loginEmail}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                  <input 
                    type="password" 
                    value={loginPass} 
                    onChange={e => setLoginPass(e.target.value)}
                    className={`w-full px-6 py-4 bg-white/[0.03] border ${errors.loginPass ? 'border-rose-500' : 'border-white/10'} rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm`}
                    placeholder="Enter password" 
                  />
                  {errors.loginPass && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.loginPass}</p>}
                </div>

                <button type="submit" className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all mt-4 active:scale-[0.98]">
                  Sign In
                </button>
              </form>

              <div className="mt-10 pt-10 border-t border-white/5 flex flex-col items-center">
                <p className="text-xs font-medium text-slate-500">
                  New here? <button onClick={toggleMode} className="text-emerald-500 font-bold hover:underline">Create an account</button>
                </p>
                <div className="mt-8 flex flex-wrap gap-2 justify-center opacity-30">
                  {[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HOD, UserRole.TEACHER].map(r => (
                    <button key={r} onClick={() => handleQuickLogin(r)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-white hover:border-emerald-500 transition-all">
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <h2 className="text-4xl font-black text-white tracking-tight">Register</h2>
              <p className="text-sm text-slate-400 mt-2 mb-8">Join the TrackNEnroll team</p>

              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Your Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[UserRole.ADMIN, UserRole.HOD, UserRole.TEACHER].map(r => (
                      <button 
                        key={r} 
                        type="button" 
                        onClick={() => setRegRole(r)}
                        className={`py-4 text-[9px] font-black uppercase rounded-xl border transition-all ${regRole === r ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-white/5 border-white/10 text-white/40'}`}
                      >
                        {r.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={regName} 
                    onChange={e => setRegName(e.target.value)}
                    className={`w-full px-6 py-4 bg-white/[0.03] border ${errors.regName ? 'border-rose-500' : 'border-white/10'} rounded-xl text-white outline-none focus:border-emerald-500 text-sm`}
                    placeholder="Enter your name" 
                  />
                  {errors.regName && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.regName}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                  <input 
                    type="email" 
                    value={regEmail} 
                    onChange={e => setRegEmail(e.target.value)}
                    className={`w-full px-6 py-4 bg-white/[0.03] border ${errors.regEmail ? 'border-rose-500' : 'border-white/10'} rounded-xl text-white outline-none focus:border-emerald-500 text-sm`}
                    placeholder="Enter email" 
                  />
                  {errors.regEmail && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.regEmail}</p>}
                </div>

                {(regRole === UserRole.HOD || regRole === UserRole.TEACHER) && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Department</label>
                    <select 
                      value={regDept} 
                      onChange={e => setRegDept(e.target.value as Department)}
                      className="w-full px-6 py-4 bg-slate-900 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 text-xs appearance-none cursor-pointer"
                    >
                      {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}

                <button type="submit" className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all mt-4 active:scale-[0.98]">
                  Register Profile
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-white/5 text-center">
                <p className="text-xs font-medium text-slate-500">
                  Already a member? <button onClick={toggleMode} className="text-emerald-500 font-bold hover:underline">Sign In</button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthHub;