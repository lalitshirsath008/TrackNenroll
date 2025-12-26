import React, { useState, useMemo } from 'react';
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
  const { messages } = useData();

  const getRoleLabel = (role: UserRole) => {
    if (role === UserRole.SUPER_ADMIN) return 'Principal';
    if (role === UserRole.ADMIN) return 'Student Section';
    return role;
  };

  const unreadCount = useMemo(() => {
    return messages.filter(m => m.receiverId === user.id && m.status !== 'seen').length;
  }, [messages, user.id]);

  const getThemeColor = () => {
    switch (user.role) {
      case UserRole.SUPER_ADMIN: return 'bg-slate-900';
      case UserRole.ADMIN: return 'bg-indigo-900';
      case UserRole.HOD: return 'bg-teal-900';
      case UserRole.TEACHER: return 'bg-emerald-900';
      default: return 'bg-indigo-900';
    }
  };

  const menuItems: MenuItem[] = [
    { 
      path: '/dashboard', 
      label: user.role === UserRole.TEACHER ? 'Counseling' : 'Dashboard', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
      )
    },
  ];

  if (user.role === UserRole.SUPER_ADMIN) {
    menuItems.push({ 
      path: '/analytics', 
      label: 'Analytics', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> 
    });
  }

  menuItems.push({ 
    path: '/chat', 
    label: 'Chat', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
    ), 
    badge: unreadCount 
  });

  if (user.role === UserRole.ADMIN) {
    menuItems.push({ 
      path: '/users', 
      label: 'Staff', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg> 
    });
  }

  if (user.role === UserRole.ADMIN || user.role === UserRole.HOD) {
    menuItems.push({ 
      path: '/approvals', 
      label: 'Verify Users', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> 
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-['Inter']">
      {/* Mobile Top Header */}
      <header className={`md:hidden p-4 flex justify-between items-center sticky top-0 z-[100] shadow-md ${getThemeColor()} text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black">T</div>
          <span className="font-black text-lg tracking-tight">TrackNEnroll</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-3 bg-white/10 rounded-xl active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7"/></svg>
        </button>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 ${getThemeColor()} text-white flex flex-col z-[120] transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 hidden md:block">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black text-2xl">T</div>
             <h1 className="text-2xl font-black tracking-tight leading-none">TrackNEnroll</h1>
           </div>
           <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">v4.1.0 High Definition</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => (
            <button 
              key={item.path}
              onClick={() => { navigate(item.path); setIsSidebarOpen(false); }}
              className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all relative ${
                location.pathname === item.path ? 'bg-white text-slate-900 shadow-lg font-black' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
              {item.badge ? (
                <span className="absolute right-4 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={onLogout} className="w-full py-4 text-sm font-bold bg-white/5 hover:bg-white hover:text-slate-900 rounded-2xl transition-all">
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full p-4 md:p-10 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;