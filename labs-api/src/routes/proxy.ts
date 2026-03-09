import { Router, Request, Response } from 'express';
import { createHandler } from '@fal-ai/server-proxy/express';

const router = Router();

/**
 * All /api/proxy/fal
 * Proxies Fal.ai API requests securely using the FAL_KEY from server environment.
 */
router.all('/fal', createHandler());

/**
 * GET /api/proxy/download?url=...&filename=...
 * Proxies a file from R2 (or any URL) through the API to the browser.
 * Bypasses CORS since the fetch happens server-side.
 */
router.get('/download', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  const filename = (req.query.filename as string) || 'download';

  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  // Only allow our own R2 domain (security: prevent open proxy abuse)
  const allowed = [
    'pub-d71f227f82364d48b1b1ff491f0ce130.r2.dev',
    'cdn.labs-schickeria.com',
    'labs-schickeria.com',
    '42e817feef1a0fe73189800cbbe001d7.r2.cloudflarestorage.com',
  ];
  const parsed = new URL(url);
  if (!allowed.some(host => parsed.hostname === host)) {
    res.status(403).json({ error: 'Domain not allowed' });
    return;
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const safeFilename = encodeURIComponent(filename);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream the body to the browser
    const buffer = await upstream.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/proxy/image?url=...
 * Proxies Instagram/TikTok images to bypass annoying CORB/CORS blocking in the browser
 */
router.get('/image', async (req: Request, res: Response) => {
  const url = req.query.url as string;

  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.instagram.com/',
      }
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h

    const buffer = await upstream.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
