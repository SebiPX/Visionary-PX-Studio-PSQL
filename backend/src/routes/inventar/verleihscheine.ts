import { Router, Response } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// Helper: fetch verleihscheine by status with joined items
async function fetchByStatus(status: 'aktiv' | 'erledigt') {
  const scheine = await pool.query(
    `SELECT v.*,
       json_build_object('id', p.id, 'full_name', p.full_name, 'email', p.email) AS profile
     FROM verleihscheine v
     LEFT JOIN profiles p ON p.id = v.profile_id
     WHERE v.status = $1
     ORDER BY v.erledigt_am DESC NULLS FIRST, v.created_at DESC`,
    [status]
  );
  if (scheine.rows.length === 0) return [];

  const ids = scheine.rows.map((s: any) => s.id);
  const lineItems = await pool.query(
    `SELECT vi.*,
       json_build_object(
         'id', i.id, 'geraet', i.geraet, 'modell', i.modell,
         'px_nummer', i.px_nummer, 'status', i.status
       ) AS item
     FROM verleihschein_items vi
     LEFT JOIN inventar_items i ON i.id = vi.item_id
     WHERE vi.verleihschein_id = ANY($1::uuid[])`,
    [ids]
  );

  const bySchein = new Map<string, any[]>();
  for (const li of lineItems.rows) {
    if (!bySchein.has(li.verleihschein_id)) bySchein.set(li.verleihschein_id, []);
    bySchein.get(li.verleihschein_id)!.push(li);
  }
  return scheine.rows.map((s: any) => ({ ...s, items: bySchein.get(s.id) || [] }));
}

// GET /api/inventar/verleihscheine?status=aktiv|erledigt
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const status = (req.query.status as string) || 'aktiv';
  if (!['aktiv', 'erledigt'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    res.json(await fetchByStatus(status as 'aktiv' | 'erledigt'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventar/verleihscheine — creates schein + line items + marks items Ausgeliehen
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { header, items } = req.body as {
    header: any;
    items: { item_id: string; anschaffungspreis: number | null; tagespreis: number | null; gesamtpreis: number | null }[];
  };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const scheinRes = await client.query(
      `INSERT INTO verleihscheine
         (borrower_type, profile_id, extern_name, extern_firma, extern_email,
          extern_telefon, abholzeit, rueckgabezeit, prozentsatz,
          gesamtkosten, zweck, notizen, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [header.borrower_type, header.profile_id, header.extern_name,
       header.extern_firma, header.extern_email, header.extern_telefon,
       header.abholzeit, header.rueckgabezeit, header.prozentsatz,
       header.gesamtkosten, header.zweck, header.notizen, header.created_by]
    );
    const schein = scheinRes.rows[0];

    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO verleihschein_items (verleihschein_id, item_id, anschaffungspreis, tagespreis, gesamtpreis)
           VALUES ($1,$2,$3,$4,$5)`,
          [schein.id, item.item_id, item.anschaffungspreis, item.tagespreis, item.gesamtpreis]
        );
        await client.query(
          `UPDATE inventar_items SET status = 'Ausgeliehen', updated_at = NOW() WHERE id = $1`,
          [item.item_id]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(schein);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/inventar/verleihscheine/:id/erledigt — mark done + restore item statuses
router.patch('/:id/erledigt', requireAuth, async (req: AuthRequest, res: Response) => {
  const { itemIds } = req.body as { itemIds: string[] };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE verleihscheine SET status = 'erledigt', erledigt_am = NOW() WHERE id = $1`,
      [req.params.id]
    );
    for (const itemId of (itemIds || [])) {
      await client.query(
        `UPDATE inventar_items SET status = 'Vorhanden', updated_at = NOW() WHERE id = $1`,
        [itemId]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
