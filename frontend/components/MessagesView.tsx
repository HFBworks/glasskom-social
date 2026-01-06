
import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message, ChatFolder, CallType, AI_AGENT_ID, Reaction } from '../types';
import * as storageService from '../services/storageService';
import Avatar from './Avatar';
import { Send, Plus, MoreVertical, Archive, Inbox, MessageCircle, Trash2, Phone, Video, ChevronDown, X, Edit2, SmilePlus, CheckCircle } from 'lucide-react';
import Button from './Button';

interface MessagesViewProps {
  currentUser: User;
  onInitiateCall: (chatId: string, otherUser: User, type: CallType) => void;
}

const MessagesView: React.FC<MessagesViewProps> = ({ currentUser, onInitiateCall }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentFolder, setCurrentFolder] = useState<ChatFolder>('inbox');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
        const [loadedChats, loadedUsers] = await Promise.all([
          storageService.getChats(currentUser.id),
          storageService.getUsers()
        ]);
        
        // FIX: Ensure robust sorting. Convert to Date only if it exists.
        const sortedChats = [...loadedChats].sort((a, b) => {
            const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return timeB - timeA;
        });
        
        setChats(sortedChats);
        setAllUsers(loadedUsers);
    };
    loadData();
  }, [currentUser]);

  useEffect(() => {
      if (selectedChatId) {
          // In real VPS app, we would join socket room here
          const chat = chats.find(c => c.id === selectedChatId);
          if (chat) setActiveChat(chat);
          scrollToBottom();
      }
  }, [selectedChatId, chats]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !selectedChatId) return;

    await storageService.sendMessage(selectedChatId, currentUser.id, messageInput);
    setMessageInput('');
    // Refresh chats after sending
    const loadedChats = await storageService.getChats(currentUser.id);
    setChats(loadedChats);
  };

  const getChatDisplayInfo = (chat: Chat) => {
      if (!chat) return { name: 'Chat', avatar: '' };
      if (chat.type === 'ai') return { name: 'GK Assistant', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=assistant' };
      const otherId = chat.participantIds.find(id => id !== currentUser.id);
      const user = allUsers.find(u => u.id === otherId);
      return { name: user?.name || 'Unknown', avatar: user?.avatarUrl || '' };
  };

  const filteredChats = chats.filter(c => (c.participantStatus?.[currentUser.id] || 'inbox') === currentFolder);

  return (
    <div className="flex h-[calc(100vh-2rem)] aero-card rounded-2xl shadow-xl overflow-hidden border border-white/10">
      <div className={`w-full md:w-80 bg-charcoal-800/80 border-r border-white/5 flex flex-col ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5">
          <h2 className="text-xl font-bold text-white tracking-tight">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map(chat => {
            const info = getChatDisplayInfo(chat);
            const active = selectedChatId === chat.id;
            const lastMsg = chat.messages?.[chat.messages.length - 1];
            
            return (
              <div key={chat.id} onClick={() => setSelectedChatId(chat.id)} className={`px-4 py-4 flex gap-3 cursor-pointer border-l-4 transition-all ${active ? 'bg-white/5 border-primary-500' : 'border-transparent hover:bg-white/5'}`}>
                <Avatar src={info.avatar} alt={info.name} size="md" />
                <div className="flex-1 overflow-hidden">
                    <h3 className="font-bold text-sm text-gray-300 truncate">{info.name}</h3>
                    <p className="text-xs text-gray-500 truncate">
                      {lastMsg ? storageService.decryptMessage(lastMsg.content) : 'Tap to chat'}
                    </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedChatId && activeChat ? (
        <div className="flex-1 flex flex-col bg-charcoal-900/50">
          <div className="p-4 bg-charcoal-800/90 border-b border-white/5 flex justify-between items-center backdrop-blur-3xl z-30">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedChatId(null)} className="md:hidden text-gray-400"><ChevronDown className="rotate-90" /></button>
              <Avatar src={getChatDisplayInfo(activeChat).avatar} alt="" />
              <h3 className="font-bold text-white text-base">{getChatDisplayInfo(activeChat).name}</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeChat.messages?.map((msg) => {
                const isMine = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm border ${isMine ? 'bg-primary-600 text-white border-primary-500' : 'bg-charcoal-700 text-gray-100 border-white/5'}`}>
                        {storageService.decryptMessage(msg.content)}
                    </div>
                  </div>
                );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-6 border-t border-white/5 flex gap-3 items-center">
            <input 
                value={messageInput} 
                onChange={e => setMessageInput(e.target.value)} 
                className="flex-1 bg-black/30 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" 
                placeholder="Type your message..." 
            />
            <button type="submit" disabled={!messageInput.trim()} className="p-3 bg-gradient-primary text-white rounded-2xl">
                <Send size={20} />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center text-gray-500 opacity-50">
            Select a conversation to start messaging.
        </div>
      )}
    </div>
  );
};

export default MessagesView;
