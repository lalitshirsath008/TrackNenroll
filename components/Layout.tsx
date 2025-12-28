
import React, { useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { useData } from '../context/DataContext';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { messages, users } = useData();

  const getRoleLabel = (role: UserRole) => {
    if (role === UserRole.SUPER_ADMIN) return 'Principal';
    if (role === UserRole.ADMIN) return 'Admin';
    if (role === UserRole.HOD) return 'HOD';
    return 'Teacher';
  };

  // Precise unreadCount logic to prevent ghost badges
  const unreadCount = useMemo(() => {
    // Only count messages from users that are currently approved/valid
    const activeUserIds = new Set(users.filter(u => u.isApproved).map(u => u.id));
    return messages.filter(m => 
      m.receiverId === user.id && 
      m.status !== 'seen' && 
      activeUserIds.has(m.senderId)
    ).length;
  }, [messages, user.id, users]);

  const menuItems: MenuItem[] = [
    { 
      path: '/dashboard', 
      label: user.role === UserRole.TEACHER ? 'Calling Area' : 'Dashboard', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
      )
    },
  ];

  if (user.role === UserRole.SUPER_ADMIN) {
    menuItems.push({ 
      path: '/analytics', 
      label: 'Statistics', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> 
    });
  }

  menuItems.push({ 
    path: '/chat', 
    label: 'Messages', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>, 
    badge: unreadCount 
  });

  if (user.role === UserRole.ADMIN) {
    menuItems.push({ 
      path: '/users', 
      label: 'Manage Staff', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg> 
    });
    menuItems.push({ 
      path: '/approvals', 
      label: 'Approve Users', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> 
    });
  }

  return (
    <div className="flex h-screen bg-[#fcfdfe] overflow-hidden font-['Inter']">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-[110] backdrop-blur-sm md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      <aside className={`
        fixed md:sticky top-0 inset-y-0 left-0 z-[120] 
        w-64 md:w-80 bg-[#0f172a] text-white flex flex-col 
        transition-transform duration-300 md:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        shadow-2xl md:shadow-none h-screen
      `}>
        <div className="p-10 shrink-0">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-2xl text-[#0f172a] shadow-lg">T</div>
             <div className="flex flex-col">
               <h1 className="text-xl font-black tracking-tight leading-none">TrackNEnroll</h1>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5">Staff Portal</p>
             </div>
           </div>
        </div>
        
        <nav className="flex-1 px-6 py-2 space-y-2 overflow-y-auto custom-scroll">
          {menuItems.map((item) => (
            <button 
              key={item.path} 
              onClick={() => { navigate(item.path); setIsSidebarOpen(false); }} 
              className={`
                w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all duration-300
                ${location.pathname === item.path 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20 font-bold' 
                  : 'text-slate-500 hover:text-white hover:bg-white/5'}
              `}
            >
              <div className={location.pathname === item.path ? 'scale-110 transition-transform' : ''}>
                {item.icon}
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="ml-auto w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-red-900/20 animate-pulse">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-8 mt-auto">
          {/* Improved Visibility for Account Detail Bar */}
          <div className="p-6 bg-[#1a2336] rounded-[2.5rem] border border-white/10 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg border border-white/20">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-black text-white truncate leading-tight uppercase tracking-tight block">{user.name}</p>
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1.5">{getRoleLabel(user.role)}</p>
              </div>
            </div>
            
            <button 
              onClick={onLogout} 
              className="w-full py-4 bg-white/5 hover:bg-red-500 text-slate-300 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 active:scale-95 border border-white/5"
            >
              Log Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        <header className="md:hidden bg-[#0f172a] p-5 flex justify-between items-center sticky top-0 z-[100] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-[#0f172a] text-lg">T</div>
            <span className="font-black text-sm tracking-tight">TrackNEnroll</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white/5 rounded-xl active:scale-95 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7"/></svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-12 custom-scroll">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
