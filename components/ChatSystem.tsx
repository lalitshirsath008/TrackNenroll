
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, UserRole } from '../types';
import { useData } from '../context/DataContext';

interface ChatProps {
  currentUser: User;
}

const ChatSystem: React.FC<ChatProps> = ({ currentUser }) => {
  const { messages, sendMessage, deleteMessage, users, markMessagesAsSeen } = useData();
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

  const handleDelete = (msgId: string) => {
    if (window.confirm('Delete this message?')) {
      deleteMessage(msgId);
    }
  };

  // FIX: Added messages.length as a dependency to trigger seen status whenever new messages arrive
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
    <div className="flex flex-col h-[calc(100vh-100px)] bg-white rounded-3xl md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden font-['Inter']">
      <div className="flex h-full flex-col md:flex-row">
        {/* Contacts Sidebar */}
        <div className={`flex-col bg-[#fcfdfe] border-r border-slate-100 h-full w-full md:w-80 lg:w-96 ${activePartnerId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-8 pb-12 bg-[#4c47f5] text-white shrink-0 rounded-tl-[4rem] relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-3xl font-black tracking-tighter mb-6 uppercase leading-none">Messenger</h3>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search staff..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 text-xs placeholder-white/60 outline-none focus:bg-white/20 transition-all font-medium" 
                />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
            {contacts.map(contact => {
              const unread = messages.filter(m => m.senderId === contact.id && m.receiverId === currentUser.id && m.status !== 'seen').length;
              return (
                <button 
                  key={contact.id} 
                  onClick={() => setActivePartnerId(contact.id)} 
                  className={`w-full p-4 flex items-center gap-4 rounded-3xl transition-all group ${
                    activePartnerId === contact.id ? 'bg-[#f0f3ff]' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 bg-[#6366f1] rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100 overflow-hidden">
                    {contact.name.split(' ').length > 1 
                      ? contact.name.split(' ').slice(0,2).map(n => n[0]).join('')
                      : contact.name.slice(0,2).toUpperCase()
                    }
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="font-black text-[#1e293b] text-xs truncate uppercase tracking-tight">{contact.name}</p>
                    <p className="text-[9px] text-[#6366f1] font-black uppercase tracking-[0.15em] mt-0.5">{getRoleLabel(contact.role)}</p>
                  </div>
                  {unread > 0 && (
                    <div className="w-6 h-6 bg-[#ff4d6d] rounded-full flex items-center justify-center text-[10px] text-white font-black shadow-lg shadow-rose-200 animate-in zoom-in duration-300">
                      {unread}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col h-full bg-[#f8fafc] ${!activePartnerId ? 'hidden md:flex' : 'flex'}`}>
          {!activePartnerId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Institutional Secure Connection</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-5 md:p-6 border-b border-slate-100 flex items-center gap-4 bg-white shrink-0 z-10 shadow-sm">
                <button onClick={() => setActivePartnerId(null)} className="md:hidden p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-md">
                   {activePartner?.name.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-black text-[#0f172a] text-sm truncate uppercase tracking-tight">{activePartner?.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Active Link</p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-5 bg-slate-50/50 custom-scroll">
                {myMessages.map((m, i) => {
                  const isMine = m.senderId === currentUser.id;
                  return (
                    <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-200 group`}>
                      <div className="max-w-[90%] md:max-w-[75%] relative">
                        <div className={`px-5 py-4 rounded-[1.5rem] shadow-sm ${
                          isMine 
                            ? 'bg-[#4c47f5] text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                        }`}>
                          <p className="text-xs font-bold leading-relaxed">{m.text}</p>
                        </div>
                        <div className={`flex items-center gap-2 mt-1.5 px-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{formatTime(m.timestamp)}</p>
                          {isMine && (
                            <div className="flex items-center gap-1">
                              {m.status === 'seen' ? (
                                <svg className="w-3 h-3 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7m-12 0l4 4L19 7"/></svg>
                              ) : (
                                <svg className="w-3 h-3 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                              )}
                            </div>
                          )}
                          <button 
                            onClick={() => handleDelete(m.id)} 
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-300 hover:text-red-500"
                            title="Delete message"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Input Area */}
              <div className="p-5 md:p-6 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
                <input 
                  type="text" 
                  placeholder="Type message..." 
                  value={inputText} 
                  onChange={e => setInputText(e.target.value)} 
                  onKeyPress={e => e.key === 'Enter' && handleSend()} 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner" 
                />
                <button 
                  onClick={handleSend} 
                  disabled={!inputText.trim()} 
                  className="w-14 h-14 bg-[#4c47f5] disabled:opacity-30 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
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
