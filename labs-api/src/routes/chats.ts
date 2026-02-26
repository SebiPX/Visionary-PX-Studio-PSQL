import { Router } from 'express';
import pool from '../db';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

const router = Router();

// GET /api/chats — list chat sessions for current user
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, bot_id, messages, created_at, updated_at
       FROM chat_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [req.userId]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('[GET /api/chats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats — save or update a chat session
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { id, title, bot_id, messages } = req.body;
  try {
    if (id) {
      // Update existing session
      const { rows } = await pool.query(
        `UPDATE chat_sessions
         SET messages = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [JSON.stringify(messages), id, req.userId]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Session not found' });
      res.json(rows[0]);
    } else {
      // Create new session
      const { rows } = await pool.query(
        `INSERT INTO chat_sessions (user_id, title, bot_id, messages, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [req.userId, title || 'New Chat', bot_id || 'general', JSON.stringify(messages || [])]
      );
      res.status(201).json(rows[0]);
    }
  } catch (err: any) {
    console.error('[POST /api/chats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chats/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query(
      'DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/chats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
