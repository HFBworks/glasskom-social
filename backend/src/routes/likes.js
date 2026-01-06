
import express from 'express';
import pool from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Toggle Like
router.post('/:postId', authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  try {
    // Check if like exists
    const existingLike = await pool.query(
      'SELECT * FROM likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    if (existingLike.rows.length > 0) {
      // Unlike
      await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      return res.json({ liked: false });
    } else {
      // Like
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
      return res.json({ liked: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing like' });
  }
});

export default router;
