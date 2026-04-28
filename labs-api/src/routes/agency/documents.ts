import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// --------------------------------------------------------------------------
// TEMPORARY MIGRATION ENDPOINT
// --------------------------------------------------------------------------
router.get('/migrate-shotlist-vfx', async (req, res) => {
  try {
    const sql = `
      ALTER TABLE agency_shotlist_items ADD COLUMN IF NOT EXISTS is_vfx BOOLEAN DEFAULT false;
      ALTER TABLE agency_shotlist_items ADD COLUMN IF NOT EXISTS focal_length VARCHAR(255);
      ALTER TABLE agency_shotlist_items ADD COLUMN IF NOT EXISTS framerate VARCHAR(50);
      ALTER TABLE agency_shotlist_items ADD COLUMN IF NOT EXISTS camera_type VARCHAR(255);
    `;
    await pool.query(sql);
    res.json({ success: true, message: 'Migration applied successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/migrate-callsheet-catering', async (req, res) => {
  try {
    const sql = `ALTER TABLE agency_call_sheet_data ADD COLUMN IF NOT EXISTS catering_info VARCHAR(255);`;
    await pool.query(sql);
    res.json({ success: true, message: 'Catering migration applied successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/agency/documents/init
// Run this once manually to create the tables.
router.post('/init', async (req, res) => {
  try {
    const sql = `
CREATE TABLE IF NOT EXISTS agency_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES agency_projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_shotlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES agency_documents(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  scene_name VARCHAR(255),
  scene_number VARCHAR(50),
  take VARCHAR(50),
  duration VARCHAR(50),
  framing VARCHAR(255),
  is_vfx BOOLEAN DEFAULT false,
  focal_length VARCHAR(255),
  framerate VARCHAR(50),
  camera_type VARCHAR(255),
  cast_list TEXT,
  props TEXT,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_call_sheet_data (
  document_id UUID PRIMARY KEY REFERENCES agency_documents(id) ON DELETE CASCADE,
  location_name VARCHAR(255),
  location_address TEXT,
  location_lat VARCHAR(50),
  location_lng VARCHAR(50),
  weather_info TEXT,
  hospital_info TEXT,
  general_notes TEXT,
  shoot_date VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agency_call_sheet_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES agency_documents(id) ON DELETE CASCADE,
  time_start VARCHAR(50),
  time_end VARCHAR(50),
  description TEXT,
  persons TEXT,
  scene_name VARCHAR(255),
  scene_number VARCHAR(50),
  duration_minutes INTEGER,
  is_done BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_call_sheet_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES agency_documents(id) ON DELETE CASCADE,
  name VARCHAR(255),
  role VARCHAR(255),
  category VARCHAR(50) DEFAULT 'crew',
  phone VARCHAR(100),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    `;
    await pool.query(sql);

    // Provide safe schema migration for existing tables that already exist
    try { await pool.query('ALTER TABLE agency_call_sheet_data ADD COLUMN shoot_date VARCHAR(50);'); } catch(e) {}
    try { await pool.query('ALTER TABLE agency_call_sheet_data ADD COLUMN location_lat VARCHAR(50);'); } catch(e) {}
    try { await pool.query('ALTER TABLE agency_call_sheet_data ADD COLUMN location_lng VARCHAR(50);'); } catch(e) {}
    try { await pool.query('ALTER TABLE agency_call_sheet_data ADD COLUMN directions_notes TEXT;'); } catch(e) {}
    try { await pool.query('ALTER TABLE agency_call_sheet_data ADD COLUMN additional_locations JSONB DEFAULT \'[]\'::jsonb;'); } catch(e) {}
    
    // safe migration for schedule table (Drehplan features)
    try {
      await pool.query('ALTER TABLE agency_call_sheet_schedule ADD COLUMN scene_name VARCHAR(255);');
      await pool.query('ALTER TABLE agency_call_sheet_schedule ADD COLUMN scene_number VARCHAR(50);');
      await pool.query('ALTER TABLE agency_call_sheet_schedule ADD COLUMN duration_minutes INTEGER;');
      await pool.query('ALTER TABLE agency_call_sheet_schedule ADD COLUMN is_done BOOLEAN DEFAULT FALSE;');
      await pool.query('ALTER TABLE agency_call_sheet_schedule ADD COLUMN image_url TEXT;');
    } catch(e) { /* ignore */ }
    
    // safe migration for contacts table
    try { await pool.query("ALTER TABLE agency_call_sheet_contacts ADD COLUMN category VARCHAR(50) DEFAULT 'crew';"); } catch(e) {}

    res.json({ message: 'Tables created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/documents/project/:projectId
router.get('/project/:projectId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, p.full_name as author_name 
       FROM agency_documents d
       LEFT JOIN profiles p ON d.created_by = p.id
       WHERE d.project_id = $1 
       ORDER BY d.created_at DESC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/documents
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { project_id, title, type } = req.body;
  const userId = req.userId;
  try {
    // 1. Create document entry
    const docRes = await pool.query(
      `INSERT INTO agency_documents (project_id, title, type, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [project_id, title, type, userId]
    );
    const newDoc = docRes.rows[0];

    // 2. Based on type, stub out default data
    if (type === 'call_sheet' || type === 'event_sheet') {
      await pool.query(
        'INSERT INTO agency_call_sheet_data (document_id) VALUES ($1)',
        [newDoc.id]
      );

      // Pre-fill contacts with the project team
      try {
        const teamRes = await pool.query(`
          SELECT pm.role, p.full_name, p.email
          FROM agency_project_members pm
          JOIN profiles p ON pm.user_id = p.id
          WHERE pm.project_id = $1
        `, [project_id]);

        for (const member of teamRes.rows) {
          const name = member.full_name || 'Unknown';
          const role = member.role || 'Team Member';
          const email = member.email || '';
          
          await pool.query(`
            INSERT INTO agency_call_sheet_contacts (document_id, name, role, phone, email)
            VALUES ($1, $2, $3, $4, $5)
          `, [newDoc.id, name, role, '', email]);
        }
      } catch (teamErr) {
        console.error('Error pre-filling call sheet contacts:', teamErr);
      }
    } else if (type === 'shotlist') {
      // maybe add a single empty row to start
      await pool.query(
        'INSERT INTO agency_shotlist_items (document_id, order_index) VALUES ($1, 0)',
        [newDoc.id]
      );
    }

    res.status(201).json(newDoc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/documents/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const docRes = await pool.query('SELECT * FROM agency_documents WHERE id = $1', [req.params.id]);
    if (docRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const doc = docRes.rows[0];

    // Fetch associated data based on type
    if (doc.type === 'shotlist') {
      const itemsRes = await pool.query('SELECT * FROM agency_shotlist_items WHERE document_id = $1 ORDER BY order_index ASC', [doc.id]);
      doc.items = itemsRes.rows;
    } else if (doc.type === 'call_sheet' || doc.type === 'event_sheet') {
      const dataRes = await pool.query('SELECT * FROM agency_call_sheet_data WHERE document_id = $1', [doc.id]);
      doc.data = dataRes.rows[0] || {};
      
      const scheduleRes = await pool.query('SELECT * FROM agency_call_sheet_schedule WHERE document_id = $1 ORDER BY time_start ASC', [doc.id]);
      doc.schedule = scheduleRes.rows;

      const contactsRes = await pool.query('SELECT * FROM agency_call_sheet_contacts WHERE document_id = $1', [doc.id]);
      doc.contacts = contactsRes.rows;
    }

    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agency/documents/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM agency_documents WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/agency/documents/:id => edit title
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'UPDATE agency_documents SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [req.body.title, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// SHOTLIST SPECIFIC ENDPOINTS
// --------------------------------------------------------------------------
router.post('/:id/shotlist-items', requireAuth, async (req: AuthRequest, res) => {
  const { scene_name, scene_number, take, duration, framing, is_vfx, focal_length, framerate, camera_type, cast_list, props, notes, image_url, order_index } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agency_shotlist_items 
        (document_id, order_index, scene_name, scene_number, take, duration, framing, is_vfx, focal_length, framerate, camera_type, cast_list, props, notes, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [req.params.id, order_index || 0, scene_name, scene_number, take, duration, framing, is_vfx || false, focal_length, framerate, camera_type, cast_list, props, notes, image_url]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/shotlist-items/:itemId', requireAuth, async (req: AuthRequest, res) => {
  const { scene_name, scene_number, order_index, take, duration, framing, is_vfx, focal_length, framerate, camera_type, cast_list, props, notes, image_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_shotlist_items 
       SET scene_name = COALESCE($1, scene_name),
           scene_number = COALESCE($2, scene_number),
           order_index = COALESCE($3, order_index),
           take = COALESCE($4, take),
           duration = COALESCE($5, duration),
           framing = COALESCE($6, framing),
           is_vfx = COALESCE($7, is_vfx),
           focal_length = COALESCE($8, focal_length),
           framerate = COALESCE($9, framerate),
           camera_type = COALESCE($10, camera_type),
           cast_list = COALESCE($11, cast_list),
           props = COALESCE($12, props),
           notes = COALESCE($13, notes),
           image_url = COALESCE($14, image_url),
           updated_at = NOW()
       WHERE id = $15 RETURNING *`,
      [scene_name, scene_number, order_index, take, duration, framing, is_vfx, focal_length, framerate, camera_type, cast_list, props, notes, image_url, req.params.itemId]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/shotlist-items/:itemId', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM agency_shotlist_items WHERE id = $1', [req.params.itemId]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// CALL SHEET SPECIFIC ENDPOINTS
// --------------------------------------------------------------------------
router.put('/:id/call-sheet-data', requireAuth, async (req: AuthRequest, res) => {
  const { location_name, location_address, location_lat, location_lng, weather_info, hospital_info, general_notes, directions_notes, shoot_date, additional_locations, catering_info } = req.body;
  const addLocsParam = additional_locations ? JSON.stringify(additional_locations) : null;
  try {
    const result = await pool.query(
      `UPDATE agency_call_sheet_data 
       SET location_name = COALESCE($1, location_name),
           location_address = COALESCE($2, location_address),
           weather_info = COALESCE($3, weather_info),
           hospital_info = COALESCE($4, hospital_info),
           general_notes = COALESCE($5, general_notes),
           directions_notes = COALESCE($10, directions_notes),
           shoot_date = COALESCE($7, shoot_date),
           location_lat = COALESCE($8, location_lat),
           location_lng = COALESCE($9, location_lng),
           additional_locations = COALESCE($11::jsonb, additional_locations),
           catering_info = COALESCE($12, catering_info),
           updated_at = NOW()
       WHERE document_id = $6 RETURNING *`,
      [location_name, location_address, weather_info, hospital_info, general_notes, req.params.id, shoot_date, location_lat, location_lng, directions_notes, addLocsParam, catering_info]
    );
    // If updating 0 rows (missing initial row), create it
    if (result.rows.length === 0) {
      const newResult = await pool.query(
        `INSERT INTO agency_call_sheet_data 
         (document_id, location_name, location_address, weather_info, hospital_info, general_notes, directions_notes, shoot_date, location_lat, location_lng, additional_locations, catering_info)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12) RETURNING *`,
        [req.params.id, location_name, location_address, weather_info, hospital_info, general_notes, directions_notes, shoot_date, location_lat, location_lng, addLocsParam, catering_info]
      );
      return res.json(newResult.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Schedule CRUD
router.post('/:id/schedule', requireAuth, async (req: AuthRequest, res) => {
  const { time_start, time_end, description, persons, scene_name, scene_number, duration_minutes, is_done, image_url } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agency_call_sheet_schedule (document_id, time_start, time_end, description, persons, scene_name, scene_number, duration_minutes, is_done, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.params.id, time_start, time_end, description, persons, scene_name, scene_number, duration_minutes, is_done, image_url]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/schedule/:itemId', requireAuth, async (req: AuthRequest, res) => {
  const { time_start, time_end, description, persons, scene_name, scene_number, duration_minutes, is_done, image_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_call_sheet_schedule 
       SET time_start = COALESCE($1, time_start),
           time_end = COALESCE($2, time_end),
           description = COALESCE($3, description),
           persons = COALESCE($4, persons),
           scene_name = COALESCE($5, scene_name),
           scene_number = COALESCE($6, scene_number),
           duration_minutes = COALESCE($7, duration_minutes),
           is_done = COALESCE($8, is_done),
           image_url = COALESCE($9, image_url),
           updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [time_start, time_end, description, persons, scene_name, scene_number, duration_minutes, is_done, image_url, req.params.itemId]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/schedule/:itemId', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM agency_call_sheet_schedule WHERE id = $1', [req.params.itemId]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Contacts CRUD
router.post('/:id/contacts', requireAuth, async (req: AuthRequest, res) => {
  const { name, role, category, phone, email } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agency_call_sheet_contacts (document_id, name, role, category, phone, email)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, name, role, category || 'crew', phone, email]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/contacts/:itemId', requireAuth, async (req: AuthRequest, res) => {
  const { name, role, category, phone, email } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_call_sheet_contacts 
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           category = COALESCE($3, category),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, role, category, phone, email, req.params.itemId]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/contacts/:itemId', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM agency_call_sheet_contacts WHERE id = $1', [req.params.itemId]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
