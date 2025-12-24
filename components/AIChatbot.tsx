import React, { useState, useEffect, useRef } from 'react';

interface PredefinedResponse {
  keywords: string[];
  response: string;
}

const KNOWLEDGE_BASE: PredefinedResponse[] = [
  {
    keywords: ['lead', 'student', 'data', 'entry'],
    response: "Leads can be added manually via the 'Add Lead' button on the Dashboard, or batch-imported using Excel/CSV files in the Admin panel."
  },
  {
    keywords: ['assign', 'delegate', 'forward'],
    response: "Admins assign leads to HODs. HODs then delegate those leads to specific Faculty members for counseling."
  },
  {
    keywords: ['verify', 'call', 'duration'],
    response: "Institutional protocol requires a minimum 10-second call duration for a lead to be marked as 'Verified' in the system."
  },
  {
    keywords: ['role', 'permission', 'hod', 'admin', 'principal'],
    response: "TrackNEnroll uses a hierarchy: Principal (Analytics), Admin (System/Leads), HOD (Department oversight), and Teacher (Direct Counseling)."
  },
  {
    keywords: ['report', 'export', 'pdf', 'excel'],
    response: "You can export audit reports in PDF, Excel, or CSV formats from the Dashboard header action buttons."
  },
  {
    keywords: ['help', 'start', 'how'],
    response: "Start by importing leads or checking your 'Awaiting Interaction' tab if you are a Faculty member. How can I assist with a specific module?"
  }
];

const SUGGESTIONS = [
  "How to add leads?",
  "Lead assignment logic",
  "Call verification rules",
  "Exporting reports"
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
    
    return match 
      ? match.response 
      : "I'm a rule-based assistant focused on TrackNEnroll. Try asking about 'leads', 'assignments', 'verification', or 'reports'.";
  };

  const handleSend = (text?: string) => {
    const userMsg = text || query;
    if (!userMsg.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuery('');
    setIsTyping(true);

    // Simulate natural "traditional" delay
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
          className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center gap-3 border-2 border-white/10 group"
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          </div>
          <span className="font-black text-[10px] uppercase tracking-[0.2em] pr-2">Support Node</span>
        </button>
      ) : (
        <div className="w-80 md:w-96 h-[500px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black">T</div>
              <div>
                <p className="font-black text-[10px] uppercase tracking-widest leading-none mb-1">TrackNEnroll</p>
                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Traditional Helper</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
          {/* Chat Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100">
                  <span className="text-3xl">👋</span>
                </div>
                <div>
                  <p className="font-black text-slate-900 text-sm uppercase">Institutional Assistant</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ready for predefined queries</p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full pt-4">
                  {SUGGESTIONS.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSend(s)}
                      className="text-left px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-tight text-slate-500 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] font-bold leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div className="p-6 bg-white border-t border-slate-100 flex gap-2">
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about leads, verification..."
              className="flex-1 bg-slate-50 rounded-2xl px-5 py-4 text-[11px] font-bold outline-none border border-slate-200 focus:border-indigo-600 transition-all placeholder:text-slate-300"
            />
            <button 
              onClick={() => handleSend()}
              disabled={!query.trim()}
              className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-20 transition-all shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatbot;