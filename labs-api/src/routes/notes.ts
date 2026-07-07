import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { title, content, due_date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO notes (user_id, title, content, due_date, due_date_notified, updated_at)
       VALUES ($1, $2, $3, $4, false, NOW()) RETURNING *`,
      [req.userId, title, content, due_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, content, due_date, due_date_notified } = req.body;
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (due_date !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(due_date);
      // Reset notification flag when due date changes
      updates.push(`due_date_notified = false`);
    } else if (due_date_notified !== undefined) {
      updates.push(`due_date_notified = $${paramIndex++}`);
      values.push(due_date_notified);
    }
    
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) { // only updated_at has changed or nothing
      const result = await pool.query(
        `SELECT * FROM notes WHERE id = $1 AND user_id = $2`,
        [id, req.userId]
      );
      return res.json(result.rows[0]);
    }

    const query = `
      UPDATE notes 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} 
      RETURNING *
    `;
    values.push(id, req.userId);

    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }
    
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
