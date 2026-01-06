import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message, ChatFolder, CallType, AI_AGENT_ID, Reaction } from '../types';
import * as messagingService from '../services/messagingService';
import * as storageService from '../services/storageService';
import Avatar from './Avatar';
import { Send, MoreVertical, ChevronDown, Edit2, Trash2, SmilePlus } from 'lucide-react';

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
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [useBackend, setUseBackend] = useState(true); // Toggle for backend vs localStorage
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (useBackend) {
      messagingService.connectSocket(currentUser.id);
      
      return () => {
        messagingService.disconnectSocket();
      };
    }
  }, [currentUser.id, useBackend]);

  // Load chats
  useEffect(() => {
    const loadData = async () => {
      if (useBackend) {
        try {
          const [loadedChats, loadedUsers] = await Promise.all([
            messagingService.getUserChats(currentUser.id),
            storageService.getUsers()
          ]);
          setChats(loadedChats);
          setAllUsers(loadedUsers);
        } catch (error) {
          console.error('Failed to load from backend, falling back to localStorage');
          setUseBackend(false);
        }
      } else {
        // Fallback to localStorage
        const [loadedChats, loadedUsers] = await Promise.all([
          storageService.getChats(currentUser.id),
          storageService.getUsers()
        ]);
        
        const sortedChats = [...loadedChats].sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });
        
        setChats(sortedChats);
        setAllUsers(loadedUsers);
      }
    };
    
    loadData();
  }, [currentUser, useBackend]);

  // Setup real-time listeners
  useEffect(() => {
    if (!useBackend) return;

    // Listen for new messages
    messagingService.onMessageReceived((message: Message) => {
      const msgChatId = message.chat_id || message.chatId;
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (chat.id === msgChatId) {
            return {
              ...chat,
              messages: [...(chat.messages || []), message],
              lastMessageAt: new Date(message.timestamp || message.created_at || new Date())
            };
          }
          return chat;
        });
        return updatedChats;
      });
      
      if (activeChat?.id === msgChatId) {
        setActiveChat(prev => prev ? {
          ...prev,
          messages: [...(prev.messages || []), message]
        } : null);
        scrollToBottom();
      }
    });

    // Listen for message updates
    messagingService.onMessageUpdated((data) => {
      updateMessageInState(data.messageId, { content: data.content, isEdited: true });
    });

    // Listen for message deletions
    messagingService.onMessageRemoved((data) => {
      if (data.deleteForEveryone) {
        updateMessageInState(data.messageId, { isDeletedEveryone: true });
      }
    });

    // Listen for reactions
    messagingService.onReactionUpdate((data) => {
      // Update reaction in state
      setActiveChat(prev => {
        if (!prev) return null;
        const updatedMessages = prev.messages.map(msg => {
          if (msg.id === data.messageId) {
            let reactions = msg.reactions || [];
            if (data.action === 'add') {
              reactions = [...reactions, { emoji: data.emoji, userId: data.userId }];
            } else {
              reactions = reactions.filter(r => !(r.emoji === data.emoji && r.userId === data.userId));
            }
            return { ...msg, reactions };
          }
          return msg;
        });
        return { ...prev, messages: updatedMessages };
      });
    });

    // Listen for typing indicators
    messagingService.onUserTyping((data) => {
      if (data.userId !== currentUser.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      }
    });

    return () => {
      messagingService.removeAllSocketListeners();
    };
  }, [currentUser.id, activeChat?.id, useBackend]);

  // Join/leave chat rooms
  useEffect(() => {
    if (selectedChatId && useBackend) {
      messagingService.joinChatRoom(selectedChatId);
      loadChatDetails(selectedChatId);
      
      return () => {
        messagingService.leaveChatRoom(selectedChatId);
      };
    }
  }, [selectedChatId, useBackend]);

  const loadChatDetails = async (chatId: string) => {
    if (useBackend) {
      const chat = await messagingService.getChatById(chatId, currentUser.id);
      if (chat) {
        setActiveChat(chat);
        messagingService.markMessagesAsRead(chatId, currentUser.id);
      }
    } else {
      const chat = chats.find(c => c.id === chatId);
      if (chat) setActiveChat(chat);
    }
    scrollToBottom();
  };

  const updateMessageInState = (messageId: string, updates: Partial<Message>) => {
    setActiveChat(prev => {
      if (!prev) return null;
      const updatedMessages = prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      return { ...prev, messages: updatedMessages };
    });
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !selectedChatId) return;

    const content = messageInput;
    setMessageInput('');

    if (useBackend) {
      // Encrypt message before sending
      const encryptedContent = storageService.encryptMessage(content);
      const message = await messagingService.sendMessage(
        selectedChatId,
        currentUser.id,
        encryptedContent
      );
      
      if (message) {
        setActiveChat(prev => prev ? {
          ...prev,
          messages: [...(prev.messages || []), message]
        } : null);
        scrollToBottom();
      }
    } else {
      await storageService.sendMessage(selectedChatId, currentUser.id, content);
      const loadedChats = await storageService.getChats(currentUser.id);
      setChats(loadedChats);
    }

    // Stop typing indicator
    if (useBackend && selectedChatId) {
      messagingService.updateTypingStatus(selectedChatId, currentUser.id, false);
    }
  };

  const handleTyping = () => {
    if (!useBackend || !selectedChatId) return;

    // Start typing
    messagingService.updateTypingStatus(selectedChatId, currentUser.id, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      messagingService.updateTypingStatus(selectedChatId, currentUser.id, false);
    }, 3000);
  };

  const handleEditMessage = async (messageId: string) => {
    if (!messageInput.trim() || !selectedChatId) return;

    const encryptedContent = storageService.encryptMessage(messageInput);
    
    if (useBackend) {
      await messagingService.editMessage(messageId, currentUser.id, encryptedContent, selectedChatId);
    }
    
    setMessageInput('');
    setEditingMessageId(null);
  };

  const handleDeleteMessage = async (messageId: string, deleteForEveryone: boolean = false) => {
    if (!selectedChatId) return;

    if (useBackend) {
      await messagingService.deleteMessage(messageId, currentUser.id, selectedChatId, deleteForEveryone);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!selectedChatId) return;

    // Check if user already reacted with this emoji
    const message = activeChat?.messages.find(m => m.id === messageId);
    const existingReaction = message?.reactions?.find(r => r.userId === currentUser.id && r.emoji === emoji);

    if (existingReaction) {
      // Remove reaction
      if (useBackend) {
        await messagingService.removeReaction(messageId, currentUser.id, emoji, selectedChatId);
      }
    } else {
      // Add reaction
      if (useBackend) {
        await messagingService.addReaction(messageId, currentUser.id, emoji, selectedChatId);
      }
    }
    
    setShowEmojiPicker(null);
  };

  const getChatDisplayInfo = (chat: Chat) => {
    if (!chat) return { name: 'Chat', avatar: '' };
    if (chat.type === 'ai') return { name: 'GK Assistant', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=assistant' };
    const otherId = chat.participantIds.find(id => id !== currentUser.id);
    const user = allUsers.find(u => u.id === otherId);
    return { name: user?.name || 'Unknown', avatar: user?.avatarUrl || '' };
  };

  const filteredChats = chats.filter(c => (c.participantStatus?.[currentUser.id] || 'inbox') === currentFolder);

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

  return (
    <div className="flex h-[calc(100vh-2rem)] aero-card rounded-2xl shadow-xl overflow-hidden border border-white/10">
      {/* Chat List */}
      <div className={`w-full md:w-80 bg-charcoal-800/80 border-r border-white/5 flex flex-col ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5">
          <h2 className="text-xl font-bold text-white tracking-tight">Messages</h2>
          <div className="text-xs text-gray-400 mt-1">
            {useBackend ? '🟢 Live Backend' : '🟡 Local Mode'}
          </div>
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

      {/* Chat View */}
      {selectedChatId && activeChat ? (
        <div className="flex-1 flex flex-col bg-charcoal-900/50">
          <div className="p-4 bg-charcoal-800/90 border-b border-white/5 flex justify-between items-center backdrop-blur-3xl z-30">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedChatId(null)} className="md:hidden text-gray-400"><ChevronDown className="rotate-90" /></button>
              <Avatar src={getChatDisplayInfo(activeChat).avatar} alt="" />
              <div>
                <h3 className="font-bold text-white text-base">{getChatDisplayInfo(activeChat).name}</h3>
                {typingUsers.size > 0 && (
                  <p className="text-xs text-primary-400">typing...</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeChat.messages?.map((msg) => {
              const isMine = msg.senderId === currentUser.id;
              const isDeleted = msg.isDeletedEveryone || msg.deletedFor?.includes(currentUser.id);
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className="relative group">
                    <div className={`px-4 py-2.5 rounded-2xl text-sm border ${isMine ? 'bg-primary-600 text-white border-primary-500' : 'bg-charcoal-700 text-gray-100 border-white/5'}`}>
                      {isDeleted ? (
                        <em className="text-gray-400">This message was deleted</em>
                      ) : (
                        <>
                          {storageService.decryptMessage(msg.content)}
                          {msg.isEdited && <span className="text-xs opacity-50 ml-2">(edited)</span>}
                        </>
                      )}
                    </div>
                    
                    {!isDeleted && (
                      <div className="absolute top-0 right-0 hidden group-hover:flex gap-1 -mt-2 -mr-2">
                        <button
                          onClick={() => setShowEmojiPicker(msg.id)}
                          className="p-1 bg-charcoal-800 rounded-full hover:bg-charcoal-700"
                        >
                          <SmilePlus size={14} className="text-gray-400" />
                        </button>
                        {isMine && (
                          <>
                            <button
                              onClick={() => {
                                setEditingMessageId(msg.id);
                                setMessageInput(storageService.decryptMessage(msg.content));
                              }}
                              className="p-1 bg-charcoal-800 rounded-full hover:bg-charcoal-700"
                            >
                              <Edit2 size={14} className="text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id, true)}
                              className="p-1 bg-charcoal-800 rounded-full hover:bg-red-600"
                            >
                              <Trash2 size={14} className="text-gray-400" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    
                    {showEmojiPicker === msg.id && (
                      <div className="absolute top-full mt-2 bg-charcoal-800 p-2 rounded-lg shadow-xl flex gap-1 z-50">
                        {commonEmojis.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="p-1 hover:bg-charcoal-700 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => setShowEmojiPicker(null)}
                          className="p-1 hover:bg-charcoal-700 rounded text-gray-400"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {Object.entries(
                        msg.reactions.reduce((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([emoji, count]) => (
                        <div key={emoji} className="bg-charcoal-800 px-2 py-0.5 rounded-full text-xs">
                          {emoji} {count}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={editingMessageId ? (e) => { e.preventDefault(); handleEditMessage(editingMessageId); } : handleSendMessage} className="p-6 border-t border-white/5 flex gap-3 items-center">
            <input 
              value={messageInput} 
              onChange={(e) => {
                setMessageInput(e.target.value);
                handleTyping();
              }}
              className="flex-1 bg-black/30 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" 
              placeholder={editingMessageId ? "Edit your message..." : "Type your message..."} 
            />
            {editingMessageId && (
              <button
                type="button"
                onClick={() => {
                  setEditingMessageId(null);
                  setMessageInput('');
                }}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            )}
            <button type="submit" disabled={!messageInput.trim()} className="p-3 bg-gradient-primary text-white rounded-2xl disabled:opacity-50">
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
frontend/components/MessagesViewEnhanced.tsx
