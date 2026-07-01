import { Router } from 'express';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';
import { mocoFetch } from '../../services/mocoService';
import pool from '../../db';

const router = Router();

// GET /api/agency/offers/:id
// Fetches an offer from MOCO and overrides with local database draft values if a draft exists
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const offerId = parseInt(req.params.id, 10);
    if (isNaN(offerId)) {
      return res.status(400).json({ error: 'Ungültige Angebots ID.' });
    }
    
    // 1. Fetch live metadata from MOCO
    const offer = await mocoFetch(`/offers/${offerId}`);
    if (!offer) {
      return res.status(404).json({ error: 'Angebot in MOCO nicht gefunden.' });
    }
    
    // 2. See if we have a persistent draft in our PostgreSQL labs_db database
    const draftRes = await pool.query(
      'SELECT items_json, updated_at FROM public.agency_moco_offer_drafts WHERE moco_offer_id = $1',
      [offerId]
    );

    let hasLocalDraft = false;
    let draftItems: any[] = [];
    let draftUpdatedAt: string | null = null;

    if (draftRes.rows.length > 0) {
      hasLocalDraft = true;
      draftItems = draftRes.rows[0].items_json;
      draftUpdatedAt = draftRes.rows[0].updated_at;
    }

    // Pass the draft properties back inside the response
    res.json({
      ...offer,
      hasLocalDraft,
      draftUpdatedAt,
      draftItems
    });
  } catch (err: any) {
    console.error(`Error fetching offer ${req.params.id} from MOCO:`, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/offers/:id/draft
// Saves/Auto-saves a temporary local draft of the offer (groupings, quantity overrides, optional states)
router.post('/:id/draft', requireAuth, async (req: AuthRequest, res) => {
  try {
    const offerId = parseInt(req.params.id, 10);
    const { items, title, projectId } = req.body;
    const userId = req.userId;

    if (isNaN(offerId)) {
      return res.status(400).json({ error: 'Ungültige ID.' });
    }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Ungültiges Items-Array.' });
    }

    // Upsert into agency_moco_offer_drafts
    const query = `
      INSERT INTO public.agency_moco_offer_drafts (moco_offer_id, project_id, title, items_json, last_edited_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (moco_offer_id) 
      DO UPDATE SET 
        project_id = EXCLUDED.project_id,
        title = EXCLUDED.title,
        items_json = EXCLUDED.items_json,
        last_edited_by = EXCLUDED.last_edited_by,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await pool.query(query, [
      offerId,
      projectId || null,
      title || 'Angebot-Entwurf',
      JSON.stringify(items),
      userId || null
    ]);

    res.json({
      success: true,
      draft: result.rows[0]
    });
  } catch (err: any) {
    console.error(`Error saving offer draft for ID ${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agency/offers/:id/draft
// Deletes/Resets the local draft to revert strictly to live MOCO states
router.delete('/:id/draft', requireAuth, async (req: AuthRequest, res) => {
  try {
    const offerId = parseInt(req.params.id, 10);
    if (isNaN(offerId)) {
      return res.status(400).json({ error: 'Ungültige ID.' });
    }

    await pool.query(
      'DELETE FROM public.agency_moco_offer_drafts WHERE moco_offer_id = $1',
      [offerId]
    );

    res.json({ success: true, message: 'Lokaler Entwurf erfolgreich gelöscht.' });
  } catch (err: any) {
    console.error(`Error resetting offer draft for ID ${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/offers/:id
// Updates an offer in MOCO with modified items/properties
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const offerId = req.params.id;
    const body = req.body;
    
    // We proxy the PUT payload straight to MOCO
    const updatedOffer = await mocoFetch(`/offers/${offerId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    res.json(updatedOffer);
  } catch (err: any) {
    console.error(`Error updating offer ${req.params.id} in MOCO:`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
