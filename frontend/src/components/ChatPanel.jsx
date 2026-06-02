import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User, Sparkles, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import ReactMarkdown from 'react-markdown';

const STARTER_QUESTIONS = [
  "Which region performed best?",
  "Why is the top candidate scored highest?",
  "Are there any cannibalization risks?",
  "Summarise the model insights.",
];

export default function ChatPanel() {
  const { chatOpen, toggleChat, sessionId, results } = useAppStore();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m the FranchiseIQ Assistant. I can analyze the current predictions, explain model scores, and help you find the best expansion strategy. Ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const messagesEndRef = useRef(null);

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
          history: messages.slice(1),
        }),
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
        for (const line of chunk.split('\n\n')) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'content_block_delta' && data.delta?.text) {
                assistantResponse += data.delta.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantResponse };
                  return updated;
                });
              } else if (data.error) throw new Error(data.error);
            } catch (e) { /* ignore parse errors */ }
          }
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '⚠️ Sorry, I couldn\'t connect to the AI service. Please ensure the API key is configured.' }
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
            className="fixed bottom-6 right-6 z-[1001] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-primary hover:scale-105 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #6C4CF1, #8B5CF6)' }}
          >
            <MessageSquare size={22} />
            <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-danger rounded-full border-2 border-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={`fixed z-[1002] bottom-6 right-6 bg-surface border border-border shadow-card-lg flex flex-col rounded-2xl transition-all duration-300 ${
              expanded ? 'w-[600px] h-[80vh]' : 'w-[380px] h-[580px]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border rounded-t-2xl bg-primary/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Sparkles size={15} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-ink leading-none">FranchiseIQ Assistant</h3>
                  <p className="text-[10px] text-ink-muted mt-0.5">Powered by Claude</p>
                </div>
                {/* Online indicator */}
                <span className="flex items-center gap-1 ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                  <span className="text-[10px] text-success font-medium">Online</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="btn-ghost p-1.5 rounded-lg"
                >
                  {expanded ? <Minimize2 size={15} className="text-ink-subtle" /> : <Maximize2 size={15} className="text-ink-subtle" />}
                </button>
                <button onClick={toggleChat} className="btn-ghost p-1.5 rounded-lg">
                  <X size={17} className="text-ink-subtle" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles size={12} className="text-primary" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-app-bg border border-border text-ink rounded-tl-sm'
                  }`}>
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-headings:text-ink prose-strong:text-ink prose-code:text-primary prose-code:bg-primary/8 prose-code:px-1 prose-code:rounded">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>

                  {m.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <User size={12} className="text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Loader2 size={12} className="text-primary animate-spin" />
                  </div>
                  <div className="bg-app-bg border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                    {[0, 150, 300].map((delay, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-border rounded-b-2xl bg-app-bg/50">
              {/* Starter questions */}
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {STARTER_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={(e) => handleSubmit(e, q)}
                      className="text-[10px] px-2.5 py-1.5 rounded-lg border border-primary/25 bg-primary/8 text-primary hover:bg-primary/15 transition-colors whitespace-nowrap font-medium"
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
                  placeholder="Ask about the predictions…"
                  disabled={loading}
                  className="input-field flex-1 py-2.5 text-sm disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-primary"
                >
                  <Send size={16} className={input.trim() && !loading ? 'translate-x-0.5' : ''} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
