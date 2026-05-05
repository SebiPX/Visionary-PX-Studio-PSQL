import { Router } from 'express';
import pool from '../../db';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = Router();

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

// Helper to generate signed URLs for Cloudflare R2
const generateSignedUrl = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
  });
  // URL expires in 1 hour
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
};

// GET /api/public/assets/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only fetch if status is one of the reviewable/public ones
    const result = await pool.query(
      `SELECT a.*, p.title as project_name 
       FROM agency_assets a
       LEFT JOIN agency_projects p ON a.project_id = p.id
       WHERE a.id = $1 AND a.status IN ('client_review', 'changes_requested', 'approved')`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found or not available for public review.' });
    }

    const asset = result.rows[0];

    // Generate signed URL if it's a digital asset
    let fileUrl = null;
    if (asset.storage_path) {
        try {
            fileUrl = await generateSignedUrl(asset.storage_path);
        } catch (e) {
            console.error('Error generating signed URL:', e);
        }
    }

    res.json({
        ...asset,
        file_url: fileUrl
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/public/assets/:id/review
router.patch('/:id/review', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, feedback_note } = req.body;

        // Validate status
        if (!['approved', 'changes_requested'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status provided.' });
        }

        // We need to fetch the existing feedback note first
        const checkResult = await pool.query(
            `SELECT id, feedback_note FROM agency_assets WHERE id = $1 AND status IN ('client_review', 'changes_requested')`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(400).json({ error: 'Asset is not currently under review.' });
        }

        const existingNote = checkResult.rows[0].feedback_note || '';
        let finalNote = existingNote;

        // Only append if new feedback was provided
        if (feedback_note && feedback_note.trim().length > 0) {
            const dateStr = new Date().toLocaleString('de-DE');
            let statusText = status === 'approved' ? 'Freigegeben (Approved)' : 'Änderungen gewünscht (Changes Requested)';
            let newEntry = `[${dateStr}] Client Review - ${statusText}:\n${feedback_note.trim()}`;
            
            finalNote = existingNote ? `${newEntry}\n\n------------------------\n\n${existingNote}` : newEntry;
        }

        // Update the asset
        const updateResult = await pool.query(
            `UPDATE agency_assets 
             SET status = $1, feedback_note = $2
             WHERE id = $3
             RETURNING *`,
            [status, finalNote, id]
        );

        res.json(updateResult.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
