
import express from 'express';
import pool from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/follows/:userId
 * @desc    Toggle follow/unfollow a user
 * @access  Private
 */
router.post('/:userId', authMiddleware, async (req, res) => {
  const targetId = req.params.userId;
  const followerId = req.user.id;

  if (targetId === followerId) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }

  try {
    // Check if relationship exists
    const check = await pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, targetId]
    );

    if (check.rows.length > 0) {
      // Unfollow
      await pool.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, targetId]
      );
      return res.json({ following: false });
    } else {
      // Follow
      await pool.query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
        [followerId, targetId]
      );
      
      // Real-time: (Optional) You could emit a notification to the target user here via Socket.io
      const io = req.app.get('socketio');
      io.to(`user_${targetId}`).emit('new_notification', {
        type: 'FOLLOW',
        message: `${req.user.handle} started following you`,
        actorId: followerId
      });

      return res.json({ following: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing follow' });
  }
});

/**
 * @route   GET /api/follows/status/:userId
 * @desc    Check if current user follows target user
 * @access  Private
 */
router.get('/status/:userId', authMiddleware, async (req, res) => {
  try {
    const check = await pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, req.params.userId]
    );
    res.json({ following: check.rows.length > 0 });
  } catch (error) {
    res.status(500).json({ message: 'Error checking status' });
  }
});

/**
 * @route   GET /api/follows/followers/:userId
 * @desc    Get list of followers for a user
 * @access  Public
 */
router.get('/followers/:userId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.handle, u.avatar_url
      FROM users u
      JOIN follows f ON u.id = f.follower_id
      WHERE f.following_id = $1
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching followers' });
  }
});

/**
 * @route   GET /api/follows/following/:userId
 * @desc    Get list of users a specific user is following
 * @access  Public
 */
router.get('/following/:userId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.handle, u.avatar_url
      FROM users u
      JOIN follows f ON u.id = f.following_id
      WHERE f.follower_id = $1
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching following' });
  }
});

export default router;
