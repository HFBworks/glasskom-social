
import express from 'express';
import pool from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get comments for a post
router.get('/:postId', async (req, res) => {
  const { postId } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        c.*, 
        json_build_object('id', u.id, 'name', u.name, 'handle', u.handle, 'avatarUrl', u.avatar_url) as user
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `, [postId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Add a comment
router.post('/:postId', authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content) return res.status(400).json({ message: 'Comment text is required' });

  try {
    const result = await pool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, userId, content]
    );

    const comment = result.rows[0];
    const userResult = await pool.query('SELECT id, name, handle, avatar_url FROM users WHERE id = $1', [userId]);
    comment.user = userResult.rows[0];

    // Real-time: Emit to post-specific room
    const io = req.app.get('socketio');
    io.to(`post_${postId}`).emit('new_comment', comment);

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment' });
  }
});

export default router;
