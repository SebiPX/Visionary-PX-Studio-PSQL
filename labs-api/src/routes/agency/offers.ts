import { Router } from 'express';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';
import { mocoFetch } from '../../services/mocoService';

const router = Router();

// GET /api/agency/offers/:id
// Fetches an offer from MOCO
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const offerId = req.params.id;
    const offer = await mocoFetch(`/offers/${offerId}`);
    res.json(offer);
  } catch (err: any) {
    console.error(`Error fetching offer ${req.params.id} from MOCO:`, err);
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

// GET /api/agency/offers
// Lists offers from MOCO
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const page = req.query.page || 1;
    const perPage = req.query.per_page || 100;
    const projectId = req.query.project_id;
    
    let endpoint = `/offers?page=${page}&per_page=${perPage}`;
    if (projectId) {
      endpoint += `&project_id=${projectId}`;
    }
    
    const offers = await mocoFetch(endpoint);
    res.json(offers);
  } catch (err: any) {
    console.error('Error listing offers from MOCO:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
