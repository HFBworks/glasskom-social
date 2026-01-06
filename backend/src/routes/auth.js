
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const router = express.Router();

// Register User
router.post('/register', async (req, res) => {
  const { name, email, handle, password } = req.body;

  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR handle = $2',
      [email, handle]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email or Handle already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
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
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, handle: user.handle },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Don't send password
    const { password: _, ...userData } = user;
    res.json({ user: userData, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

export default router;
