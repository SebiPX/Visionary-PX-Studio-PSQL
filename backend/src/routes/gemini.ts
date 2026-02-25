import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const router = Router();

// POST /api/gemini
// Proxies all Gemini API calls — API key stays server-side
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    return;
  }

  try {
    const { action, model, contents, config, systemInstruction, tools, prompt, image, operation } = req.body;

    // ---- generateContent (text, image generation, sketch) ----
    if (action === 'generateContent') {
      const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;
      const geminiBody: Record<string, unknown> = { contents };
      if (systemInstruction) geminiBody.systemInstruction = { parts: [{ text: systemInstruction }] };
      if (config) geminiBody.generationConfig = config;
      if (tools) geminiBody.tools = tools;

      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });
      const result = await geminiRes.json() as any;
      if (!geminiRes.ok) {
        res.status(geminiRes.status).json({ error: result?.error?.message || 'Gemini API error', details: result });
        return;
      }
      res.json(result);
      return;
    }

    // ---- generateVideos (VideoStudio — Veo) ----
    if (action === 'generateVideos') {
      const url = `${GEMINI_BASE}/models/${model}:predictLongRunning?key=${apiKey}`;
      const geminiBody: Record<string, unknown> = {
        instances: [{ prompt, ...(image ? { image } : {}) }],
        parameters: config || {},
      };
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });
      const result = await geminiRes.json() as any;
      res.json(result);
      return;
    }

    // ---- getVideosOperation (polling for Veo) ----
    if (action === 'getVideosOperation') {
      const url = `${GEMINI_BASE}/${operation?.name}?key=${apiKey}`;
      const geminiRes = await fetch(url);
      const result = await geminiRes.json() as any;
      res.json(result);
      return;
    }

    // ---- embedContent (RAG chatbot) ----
    if (action === 'embedContent') {
      const url = `${GEMINI_BASE}/models/${model}:embedContent?key=${apiKey}`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text: contents }] } }),
      });
      const result = await geminiRes.json() as any;
      res.json(result);
      return;
    }

    res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err: any) {
    console.error('[gemini-proxy]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
