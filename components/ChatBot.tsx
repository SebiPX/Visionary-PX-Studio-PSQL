import React, { useState, useEffect, useRef, useCallback } from 'react';

import ReactMarkdown from 'react-markdown';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import { ChatSession } from '../types';
import { geminiProxy, getToken } from '../lib/apiClient';

// ── Onboarding RAG helpers ─────────────────────────────────────────────────
const EMBED_MODEL = 'gemini-embedding-001';

async function embedText(text: string): Promise<number[]> {
  const response = await geminiProxy({
    action: 'embedContent',
    model: EMBED_MODEL,
    contents: text
  }) as any;

  if (response?.error) {
    throw new Error(`Embed API error: ${JSON.stringify(response.error)}`);
  }

  return response.embedding.values as number[];
}

async function retrieveOnboardingContext(question: string): Promise<string> {
  try {
    const embedding = await embedText(question);
    // Call labs-api RAG endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const token = getToken();
    const res = await fetch(`${apiUrl}/api/rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ embedding, match_count: 5 }),
    });
    if (!res.ok) return '';
    const data = await res.json() as { heading: string; content: string }[];
    if (!data?.length) return '';
    return data.map(r => `### ${r.heading}\n${r.content}`).join('\n\n');
  } catch (err) {
    console.warn('[OnboardingRAG] retrieval failed:', err);
    return '';
  }
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface Persona {
  id: string;
  name: string;
  icon: string;
  desc: string;
  instruction: string;
}

const PERSONAS: Persona[] = [
  {
    id: 'analysis',
    name: 'Medien-Analyst',
    icon: 'palette',
    desc: 'Helps with brainstorming and art direction.',
    instruction: 'You are a highly creative art director and brainstorming partner. Your goal is to inspire, generate vivid ideas, and help refine artistic concepts for videos, images, and designs. Keep responses enthusiastic and visual.'
  },
  {
    id: 'coding',
    name: 'DevX Assistant',
    icon: 'terminal',
    desc: 'Assistance with coding and technical details.',
    instruction: 'You are a senior software engineer and technical expert. Provide concise, accurate, and efficient solutions. Use code blocks where necessary.'
  },
  {
    id: 'content',
    name: 'Content Stratege',
    icon: 'trending_up',
    desc: 'Strategy for social media and growth.',
    instruction: 'You are a digital marketing strategist. Focus on engagement, hooks, social media trends, and audience growth strategies. Keep advice actionable and data-driven.'
  },
  {
    id: 'marketing',
    name: 'Marketing & SEO Pro',
    icon: 'campaign',
    desc: 'Marketing specialist and SEO expert.',
    instruction: 'You are a marketing specialist and SEO professional. Provide expert advice on digital marketing strategies, SEO optimization, keyword research, content marketing, conversion optimization, and analytics. Focus on practical, results-driven recommendations with current best practices.'
  },
  {
    id: 'normal',
    name: 'Gemini General',
    icon: 'auto_awesome',
    desc: 'General purpose assistant.',
    instruction: 'You are Visionary AI, a helpful, futuristic assistant integrated into a creative studio suite. You are polite, professional, and knowledgeable about all topics.'
  },
  {
    id: 'onboarding',
    name: 'Onboarding Support',
    icon: 'support_agent',
    desc: 'Helps with onboarding and getting started.',
    instruction: 'You are a friendly onboarding assistant. Help users get started with the platform, answer questions about features, and guide them through their first steps.'
  }
];

export const ChatBot: React.FC = () => {
  const { saveChat, loadChatSessions } = useGeneratedContent();
  const [activePersona, setActivePersona] = useState<Persona>(PERSONAS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat sessions from database
  const loadSessions = useCallback(async () => {
    const result = await loadChatSessions(20);
    if (result.success && result.data) {
      setChatSessions(result.data as ChatSession[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only load once on mount

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Save current chat session
  const saveCurrentSession = async () => {
    if (messages.length < 2) return; // Need at least one exchange

    const title = messages.find(m => m.role === 'user')?.text.slice(0, 50) || 'Untitled Chat';

    await saveChat({
      title,
      bot_id: activePersona.id,
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      })),
    });

    loadSessions(); // Reload to show new session
  };

  // Initialize Chat Session
  useEffect(() => {

    // Set initial greeting or switch message
    setMessages([{
      id: Date.now().toString(),
      role: 'model',
      text: activePersona.id === PERSONAS[0].id && messages.length === 0
        ? `Hello! I'm your ${activePersona.name}. How can I assist with your creative process today?`
        : `System: Switched to ${activePersona.name} mode.\n${activePersona.desc}`
    }]);

  }, [activePersona.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      let messageToSend = userMsg.text;

      // ── RAG: inject company knowledge for Onboarding persona ──────────────
      if (activePersona.id === 'onboarding') {
        const context = await retrieveOnboardingContext(userMsg.text);
        if (context) {
          messageToSend =
            `Beantworte die folgende Frage basierend auf dem Pixelschickeria-Firmenwissen. ` +
            `Antworte auf Deutsch, freundlich und präzise. ` +
            `Falls die Antwort nicht im Kontext steht, sag das ehrlich.\n\n` +
            `--- FIRMENWISSEN ---\n${context}\n--- ENDE ---\n\n` +
            `Frage: ${userMsg.text}`;
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const historyMsgs = messages.filter(m => m.role === 'user' || (m.role === 'model' && m.text && !m.text.startsWith('System:') && !m.text.startsWith('Hello!')));

      const contents = historyMsgs.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: messageToSend }] });

      const response = await geminiProxy({
        action: 'generateContent',
        model: 'gemini-3-flash-preview',
        contents: contents,
        systemInstruction: activePersona.instruction,
      }) as any;

      if (response?.error) {
        throw new Error(JSON.stringify(response.error));
      }

      const modelMsgId = (Date.now() + 1).toString();
      const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: responseText }]);

      setTimeout(() => saveCurrentSession(), 500);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I'm having trouble connecting right now. Please check your internet or API key." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const loadSession = (session: ChatSession) => {
    // Convert database messages to component format
    const loadedMessages: Message[] = session.messages.map((msg, idx) => ({
      id: `${session.id}-${idx}`,
      role: msg.role === 'user' ? 'user' : 'model',
      text: msg.content,
    }));

    setMessages(loadedMessages);
    setCurrentSessionId(session.id);

    // Switch to the bot that was used
    const persona = PERSONAS.find(p => p.id === session.bot_id);
    if (persona) setActivePersona(persona);
  };

  const startNewChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'model',
      text: `Hello! I'm your ${activePersona.name}. How can I assist with your creative process today?`
    }]);
    setCurrentSessionId(null);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#080c14] overflow-hidden">

      {/* Sidebar: Persona Selector */}
      <aside className="w-full md:w-72 bg-glass border-b md:border-b-0 md:border-r border-white/5 z-20 flex flex-col order-2 md:order-1 flex-shrink-0">
        <div className="p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">AI Persona</h3>
          <div className="space-y-3">
            {PERSONAS.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePersona(p)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-300 flex items-start gap-3 ${activePersona.id === p.id ? 'bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(19,91,236,0.1)]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activePersona.id === p.id ? 'bg-primary text-white' : 'bg-white/10 text-slate-400'}`}>
                  <span className="material-icons-round text-sm">{p.icon}</span>
                </div>
                <div>
                  <p className={`text-xs font-bold ${activePersona.id === p.id ? 'text-white' : 'text-slate-300'}`}>{p.name}</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 pt-0 border-t border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Chat History</h3>
            <button
              onClick={startNewChat}
              className="text-xs text-primary hover:text-primary-hover flex items-center gap-1"
            >
              <span className="material-icons-round text-sm">add</span>
              New
            </button>
          </div>

          {chatSessions.length > 0 ? (
            <div className="space-y-2">
              {chatSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${currentSessionId === session.id ? 'bg-primary/10 border-primary/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="material-icons-round text-xs text-slate-400 mt-0.5">
                      {PERSONAS.find(p => p.id === session.bot_id)?.icon || 'chat'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-300 font-medium truncate">
                        {session.title || 'Untitled Chat'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-icons-round text-slate-600 text-2xl mb-2">chat_bubble_outline</span>
              <p className="text-xs text-slate-500">No chat history yet</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col order-1 md:order-2 relative min-w-0 bg-gradient-to-b from-[#080c14] to-[#101622]">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 hide-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-2 ${msg.role === 'user' ? 'bg-white text-black' : 'bg-primary text-white'}`}>
                <span className="material-icons-round text-sm">{msg.role === 'user' ? 'person' : 'auto_awesome'}</span>
              </div>
              <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-white text-black rounded-tr-none whitespace-pre-wrap' : 'glass-card text-slate-200 rounded-tl-none border-white/10'}`}>
                {msg.role === 'user' ? msg.text : (
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2 mt-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold text-white mb-1.5 mt-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mb-1 mt-2">{children}</h3>,
                      p: ({ children }) => <p className="mb-2 last:mb-0 text-slate-200">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-slate-300">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-slate-300">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                      em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
                      code: ({ children }) => <code className="bg-black/40 text-primary px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/50 pl-3 my-2 text-slate-400 italic">{children}</blockquote>,
                      hr: () => <hr className="border-white/10 my-3" />,
                      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-2 bg-primary text-white">
                <span className="material-icons-round text-sm">auto_awesome</span>
              </div>
              <div className="p-4 rounded-2xl rounded-tl-none glass-card border-white/10 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-[#101622] border-t border-white/5 z-20">
          <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-[#0a0f18] border border-white/10 rounded-2xl p-2 shadow-xl">
            <button className="w-10 h-10 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors flex-shrink-0 flex items-center justify-center">
              <span className="material-icons-round">add_circle</span>
            </button>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${activePersona.name}...`}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-200 placeholder-slate-500 py-3 resize-none max-h-32 hide-scrollbar"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isTyping}
              className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <span className="material-icons-round text-sm">send</span>
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-600">AI can make mistakes. Please verify important information.</p>
          </div>
        </div>
      </main>
    </div>
  );
};