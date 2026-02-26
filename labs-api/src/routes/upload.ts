import { Router, Response } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

// Cloudflare R2 client (S3-compatible API)
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// multer: store in memory (buffer), not disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

const router = Router();

// POST /api/upload
// Body: multipart/form-data with `file` field
// Optional query: ?folder=images|videos|thumbnails|sketches|storyboards|avatars
router.post('/', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  const folder = (req.query.folder as string) || 'uploads';
  const ext = path.extname(req.file.originalname) || '.bin';
  const key = `${folder}/${uuidv4()}${ext}`;

  try {
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      CacheControl: 'public, max-age=31536000',
    }));

    // Public URL via R2 custom domain (set R2_PUBLIC_URL in .env)
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    res.json({ url: publicUrl, key });
  } catch (err: any) {
    console.error('[upload] R2 error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
