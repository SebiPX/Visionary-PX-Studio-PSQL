import { Router } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// Ensure the table exists on startup
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agency_cases (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        project_id UUID REFERENCES agency_projects(id) ON DELETE CASCADE,
        title VARCHAR(255),
        notes TEXT,
        category VARCHAR(100),
        material_status VARCHAR(100),
        material_link TEXT,
        editor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        website_editor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        date_posting DATE,
        status_instagram VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform',
        status_facebook VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform',
        status_linkedin VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform',
        status_website VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform',
        status_youtube VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform',
        status_tiktok VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform'
      );
    `);
    console.log("Verified agency_cases table.");
  } catch (err) {
    console.error("Error creating agency_cases table:", err);
  }
})();

// GET all cases (joined with project details and editors)
router.get('/', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT 
        c.*,
        json_build_object(
          'id', p.id,
          'title', p.title,
          'client_id', p.client_id
        ) as project,
        json_build_object(
          'id', e.id,
          'full_name', e.full_name,
          'avatar_url', e.avatar_url
        ) as editor,
        json_build_object(
          'id', w.id,
          'full_name', w.full_name,
          'avatar_url', w.avatar_url
        ) as website_editor
      FROM agency_cases c
      LEFT JOIN agency_projects p ON c.project_id = p.id
      LEFT JOIN profiles e ON c.editor_id = e.id
      LEFT JOIN profiles w ON c.website_editor_id = w.id
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET single case by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM agency_cases WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Case not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching case:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST new case
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      project_id, title, notes, category, material_status, material_link,
      editor_id, website_editor_id, date_posting,
      status_instagram, status_facebook, status_linkedin, status_website, status_youtube, status_tiktok
    } = req.body;

    const query = `
      INSERT INTO agency_cases (
        project_id, title, notes, category, material_status, material_link,
        editor_id, website_editor_id, date_posting,
        status_instagram, status_facebook, status_linkedin, status_website, status_youtube, status_tiktok
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    const values = [
      project_id, title, notes, category, material_status, material_link,
      editor_id || null, website_editor_id || null, date_posting || null,
      status_instagram || 'Nicht auf dieser Plattform',
      status_facebook || 'Nicht auf dieser Plattform',
      status_linkedin || 'Nicht auf dieser Plattform',
      status_website || 'Nicht auf dieser Plattform',
      status_youtube || 'Nicht auf dieser Plattform',
      status_tiktok || 'Nicht auf dieser Plattform'
    ];
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating case:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH update case
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updates);
    values.push(id); // for the WHERE id = $n

    const query = `UPDATE agency_cases SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`;
    
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Case not found' });
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating case:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE case
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM agency_cases WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Case not found' });
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Error deleting case:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
