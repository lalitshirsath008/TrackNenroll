
import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { useData } from '../context/DataContext';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { messages, users } = useData();

  const getRoleLabel = (role: UserRole) => {
    if (role === UserRole.SUPER_ADMIN) return 'Principal';
    if (role === UserRole.ADMIN) return 'Student Section';
    return role;
  };

  const unreadCount = useMemo(() => {
    return messages.filter(m => m.receiverId === user.id && m.status !== 'seen').length;
  }, [messages, user.id]);

  const pendingApprovals = useMemo(() => {
    return users.filter(u => {
      if (user.role === UserRole.ADMIN) return u.role === UserRole.HOD && u.registrationStatus === 'pending';
      if (user.role === UserRole.HOD) return u.role === UserRole.TEACHER && u.department === user.department && u.registrationStatus === 'pending';
      return false;
    }).length;
  }, [users, user]);

  const getThemeColor = () => {
    switch (user.role) {
      case UserRole.SUPER_ADMIN: return 'bg-slate-900';
      case UserRole.ADMIN: return 'bg-indigo-900';
      case UserRole.HOD: return 'bg-teal-900';
      case UserRole.TEACHER: return 'bg-emerald-900';
      default: return 'bg-indigo-900';
    }
  };

  const NavContent = () => (
    <>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-xl">T</div>
          <h1 className="text-xl font-black tracking-tight leading-none">TrackNEnroll</h1>
        </div>
        <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter leading-tight">Student Admission Categorization System</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 py-4">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 px-2">Designation: {getRoleLabel(user.role)}</div>
        
        <button 
          onClick={() => { navigate('/dashboard'); setIsSidebarOpen(false); }}
          className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
            location.pathname === '/dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          {user.role === UserRole.SUPER_ADMIN ? 'Live Feed' : 'Dashboard'}
        </button>

        {(user.role === UserRole.ADMIN) && (
          <button 
            onClick={() => { navigate('/users'); setIsSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
              location.pathname === '/users' ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            User Management
          </button>
        )}

        {(user.role === UserRole.ADMIN || user.role === UserRole.HOD) && (
          <button 
            onClick={() => { navigate('/approvals'); setIsSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all relative ${
              location.pathname === '/approvals' ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            Approval Center
            {pendingApprovals > 0 && (
              <span className="absolute right-4 top-3 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg">
                {pendingApprovals}
              </span>
            )}
          </button>
        )}

        {user.role === UserRole.SUPER_ADMIN && (
          <button 
            onClick={() => { navigate('/analytics'); setIsSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
              location.pathname === '/analytics' ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            Global Analytics
          </button>
        )}

        <button 
          onClick={() => { navigate('/chat'); setIsSidebarOpen(false); }}
          className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all relative ${
            location.pathname === '/chat' ? 'bg-white/20' : 'hover:bg-white/10'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          Faculty Chat
          {unreadCount > 0 && (
            <span className="absolute right-4 top-3 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold animate-bounce shadow-lg">
              {unreadCount}
            </span>
          )}
        </button>
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-4">
          <img src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} className="w-10 h-10 rounded-full" alt="User" />
          <div className="overflow-hidden">
            <p className="font-semibold truncate text-sm">{user.name}</p>
            <p className="text-[10px] text-white/50 truncate uppercase tracking-widest">{user.department || 'Office'}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all font-medium border border-red-500/20 text-xs"
        >
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-x-hidden">
      <header className={`md:hidden p-4 flex justify-between items-center sticky top-0 z-[60] shadow-md ${getThemeColor()} text-white`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center font-bold text-lg">T</div>
          <span className="font-black text-sm tracking-tight uppercase">TrackNEnroll</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-white/10 rounded-lg"
        >
          {isSidebarOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
          )}
        </button>
      </header>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[70] md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 w-64 ${getThemeColor()} text-white flex flex-col z-[80]
        transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:h-screen sticky top-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        <NavContent />
      </aside>

      <main className="flex-1 w-full min-h-screen relative p-4 md:p-8 max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
