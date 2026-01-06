
import express from 'express';
import pool from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/posts
 * @desc    Create a new post
 */
router.post('/', authMiddleware, async (req, res) => {
  const { content, imageUrl, tags } = req.body;
  const userId = req.user.id;

  if (!content && !imageUrl) {
    return res.status(400).json({ message: 'Post content or image is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO posts (user_id, content, image_url, tags) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, content, imageUrl, tags || []]
    );

    const post = result.rows[0];
    const userResult = await pool.query('SELECT id, name, handle, avatar_url FROM users WHERE id = $1', [userId]);
    post.user = userResult.rows[0];

    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating post' });
  }
});

/**
 * @route   GET /api/posts/trending
 * @desc    Get top trending tags based on frequency in recent posts
 */
router.get('/trending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tag, count(*) as count
      FROM (
        SELECT unnest(tags) as tag
        FROM posts
        WHERE created_at > NOW() - INTERVAL '7 days'
      ) sub
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trending tags' });
  }
});

/**
 * @route   GET /api/posts/discovery
 * @desc    Get a discovery feed (mixture of high engagement and new content)
 */
router.get('/discovery', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*, 
        json_build_object(
          'id', u.id,
          'name', u.name,
          'handle', u.handle,
          'avatarUrl', u.avatar_url
        ) as user,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as likes_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY likes_count DESC, p.created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching discovery feed' });
  }
});

/**
 * @route   GET /api/posts
 * @desc    Get all posts
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*, 
        json_build_object(
          'id', u.id,
          'name', u.name,
          'handle', u.handle,
          'avatarUrl', u.avatar_url
        ) as user
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching posts' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;
  try {
    const check = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Post not found' });
    if (check.rows[0].user_id !== userId) return res.status(403).json({ message: 'Unauthorized' });
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post' });
  }
});

export default router;
