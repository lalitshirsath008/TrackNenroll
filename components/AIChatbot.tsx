
import React, { useState, useEffect, useRef } from 'react';

interface PredefinedResponse {
  keywords: string[];
  response: string;
}

const KNOWLEDGE_BASE: PredefinedResponse[] = [
  {
    keywords: ['lead', 'student', 'data', 'entry'],
    response: "You can add students manually using 'Add Student' button or upload Excel files."
  },
  {
    keywords: ['assign', 'delegate', 'forward'],
    response: "Admins give students to HODs. HODs then give them to Teachers for calling."
  },
  {
    keywords: ['verify', 'call', 'duration'],
    response: "A call must be at least 15 seconds long to be saved properly."
  },
  {
    keywords: ['role', 'permission', 'hod', 'admin', 'principal'],
    response: "Roles: Principal (View all stats), Admin (Manage system), HOD (Manage branch), Teacher (Call students)."
  },
  {
    keywords: ['report', 'export', 'pdf', 'excel'],
    response: "You can download reports in Excel or PDF from the dashboard."
  },
  {
    keywords: ['help', 'start', 'how'],
    response: "Click on 'Call Students' to start your work or 'Statistics' to see reports."
  }
];

const SUGGESTIONS = [
  "How to add students?",
  "How to assign work?",
  "Call rules",
  "Download reports"
];

const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const getTraditionalResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    const match = KNOWLEDGE_BASE.find(item => 
      item.keywords.some(keyword => lowerInput.includes(keyword))
    );
    return match ? match.response : "Sorry, I don't know that. Try asking about 'leads', 'calls', or 'reports'.";
  };

  const handleSend = (text?: string) => {
    const userMsg = text || query;
    if (!userMsg.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuery('');
    setIsTyping(true);
    setTimeout(() => {
      const response = getTraditionalResponse(userMsg);
      setMessages(prev => [...prev, { role: 'bot', text: response }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-['Inter']">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-[#0f172a] text-white p-2.5 rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3 border border-white/10 group"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          </div>
          <span className="font-black text-[9px] uppercase tracking-[0.2em] pr-2">Help</span>
        </button>
      ) : (
        <div className="w-72 md:w-[360px] h-[500px] bg-white rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.4)] border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
          <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xs">T</div>
              <div>
                <p className="font-black text-[9px] tracking-[0.1em] leading-none mb-1">TrackNEnroll</p>
                <p className="text-[8px] font-black text-emerald-400 uppercase">Support Bot</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scroll">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center shadow-sm border border-slate-100 font-black text-indigo-600 text-2xl">?</div>
                <div>
                  <p className="font-black text-[#1e293b] text-xs uppercase">Need Help?</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-relaxed">Ask anything about the system.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full pt-4">
                  {SUGGESTIONS.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSend(s)}
                      className="text-left px-5 py-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-[1.25rem] text-[10px] font-bold leading-relaxed shadow-sm uppercase tracking-tight ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-100 text-[#475569] rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 px-4 py-3 rounded-[1.25rem] rounded-tl-none flex gap-1 items-center">
                   <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></div>
                   <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                   <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-100 flex gap-2">
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Type here..."
              className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-widest outline-none border border-slate-200 focus:border-indigo-600 transition-all placeholder:text-slate-300"
            />
            <button 
              onClick={() => handleSend()}
              disabled={!query.trim()}
              className="w-12 h-12 bg-[#0f172a] text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-slate-800 disabled:opacity-20 transition-all shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatbot;
