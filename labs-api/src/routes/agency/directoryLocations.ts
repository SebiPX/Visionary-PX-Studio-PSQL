import { Router } from 'express';
import pool from '../../db';

const router = Router();

// Get all locations
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM directory_locations ORDER BY name ASC');
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Create new location
router.post('/', async (req, res) => {
    const fields = req.body;
    const keys = Object.keys(fields).filter(k => k !== 'id' && k !== 'created_at');
    
    if (keys.length === 0) return res.status(400).json({ error: 'No fields provided' });
    
    const columns = keys.map(k => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map(k => fields[k]);
    
    try {
        const result = await pool.query(
            `INSERT INTO directory_locations (${columns}) VALUES (${placeholders}) RETURNING *`,
            values
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update location
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const fields = req.body;
    const keys = Object.keys(fields).filter(k => k !== 'id' && k !== 'created_at');
    
    if (keys.length === 0) return res.status(400).json({ error: 'No fields provided' });
    
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = [...keys.map(k => fields[k]), id];
    
    try {
        const result = await pool.query(
            `UPDATE directory_locations SET ${setClause} WHERE id = $${values.length} RETURNING *`,
            values
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Delete location
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM directory_locations WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
