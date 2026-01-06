
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import likeRoutes from './routes/likes.js';
import commentRoutes from './routes/comments.js';
import followRoutes from './routes/follows.js';
import searchRoutes from './routes/search.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Attach io to app for use in routes
app.set('socketio', io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/search', searchRoutes);

// Socket.IO Logic
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on('join_post', (postId) => {
    socket.join(`post_${postId}`);
    console.log(`👤 User joined room for post: ${postId}`);
  });

  socket.on('leave_post', (postId) => {
    socket.leave(`post_${postId}`);
  });

  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User joined their personal room: ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
