
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
  
  // State for Flip
  const [isFlipped, setIsFlipped] = useState(location.pathname === '/register');
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register Form States
  const [regRole, setRegRole] = useState<UserRole>(UserRole.TEACHER);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDept, setRegDept] = useState<Department>(Department.IT);
  const [regPass, setRegPass] = useState('');

  // Sync state with URL if user uses browser back/forward
  useEffect(() => {
    setIsFlipped(location.pathname === '/register');
  }, [location.pathname]);

  const toggleFlip = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFlipped = !isFlipped;
    setIsFlipped(newFlipped);
    
    // We update the URL to keep history in sync, but the animation is handled by local state
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
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 relative overflow-hidden font-['Inter']">
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
          border-radius: 3rem;
          overflow: hidden;
          background: white;
          box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5);
          transition: transform 0.85s cubic-bezier(0.4, 0, 0.2, 1), z-index 0.85s step-end;
        }
        .flip-card-front {
          z-index: 10;
          transform: rotateY(0deg) translateZ(5px);
          pointer-events: auto;
        }
        .flip-card-back {
          z-index: 5;
          transform: rotateY(180deg) translateZ(0px);
          pointer-events: none;
        }
        /* When flipped, the back face must be physically closer to the user to receive clicks */
        .is-flipped .flip-card-back {
          z-index: 100;
          transform: rotateY(180deg) translateZ(10px);
          pointer-events: auto;
        }
        .is-flipped .flip-card-front {
          z-index: 1;
          pointer-events: none;
          transform: rotateY(0deg) translateZ(-10px);
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>

      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 transition-colors duration-1000">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] transition-all duration-1000 ${isFlipped ? 'bg-emerald-600/20' : 'bg-indigo-600/30'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] transition-all duration-1000 ${isFlipped ? 'bg-indigo-600/10' : 'bg-emerald-600/10'}`}></div>
      </div>

      <div className="perspective-container h-[780px] md:h-[650px]">
        <div className={`flip-card-inner h-full ${isFlipped ? 'is-flipped' : ''}`}>
          
          {/* FRONT SIDE: LOGIN */}
          <div className="flip-card-face flip-card-front border border-white/10">
            {/* Left Hero */}
            <div className="md:w-[42%] bg-indigo-600 p-10 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-800 opacity-90"></div>
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
               <div className="relative z-10">
                 <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 text-3xl font-black mb-8 shadow-2xl">T</div>
                 <h1 className="text-4xl font-black tracking-tighter leading-none uppercase">TrackNEnroll.</h1>
                 <p className="mt-6 text-indigo-100/70 text-sm font-medium leading-relaxed">Secure terminal for high-precision student lead categorization and institutional growth metrics.</p>
               </div>
               <div className="relative z-10 pt-8 border-t border-white/10 flex justify-between items-end">
                 <div><p className="text-[9px] font-black uppercase tracking-widest opacity-50">Security Module</p><p className="text-lg font-bold">Faculty Authenticator</p></div>
                 <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping mb-2"></div>
               </div>
            </div>
            {/* Right Form */}
            <div className="flex-1 p-10 lg:p-14 flex flex-col justify-center bg-white h-full overflow-y-auto custom-scrollbar">
              <h2 className="text-3xl font-black text-slate-900 mb-1 tracking-tight uppercase">Faculty Login</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Access Institutional Control Center</p>
              
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                {loginError && <div className="p-4 bg-rose-50 text-rose-600 text-[11px] rounded-xl border border-rose-100 font-black uppercase flex items-center gap-3"><span className="w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center">!</span>{loginError}</div>}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity (Work Email)</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 transition-all focus:ring-2 focus:ring-indigo-500 shadow-sm" placeholder="faculty@college.edu" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Key</label>
                  <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 transition-all focus:ring-2 focus:ring-indigo-500 shadow-sm" placeholder="••••••••" required />
                </div>
                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-[0.98]">Authenticate Portal</button>
              </form>
              
              <div className="mt-8 text-center">
                <p className="text-sm font-medium text-slate-400">
                  New faculty member? <button type="button" onClick={toggleFlip} className="text-indigo-600 font-black hover:underline underline-offset-4 decoration-2 focus:outline-none cursor-pointer">Register Profile</button>
                </p>
              </div>
              
              <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-4 gap-2">
                {[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HOD, UserRole.TEACHER].map(r => (
                  <button key={r} type="button" onClick={() => handleQuickLogin(r)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[8px] font-black uppercase text-slate-400 hover:border-indigo-500 hover:text-indigo-600 transition-all">{r.split(' ')[0]}</button>
                ))}
              </div>
            </div>
          </div>

          {/* BACK SIDE: REGISTER */}
          <div className="flip-card-face flip-card-back border border-white/10">
             {/* Left Hero (Reverse) */}
             <div className="md:w-[42%] bg-emerald-600 p-10 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-800 opacity-90"></div>
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
               <div className="relative z-10">
                 <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-600 text-3xl font-black mb-8 shadow-2xl">R</div>
                 <h1 className="text-4xl font-black tracking-tighter leading-none uppercase">Registration.</h1>
                 <p className="mt-6 text-emerald-100/70 text-sm font-medium leading-relaxed">Initialize your institutional identity within the TrackNEnroll ecosystem for delegated workflow management.</p>
               </div>
               <div className="relative z-10 pt-8 border-t border-white/10">
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Security Status</p>
                 <p className="text-lg font-bold">Encrypted Node Transfer</p>
               </div>
            </div>
            {/* Right Form */}
            <div className="flex-1 p-10 lg:p-14 flex flex-col justify-center bg-white h-full overflow-y-auto custom-scrollbar">
              <h2 className="text-3xl font-black text-slate-900 mb-1 tracking-tight uppercase">Join Faculty</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Establish Institutional Identity</p>
              
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[UserRole.ADMIN, UserRole.HOD, UserRole.TEACHER].map(r => (
                      <button key={r} type="button" onClick={() => setRegRole(r)} className={`py-3 text-[9px] font-black uppercase rounded-xl border-2 transition-all ${regRole === r ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" placeholder="Dr. Rajesh Mehta" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                    <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" placeholder="rajesh@college.edu" required />
                  </div>
                </div>
                {(regRole === UserRole.HOD || regRole === UserRole.TEACHER) && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Allocated Department</label>
                    <select value={regDept} onChange={e => setRegDept(e.target.value as Department)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-[10px] uppercase cursor-pointer">
                      {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Key</label>
                   <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" placeholder="••••••••" required />
                </div>
                <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-emerald-700 transition-all mt-4">Broadcast Identity</button>
              </form>
              
              <div className="mt-8 text-center">
                <p className="text-sm font-medium text-slate-400">
                  Already institutionalized? <button type="button" onClick={toggleFlip} className="text-emerald-600 font-black hover:underline underline-offset-4 decoration-2 focus:outline-none cursor-pointer">Sign In Portal</button>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AuthHub;
