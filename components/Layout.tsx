
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
  const { messages, exportSystemData, importSystemData } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRoleLabel = (role: UserRole) => {
    if (role === UserRole.SUPER_ADMIN) return 'Principal';
    if (role === UserRole.ADMIN) return 'Student Section';
    return role;
  };

  const unreadCount = useMemo(() => {
    return messages.filter(m => m.receiverId === user.id && m.status !== 'seen').length;
  }, [messages, user.id]);

  const menuItems: MenuItem[] = [
    { 
      path: '/dashboard', 
      label: user.role === UserRole.TEACHER ? 'Counseling' : 'Dashboard', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
      )
    },
  ];

  // Super Admin exclusive: Analytics
  if (user.role === UserRole.SUPER_ADMIN) {
    menuItems.push({ 
      path: '/analytics', 
      label: 'Global Analytics', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> 
    });
  }

  menuItems.push({ 
    path: '/chat', 
    label: 'Messenger', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>, 
    badge: unreadCount 
  });

  // Admin exclusive: Staff Portal & Approvals
  if (user.role === UserRole.ADMIN) {
    menuItems.push({ 
      path: '/users', 
      label: 'Staff Portal', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg> 
    });
    menuItems.push({ 
      path: '/approvals', 
      label: 'Approvals', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> 
    });
  }

  const handleExport = () => {
    const data = exportSystemData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Backup_${new Date().getTime()}.json`; a.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importSystemData(content);
      if (success) {
        alert('Database Restored!'); window.location.reload();
      } else {
        alert('Restore failed. Check file format.');
      }
    };
    reader.readAsText(file);
  };

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
        w-64 md:w-72 bg-[#0f172a] text-white flex flex-col 
        transition-transform duration-300 md:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        shadow-2xl md:shadow-none h-screen
      `}>
        <div className="p-6 md:p-8 shrink-0">
           <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-lg">T</div>
             <div className="flex flex-col">
               <h1 className="text-lg font-bold tracking-tight leading-none">TrackNEnroll</h1>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Admin Panel</p>
             </div>
           </div>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scroll">
          {menuItems.map((item) => (
            <button 
              key={item.path} 
              onClick={() => { navigate(item.path); setIsSidebarOpen(false); }} 
              className={`
                w-full text-left px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all duration-200
                ${location.pathname === item.path 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/10 font-semibold' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <div className={location.pathname === item.path ? 'scale-105 transition-transform' : ''}>
                {item.icon}
              </div>
              <span className="text-sm font-medium tracking-tight">{item.label}</span>
              {item.badge ? (
                <span className="ml-auto w-4.5 h-4.5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-4 md:p-6 mt-auto border-t border-white/5 bg-black/10">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-sm">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black text-white truncate leading-tight uppercase">{user.name}</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{getRoleLabel(user.role)}</p>
              </div>
            </div>
            
            <button 
              onClick={onLogout} 
              className="w-full py-2.5 bg-white/5 hover:bg-rose-500 text-slate-300 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300"
            >
              Sign Out
            </button>
          </div>
          
          {user.role === UserRole.SUPER_ADMIN && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleExport} className="py-2 bg-transparent border border-white/10 text-[8px] font-black uppercase text-slate-400 rounded-lg hover:text-white transition-all">Backup</button>
              <button onClick={() => fileInputRef.current?.click()} className="py-2 bg-transparent border border-white/10 text-[8px] font-black uppercase text-slate-400 rounded-lg hover:text-white transition-all">Restore</button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#fcfdfe]">
        <header className="md:hidden bg-[#0f172a] p-4 flex justify-between items-center sticky top-0 z-[100] text-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center font-bold text-sm">T</div>
            <span className="font-bold text-xs tracking-tight">TrackNEnroll</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 custom-scroll">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
