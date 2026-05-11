import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/client-contacts
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT cc.*, c.company_name as client_name,
              CASE WHEN p.id IS NOT NULL THEN true ELSE false END as has_login,
              p.id as profile_id
       FROM agency_client_contacts cc
       JOIN agency_clients c ON cc.client_id = c.id
       LEFT JOIN profiles p ON p.email = LOWER(cc.email)
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
      `SELECT cc.*,
              CASE WHEN p.id IS NOT NULL THEN true ELSE false END as has_login,
              p.id as profile_id
       FROM agency_client_contacts cc
       LEFT JOIN profiles p ON p.email = LOWER(cc.email)
       WHERE cc.client_id = $1
       ORDER BY cc.is_primary DESC, cc.created_at ASC`,
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

// POST /api/agency/client-contacts/:id/manage-login
// Generates or updates a client login (profile) for a given contact
import bcrypt from 'bcryptjs';

router.post('/:id/manage-login', requireAuth, async (req: AuthRequest, res) => {
  // Only admins can create/manage logins
  try {
    const adminCheck = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.userId]);
    if (!adminCheck.rows[0] || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to manage client logins' });
    }

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'A password of at least 6 characters is required.' });
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

    const passwordHash = await bcrypt.hash(password, 12);

    // Check if profile exists already
    const existingRes = await pool.query('SELECT id FROM profiles WHERE email = $1', [contact.email.toLowerCase()]);
    
    let result;
    if (existingRes.rows.length > 0) {
      // Update existing
      result = await pool.query(
        `UPDATE profiles 
         SET password_hash = $1, full_name = $2, client_id = $3
         WHERE email = $4
         RETURNING id, email, full_name, role`,
        [passwordHash, contact.full_name, contact.client_id, contact.email.toLowerCase()]
      );
    } else {
      // Create the user profile
      result = await pool.query(
        `INSERT INTO profiles (email, full_name, password_hash, role, client_id, weekly_hours, billable_hourly_rate, internal_cost_per_hour)
         VALUES ($1, $2, $3, 'client', $4, 0, 0, 0)
         RETURNING id, email, full_name, role`,
        [contact.email.toLowerCase(), contact.full_name, passwordHash, contact.client_id]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Client login updated successfully',
      user: result.rows[0]
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agency/client-contacts/:id/revoke-login
router.delete('/:id/revoke-login', requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminCheck = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.userId]);
    if (!adminCheck.rows[0] || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to revoke client logins' });
    }

    const contactRes = await pool.query('SELECT email FROM agency_client_contacts WHERE id = $1', [req.params.id]);
    if (contactRes.rows.length === 0 || !contactRes.rows[0].email) {
      return res.status(404).json({ error: 'Contact or email not found' });
    }
    
    const email = contactRes.rows[0].email.toLowerCase();
    
    // Delete the profile (access revoked)
    await pool.query('DELETE FROM profiles WHERE email = $1', [email]);
    
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
