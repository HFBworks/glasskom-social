import { io, Socket } from 'socket.io-client';
import { User, Chat, Message } from '../types';

// This service replaces storageService.ts when connected to the real backend.
// Currently pointed to localhost for development.

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
let socket: Socket | null = null;

// --- AUTH ---

export const connectSocket = (userId: string, token: string) => {
  if (socket) return socket;
  
  socket = io(API_URL, {
    auth: { token },
    query: { userId },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('Connected to realtime server');
  });

  return socket;
};

// --- REST API CALLS ---

export const fetchChats = async (token: string): Promise<Chat[]> => {
  const res = await fetch(`${API_URL}/api/chats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch chats');
  return res.json();
};

export const createChat = async (token: string, participantIds: string[], type: 'direct' | 'group', name?: string) => {
  const res = await fetch(`${API_URL}/api/chats`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ participantIds, type, name })
  });
  return res.json();
};

export const uploadMedia = async (token: string, file: File) => {
  // Upload to S3/Cloud Storage via Presigned URL pattern
  
  // 1. Get presigned URL
  const { uploadUrl, key } = await fetch(`${API_URL}/api/media/presign`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ filename: file.name, fileType: file.type })
  }).then(r => r.json());

  // 2. Upload direct to Cloud
  await fetch(uploadUrl, {
      method: 'PUT',
      body: file
  });

  return key; // Return reference to store in DB
};

// --- SOCKET EMITTERS ---

export const sendRealtimeMessage = (conversationId: string, content: string, senderId: string) => {
  if (!socket) throw new Error("Socket not connected");
  socket.emit('send_message', { conversationId, content, senderId });
};

export const setTypingStatus = (conversationId: string, isTyping: boolean) => {
  if (!socket) return;
  socket.emit(isTyping ? 'typing_start' : 'typing_stop', conversationId);
};
