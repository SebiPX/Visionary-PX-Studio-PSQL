import { Router, Response } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/kitchen-duty
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const dutiesRes = await pool.query(
      `SELECT year, week_number as "weekNumber", assigned_ids as "assignedIds" 
       FROM public.agency_kitchen_duties
       ORDER BY year ASC, week_number ASC`
    );
    const participantsRes = await pool.query(
      `SELECT profile_id as "id" FROM public.agency_kitchen_duty_participants`
    );
    
    res.json({
      duties: dutiesRes.rows,
      participants: participantsRes.rows.map((row: any) => row.id)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kitchen-duty/duties
router.post('/duties', requireAuth, async (req: AuthRequest, res: Response) => {
  const { duties } = req.body; // array of WeekDuty: { weekNumber, year, assignedIds }
  
  if (!Array.isArray(duties)) {
    return res.status(400).json({ error: 'duties must be an array' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const duty of duties) {
      const { weekNumber, year, assignedIds } = duty;
      // Filter out any invalid non-UUID entries (just in case)
      const validAssignedIds = Array.isArray(assignedIds)
        ? assignedIds.filter(id => typeof id === 'string' && id.length === 36)
        : [];

      await client.query(
        `INSERT INTO public.agency_kitchen_duties (year, week_number, assigned_ids, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (year, week_number)
         DO UPDATE SET assigned_ids = EXCLUDED.assigned_ids, updated_at = NOW()`,
        [year, weekNumber, validAssignedIds]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/kitchen-duty/participants
router.post('/participants', requireAuth, async (req: AuthRequest, res: Response) => {
  const { participantIds } = req.body; // array of strings (UUIDs)
  
  if (!Array.isArray(participantIds)) {
    return res.status(400).json({ error: 'participantIds must be an array' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM public.agency_kitchen_duty_participants');
    for (const pId of participantIds) {
      if (typeof pId === 'string' && pId.length === 36) {
        await client.query(
          `INSERT INTO public.agency_kitchen_duty_participants (profile_id)
           VALUES ($1) ON CONFLICT DO NOTHING`,
          [pId]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
