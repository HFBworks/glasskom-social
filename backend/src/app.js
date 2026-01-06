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

// Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export { app, io };
