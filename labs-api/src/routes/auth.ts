import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const router = Router();

// POST /auth/register — DISABLED: accounts are created by admin only (defaults to 'creative')
router.post('/register', async (_req, res: Response) => {
  res.status(403).json({ error: 'Self-registration is disabled. Please contact your administrator.' });
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
    res.json(result.rows[0]);
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
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /auth/password — change password for logged-in user
router.patch('/password', requireAuth, async (req: AuthRequest, res: Response) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    res.status(400).json({ error: 'current_password and new_password required' });
    return;
  }
  if (new_password.length < 6) {
    res.status(400).json({ error: 'new_password must be at least 6 characters' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT password_hash FROM profiles WHERE id = $1', [req.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    const new_hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      'UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [new_hash, req.userId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /auth/admin/reset-password — admin sets a new password for any user
router.patch('/admin/reset-password', requireAuth, async (req: AuthRequest, res: Response) => {
  // Only admins
  const adminCheck = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.userId]);
  if (!adminCheck.rows[0] || adminCheck.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  const { user_id, new_password } = req.body;
  if (!user_id || !new_password) {
    res.status(400).json({ error: 'user_id and new_password required' });
    return;
  }
  if (new_password.length < 6) {
    res.status(400).json({ error: 'new_password must be at least 6 characters' });
    return;
  }
  try {
    const new_hash = await bcrypt.hash(new_password, 12);
    const result = await pool.query(
      'UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name',
      [new_hash, user_id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
