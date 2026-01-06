
import jwt from 'jsonwebtoken';
import pool from '../models/db.js';
import { hashPassword, comparePassword } from '../utils/hash.js';

export const register = async (req, res) => {
  const { name, email, handle, password } = req.body;

  try {
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR handle = $2',
      [email, handle]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email or Handle already taken' });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await pool.query(
      'INSERT INTO users (name, email, handle, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email, handle, avatar_url',
      [name, email, handle, hashedPassword]
    );

    const user = newUser.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, handle: user.handle },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, handle: user.handle },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userData } = user;
    res.json({ user: userData, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const syncFirebaseUser = async (req, res) => {
  const { id, name, email, handle, avatarUrl, bio, coverUrl } = req.body;
  try {
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
    const result = await pool.query(query, [id, name, email, handle, avatarUrl, bio || '', coverUrl || '']);
    res.json({ success: true, user: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to sync user' });
  }
};
