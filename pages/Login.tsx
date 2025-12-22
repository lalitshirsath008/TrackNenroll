
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
  
  const [isFlipped, setIsFlipped] = useState(location.pathname === '/register');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [regRole, setRegRole] = useState<UserRole>(UserRole.TEACHER);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDept, setRegDept] = useState<Department>(Department.IT);
  const [regPass, setRegPass] = useState('');

  useEffect(() => {
    setIsFlipped(location.pathname === '/register');
  }, [location.pathname]);

  const toggleFlip = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFlipped = !isFlipped;
    setIsFlipped(newFlipped);
    setTimeout(() => {
      navigate(newFlipped ? '/register' : '/login', { replace: true });
    }, 100);
  };

  const handleQuickLogin = (role: UserRole) => {
    const user = users.find(u => u.role === role && u.isApproved);
    if (user) onLogin(user);
    else setLoginError(`No approved demo user found for role: ${role}`);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email === loginEmail);
    if (user) {
      if (!user.isApproved) {
        setLoginError('Account pending approval.');
        return;
      }
      if (loginPass === 'admin123') onLogin(user);
      else setLoginError('Invalid password. Use "admin123".');
    } else {
      setLoginError('Identity not recognized.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    alert('Registration transmitted. Awaiting HOD/Admin authorization.');
    setIsFlipped(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 relative overflow-x-hidden font-['Inter']">
      <style>{`
        .perspective-container {
          perspective: 2500px;
          width: 100%;
          max-width: 1100px;
          z-index: 10;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.85s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .is-flipped {
          transform: rotateY(180deg);
        }
        .flip-card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          border-radius: 2rem;
          overflow: hidden;
          background: white;
          box-shadow: 0 40px 80px -20px rgba(0,0,0,0.6);
        }
        @media (min-width: 768px) {
          .flip-card-face {
            flex-direction: row;
            border-radius: 3.5rem;
          }
        }
        .flip-card-front {
          z-index: 10;
          transform: rotateY(0deg) translateZ(5px);
        }
        .flip-card-back {
          transform: rotateY(180deg) translateZ(5px);
        }
        .is-flipped .flip-card-back {
          z-index: 100;
          pointer-events: auto;
        }
        .is-flipped .flip-card-front {
          z-index: 1;
          pointer-events: none;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full blur-[120px] transition-all duration-1000 ${isFlipped ? 'bg-emerald-600/20' : 'bg-indigo-600/30'}`}></div>
        <div className={`absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[120px] transition-all duration-1000 ${isFlipped ? 'bg-indigo-600/10' : 'bg-emerald-600/10'}`}></div>
      </div>

      <div className="perspective-container h-[85vh] md:h-[680px]">
        <div className={`flip-card-inner h-full ${isFlipped ? 'is-flipped' : ''}`}>
          
          {/* FRONT SIDE: LOGIN */}
          <div className="flip-card-face flip-card-front border border-white/5">
            <div className="h-40 md:h-full md:w-[40%] bg-indigo-600 p-8 md:p-12 text-white flex flex-col justify-center md:justify-between relative overflow-hidden shrink-0">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-800 opacity-90"></div>
               <div className="relative z-10">
                 <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 text-2xl md:text-3xl font-black mb-4 md:mb-8 shadow-2xl">T</div>
                 <h1 className="text-2xl md:text-4xl font-black tracking-tighter leading-none uppercase">TrackNEnroll.</h1>
               </div>
               <p className="hidden md:block relative z-10 text-indigo-100/70 text-sm font-medium leading-relaxed">Secure terminal for high-precision student lead categorization and institutional growth metrics.</p>
            </div>
            <div className="flex-1 p-8 md:p-14 bg-white h-full overflow-y-auto custom-scrollbar">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-1 uppercase tracking-tight">Faculty Login</h2>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 md:mb-12">Institutional Portal v3.1</p>
              
              <form onSubmit={handleLoginSubmit} className="space-y-5 md:space-y-6">
                {loginError && <div className="p-4 bg-rose-50 text-rose-600 text-[10px] rounded-xl border border-rose-100 font-black uppercase flex items-center gap-3">! {loginError}</div>}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="faculty@college.edu" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Key</label>
                  <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="••••••••" required />
                </div>
                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all active:scale-[0.98]">Authenticate</button>
              </form>
              
              <p className="mt-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                No ID? <button type="button" onClick={toggleFlip} className="text-indigo-600 font-black decoration-2">Register Now</button>
              </p>
              
              <div className="mt-8 md:mt-12 pt-8 border-t border-slate-100 flex flex-wrap gap-2 justify-center">
                {[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HOD, UserRole.TEACHER].map(r => (
                  <button key={r} type="button" onClick={() => handleQuickLogin(r)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[8px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-all">{r.split(' ')[0]}</button>
                ))}
              </div>
            </div>
          </div>

          {/* BACK SIDE: REGISTER */}
          <div className="flip-card-face flip-card-back border border-white/5">
             <div className="h-40 md:h-full md:w-[40%] bg-emerald-600 p-8 md:p-12 text-white flex flex-col justify-center md:justify-between relative overflow-hidden shrink-0">
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-800 opacity-90"></div>
               <div className="relative z-10">
                 <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-600 text-2xl md:text-3xl font-black mb-4 md:mb-8 shadow-2xl">R</div>
                 <h1 className="text-2xl md:text-4xl font-black tracking-tighter leading-none uppercase">Registration.</h1>
               </div>
               <p className="hidden md:block relative z-10 text-emerald-100/70 text-sm font-medium leading-relaxed">Initialize your institutional identity within the TrackNEnroll ecosystem.</p>
            </div>
            <div className="flex-1 p-8 md:p-14 bg-white h-full overflow-y-auto custom-scrollbar">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-1 uppercase tracking-tight">New Profile</h2>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 md:mb-10">Identity Node Creation</p>
              
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[UserRole.ADMIN, UserRole.HOD, UserRole.TEACHER].map(r => (
                      <button key={r} type="button" onClick={() => setRegRole(r)} className={`py-3 text-[8px] md:text-[9px] font-black uppercase rounded-xl border-2 transition-all ${regRole === r ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{r.split(' ')[0]}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                    <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" placeholder="Dr. R. Mehta" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                    <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" placeholder="r@college.edu" required />
                  </div>
                </div>
                {(regRole === UserRole.HOD || regRole === UserRole.TEACHER) && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Department Branch</label>
                    <select value={regDept} onChange={e => setRegDept(e.target.value as Department)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-[10px] uppercase cursor-pointer">
                      {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all mt-4">Create Profile</button>
              </form>
              
              <p className="mt-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                Have Profile? <button type="button" onClick={toggleFlip} className="text-emerald-600 font-black decoration-2">Sign In</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthHub;
