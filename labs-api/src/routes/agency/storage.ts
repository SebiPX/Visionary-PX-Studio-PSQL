import { Router } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET) {
  console.warn('[Storage] Missing R2 credentials. Storage routes will fail.');
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// GET /api/agency/storage/signed-url
router.get('/signed-url', requireAuth, async (req: AuthRequest, res) => {
  const fileKey = req.query.path as string;
  if (!fileKey) {
    return res.status(400).json({ error: 'path is required' });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileKey,
    });
    // Valid for 1 hour
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ url });
  } catch (error: any) {
    console.error('[Storage SignedURL]', error);
    res.status(500).json({ error: 'Failed to generate signed url' });
  }
});

// POST /api/agency/storage/avatars
router.post('/avatars', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `avatars/${req.userId}-${Date.now()}${ext}`;
    
    // Prefix all agency files with agency_ prefix (e.g. agency_avatars/ to be fully separated if desired, 
    // but the frontend profileSettings calls /api/storage/avatars - wait, let's just use the `agency_` bucket folder)
    const fileKey = `agency_avatars/${req.userId}-${crypto.randomBytes(4).toString('hex')}${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3.send(command);

    res.json({ path: fileKey });
  } catch (error: any) {
    console.error('[Storage Upload Avatar]', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /api/agency/storage/clients
router.post('/clients', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const ext = path.extname(req.file.originalname) || '.png';
    const fileKey = `agency_clients/${crypto.randomBytes(8).toString('hex')}${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3.send(command);

    // If there's a custom domain available:
    const publicUrl = process.env.R2_PUBLIC_URL 
      ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
      : fileKey;

    res.json({ path: fileKey, publicUrl });
  } catch (error: any) {
    console.error('[Storage Upload Client Logo]', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /api/agency/storage/delete
router.post('/delete', requireAuth, async (req: AuthRequest, res) => {
  const { path: fileKey } = req.body;
  if (!fileKey) {
    return res.status(400).json({ error: 'path is required' });
  }
  
  // Protect against deleting non-agency files
  if (!fileKey.startsWith('agency_')) {
    return res.status(403).json({ error: 'Not authorized to delete this file' });
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileKey,
    });
    await s3.send(command);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Storage Delete]', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
