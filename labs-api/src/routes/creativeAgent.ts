import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const router = Router();

// GET /api/creative/projects - List all projects for user
router.get('/projects', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM px_creative_projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creative/projects/:id - Get specific project details
router.get('/projects/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const projectRes = await pool.query(
      'SELECT * FROM px_creative_projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (projectRes.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    
    // Also fetch matrices and concepts if they exist
    const matricesRes = await pool.query('SELECT * FROM px_creative_matrices WHERE project_id = $1', [req.params.id]);
    const conceptsRes = await pool.query('SELECT * FROM px_creative_concepts WHERE project_id = $1', [req.params.id]);

    res.json({
      ...projectRes.rows[0],
      matrices: matricesRes.rows,
      concepts: conceptsRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creative/projects - Create new project
router.post('/projects', requireAuth, async (req: AuthRequest, res: Response) => {
  const { title, occasion, guest_count, budget, season, industry, emotional_goals, target_audience, location_preference } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO px_creative_projects 
        (user_id, title, occasion, guest_count, budget, season, industry, emotional_goals, target_audience, location_preference, current_step)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'briefing') 
       RETURNING *`,
      [
        req.userId, 
        title ?? null, 
        occasion ?? null, 
        guest_count ?? null, 
        budget ?? null, 
        season ?? null, 
        industry ?? null, 
        emotional_goals ?? null, 
        target_audience ?? null, 
        location_preference ?? null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('[creative projects POST] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/creative/projects/:id - Update existing project (Auto-save)
router.patch('/projects/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { title, occasion, guest_count, budget, season, industry, emotional_goals, target_audience, location_preference, current_step } = req.body;
  try {
    const result = await pool.query(
      `UPDATE px_creative_projects
       SET title = COALESCE($1, title),
           occasion = COALESCE($2, occasion),
           guest_count = COALESCE($3, guest_count),
           budget = COALESCE($4, budget),
           season = COALESCE($5, season),
           industry = COALESCE($6, industry),
           emotional_goals = COALESCE($7, emotional_goals),
           target_audience = COALESCE($8, target_audience),
           location_preference = COALESCE($9, location_preference),
           current_step = COALESCE($10, current_step),
           updated_at = NOW()
       WHERE id = $11 AND user_id = $12
       RETURNING *`,
      [
        title ?? null,
        occasion ?? null,
        guest_count ?? null,
        budget ?? null,
        season ?? null,
        industry ?? null,
        emotional_goals ?? null,
        target_audience ?? null,
        location_preference ?? null,
        current_step ?? null,
        req.params.id,
        req.userId
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('[creative projects PATCH] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/creative/projects/:id
router.delete('/projects/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM px_creative_projects WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creative/projects/:id/matrix - Generate matrix for project via Gemini
router.post('/projects/:id/matrix', requireAuth, async (req: AuthRequest, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing' });

  try {
    // 1. Get project data
    const projectRes = await pool.query('SELECT * FROM px_creative_projects WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (projectRes.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    const project = projectRes.rows[0];

    // 2. Build Gemini prompt for Matrix Generation
    const prompt = `
Du bist ein Experte für unkonventionelle Kreativitätstechniken im Eventbereich.
Erstelle einen Morphologischen Kasten für folgendes Event-Vorhaben:
Anlass: ${project.occasion}
Teilnehmer: ${project.guest_count}
${project.budget ? `Budget: ${project.budget}\n` : ''}${project.season ? `Jahreszeit: ${project.season}\n` : ''}${project.industry ? `Branche: ${project.industry}\n` : ''}${project.emotional_goals ? `Zustand/Emotionen: ${project.emotional_goals}\n` : ''}

Erzeuge Kategorien (z.B. Location, Catering, Technik, Module) und füge pro Kategorie mindestens 5 Optionen hinzu.
WICHTIG:
- Davon sollen 2-3 Standard-Optionen sein (grün: sehr sinnvoll, machbar).
- Und 2-3 Out-of-the-Box, mutige Ideen (rot: schwerer machbar, aber extrem innovativ).
  
Antworte AUSSCHLIESSLICH im folgenden validen JSON-Format:
{
  "categories": [
    {
      "name": "Location",
      "options": [
        { "name": "Standard Hotel", "color": "green", "reason": "Einfach und erprobt" },
        { "name": "Verlassener Bahnhof", "color": "red", "reason": "Logistisch aufwändig, aber maximales Erlebnis" }
      ]
    }
  ]
}
`;

    // 3. Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
      })
    });
    
    if (!geminiRes.ok) {
        const errObj = await geminiRes.json() as any;
        return res.status(geminiRes.status).json({ error: 'Failed to generate matrix', details: errObj });
    }

    const data = await geminiRes.json() as any;
    const textResp = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResp) throw new Error("Keine valide Antwort von der KI erhalten");

    const matrixData = JSON.parse(textResp);

    // 4. Save to Database (UPSERT or INSERT missing, typical is UPSERT or delete old first)
    await pool.query('DELETE FROM px_creative_matrices WHERE project_id = $1', [project.id]);
    const matrixInsertRes = await pool.query(
      `INSERT INTO px_creative_matrices (project_id, matrix_data) VALUES ($1, $2::jsonb) RETURNING *`,
      [project.id, JSON.stringify(matrixData)]
    );

    // Update current_step
    await pool.query('UPDATE px_creative_projects SET current_step = $1 WHERE id = $2', ['matrix', project.id]);
    res.json(matrixInsertRes.rows[0]);
  } catch (err: any) {
    console.error('[Generate Matrix] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creative/projects/:id/concepts - Generate AI Concepts & SCAMPER Refinement
router.post('/projects/:id/concepts', requireAuth, async (req: AuthRequest, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing' });

  const { userConcepts } = req.body; // Expected: array of 2 objects with selected parameters
  if (!Array.isArray(userConcepts)) return res.status(400).json({ error: 'userConcepts array required' });

  try {
    // 1. Fetch Project and Matrix
    const projectRes = await pool.query('SELECT * FROM px_creative_projects WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (projectRes.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    const project = projectRes.rows[0];

    const matrixRes = await pool.query('SELECT * FROM px_creative_matrices WHERE project_id = $1', [project.id]);
    const matrixData = matrixRes.rows.length > 0 ? matrixRes.rows[0].matrix_data : {};

    // 2. Build Gemini prompt
    const prompt = `
Du bist ein renommierter Event-Kreativdirektor.
Hier ist das Briefing:
Anlass: ${project.occasion}, Teilnehmer: ${project.guest_count}, Budget: ${project.budget || 'Offen'}

Hier ist der Morphologische Kasten (Matrix), der dafür generiert wurde:
${JSON.stringify(matrixData, null, 2)}

Der User hat bereits 2 Favoriten-Konzepte aus der Matrix gewählt:
Konzepte des Users:
${JSON.stringify(userConcepts, null, 2)}

DEINE AUFGABE:
1. Erstelle 2 weitere, eigene KI-Konzepte (Wähle dazu Parameter aus der Matrix, die extrem "Out-of-the-Box" und innovativ sind).
2. Wende nun auf ALLE 4 Konzepte (die 2 vom User + deine 2) die SCAMPER-Methode an (Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse), um jedem Konzept einen einzigartigen "Wow-Faktor" zu verleihen.
3. Bewerte jedes der 4 Konzepte auf der How-Now-Wow-Skala:
   - "how": Sehr innovativ, aber schwer machbar / teuer.
   - "now": Bekannt, erprobt, einfach machbar.
   - "wow": Extrem kreativ, neuartig, aber absolut umsetzbar.
4. Schätze für jedes Konzept eine Budget-Kategorie (z.B. "$", "$$", "$$$").

Antworte AUSSCHLIESSLICH im folgenden validen JSON-Format:
{
  "concepts": [
    {
      "source": "user", // oder "ai"
      "parameters": { "Location": "...", "Catering": "..." }, // Die gewählten Matrix-Punkte
      "scamper_refinements": {
        "idea": "Der Wow-Faktor durch SCAMPER beschrieben..."
      },
      "how_now_wow": "wow",
      "budget_estimation": "$$"
    }
  ]
}
`;

    // 3. Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.8 }
      })
    });
    
    if (!geminiRes.ok) {
        const errObj = await geminiRes.json() as any;
        return res.status(geminiRes.status).json({ error: 'Failed to generate concepts', details: errObj });
    }

    const data = await geminiRes.json() as any;
    const textResp = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResp) throw new Error("Keine valide Antwort von der KI erhalten");

    const parsedData = JSON.parse(textResp);
    const concepts = parsedData.concepts || [];

    // 4. Save to Database
    await pool.query('DELETE FROM px_creative_concepts WHERE project_id = $1', [project.id]);
    
    for (const concept of concepts) {
        await pool.query(
          `INSERT INTO px_creative_concepts (project_id, concept_type, selected_parameters, scamper_refinements, how_now_wow_score, budget_estimation)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)`,
          [project.id, concept.source, JSON.stringify(concept.parameters), JSON.stringify(concept.scamper_refinements), concept.how_now_wow, concept.budget_estimation]
        );
    }

    // Update current_step
    await pool.query('UPDATE px_creative_projects SET current_step = $1 WHERE id = $2', ['scamper', project.id]);

    const finalConcepts = await pool.query('SELECT * FROM px_creative_concepts WHERE project_id = $1', [project.id]);
    res.json(finalConcepts.rows);

  } catch (err: any) {
    console.error('[Generate Concepts] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
// PATCH /api/creative/projects/:id/concepts/:conceptId/select - Mark concept as final
router.patch('/projects/:id/concepts/:conceptId/select', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Reset all to false
    await pool.query('UPDATE px_creative_concepts SET is_final_choice = FALSE WHERE project_id = $1', [req.params.id]);
    // Set selected to true
    await pool.query('UPDATE px_creative_concepts SET is_final_choice = TRUE WHERE id = $1 AND project_id = $2', [req.params.conceptId, req.params.id]);
    // Update project step
    await pool.query('UPDATE px_creative_projects SET current_step = $1 WHERE id = $2', ['finished', req.params.id]);
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Select Concept] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
