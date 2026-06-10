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

      const openRouterBody: any = {
        model: model,
        messages: messages,
      };

      // If user specified modalities or if it's an image model, add it
      if (req.body.modalities) {
        openRouterBody.modalities = req.body.modalities;
      } else if (
        model && (
          model.includes('image') ||
          model.includes('flux') ||
          model.includes('riverflow') ||
          model.includes('sdxl') ||
          model.includes('stable-diffusion') ||
          model.includes('midjourney') ||
          model.includes('seedream')
        )
      ) {
        openRouterBody.modalities = ['image'];
      }

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
      
      const responseText = await orRes.text();
      let result: any = {};
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse OpenRouter response as JSON:', responseText);
        res.status(orRes.status).json({ error: `OpenRouter returned invalid response (status ${orRes.status})`, details: responseText });
        return;
      }

      if (!orRes.ok) {
        res.status(orRes.status).json({ error: result?.error?.message || 'OpenRouter API error', details: result });
        return;
      }

      // Map response back to mimic the gemini structure output expected by the frontend
      const parts: any[] = [];
      const assistantMessage = result?.choices?.[0]?.message;

      if (assistantMessage) {
        if (assistantMessage.content) {
          parts.push({ text: assistantMessage.content });
        }

        const images = assistantMessage.images || assistantMessage.image_url;
        if (Array.isArray(images)) {
          for (const img of images) {
            const url = img.image_url?.url || img.url;
            if (url) {
              if (url.startsWith('data:')) {
                const match = url.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                  parts.push({
                    inlineData: {
                      mimeType: match[1],
                      data: match[2]
                    }
                  });
                }
              } else {
                try {
                  const imageFetch = await fetch(url);
                  const arrayBuffer = await imageFetch.arrayBuffer();
                  const base64 = Buffer.from(arrayBuffer).toString('base64');
                  const mimeType = imageFetch.headers.get('content-type') || 'image/png';
                  parts.push({
                    inlineData: {
                      mimeType,
                      data: base64
                    }
                  });
                } catch (e) {
                  console.error('Failed to fetch remote image url from OpenRouter response:', e);
                }
              }
            }
          }
        } else if (images && typeof images === 'object') {
          const url = images.image_url?.url || images.url;
          if (url) {
            if (url.startsWith('data:')) {
              const match = url.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                parts.push({
                  inlineData: {
                    mimeType: match[1],
                    data: match[2]
                  }
                });
              }
            } else {
              try {
                const imageFetch = await fetch(url);
                const arrayBuffer = await imageFetch.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                const mimeType = imageFetch.headers.get('content-type') || 'image/png';
                parts.push({
                  inlineData: {
                    mimeType,
                    data: base64
                  }
                });
              } catch (e) {
                console.error('Failed to fetch remote image url from OpenRouter response:', e);
              }
            }
          }
        }
      }

      if (parts.length === 0) {
        parts.push({ text: assistantMessage?.content || '' });
      }

      const mappedResponse = {
        candidates: [
          {
            content: {
              parts: parts
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
