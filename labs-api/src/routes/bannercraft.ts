import express from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

// GET /api/bannercraft - List all projects for the authenticated user
router.get('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.userId;
        const result = await pool.query(
            'SELECT id, project_name, state_json, created_at, updated_at FROM public.bannercraft_projects WHERE user_id = $1 ORDER BY updated_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching bannercraft projects:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// POST /api/bannercraft - Create a new project
router.post('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.userId;
        const { project_name, state_json } = req.body;

        const result = await pool.query(
            `INSERT INTO public.bannercraft_projects (user_id, project_name, state_json) 
             VALUES ($1, $2, $3) RETURNING *`,
            [userId, project_name || 'New Project', state_json || {}]
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        console.error('Error creating bannercraft project:', err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// PUT /api/bannercraft/:id - Update an existing project
router.put('/:id', requireAuth, async (req: any, res) => {
    try {
        const userId = req.userId;
        const projectId = req.params.id;
        const { project_name, state_json } = req.body;

        // Verify ownership
        const verify = await pool.query('SELECT user_id FROM public.bannercraft_projects WHERE id = $1', [projectId]);
        if (verify.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        if (verify.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await pool.query(
            `UPDATE public.bannercraft_projects 
             SET project_name = $1, state_json = $2, updated_at = NOW() 
             WHERE id = $3 AND user_id = $4 RETURNING *`,
            [project_name, state_json, projectId, userId]
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Error updating bannercraft project:', err);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// DELETE /api/bannercraft/:id - Delete a project
router.delete('/:id', requireAuth, async (req: any, res) => {
    try {
        const userId = req.userId;
        const projectId = req.params.id;

        const result = await pool.query(
            'DELETE FROM public.bannercraft_projects WHERE id = $1 AND user_id = $2 RETURNING id',
            [projectId, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or unauthorized' });
        }
        res.json({ success: true });
    } catch (err: any) {
        console.error('Error deleting bannercraft project:', err);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

export default router;
