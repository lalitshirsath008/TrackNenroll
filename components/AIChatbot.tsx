
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
    <div className="h-[calc(100vh-140px)] bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-500 font-['Inter']">
      {/* Header */}
      <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-xl shadow-indigo-900/20">T</div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-1">AI Assistant</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Active System Helper</p>
            </div>
          </div>
        </div>
        <div className="hidden md:block px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400">
          Institutional Neural Link
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50 custom-scroll">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center shadow-sm border border-slate-100 font-black text-indigo-600 text-3xl">?</div>
            <div>
              <p className="font-black text-[#1e293b] text-sm uppercase tracking-tight">How can I assist you today?</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 leading-relaxed tracking-wide">I can help with lead management, role permissions, and reporting.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-md pt-4">
              {SUGGESTIONS.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSend(s)}
                  className="text-left px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] md:max-w-[70%] p-5 rounded-[2rem] text-xs font-bold leading-relaxed shadow-sm tracking-tight ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-100 text-[#1e293b] rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 px-6 py-4 rounded-[1.5rem] rounded-tl-none flex gap-1.5 items-center">
               <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
               <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
               <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-8 bg-white border-t border-slate-100 flex gap-4 shrink-0">
        <input 
          type="text" 
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask a technical or system question..."
          className="flex-1 bg-slate-50 rounded-2xl px-6 py-4 text-[11px] font-bold outline-none border border-slate-200 focus:border-indigo-600 focus:bg-white transition-all shadow-inner placeholder:text-slate-300"
        />
        <button 
          onClick={() => handleSend()}
          disabled={!query.trim()}
          className="w-14 h-14 bg-[#0f172a] text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-slate-800 disabled:opacity-20 transition-all shrink-0 active:scale-95"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
};

export default AIChatbot;
