import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const router = Router();

/**
 * POST /api/rag
 *
 * Receives a pre-computed embedding vector from the frontend and returns
 * the top-N matching onboarding doc chunks via cosine similarity.
 *
 * Body: { embedding: number[], match_count?: number }
 * Returns: { heading: string; content: string }[]
 *
 * Note: This requires pgvector extension on labs_db and the
 * onboarding_embeddings table to have a "vector" column.
 * If pgvector is not installed, falls back to returning an empty array
 * so the chatbot still works (just without RAG context).
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { embedding, match_count = 5 } = req.body as {
    embedding: number[];
    match_count?: number;
  };

  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    return res.status(400).json({ error: 'embedding array is required' });
  }

  // Clamp match_count to a safe range
  const limit = Math.min(Math.max(Number(match_count) || 5, 1), 20);

  try {
    // ── pgvector cosine similarity search ────────────────────────────────
    // Requires: CREATE EXTENSION vector;
    // Column "embedding" must be type vector(N) in onboarding_embeddings
    const vectorLiteral = `[${embedding.join(',')}]`;

    const result = await pool.query<{ heading: string; content: string }>(
      `SELECT heading, content
       FROM onboarding_embeddings
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorLiteral, limit]
    );

    res.json(result.rows);
  } catch (err: any) {
    // If pgvector is not installed or column doesn't exist, return empty
    // so the chatbot degrades gracefully rather than crashing
    if (
      err.message?.includes('does not exist') ||
      err.message?.includes('operator does not exist') ||
      err.message?.includes('type "vector"')
    ) {
      console.warn('[rag] pgvector not available — returning empty context:', err.message);
      return res.json([]);
    }
    console.error('[rag]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
