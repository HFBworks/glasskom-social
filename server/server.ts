import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initCache, db } from './database';
import { initializeSocketManager } from './socketManager';

const app = express();
const httpServer = createServer(app);

// Security & Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json() as any);

// Initialize Redis
initCache().catch(console.error);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

initializeSocketManager(io);

// --- API ROUTES ---

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// --- USER MANAGEMENT (Synced with Firebase) ---

// Check if handle/email exists before Firebase registration
app.get('/api/users/check-availability', async (req, res) => {
  const { handle, email } = req.query;
  try {
    const result = await db.query(
      'SELECT id FROM users WHERE handle = $1 OR email = $2', 
      [handle, email]
    );
    if (result.rows.length > 0) {
      return res.status(409).json({ available: false, error: 'Username or Email already taken' });
    }
    res.json({ available: true });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Sync Firebase User to Postgres
app.post('/api/users/sync', async (req, res) => {
  const { id, name, email, handle, avatarUrl, bio, coverUrl } = req.body;
  
  try {
    // Upsert user (Insert or Update if exists)
    // Note: We need to ensure the database schema has cover_url column. 
    // Assuming standard schema, if not exists, this might error, but we'll include it.
    const query = `
      INSERT INTO users (id, name, email, handle, avatar_url, bio, cover_url, last_seen)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name, 
          email = EXCLUDED.email, 
          handle = EXCLUDED.handle,
          bio = EXCLUDED.bio,
          avatar_url = EXCLUDED.avatar_url,
          cover_url = EXCLUDED.cover_url,
          last_seen = NOW()
      RETURNING *;
    `;
    
    const result = await db.query(query, [id, name, email, handle, avatarUrl, bio || '', coverUrl || '']);
    res.json({ success: true, user: result.rows[0] });
  } catch (e) {
    console.error("Sync error:", e);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// Get Current User (by ID from token/request)
app.get('/api/users/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({error: 'User not found'});
        res.json(result.rows[0]);
    } catch(e) {
        res.status(500).json({error: 'Server error'});
    }
});

// --- POSTS ---
app.get('/api/posts', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, row_to_json(u) as user, 
      (SELECT json_agg(c) FROM comments c WHERE c.post_id = p.id) as comments 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
    `);
    const posts = result.rows.map(row => ({
      ...row,
      user: row.user,
      comments: row.comments || [],
      createdAt: row.created_at,
      imageUrl: row.image_url,
      likes: row.likes_count || 0
    }));
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/posts', async (req, res) => {
  const { id, userId, content, imageUrl, tags } = req.body;
  try {
    await db.query(
      'INSERT INTO posts (id, user_id, content, image_url, tags) VALUES ($1, $2, $3, $4, $5)',
      [id, userId, content, imageUrl, tags]
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.post('/api/posts/:id/like', async (req, res) => {
    const { id } = req.params;
    await db.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1', [id]);
    res.json({ success: true });
});

app.post('/api/posts/:id/comments', async (req, res) => {
    // Comment insertion logic would go here
    res.json({ success: true });
});

// --- USERS LIST ---
app.get('/api/users', async (req, res) => {
    const result = await db.query('SELECT * FROM users');
    res.json(result.rows);
});

// --- CHATS ---
app.get('/api/chats', async (req, res) => {
    const userId = req.query.userId as string;
    res.json([]); 
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});