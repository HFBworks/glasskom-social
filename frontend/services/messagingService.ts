import { io, Socket } from 'socket.io-client';
import { Chat, Message, Reaction } from '../types';

// Dynamic backend URL configuration
const getBackendUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  const hostname = window.location.hostname;
  
  // Production VPS Setup
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${window.location.protocol}//${hostname}:3001`;
  }
  
  return 'http://localhost:3001';
};

const API_URL = getBackendUrl();
const BASE_API = `${API_URL}/api`;

let socket: Socket | null = null;

// Socket.io connection
export const connectSocket = (userId: string) => {
  if (socket?.connected) return socket;
  
  socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected');
    socket?.emit('join_user', userId);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

// ===== REST API Calls =====

// Get all chats for a user
export const getUserChats = async (userId: string): Promise<Chat[]> => {
  try {
    const response = await fetch(`${BASE_API}/chats/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch chats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
};

// Get specific chat with messages
export const getChatById = async (chatId: string, userId: string): Promise<Chat | null> => {
  try {
    const response = await fetch(`${BASE_API}/chats/${chatId}?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch chat');
    return await response.json();
  } catch (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
};

// Create or get existing chat
export const createOrGetChat = async (
  participantIds: string[],
  type: 'direct' | 'group' | 'ai' = 'direct',
  name?: string,
  avatarUrl?: string
): Promise<Chat | null> => {
  try {
    const response = await fetch(`${BASE_API}/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantIds, type, name, avatarUrl }),
    });
    if (!response.ok) throw new Error('Failed to create chat');
    return await response.json();
  } catch (error) {
    console.error('Error creating chat:', error);
    return null;
  }
};

// Send message
export const sendMessage = async (
  chatId: string,
  senderId: string,
  content: string,
  isVoice: boolean = false
): Promise<Message | null> => {
  try {
    const response = await fetch(`${BASE_API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, senderId, content, isVoice }),
    });
    if (!response.ok) throw new Error('Failed to send message');
    const message = await response.json();
    
    // Emit socket event for real-time update
    if (socket?.connected) {
      socket.emit('new_message', { chatId, message });
    }
    
    return message;
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};

// Edit message
export const editMessage = async (
  messageId: string,
  userId: string,
  content: string,
  chatId: string
): Promise<Message | null> => {
  try {
    const response = await fetch(`${BASE_API}/messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content }),
    });
    if (!response.ok) throw new Error('Failed to edit message');
    const message = await response.json();
    
    // Emit socket event
    if (socket?.connected) {
      socket.emit('message_edited', { chatId, messageId, content });
    }
    
    return message;
  } catch (error) {
    console.error('Error editing message:', error);
    return null;
  }
};

// Delete message
export const deleteMessage = async (
  messageId: string,
  userId: string,
  chatId: string,
  deleteForEveryone: boolean = false
): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_API}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, deleteForEveryone }),
    });
    if (!response.ok) throw new Error('Failed to delete message');
    
    // Emit socket event
    if (socket?.connected) {
      socket.emit('message_deleted', { chatId, messageId, deleteForEveryone });
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
};

// Add reaction to message
export const addReaction = async (
  messageId: string,
  userId: string,
  emoji: string,
  chatId: string
): Promise<Reaction[] | null> => {
  try {
    const response = await fetch(`${BASE_API}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, emoji }),
    });
    if (!response.ok) throw new Error('Failed to add reaction');
    const reactions = await response.json();
    
    // Emit socket event
    if (socket?.connected) {
      socket.emit('reaction_added', { chatId, messageId, userId, emoji });
    }
    
    return reactions;
  } catch (error) {
    console.error('Error adding reaction:', error);
    return null;
  }
};

// Remove reaction from message
export const removeReaction = async (
  messageId: string,
  userId: string,
  emoji: string,
  chatId: string
): Promise<Reaction[] | null> => {
  try {
    const response = await fetch(`${BASE_API}/messages/${messageId}/reactions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, emoji }),
    });
    if (!response.ok) throw new Error('Failed to remove reaction');
    const reactions = await response.json();
    
    // Emit socket event
    if (socket?.connected) {
      socket.emit('reaction_removed', { chatId, messageId, userId, emoji });
    }
    
    return reactions;
  } catch (error) {
    console.error('Error removing reaction:', error);
    return null;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (chatId: string, userId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_API}/chats/${chatId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
};

// Update typing status
export const updateTypingStatus = async (
  chatId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  try {
    await fetch(`${BASE_API}/chats/${chatId}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isTyping }),
    });
    
    // Emit socket event for real-time update
    if (socket?.connected) {
      if (isTyping) {
        socket.emit('typing_start', { chatId, userId });
      } else {
        socket.emit('typing_stop', { chatId, userId });
      }
    }
  } catch (error) {
    console.error('Error updating typing status:', error);
  }
};

// Get typing users
export const getTypingUsers = async (chatId: string): Promise<string[]> => {
  try {
    const response = await fetch(`${BASE_API}/chats/${chatId}/typing`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Error fetching typing users:', error);
    return [];
  }
};

// ===== Socket Event Handlers =====

// Join a chat room
export const joinChatRoom = (chatId: string) => {
  if (socket?.connected) {
    socket.emit('join_chat', chatId);
  }
};

// Leave a chat room
export const leaveChatRoom = (chatId: string) => {
  if (socket?.connected) {
    socket.emit('leave_chat', chatId);
  }
};

// Listen for new messages
export const onMessageReceived = (callback: (message: Message) => void) => {
  if (socket) {
    socket.on('message_received', callback);
  }
};

// Listen for message updates
export const onMessageUpdated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('message_updated', callback);
  }
};

// Listen for message deletions
export const onMessageRemoved = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('message_removed', callback);
  }
};

// Listen for reaction updates
export const onReactionUpdate = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('reaction_update', callback);
  }
};

// Listen for typing indicators
export const onUserTyping = (callback: (data: { userId: string; isTyping: boolean }) => void) => {
  if (socket) {
    socket.on('user_typing', callback);
  }
};

// Listen for read receipts
export const onMessagesReadBy = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('messages_read_by', callback);
  }
};

// Remove all socket listeners
export const removeAllSocketListeners = () => {
  if (socket) {
    socket.removeAllListeners('message_received');
    socket.removeAllListeners('message_updated');
    socket.removeAllListeners('message_removed');
    socket.removeAllListeners('reaction_update');
    socket.removeAllListeners('user_typing');
    socket.removeAllListeners('messages_read_by');
  }
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  getUserChats,
  getChatById,
  createOrGetChat,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markMessagesAsRead,
  updateTypingStatus,
  getTypingUsers,
  joinChatRoom,
  leaveChatRoom,
  onMessageReceived,
  onMessageUpdated,
  onMessageRemoved,
  onReactionUpdate,
  onUserTyping,
  onMessagesReadBy,
  removeAllSocketListeners,
};
frontend/services/messagingService.ts
