import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

const router = Router();

// POST /api/openrouter
// Proxies OpenRouter API calls — securely kept server-side
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY not configured on server' });
    return;
  }

  try {
    const { action, model, contents, systemInstruction } = req.body;

    if (action === 'generateContent') {
      const messages: any[] = [];

      // Add system instruction if present
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }

      // Transform Gemini contents format into OpenAI/OpenRouter messages format
      if (Array.isArray(contents)) {
        for (const item of contents) {
          const role = item.role === 'model' ? 'assistant' : 'user';
          
          if (!item.parts || !Array.isArray(item.parts)) continue;

          // Check if there are complex parts (like images)
          const hasImage = item.parts.some((p: any) => p.inlineData);
          
          if (hasImage) {
            const contentParts: any[] = [];
            for (const p of item.parts) {
              if (p.text) {
                contentParts.push({ type: 'text', text: p.text });
              } else if (p.inlineData) {
                const mimeType = p.inlineData.mimeType || 'image/png';
                const base64Data = p.inlineData.data;
                contentParts.push({
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`
                  }
                });
              }
            }
            messages.push({ role, content: contentParts });
          } else {
            // Simple text-only message
            const combinedText = item.parts.map((p: any) => p.text || '').join('');
            messages.push({ role, content: combinedText });
          }
        }
      }

      const openRouterBody = {
        model: model,
        messages: messages,
      };

      const orRes = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.VITE_API_URL || 'http://localhost:4000',
          'X-Title': 'PX-Studio'
        },
        body: JSON.stringify(openRouterBody),
      });
      
      const result = await orRes.json() as any;
      if (!orRes.ok) {
        res.status(orRes.status).json({ error: result?.error?.message || 'OpenRouter API error', details: result });
        return;
      }

      // Map response back to mimic the gemini structure output expected by the frontend
      const mappedResponse = {
        candidates: [
          {
            content: {
              parts: [
                { text: result.choices?.[0]?.message?.content || '' }
              ]
            }
          }
        ]
      };

      res.json(mappedResponse);
      return;
    }

    res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err: any) {
    console.error('[openrouter-proxy]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
