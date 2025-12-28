
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
    if (!u.isApproved || u.registrationStatus !== 'approved') return false;
    if (u.id === currentUser.id) return false;
    if (searchTerm && !u.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) return true;
    if (u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN) return true;
    return u.department === currentUser.department;
  });

  const handleSend = () => {
    if (!inputText.trim() || !activePartnerId) return;
    sendMessage({
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderId: currentUser.id,
      receiverId: activePartnerId,
      text: inputText,
      timestamp: new Date().toISOString(),
      status: 'sent'
    });
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

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex h-full flex-col md:flex-row">
        {/* Contacts */}
        <div className={`flex-col bg-slate-50 border-r border-slate-100 h-full w-full md:w-80 lg:w-96 ${activePartnerId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 md:p-8 bg-indigo-600 text-white shrink-0">
            <h3 className="text-xl md:text-2xl font-black tracking-tight mb-4 uppercase">Messenger</h3>
            <div className="relative">
              <input type="text" placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-xs placeholder-white/50 outline-none focus:bg-white/20 transition-all" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scroll">
            {contacts.map(contact => {
              const unread = messages.filter(m => m.senderId === contact.id && m.receiverId === currentUser.id && m.status !== 'seen').length;
              return (
                <button key={contact.id} onClick={() => setActivePartnerId(contact.id)} className={`w-full p-4 flex items-center gap-3 rounded-2xl transition-all border ${activePartnerId === contact.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                  <img src={`https://ui-avatars.com/api/?name=${contact.name}&background=6366f1&color=fff&bold=true`} className="w-10 h-10 rounded-xl" alt="" />
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="font-black text-slate-900 text-xs truncate uppercase">{contact.name}</p>
                    <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest">{getRoleLabel(contact.role)}</p>
                  </div>
                  {unread > 0 && <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[9px] text-white font-black animate-pulse">{unread}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col h-full bg-[#f8fafc] ${!activePartnerId ? 'hidden md:flex' : 'flex'}`}>
          {!activePartnerId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select a faculty node to start communicating</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 md:p-6 border-b border-slate-100 flex items-center gap-4 bg-white shrink-0 z-10 shadow-sm">
                <button onClick={() => setActivePartnerId(null)} className="md:hidden p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <img src={`https://ui-avatars.com/api/?name=${activePartner?.name}&background=6366f1&color=fff&bold=true`} className="w-11 h-11 rounded-xl shadow-sm" alt="" />
                <div className="flex-1 overflow-hidden">
                  <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{activePartner?.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Connection Active</p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50/50 custom-scroll">
                {myMessages.map((m, i) => {
                  const isMine = m.senderId === currentUser.id;
                  return (
                    <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                      <div className="max-w-[85%] md:max-w-[70%] group">
                        <div className={`p-4 rounded-[1.5rem] shadow-sm relative ${
                          isMine 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                        }`}>
                          <p className="text-xs font-medium leading-relaxed">{m.text}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 mt-1.5 px-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <p className="text-[8px] font-black text-slate-400 uppercase">{formatTime(m.timestamp)}</p>
                          {isMine && (
                            <div className="flex items-center">
                              {m.status === 'seen' ? (
                                <svg className="w-3 h-3 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7m-12 0l4 4L19 7"/></svg>
                              ) : (
                                <svg className="w-3 h-3 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 md:p-6 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
                <input 
                  type="text" 
                  placeholder="Type your message..." 
                  value={inputText} 
                  onChange={e => setInputText(e.target.value)} 
                  onKeyPress={e => e.key === 'Enter' && handleSend()} 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all" 
                />
                <button 
                  onClick={handleSend} 
                  disabled={!inputText.trim()} 
                  className="w-12 h-12 bg-indigo-600 disabled:opacity-30 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200 active:scale-90 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
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
