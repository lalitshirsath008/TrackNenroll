
import React, { useState, useEffect, useRef } from 'react';

interface PredefinedResponse {
  keywords: string[];
  response: string;
}

const KNOWLEDGE_BASE: PredefinedResponse[] = [
  {
    keywords: ['lead', 'student', 'data', 'entry'],
    response: "Leads can be added manually via the 'Manual Entry' button on the Dashboard, or batch-imported using Excel/CSV files in the Admin panel."
  },
  {
    keywords: ['assign', 'delegate', 'forward'],
    response: "Admins assign leads to HODs. HODs then delegate those leads to specific Faculty members for counseling via the Central Console."
  },
  {
    keywords: ['verify', 'call', 'duration'],
    response: "Institutional protocol requires a minimum 10-second interaction duration for a lead to be marked as 'Verified' in the system."
  },
  {
    keywords: ['role', 'permission', 'hod', 'admin', 'principal'],
    response: "System hierarchy: Principal (Analytics), Admin (System/Leads), HOD (Department oversight), and Faculty (Direct Counseling)."
  },
  {
    keywords: ['report', 'export', 'pdf', 'excel'],
    response: "Audit reports can be exported in PDF, Excel, or CSV formats from the Management Actions panel on the Dashboard."
  },
  {
    keywords: ['help', 'start', 'how'],
    response: "You can initiate lead processing via the Counseling tab if you are a Faculty member, or manage staff through the Staff Portal if you are an Admin."
  }
];

const SUGGESTIONS = [
  "Provisioning Leads",
  "Assignment Protocol",
  "Interaction Metrics",
  "Dataset Exports"
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
    return match ? match.response : "Institutional knowledge base query failed. Please ask about 'leads', 'assignments', 'verification', or 'reports'.";
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
    <div className="fixed bottom-10 right-10 z-[100] font-['Inter']">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-[#0f172a] text-white p-5 rounded-3xl shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-4 border border-white/10 group"
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          </div>
          <span className="font-black text-[10px] uppercase tracking-[0.3em] pr-2">Support Node</span>
        </button>
      ) : (
        <div className="w-80 md:w-[400px] h-[600px] bg-white rounded-[3rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.4)] border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
          <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black">T</div>
              <div>
                <p className="font-black text-[10px] uppercase tracking-[0.2em] leading-none mb-1">TrackNEnroll</p>
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Institutional Support</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50 custom-scroll">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-sm border border-slate-100 font-black text-indigo-600 text-3xl">?</div>
                <div>
                  <p className="font-black text-[#1e293b] text-sm uppercase tracking-tight">Institutional Assistant</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-2 leading-relaxed">System ready for predefined node queries.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 w-full pt-6">
                  {SUGGESTIONS.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSend(s)}
                      className="text-left px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-5 rounded-[1.5rem] text-[11px] font-bold leading-relaxed shadow-sm uppercase tracking-tight ${
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
                <div className="bg-white border border-slate-100 px-6 py-4 rounded-[1.5rem] rounded-tl-none flex gap-1.5 items-center">
                   <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                   <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 bg-white border-t border-slate-100 flex gap-3">
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Query system..."
              className="flex-1 bg-slate-50 rounded-2xl px-6 py-5 text-[10px] font-black uppercase tracking-widest outline-none border border-slate-200 focus:border-indigo-600 transition-all placeholder:text-slate-300"
            />
            <button 
              onClick={() => handleSend()}
              disabled={!query.trim()}
              className="w-16 h-16 bg-[#0f172a] text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-200 hover:bg-slate-800 disabled:opacity-20 transition-all shrink-0"
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
