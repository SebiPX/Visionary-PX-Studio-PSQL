import { Router, Response } from 'express';
import pool from '../../db';
import { requireAuth, AuthRequest } from '../../middleware/requireAuth';

const router = Router();

// GET /api/chat/summary
router.get('/summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT channel_id, MAX(created_at) as last_message_at 
       FROM agency_chat_messages 
       WHERE is_deleted = false 
       GROUP BY channel_id`
    );
    res.json(rows);
  } catch (err: any) {
    console.error('[GET /api/chat/summary]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/channels
router.get('/channels', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT p.id, p.title as name, 'project' as type
       FROM agency_projects p
       LEFT JOIN agency_project_members pm ON p.id = pm.project_id
       LEFT JOIN agency_tasks t ON p.id = t.project_id
       WHERE pm.user_id = $1 
          OR t.assignee_id = $1 
          OR p.title IN ('Studio Vermietung', 'INTERNES - NWB 2026')
       ORDER BY p.title ASC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('[GET /api/chat/channels]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/:channelId
router.get('/:channelId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { channelId } = (req as any).params;
  
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
  const { channelId } = (req as any).params;
  const { content } = (req as any).body;

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
    
    const profile = profileRes.rows[0];

    // Trigger notification
    import('../../services/notificationService').then(({ notifyProjectMembers }) => {
      notifyProjectMembers(
        channelId, 
        {
          type: 'info',
          title: `Neue Nachricht in Chat`,
          message: `${profile.full_name || 'Jemand'}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          related_entity_id: channelId,
          related_entity_type: 'chat'
        },
        req.userId
      );
    }).catch(err => console.error('Error importing notificationService:', err));

    res.status(201).json({
      ...newMessage,
      profile
    });
  } catch (err: any) {
    console.error(`[POST /api/chat/${channelId}]`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/messages/:id (Soft Delete)
router.delete('/messages/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = (req as any).params;
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
