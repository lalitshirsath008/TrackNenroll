
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, UserRole } from '../types';
import { useData } from '../context/DataContext';

interface ChatProps {
  currentUser: User;
}

const ChatSystem: React.FC<ChatProps> = ({ currentUser }) => {
  const { messages, sendMessage, users, markMessagesAsSeen } = useData();
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const getRoleLabel = (role: UserRole) => {
    if (role === UserRole.SUPER_ADMIN) return 'Principal';
    if (role === UserRole.ADMIN) return 'Student Section';
    return role;
  };

  const myMessages = messages.filter(m => 
    (m.senderId === currentUser.id && m.receiverId === activePartnerId) || 
    (m.senderId === activePartnerId && m.receiverId === currentUser.id)
  );

  const contacts = users.filter(u => {
    // Only show approved users
    if (!u.isApproved || u.registrationStatus !== 'approved') return false;
    if (u.id === currentUser.id) return false;

    // Search filter
    if (searchTerm && !u.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

    // Principal (Super Admin) and Student Section (Admin) see everyone
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) return true;

    // Everyone sees Principal and Student Section
    if (u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN) return true;

    // Teachers/HODs see people in their own department
    return u.department === currentUser.department;
  });

  const handleSend = () => {
    if (!inputText.trim() || !activePartnerId) return;
    
    const newMsg: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      receiverId: activePartnerId,
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };
    
    sendMessage(newMsg);
    setInputText('');
  };

  useEffect(() => {
    if (activePartnerId) {
      markMessagesAsSeen(activePartnerId, currentUser.id);
    }
  }, [activePartnerId, messages.length, currentUser.id, markMessagesAsSeen]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [myMessages.length]);

  const activePartner = users.find(u => u.id === activePartnerId);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-500">
      <style>{`
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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
      <div className="flex h-full flex-col md:flex-row">
        {/* Contacts Sidebar */}
        <div className={`
          flex-col bg-slate-50 border-r border-slate-100 h-full w-full md:w-80 lg:w-96 
          ${activePartnerId ? 'hidden md:flex' : 'flex'}
        `}>
          <div className="p-8 bg-indigo-600 text-white shrink-0">
            <h3 className="text-2xl font-black tracking-tight mb-6">Messaging Hub</h3>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search faculty..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-sm placeholder-white/50 outline-none focus:bg-white/20 transition-all" 
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {contacts.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-white/50 m-4 rounded-[2rem] border border-dashed border-slate-200">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl">👤</div>
                <p className="text-[10px] font-black uppercase tracking-widest">No verified faculty</p>
                <p className="text-[9px] mt-2 font-bold leading-relaxed">Ensure new registrations are approved in the <span className="text-indigo-600">Approval Center</span> to enable messaging.</p>
              </div>
            ) : (
              contacts.map(contact => {
                const chatHistory = [...messages].reverse();
                const lastMsg = chatHistory.find(m => (m.senderId === contact.id && m.receiverId === currentUser.id) || (m.senderId === currentUser.id && m.receiverId === contact.id));
                const unreadCount = messages.filter(m => m.senderId === contact.id && m.receiverId === currentUser.id && m.status !== 'seen').length;
                
                return (
                  <button 
                    key={contact.id}
                    onClick={() => setActivePartnerId(contact.id)}
                    className={`
                      w-full p-5 flex items-center gap-4 rounded-[2rem] transition-all group border shadow-sm
                      ${activePartnerId === contact.id ? 'bg-indigo-50 border-indigo-100 ring-2 ring-indigo-500/10' : 'bg-white border-slate-100 hover:bg-slate-50 hover:shadow-md'}
                    `}
                  >
                    <div className="relative shrink-0">
                      <img src={`https://ui-avatars.com/api/?name=${contact.name}&background=random`} className="w-12 h-12 rounded-2xl" alt="" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="flex justify-between items-center">
                        <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{contact.name}</p>
                        <span className="text-[9px] text-slate-400 font-bold ml-2 whitespace-nowrap">{lastMsg?.timestamp || ''}</span>
                      </div>
                      <p className="text-[9px] text-indigo-600 font-black uppercase tracking-[0.15em] mb-1">{getRoleLabel(contact.role)}</p>
                      <p className={`text-xs truncate ${unreadCount > 0 ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                        {lastMsg?.text || 'No interaction history'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] text-white font-black shrink-0 shadow-lg shadow-indigo-100">
                        {unreadCount}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`
          flex-1 flex flex-col h-full bg-white relative
          ${!activePartnerId ? 'hidden md:flex' : 'flex'}
        `}>
          {!activePartnerId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/30">
              <div className="w-24 h-24 bg-indigo-50 text-indigo-400 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              </div>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Institutional Messenger</h4>
              <p className="max-w-xs mx-auto text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-loose">Select a faculty member from the sidebar to begin communication.</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-white shrink-0 shadow-sm z-10">
                <button 
                  onClick={() => setActivePartnerId(null)} 
                  className="md:hidden p-3 hover:bg-slate-100 rounded-2xl text-slate-500 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <div className="relative shrink-0">
                  <img src={`https://ui-avatars.com/api/?name=${activePartner?.name}&background=random`} className="w-12 h-12 rounded-2xl" alt="" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-black text-slate-900 text-lg leading-none truncate uppercase tracking-tight">{activePartner?.name}</p>
                  <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em] mt-2">
                    {getRoleLabel(activePartner?.role || UserRole.TEACHER)} • Active Session
                  </p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 bg-slate-50/50 custom-scrollbar">
                {myMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-20 h-20 bg-white border border-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-6 shadow-sm">
                       <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No existing conversation history</p>
                  </div>
                )}
                {myMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`
                      max-w-[85%] md:max-w-[70%] p-5 rounded-[2rem] shadow-sm text-sm font-medium 
                      ${m.senderId === currentUser.id 
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100' 
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}
                    `}>
                      {m.text}
                      <div className="flex items-center justify-end gap-2 mt-3 opacity-60">
                        <span className="text-[9px] font-black uppercase tracking-widest">{m.timestamp}</span>
                        {m.senderId === currentUser.id && (
                          <svg className={`w-3.5 h-3.5 ${m.status === 'seen' ? 'text-white' : 'text-indigo-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                            {m.status === 'seen' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 13l4 4L23 7" className="-ml-2" />}
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>

              <div className="p-8 bg-white border-t border-slate-100 flex items-center gap-4 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                <input 
                  type="text" 
                  placeholder="Communicate with faculty..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 ring-indigo-500 outline-none transition-all shadow-inner"
                />
                <button 
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="w-14 h-14 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center shadow-xl shadow-indigo-100 shrink-0"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSystem;
