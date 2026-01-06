
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, AI_AGENT_ID } from '../types';
import * as storageService from '../services/storageService';
import * as geminiService from '../services/geminiService';
import { Sparkles, X, Reply, ArrowUp, UserPlus, LogIn, Info, Search, RefreshCw, Undo2, ExternalLink } from 'lucide-react';

interface AssistantViewProps {
  currentUser: User | null;
  onBack: () => void;
  onLoginClick?: (mode: 'login' | 'register') => void;
  landingTrigger?: number;
}

const AssistantView: React.FC<AssistantViewProps> = ({ currentUser, onBack, onLoginClick, landingTrigger }) => {
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [isRestorable, setIsRestorable] = useState(false);
  const [assistantUser, setAssistantUser] = useState<User | null>(null);
  
  const [streamingText, setStreamingText] = useState("");
  const [groundingLinks, setGroundingLinks] = useState<{uri: string, title: string}[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const effectiveUser = currentUser || { id: 'guest', name: 'Guest', handle: '@guest', avatarUrl: '' };

  useEffect(() => {
    const initChat = async () => {
      // storageService.createChat now handles VPS failure silently
      const existing = await storageService.createChat('ai', [effectiveUser.id, AI_AGENT_ID], effectiveUser.id);
      
      if (existing) {
        setChat(existing);
        setMessages(existing.messages || []);
        if (existing.messages && existing.messages.length > 0) {
            setIsRestorable(true);
        }
        if (!landingTrigger && (!existing.messages || existing.messages.length === 0)) {
            setShowLanding(true);
        }
      }
      
      const aiUser = await storageService.getUserById(AI_AGENT_ID);
      if (aiUser) setAssistantUser(aiUser);
    };
    initChat();
  }, [currentUser, effectiveUser.id, landingTrigger]);

  useEffect(() => {
    if (chat?.id) {
      const unsubscribe = storageService.subscribeToChatMessages(chat.id, (msgs) => {
        if (!msgs) return;
        setMessages(msgs);
        if (!showLanding) scrollToBottom();
      });
      return () => unsubscribe();
    }
  }, [chat?.id, showLanding]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 150);
  };

  const handleSend = async (e?: React.FormEvent, customContent?: string) => {
    if (e) e.preventDefault();
    const finalContent = customContent || input;
    if (!finalContent.trim()) return;
    
    let currentChatId = chat?.id;
    if (!currentChatId) {
        const fallbackChat = await storageService.createChat('ai', [effectiveUser.id, AI_AGENT_ID], effectiveUser.id);
        if (fallbackChat) {
            setChat(fallbackChat);
            currentChatId = fallbackChat.id;
        } else {
            return;
        }
    }

    if (showLanding) {
        setShowLanding(false);
    }

    let content = finalContent;
    if (replyingTo) {
      const quoted = storageService.decryptMessage(replyingTo.content).substring(0, 60);
      content = `Replying to: "${quoted}..." \n\n ${finalContent}`;
    }

    if (!customContent) setInput('');
    setReplyingTo(null);
    setIsProcessing(true);
    setStreamingText("");
    setGroundingLinks([]);
    
    await storageService.persistMessage(currentChatId, effectiveUser.id, content);
    scrollToBottom();

    const chatHistory = [...messages, { 
        id: 'temp', 
        senderId: effectiveUser.id, 
        content: storageService.encryptMessage(content), 
        timestamp: new Date(), 
        reactions: [], 
        readBy: [] 
    } as Message];

    const aiResult = await geminiService.getAiAgentResponseStream(
        chatHistory.slice(-12), 
        effectiveUser as User,
        (text) => {
            setStreamingText(text);
            scrollToBottom();
        }
    );

    if (aiResult.groundingChunks) {
        const links = aiResult.groundingChunks
            .filter(c => c.web)
            .map(c => ({ uri: c.web.uri, title: c.web.title }));
        setGroundingLinks(links);
    }

    if (aiResult.functionCalls) {
        for (const fc of aiResult.functionCalls) {
            if (fc.name === 'triggerRegistration') {
                window.dispatchEvent(new CustomEvent('ai_trigger_auth'));
            }
        }
    }

    if (aiResult.fullText) {
        await storageService.persistMessage(currentChatId, AI_AGENT_ID, aiResult.fullText);
    }
    
    setIsProcessing(false);
    setStreamingText("");
    setGroundingLinks([]);
  };

  const handleRestore = () => {
    setShowLanding(false);
    scrollToBottom();
  };

  const handleClearHistory = async () => {
    if (confirm("Reset current session? This will permanently clear the current conversation history.")) {
        await storageService.purgeChatHistory(effectiveUser.id);
        setMessages([]);
        setShowLanding(true);
        setIsRestorable(false);
    }
  };

  const handleLandingAction = (label: string) => {
      if (label === 'Register') {
          if (onLoginClick) onLoginClick('register');
          return;
      }
      if (label === 'Login') {
          if (onLoginClick) onLoginClick('login');
          return;
      }
      if (label === 'About App') {
          handleSend(undefined, "Tell me more about GK:Assistant and the GlassKom platform.");
          return;
      }
      if (label === 'Find Content') {
          handleSend(undefined, "I want to find something on GlassKom. Ask me what I'm looking for.");
          return;
      }
  };

  const landingActions = [
    { label: 'Register', icon: <UserPlus size={14} />, color: 'text-orange-400' },
    { label: 'Login', icon: <LogIn size={14} />, color: 'text-blue-400' },
    { label: 'About App', icon: <Info size={14} />, color: 'text-purple-400' },
    { label: 'Find Content', icon: <Search size={14} />, color: 'text-teal-400' },
  ];

  const OrbIcon = ({ size = "w-8 h-8" }: { size?: string }) => (
    <div className={`relative ${size} rounded-full overflow-hidden border-2 border-primary-500/50 shadow-[0_0_15px_rgba(79,172,254,0.3)] shrink-0 group`}>
        <img 
            src={assistantUser?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=assistant'} 
            className="w-full h-full object-cover bg-charcoal-900 group-hover:scale-110 transition-transform" 
            alt="AI"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/20 to-transparent pointer-events-none"></div>
    </div>
  );

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col overflow-hidden relative selection:bg-purple-500/30">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] right-[15%] w-[400px] h-[400px] rounded-full animate-blob-float opacity-20 mix-blend-screen blur-[100px] bg-gradient-to-tr from-orange-500 via-blue-500 to-teal-400"></div>
        <div className="absolute bottom-[5%] left-[10%] w-[350px] h-[350px] rounded-full animate-blob-float-delayed opacity-15 mix-blend-screen blur-[100px] bg-gradient-to-bl from-purple-500 via-teal-500 to-orange-400"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.03),transparent_70%)]"></div>
      </div>

      <div className="w-full h-full flex flex-col relative z-10 animate-in fade-in duration-700">
        <div className={`flex items-center justify-center p-6 transition-all duration-500 relative ${!showLanding ? 'bg-black/40 backdrop-blur-md border-b border-white/5' : 'mt-12'}`}>
           <h1 className={`font-black text-white tracking-tighter text-center transition-all duration-500 ${showLanding ? 'text-3xl md:text-5xl' : 'text-xl'}`}>
               GK:<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-purple-500 to-teal-400">Assistant</span>
           </h1>
           {!showLanding && (
                <button onClick={handleClearHistory} className="absolute right-6 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <RefreshCw size={14} /><span className="hidden sm:inline">New Session</span>
                </button>
           )}
        </div>

        <div className={`flex-1 flex flex-col w-full max-w-4xl mx-auto px-6 overflow-hidden ${showLanding ? 'justify-center items-center' : 'pt-4'}`}>
          {showLanding ? (
            <div className="w-full flex flex-col items-center text-center space-y-10 animate-in slide-in-from-bottom-6 duration-700">
              <div className="relative group cursor-pointer" onClick={() => setIsRestorable(false)}>
                <div className="absolute inset-0 bg-primary-500/10 blur-[40px] rounded-full transition-all duration-700 group-hover:bg-primary-500/20"></div>
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl transition-transform group-hover:scale-105">
                    <img src={assistantUser?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=assistant'} className="w-full h-full object-cover bg-charcoal-900" alt="Assistant" />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                  Hi {effectiveUser?.name ? effectiveUser.name.split(' ')[0] : 'there'}! <br />
                  <span className="text-gray-500">How can I help you today?</span>
                </h2>
                <p className="text-gray-700 text-[9px] font-black uppercase tracking-[0.4em] opacity-60">Powered by Gemini 3 Pro • Real-time Intelligence</p>
              </div>
              <div className="w-full max-w-2xl relative space-y-6">
                <form onSubmit={handleSend} className="relative group shadow-2xl rounded-3xl">
                  <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything..." className="w-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2rem] px-8 py-5 md:py-6 text-white text-base outline-none focus:ring-4 focus:ring-orange-500/10 focus:bg-white/[0.06] transition-all placeholder-gray-600" />
                  <button type="submit" disabled={!input.trim() || isProcessing} className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 via-purple-600 to-blue-600 rounded-2xl text-white text-xs font-black shadow-lg disabled:opacity-20 hover:scale-[1.02] active:scale-95 transition-all border border-white/10">
                    <span>Send</span><ArrowUp size={14} strokeWidth={3} />
                  </button>
                </form>
                <div className="space-y-5">
                  <div className="flex flex-wrap justify-center gap-2">
                    {landingActions.map((action) => {
                      if (currentUser && (action.label === 'Register' || action.label === 'Login')) return null;
                      return (
                        <button key={action.label} onClick={() => handleLandingAction(action.label)} className={`flex items-center gap-2 px-4 py-2 bg-white/[0.02] border border-white/10 rounded-full text-[10px] font-black uppercase tracking-wider ${action.color} hover:bg-white/5 hover:border-white/20 transition-all active:scale-95`}>
                          {action.icon}{action.label}
                        </button>
                      );
                    })}
                  </div>
                  {isRestorable && messages.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                        <button onClick={handleRestore} className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 rounded-full text-[10px] text-primary-400 font-black uppercase tracking-[0.2em] transition-all active:scale-95 group shadow-[0_0_20px_rgba(79,172,254,0.1)]">
                            <Undo2 size={14} className="group-hover:-translate-x-1 transition-transform" /> Restore Previous Chat
                        </button>
                      </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pb-40 space-y-6 pt-2">
               {messages.map((msg) => {
                  if (!msg) return null;
                  const isAi = msg.senderId === AI_AGENT_ID;
                  const content = storageService.decryptMessage(msg.content);
                  const isReply = content.includes('Replying to:');
                  const [quoted, ...realText] = isReply ? content.split('\n\n') : ['', content];
                  return (
                    <div key={msg.id} className={`flex group/msg ${isAi ? 'justify-start items-end gap-3' : 'justify-end'} animate-in slide-in-from-bottom-3 duration-500`}>
                      {isAi && <OrbIcon size="w-7 h-7 md:w-8 md:h-8 mb-1" />}
                      <div className={`max-w-[90%] md:max-w-[80%] px-6 py-4 rounded-[2rem] shadow-2xl border relative transition-all duration-300 ${isAi ? 'bg-white/[0.02] border-white/10 text-gray-200 rounded-bl-none backdrop-blur-xl' : 'bg-gradient-to-r from-orange-500/10 via-purple-600/10 to-blue-600/10 border-white/20 text-white rounded-br-none backdrop-blur-2xl'}`}>
                        {isAi && (
                            <div className="flex items-center gap-2 mb-2.5 text-[9px] font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-purple-400 to-teal-400 uppercase tracking-[0.2em] border-b border-white/5 pb-2">
                               <Sparkles size={10} className="text-orange-400" /> GK:Assistant
                            </div>
                        )}
                        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">{realText.join('\n\n')}</p>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 opacity-40">
                             <button onClick={() => setReplyingTo(msg)} className="p-1 hover:text-white transition-colors"><Reply size={14} /></button>
                             <span className="text-[8px] font-mono uppercase tracking-tighter">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isProcessing && streamingText && (
                  <div className="flex justify-start items-end gap-3 animate-in fade-in duration-300">
                    <OrbIcon size="w-7 h-7 md:w-8 md:h-8 mb-1" />
                    <div className="max-w-[90%] md:max-w-[80%] px-6 py-4 rounded-[2rem] rounded-bl-none shadow-2xl border border-white/10 text-gray-200 bg-white/[0.02] backdrop-blur-xl transition-all">
                        <div className="flex items-center gap-2 mb-2.5 text-[9px] font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-purple-400 to-teal-400 uppercase tracking-[0.2em] border-b border-white/5 pb-2">
                           <Sparkles size={10} className="text-orange-400 animate-pulse" /> Assistant Generating...
                        </div>
                        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">{streamingText}</p>
                        {groundingLinks.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-white/5">
                             <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Sources Found:</p>
                             <div className="flex flex-wrap gap-2">
                                {groundingLinks.map((link, idx) => (
                                  <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg text-[10px] text-primary-400 hover:bg-white/10 transition-colors">
                                     <ExternalLink size={10} /> {link.title || 'Source'}
                                  </a>
                                ))}
                             </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
                {isProcessing && !streamingText && (
                  <div className="flex justify-start items-end gap-3 animate-in slide-in-from-left-4">
                      <OrbIcon size="w-7 h-7 md:w-8 md:h-8 mb-1" />
                      <div className="bg-white/[0.02] border border-white/10 px-8 py-4 rounded-[2rem] rounded-bl-none flex items-center gap-3 backdrop-blur-xl">
                         <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                         <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                         <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"></div>
                         <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2">Thinking</span>
                      </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4 shrink-0" />
            </div>
          )}
        </div>

        {!showLanding && (
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-black via-black/90 to-transparent backdrop-blur-sm z-50">
            <div className="max-w-3xl mx-auto relative">
                {replyingTo && (
                  <div className="absolute bottom-full mb-3 left-0 right-0 p-3 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center text-[10px] animate-in slide-in-from-bottom-2 backdrop-blur-3xl">
                    <span className="text-gray-400 truncate px-2 italic font-medium">Replying: "{storageService.decryptMessage(replyingTo.content).substring(0, 50)}..."</span>
                    <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-600 hover:text-white"><X size={14} /></button>
                  </div>
                )}
                <form onSubmit={handleSend} className="relative group shadow-2xl">
                  <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message GK:Assistant..." className="w-full bg-white/[0.05] backdrop-blur-[40px] border border-white/15 rounded-full px-8 py-5 text-white text-sm outline-none focus:ring-4 focus:ring-orange-500/10 focus:bg-white/[0.08] transition-all placeholder-gray-600" />
                  <button type="submit" disabled={!input.trim() || isProcessing} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-gradient-to-r from-orange-500 via-purple-600 to-teal-500 rounded-full text-white shadow-lg disabled:opacity-10 active:scale-90 hover:scale-[1.05] transition-all border border-white/10">
                    <ArrowUp size={18} strokeWidth={3} />
                  </button>
                </form>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob-float { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -60px) scale(1.1); } 66% { transform: translate(-30px, 30px) scale(0.9); } }
        .animate-blob-float { animation: blob-float 22s ease-in-out infinite; }
        .animate-blob-float-delayed { animation: blob-float 28s ease-in-out infinite; animation-delay: -10s; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default AssistantView;
