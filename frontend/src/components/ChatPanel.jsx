import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User, Sparkles, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import ReactMarkdown from 'react-markdown'; // Ensure this exists, or use basic HTML

const STARTER_QUESTIONS = [
  "Which region performed best?",
  "Why is the top candidate scored highest?",
  "Are there any cannibalization risks?",
  "Summarise the model insights."
];

export default function ChatPanel() {
  const { chatOpen, toggleChat, sessionId, results } = useAppStore();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am FranchiseIQ Assistant. I can analyze the current location predictions, explain model scores, and help you find the best expansion strategy. Ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!results) return null;

  const handleSubmit = async (e, forceText = null) => {
    e?.preventDefault();
    const text = forceText || input.trim();
    if (!text || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          history: messages.slice(1) // exclude initial greeting
        })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantResponse = '';

      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'content_block_delta' && data.delta?.text) {
                assistantResponse += data.delta.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1].content = assistantResponse;
                  return updated;
                });
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('JSON parse error in SSE:', e, dataStr);
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: '⚠️ Sorry, I encountered an error connecting to the AI service. Please make sure the Anthropic API key is configured on the backend.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={toggleChat}
            className="fixed bottom-6 right-6 z-[1001] w-14 h-14 rounded-full bg-gradient-to-r from-purple to-purple-light shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-white border-2 border-white/10"
          >
            <MessageSquare size={24} />
            <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-[#0f0f1a]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed z-[1002] bottom-6 right-6 bg-void/95 backdrop-blur-xl border border-purple/30 shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(124,58,237,0.2)] flex flex-col transition-all duration-300 ${
              expanded 
                ? 'w-[600px] h-[80vh] rounded-2xl' 
                : 'w-[380px] h-[600px] rounded-2xl'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-purple/20 to-transparent rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple/20 flex items-center justify-center border border-purple/30">
                  <Sparkles size={16} className="text-purple-light" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">FranchiseIQ Assistant</h3>
                  <p className="text-[10px] text-slate-400">Powered by Claude</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-slate-400 hover:bg-white/10 rounded-lg transition-colors">
                  {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button onClick={toggleChat} className="p-1.5 text-slate-400 hover:bg-white/10 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded bg-purple/20 border border-purple/30 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles size={12} className="text-purple-light" />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user' 
                      ? 'bg-purple text-white rounded-tr-sm' 
                      : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm'
                  }`}>
                    {m.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/20 prose-pre:border prose-pre:border-white/10">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                  
                  {m.role === 'user' && (
                    <div className="w-7 h-7 rounded bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-1">
                      <User size={12} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded bg-purple/20 border border-purple/30 flex items-center justify-center shrink-0 mt-1">
                    <Loader2 size={12} className="text-purple-light animate-spin" />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                    <div className="w-2 h-2 bg-purple-light rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-light rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-light rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/[0.02] border-t border-white/10 rounded-b-2xl">
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {STARTER_QUESTIONS.map((q, i) => (
                    <button 
                      key={i} 
                      onClick={(e) => handleSubmit(e, q)}
                      className="text-[10px] px-2.5 py-1.5 rounded-full border border-purple/30 bg-purple/10 text-purple-light hover:bg-purple/20 transition-colors whitespace-nowrap"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about the predictions..."
                  disabled={loading}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-11 h-11 rounded-xl bg-purple text-white flex items-center justify-center hover:bg-purple-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Send size={18} className={input.trim() && !loading ? 'translate-x-0.5' : ''} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
