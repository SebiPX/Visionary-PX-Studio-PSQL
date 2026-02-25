import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const router = Router();

// POST /auth/register
router.post('/register', async (req, res: Response) => {
  const { email, password, full_name } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }
  try {
    const existing = await pool.query('SELECT id FROM profiles WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO profiles (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, avatar_url, role, created_at`,
      [email, password_hash, full_name || '']
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err: any) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, avatar_url, role, password_hash FROM profiles WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/me — returns current user from JWT
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, avatar_url, role, created_at, updated_at FROM profiles WHERE id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /auth/profile — update name or avatar_url
router.patch('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  const { full_name, avatar_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE profiles SET full_name = COALESCE($1, full_name), avatar_url = COALESCE($2, avatar_url), updated_at = NOW()
       WHERE id = $3 RETURNING id, email, full_name, avatar_url, role`,
      [full_name, avatar_url, req.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
