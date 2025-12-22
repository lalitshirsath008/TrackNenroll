
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
      id: Date.now().toString(),
      senderId: currentUser.id,
      receiverId: activePartnerId,
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    });
    setInputText('');
  };

  useEffect(() => {
    if (activePartnerId) markMessagesAsSeen(activePartnerId, currentUser.id);
  }, [activePartnerId, messages.length, currentUser.id, markMessagesAsSeen]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [myMessages.length]);

  const activePartner = users.find(u => u.id === activePartnerId);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex h-full flex-col md:flex-row">
        {/* Contacts */}
        <div className={`flex-col bg-slate-50 border-r border-slate-100 h-full w-full md:w-80 lg:w-96 ${activePartnerId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 md:p-8 bg-indigo-600 text-white shrink-0">
            <h3 className="text-xl md:text-2xl font-black tracking-tight mb-4 uppercase">Messenger</h3>
            <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm placeholder-white/50 outline-none" />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {contacts.map(contact => {
              const unread = messages.filter(m => m.senderId === contact.id && m.receiverId === currentUser.id && m.status !== 'seen').length;
              return (
                <button key={contact.id} onClick={() => setActivePartnerId(contact.id)} className={`w-full p-4 flex items-center gap-3 rounded-2xl transition-all border ${activePartnerId === contact.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}>
                  <img src={`https://ui-avatars.com/api/?name=${contact.name}&background=random`} className="w-10 h-10 rounded-xl" alt="" />
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="font-black text-slate-900 text-xs truncate uppercase">{contact.name}</p>
                    <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest">{getRoleLabel(contact.role)}</p>
                  </div>
                  {unread > 0 && <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[9px] text-white font-black">{unread}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat */}
        <div className={`flex-1 flex flex-col h-full ${!activePartnerId ? 'hidden md:flex' : 'flex'}`}>
          {!activePartnerId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/50"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select faculty to initiate</p></div>
          ) : (
            <>
              <div className="p-4 md:p-6 border-b border-slate-100 flex items-center gap-4 bg-white shrink-0">
                <button onClick={() => setActivePartnerId(null)} className="md:hidden p-2 bg-slate-100 rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg></button>
                <img src={`https://ui-avatars.com/api/?name=${activePartner?.name}&background=random`} className="w-10 h-10 rounded-xl" alt="" />
                <div className="flex-1 overflow-hidden"><p className="font-black text-slate-900 text-sm truncate uppercase">{activePartner?.name}</p><p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Live Node Active</p></div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 bg-slate-50/50">
                {myMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] md:max-w-[75%] p-4 rounded-2xl text-xs font-medium shadow-sm ${m.senderId === currentUser.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>{m.text}</div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
              <div className="p-4 md:p-6 bg-white border-t border-slate-100 flex items-center gap-2">
                <input type="text" placeholder="Type here..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                <button onClick={handleSend} disabled={!inputText.trim()} className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg></button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSystem;
