import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/posts.js';
import searchRoutes from './routes/search.js';
import uploadRoutes from './routes/upload.js';
import messagesRoutes from './routes/messages.js';
import initializeDatabase from './utils/initDb.js';
import { apiLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Serve Static Uploads
// CRITICAL: In the Docker container, /app/uploads is where the volume is mounted.
const uploadsPath = process.env.NODE_ENV === 'production' 
  ? '/app/uploads' 
  : path.join(__dirname, '../uploads');

app.use('/uploads', express.static(uploadsPath));

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', messagesRoutes);

// Socket.IO - Real-time messaging
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  // Join user room for personal notifications
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join chat room
  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`User joined chat: ${chatId}`);
  });

  // Leave chat room
  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat_${chatId}`);
    console.log(`User left chat: ${chatId}`);
  });

  // New message event
  socket.on('new_message', (data) => {
    const { chatId, message } = data;
    // Broadcast to all users in the chat except sender
    socket.to(`chat_${chatId}`).emit('message_received', message);
    console.log(`Message sent to chat ${chatId}`);
  });

  // Message edited event
  socket.on('message_edited', (data) => {
    const { chatId, messageId, content } = data;
    socket.to(`chat_${chatId}`).emit('message_updated', { messageId, content, isEdited: true });
  });

  // Message deleted event
  socket.on('message_deleted', (data) => {
    const { chatId, messageId, deleteForEveryone } = data;
    socket.to(`chat_${chatId}`).emit('message_removed', { messageId, deleteForEveryone });
  });

  // Reaction added event
  socket.on('reaction_added', (data) => {
    const { chatId, messageId, userId, emoji } = data;
    socket.to(`chat_${chatId}`).emit('reaction_update', { messageId, userId, emoji, action: 'add' });
  });

  // Reaction removed event
  socket.on('reaction_removed', (data) => {
    const { chatId, messageId, userId, emoji } = data;
    socket.to(`chat_${chatId}`).emit('reaction_update', { messageId, userId, emoji, action: 'remove' });
  });

  // Typing indicator
  socket.on('typing_start', (data) => {
    const { chatId, userId } = data;
    socket.to(`chat_${chatId}`).emit('user_typing', { userId, isTyping: true });
  });

  socket.on('typing_stop', (data) => {
    const { chatId, userId } = data;
    socket.to(`chat_${chatId}`).emit('user_typing', { userId, isTyping: false });
  });

  // Message read receipt
  socket.on('messages_read', (data) => {
    const { chatId, userId, messageIds } = data;
    socket.to(`chat_${chatId}`).emit('messages_read_by', { userId, messageIds });
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Initialize database tables
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
});

export { app, io };
