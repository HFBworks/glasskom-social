
import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/**
 * @route   GET /api/search
 * @desc    Search for users and posts
 * @access  Public
 */
router.get('/', async (req, res) => {
  const { q, type } = req.query; // q: query string, type: 'users' | 'posts' | 'all'

  if (!q) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const searchResults = {
      users: [],
      posts: []
    };

    // Search Users
    if (type === 'users' || type === 'all' || !type) {
      const userRes = await pool.query(
        `SELECT id, name, handle, avatar_url, bio 
         FROM users 
         WHERE name ILIKE $1 OR handle ILIKE $1 
         LIMIT 20`,
        [`%${q}%`]
      );
      searchResults.users = userRes.rows;
    }

    // Search Posts
    if (type === 'posts' || type === 'all' || !type) {
      const postRes = await pool.query(
        `SELECT 
          p.*, 
          json_build_object(
            'id', u.id,
            'name', u.name,
            'handle', u.handle,
            'avatarUrl', u.avatar_url
          ) as user
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.content ILIKE $1 OR $2 = ANY(p.tags)
        ORDER BY p.created_at DESC
        LIMIT 20`,
        [`%${q}%`, q.replace('#', '')]
      );
      searchResults.posts = postRes.rows;
    }

    res.json(searchResults);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error performing search' });
  }
});

export default router;
