import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import crypto from 'crypto';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for general assets
});

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

// GET /api/agency/assets
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
        json_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url) as uploader
       FROM agency_assets a
       LEFT JOIN profiles p ON a.uploaded_by = p.id
       ORDER BY a.created_at DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/assets/project/:id  (Wait, frontend calls /api/projects/:id/assets which means it's handled in projects.ts or index.ts, BUT actually the frontend calls /api/projects/:id/assets directly. I will add that endpoint in projects.ts or just handle it here if requested. Wait, see below)
// The frontend calls /api/projects/:id/assets ...

// GET /api/agency/assets/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
        json_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url) as uploader
       FROM agency_assets a
       LEFT JOIN profiles p ON a.uploaded_by = p.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/assets
router.post('/', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  const { 
    project_id, name, description, category, status, 
    feedback_note, is_physical, location, is_visible_to_client 
  } = req.body;

  try {
    let fileKey = null;
    let fileSize = null;
    let fileType = null;

    if (req.file) {
      const ext = path.extname(req.file.originalname) || '';
      fileKey = `agency_assets/${project_id}/${crypto.randomBytes(8).toString('hex')}${ext}`;
      fileSize = req.file.size;
      fileType = req.file.mimetype;

      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });

      await s3.send(command);
    } else if (is_physical === 'false' || !is_physical) {
      // If it's not physical, a file is required
      return res.status(400).json({ error: 'No file uploaded for digital asset' });
    }

    const result = await pool.query(
      `INSERT INTO agency_assets (
        project_id, name, description, category, status, feedback_note, 
        storage_path, file_type, file_size, is_physical, location, 
        uploaded_by, is_visible_to_client
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        project_id, name, description, category, status, feedback_note,
        fileKey, fileType, fileSize, is_physical === 'true', location,
        req.userId, is_visible_to_client === 'true'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('[Asset Upload Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/assets/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { 
    name, description, category, status, feedback_note, 
    is_physical, location, is_visible_to_client 
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE agency_assets 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           status = COALESCE($4, status),
           feedback_note = COALESCE($5, feedback_note),
           is_physical = COALESCE($6, is_physical),
           location = COALESCE($7, location),
           is_visible_to_client = COALESCE($8, is_visible_to_client)
       WHERE id = $9
       RETURNING *`,
      [
        name, description, category, status, feedback_note, 
        is_physical, location, is_visible_to_client, req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agency/assets/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Check if asset exists and has a storage_path
    const assetRes = await pool.query('SELECT storage_path FROM agency_assets WHERE id = $1', [req.params.id]);
    
    if (assetRes.rows.length > 0) {
      const storagePath = assetRes.rows[0].storage_path;
      
      // Delete from R2 if applicable
      if (storagePath) {
        try {
          const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: storagePath,
          });
          await s3.send(command);
        } catch (s3Err) {
          console.error('[Asset Storage Delete Error]', s3Err);
          // Proceed with db deletion even if s3 deletion fails
        }
      }

      await pool.query('DELETE FROM agency_assets WHERE id = $1', [req.params.id]);
    }

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
