import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';
import { request } from 'https';
import { URL } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function uploadBase64ToR2(base64Data: string, mimeType: string): Promise<string> {
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = mimeType.split('/')[1] || 'png';
  const key = `uploads/${uuidv4()}.${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

function postRequest(urlStr: string, headers: any, bodyObj: any): Promise<{ status: number, text: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const body = JSON.stringify(bodyObj);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk.toString();
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode || 200,
          text: responseData
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

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
      const isVideoModel = model && (
        model.includes('video') ||
        model.includes('wan') ||
        model.includes('sora') ||
        model.includes('veo') ||
        model.includes('seedance') ||
        model.includes('hailuo') ||
        model.includes('kling')
      );

      if (isVideoModel) {
        let promptText = '';
        let base64Image = '';
        let base64Mime = 'image/png';
        if (Array.isArray(contents)) {
          for (const item of contents) {
            if (item.parts && Array.isArray(item.parts)) {
              for (const p of item.parts) {
                if (p.text) {
                  promptText += (promptText ? ' ' : '') + p.text;
                } else if (p.inlineData) {
                  base64Image = p.inlineData.data;
                  base64Mime = p.inlineData.mimeType || 'image/png';
                }
              }
            }
          }
        }

        let imageUrl = '';
        if (base64Image) {
          try {
            imageUrl = await uploadBase64ToR2(base64Image, base64Mime);
          } catch (e: any) {
            console.error('Failed to upload base64 image to R2 for OpenRouter Video API:', e);
          }
        }

        const payload: any = {
          model: model,
          prompt: promptText
        };
        if (imageUrl) {
          payload.frame_images = [
            {
              url: imageUrl,
              frame_type: 'first_frame'
            }
          ];
        }

        const submitRes = await fetch('https://openrouter.ai/api/v1/videos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.VITE_API_URL || 'http://localhost:4000',
            'X-Title': 'PX-Studio'
          },
          body: JSON.stringify(payload)
        });

        const submitData: any = await submitRes.json();
        if (submitRes.status < 200 || submitRes.status >= 300 || !submitData.id) {
          res.status(submitRes.status || 400).json({
            error: submitData.error?.message || 'OpenRouter Video submission failed',
            details: submitData
          });
          return;
        }

        // Poll the job status
        const jobId = submitData.id;
        const pollUrl = `https://openrouter.ai/api/v1/videos/${jobId}`;
        let completedData: any = null;
        let success = false;

        // Poll every 5s up to 30 times (150 seconds total timeout)
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          const pollRes = await fetch(pollUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          const pollData: any = await pollRes.json();
          if (pollData.status === 'completed') {
            completedData = pollData;
            success = true;
            break;
          } else if (pollData.status === 'failed') {
            res.status(400).json({ error: 'OpenRouter video generation failed', details: pollData });
            return;
          }
        }

        if (!success || !completedData || !completedData.unsigned_urls || completedData.unsigned_urls.length === 0) {
          res.status(504).json({ error: 'Video generation timed out on OpenRouter' });
          return;
        }

        // Download the generated video file
        const videoUrl = completedData.unsigned_urls[0];
        const videoFetch = await fetch(videoUrl, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const arrayBuffer = await videoFetch.arrayBuffer();
        const base64Video = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = videoFetch.headers.get('content-type') || 'video/mp4';

        const mappedResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Video
                    }
                  }
                ]
              }
            }
          ]
        };

        res.json(mappedResponse);
        return;
      }

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

      // If user specified modalities or if it's an image/video model, add it
      if (req.body.modalities) {
        openRouterBody.modalities = req.body.modalities;
      } else if (
        model && (
          model.includes('video') ||
          model.includes('wan') ||
          model.includes('sora') ||
          model.includes('veo') ||
          model.includes('seedance') ||
          model.includes('hailuo') ||
          model.includes('kling')
        )
      ) {
        openRouterBody.modalities = ['video'];
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

      const orRes = await postRequest(`${OPENROUTER_BASE}/chat/completions`, {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.VITE_API_URL || 'http://localhost:4000',
        'X-Title': 'PX-Studio'
      }, openRouterBody);
      
      const responseText = orRes.text;
      let result: any = {};
      try {
        result = JSON.parse(responseText.trim());
      } catch (e) {
        console.error('Failed to parse OpenRouter response as JSON:', responseText);
        res.status(orRes.status).json({ error: `OpenRouter returned invalid response (status ${orRes.status})`, details: responseText });
        return;
      }

      if (orRes.status < 200 || orRes.status >= 300) {
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
        const videos = assistantMessage.videos || assistantMessage.video_url;
        if (Array.isArray(videos)) {
          for (const vid of videos) {
            const url = vid.video_url?.url || vid.url || vid;
            if (url && typeof url === 'string') {
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
                  const videoFetch = await fetch(url);
                  const arrayBuffer = await videoFetch.arrayBuffer();
                  const base64 = Buffer.from(arrayBuffer).toString('base64');
                  const mimeType = videoFetch.headers.get('content-type') || 'video/mp4';
                  parts.push({
                    inlineData: {
                      mimeType,
                      data: base64
                    }
                  });
                } catch (e) {
                  console.error('Failed to fetch remote video url from OpenRouter response:', e);
                }
              }
            }
          }
        } else if (videos) {
          const url = typeof videos === 'string' ? videos : (videos.video_url?.url || videos.url);
          if (url && typeof url === 'string') {
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
                const videoFetch = await fetch(url);
                const arrayBuffer = await videoFetch.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                const mimeType = videoFetch.headers.get('content-type') || 'video/mp4';
                parts.push({
                  inlineData: {
                    mimeType,
                    data: base64
                  }
                });
              } catch (e) {
                console.error('Failed to fetch remote video url from OpenRouter response:', e);
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
