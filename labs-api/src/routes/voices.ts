import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';
import pool from '../db';

const router = Router();

// GET /api/voices
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const result = await pool.query(
            'SELECT * FROM generated_voices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json(result.rows);
    } catch (err: any) {
        console.error('[voices list]', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/voices
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { title, prompt, audio_url, config } = req.body;

        if (!prompt || !audio_url) {
            res.status(400).json({ error: 'prompt and audio_url are required' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO generated_voices (user_id, title, prompt, audio_url, config)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, title || null, prompt, audio_url, config || {}]
        );

        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        console.error('[voices create]', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/voices/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const voiceId = req.params.id;

        const result = await pool.query(
            'DELETE FROM generated_voices WHERE id = $1 AND user_id = $2 RETURNING id',
            [voiceId, userId]
        );

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Voice not found or not authorized' });
            return;
        }

        res.json({ success: true, id: voiceId });
    } catch (err: any) {
        console.error('[voices delete]', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
