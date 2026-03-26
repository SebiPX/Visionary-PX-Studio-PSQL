import { Router, Response } from 'express';
import pool from '../../../db';
import { requireAuth, AuthRequest } from '../../middleware/requireAuth';

const router = Router();

// GET /api/chat/:channelId
router.get('/:channelId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  
  try {
    const { rows } = await pool.query(
      `SELECT m.*, 
              row_to_json(p) as profile 
       FROM agency_chat_messages m
       LEFT JOIN profiles p ON m.sender_id = p.id
       WHERE m.channel_id = $1 AND m.is_deleted = false
       ORDER BY m.created_at ASC
       LIMIT 200`,
      [channelId]
    );

    res.json(rows);
  } catch (err: any) {
    console.error(`[GET /api/chat/${channelId}]`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/:channelId
router.post('/:channelId', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { channelId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    // Insert new message
    const { rows } = await pool.query(
      `INSERT INTO agency_chat_messages (channel_id, sender_id, content) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [channelId, req.userId, content]
    );

    const newMessage = rows[0];

    // Fetch the profile for immediate return
    const profileRes = await pool.query(
      `SELECT * FROM profiles WHERE id = $1`,
      [req.userId]
    );

    res.status(201).json({
      ...newMessage,
      profile: profileRes.rows[0]
    });
  } catch (err: any) {
    console.error(`[POST /api/chat/${channelId}]`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/messages/:id (Soft Delete)
router.delete('/messages/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  // TODO: Verify if user is sender or admin
  try {
    const { rowCount } = await pool.query(
      `UPDATE agency_chat_messages SET is_deleted = true WHERE id = $1 AND sender_id = $2`,
      [id, req.userId]
    );
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error(`[DELETE /api/chat/messages/${id}]`, err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
