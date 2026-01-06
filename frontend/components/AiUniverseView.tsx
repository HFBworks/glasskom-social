
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, AI_AGENT_ID } from '../types';
import * as storageService from '../services/storageService';
import * as geminiService from '../services/geminiService';
import { Send, Sparkles, Search, HelpCircle, Reply, X } from 'lucide-react';
import Logo from './Logo';

interface AiUniverseViewProps {
  currentUser: User | null;
  onBack: () => void;
}

const AiUniverseView: React.FC<AiUniverseViewProps> = ({ currentUser, onBack }) => {
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const orbRef = useRef<HTMLDivElement>(null);

  const effectiveUser = currentUser || { id: 'guest', name: 'Guest User', handle: '@guest', avatarUrl: '' };

  useEffect(() => {
    const initChat = async () => {
      const existing = await storageService.createChat('ai', [effectiveUser.id, AI_AGENT_ID], effectiveUser.id);
      setChat(existing);
      setMessages(existing.messages || []);
    };
    initChat();

    const handleMouseMove = (e: MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [currentUser]);

  useEffect(() => {
    if (chat?.id) {
      const unsubscribe = storageService.subscribeToChatMessages(chat.id, (msgs) => {
        setMessages(msgs);
        if (msgs.length > 0 && msgs[msgs.length - 1].senderId === AI_AGENT_ID) {
          setIsProcessing(false);
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      });
      return () => unsubscribe();
    }
  }, [chat?.id]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !chat?.id) return;
    
    let content = input;
    if (replyingTo) {
      const quoted = storageService.decryptMessage(replyingTo.content).substring(0, 60);
      content = `Replying to: "${quoted}..." \n\n ${input}`;
    }

    setInput('');
    setReplyingTo(null);
    setIsProcessing(true);
    await storageService.sendMessage(chat.id, effectiveUser.id, content);
  };

  return (
    <div className="h-full w-full bg-charcoal-900 flex flex-col overflow-hidden animate-in fade-in relative sparkle-container md:border-l border-white/5">
      
      {/* Immersive Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10 overflow-hidden pt-6">
        
        {/* Assistant Column */}
        <div className="w-full lg:w-5/12 flex flex-col items-center justify-center p-6 md:p-8 space-y-8" ref={orbRef}>
            <div className={`relative transition-all duration-700 ${isProcessing ? 'scale-110' : 'scale-100 animate-float'}`}>
                {/* Aura Glow Layers */}
                <div className={`absolute inset-0 bg-primary-500/40 blur-[80px] rounded-full transition-opacity duration-300 ${isProcessing ? 'opacity-100 scale-150 animate-pulse' : 'opacity-60'}`}></div>
                
                {/* The Assistant Visual */}
                <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden z-10 shadow-[0_0_60px_rgba(79,172,254,0.5)] border border-white/20">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary-600 via-primary-400 to-purple-500 animate-orb-rotation"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4),transparent_60%)]"></div>
                    <div className="absolute inset-4 rounded-full bg-black/10 backdrop-blur-[2px] border border-white/5"></div>
                </div>
            </div>

            <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                    Hello, {effectiveUser.name.split(' ')[0]}
                    <Sparkles className="text-primary-400 animate-pulse" size={24} />
                </h2>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                   <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Assistant Online</span>
                </div>
            </div>
            
            <div className="max-w-xs space-y-4 hidden lg:block">
                {!currentUser && (
                    <button 
                        onClick={() => setInput("I want to register an account")}
                        className="w-full py-3 bg-gradient-primary rounded-xl text-white font-bold text-sm shadow-lg shadow-primary-500/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                        Sign Up with Assistant <HelpCircle size={16} />
                    </button>
                )}
            </div>
        </div>

        {/* Chat Column */}
        <div className="flex-1 flex flex-col bg-black/40 backdrop-blur-md border-l border-white/5 m-2 md:m-4 rounded-[2rem] overflow-hidden relative border border-white/10">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="p-6 bg-primary-500/10 rounded-full border border-primary-500/20 animate-pulse">
                        <Search size={40} className="text-primary-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-xl">AI Assistant</h3>
                        <p className="text-gray-500 text-sm max-w-sm mt-2 px-4 italic">
                            "How can I help you today?"<br/>
                            "Find people with similar interests"<br/>
                            "Update my profile bio"
                        </p>
                    </div>
                </div>
            )}
            
            {messages.map((msg) => {
              const isAi = msg.senderId === AI_AGENT_ID;
              const content = storageService.decryptMessage(msg.content);
              const isReply = content.includes('Replying to:');
              const [quoted, ...realText] = isReply ? content.split('\n\n') : ['', content];

              return (
                <div key={msg.id} className={`flex group/msg ${isAi ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[90%] md:max-w-[85%] px-4 py-3 md:px-5 md:py-3 rounded-2xl shadow-2xl border relative transition-all ${
                    isAi 
                      ? 'bg-charcoal-800/95 border-primary-500/20 text-gray-100 rounded-bl-none' 
                      : 'bg-gradient-primary text-white border-white/10 rounded-br-none'
                  }`}>
                    {isAi && (
                        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold text-primary-400 uppercase tracking-widest border-b border-white/5 pb-1">
                            Assistant Reply
                        </div>
                    )}
                    
                    {isReply && (
                      <div className="mb-2 p-2 bg-black/20 rounded-lg border-l-2 border-primary-500 text-[11px] opacity-70 italic truncate">
                        {quoted.replace('Replying to: ', '')}
                      </div>
                    )}

                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{realText.join('\n\n')}</p>
                    
                    <div className="flex items-center justify-between mt-2 gap-4">
                        <button 
                          onClick={() => setReplyingTo(msg)}
                          className="opacity-0 group-hover/msg:opacity-100 p-1 hover:bg-white/10 rounded-md transition-all text-gray-400 hover:text-white"
                          title="Reply"
                        >
                          <Reply size={14} />
                        </button>
                        <span className="block text-[9px] opacity-40 text-right">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {isProcessing && (
               <div className="flex justify-start">
                  <div className="bg-charcoal-800/80 border border-primary-500/20 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-1.5">
                     <span className="text-[10px] text-primary-400 font-bold uppercase animate-pulse mr-2 tracking-widest">Typing...</span>
                     <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                     <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                     <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce"></div>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 md:p-6 bg-charcoal-900/90 border-t border-white/10 backdrop-blur-xl">
            {replyingTo && (
              <div className="mb-3 flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/10 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Reply size={14} className="text-primary-400 shrink-0" />
                  <p className="text-xs text-gray-400 truncate">
                    Replying to: <span className="text-gray-200 italic">"{storageService.decryptMessage(replyingTo.content).substring(0, 50)}..."</span>
                  </p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-500 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            )}
            
            <form onSubmit={handleSend} className="flex gap-2 md:gap-3 items-center">
              <input 
                value={input} 
                onChange={e => setInput(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm md:text-base focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder-gray-600" 
                placeholder="Message assistant..."
              />
              <button 
                  type="submit" 
                  disabled={!input.trim() || isProcessing}
                  className="p-4 bg-gradient-primary text-white rounded-2xl shadow-xl shadow-primary-500/20 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center"
              >
                <Send size={20} className="md:w-[22px] md:h-[22px]" />
              </button>
            </form>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes orb-rotation {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-orb-rotation {
          animation: orb-rotation 10s linear infinite;
        }
      `}} />
    </div>
  );
};

export default AiUniverseView;
