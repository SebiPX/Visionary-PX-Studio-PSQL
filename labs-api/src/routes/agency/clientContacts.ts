import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/client-contacts
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT cc.*, c.company_name as client_name
       FROM agency_client_contacts cc
       JOIN agency_clients c ON cc.client_id = c.id
       ORDER BY cc.created_at DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/client-contacts/client/:clientId
router.get('/client/:clientId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM agency_client_contacts
       WHERE client_id = $1
       ORDER BY is_primary DESC, created_at ASC`,
      [req.params.clientId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/client-contacts/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM agency_client_contacts WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/client-contacts
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { client_id, full_name, position, email, phone, is_primary, notes } = req.body;
  try {
    // If this is the first contact or marked as primary, we could potentially unset other primary contacts for this client
    if (is_primary) {
      await pool.query(
        `UPDATE agency_client_contacts SET is_primary = false WHERE client_id = $1`,
        [client_id]
      );
    }

    const result = await pool.query(
      `INSERT INTO agency_client_contacts (client_id, full_name, position, email, phone, is_primary, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [client_id, full_name, position, email, phone, is_primary || false, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/client-contacts/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { full_name, position, email, phone, is_primary, notes, client_id } = req.body;
  
  try {
    if (is_primary && client_id) {
      await pool.query(
        `UPDATE agency_client_contacts SET is_primary = false WHERE client_id = $1 AND id != $2`,
        [client_id, req.params.id]
      );
    }

    const result = await pool.query(
      `UPDATE agency_client_contacts 
       SET full_name = COALESCE($1, full_name),
           position = COALESCE($2, position),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           is_primary = COALESCE($5, is_primary),
           notes = COALESCE($6, notes)
       WHERE id = $7
       RETURNING *`,
      [full_name, position, email, phone, is_primary, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agency/client-contacts/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('DELETE FROM agency_client_contacts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/client-contacts/:id/create-login
// Generates a client login (profile) for a given contact
import bcrypt from 'bcryptjs';

router.post('/:id/create-login', requireAuth, async (req: AuthRequest, res) => {
  // Only admins can create logins
  try {
    const adminCheck = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.userId]);
    if (!adminCheck.rows[0] || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to generate client logins' });
    }

    // Get contact info
    const contactRes = await pool.query('SELECT * FROM agency_client_contacts WHERE id = $1', [req.params.id]);
    if (contactRes.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    const contact = contactRes.rows[0];

    if (!contact.email) {
      return res.status(400).json({ error: 'Contact has no email address assigned. Please update the contact in MOCO or PX-Flow first.' });
    }

    // Check if profile exists already
    const existingRes = await pool.query('SELECT id FROM profiles WHERE email = $1', [contact.email.toLowerCase()]);
    if (existingRes.rows.length > 0) {
      return res.status(400).json({ error: 'A user login with this email already exists.' });
    }

    // Generate random secure password (e.g., PX-Flow-Client-8A2x!)
    const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
    const rawPassword = `PX-${randomSuffix}!`;
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    // Create the user profile
    const result = await pool.query(
      `INSERT INTO profiles (email, full_name, password_hash, role, client_id, weekly_hours, billable_hourly_rate, internal_cost_per_hour)
       VALUES ($1, $2, $3, 'client', $4, 0, 0, 0)
       RETURNING id, email, full_name, role`,
      [contact.email.toLowerCase(), contact.full_name, passwordHash, contact.client_id]
    );

    // Return the generated credentials so the Admin can view and copy them
    res.status(201).json({
      success: true,
      message: 'Client login generated successfully',
      user: result.rows[0],
      credentials: {
        email: contact.email.toLowerCase(),
        password: rawPassword
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
