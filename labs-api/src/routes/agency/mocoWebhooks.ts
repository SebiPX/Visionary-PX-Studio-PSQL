import { Router } from 'express';
import pool from '../../db';

const router = Router();

// Endpoint for MOCO Webhooks
router.post('/', async (req, res) => {
  try {
    const { webhook_identifier, event, payload } = req.body;
    
    console.log(`Received MOCO Webhook: ${event}`);

    // Example handling of Project creation Webhook
    if (event === 'project.created' || event === 'project.updated') {
      const project = payload;
      // Extract data
      const mocoProjectId = project.id;
      const mocoCompanyId = project.company?.id;
      const name = project.name;
      const budget = project.budget || 0;
      
      // Upsert to DB conceptually (implementation depends on exact mapping needed)
      // await pool.query('INSERT INTO agency_projects (title, moco_project_id, budget_total) VALUES ($1, $2, $3)', [name, mocoProjectId, budget]);
      console.log('Project processed via webhook:', name);
    }

    // Example handling of Absence (Urlaub / Krankheit)
    if (event === 'absence.created' || event === 'absence.updated') {
      const absence = payload;
      const mocoAbsenceId = absence.id;
      const date = absence.date;
      const am = absence.am;
      const pm = absence.pm;
      const reqMocoUserId = absence.user?.id;
      
      if (reqMocoUserId) {
        await pool.query(`
          INSERT INTO agency_moco_absences (moco_absence_id, moco_user_id, date, am, pm) 
          VALUES ($1, $2, $3, $4, $5) 
          ON CONFLICT (moco_absence_id) 
          DO UPDATE SET date = EXCLUDED.date, am = EXCLUDED.am, pm = EXCLUDED.pm
        `, [mocoAbsenceId, reqMocoUserId, date, am, pm]);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('MOCO Webhook Error:', error);
    res.status(500).json({ error: 'Internal server error while processing webhook' });
  }
});

export default router;
