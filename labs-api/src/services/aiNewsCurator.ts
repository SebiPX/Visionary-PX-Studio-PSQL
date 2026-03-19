import pool from '../db';

export async function curateAiNews() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No GEMINI_API_KEY found');

  // We use gemini-2.5-flash as it supports googleSearch out of the box mostly
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `Suche über Google nach den 3 wichtigsten und relevantesten News aus den Bereichen KI (Künstliche Intelligenz), LLMs, Video-Gen und generativer AI der letzten 24-48 Stunden.
Fasse jede News kurz und prägnant in 2-4 Sätzen auf Deutsch zusammen. 
Zielgruppe ist das Team einer modernen digitalen KI-Kreationsagentur.
Formatiere den Text als sauberes, schlichtes Markdown mit Bullet Points für jede News. 
Nutze kleine Überschriften für die Themen wenn sinnvoll.
Keine Begrüßung am Anfang, keine Schlussformel. Nenne die Nachrichtenquellen beiläufig im Text (z.B. "wie OpenAI gestern bekanntgab").`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json() as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No text returned from Gemini: ' + JSON.stringify(data));
  }

  // Clean up any potential markdown code blocks if the bot wraps it all in ```markdown
  let cleanText = text.trim();
  if (cleanText.startsWith('```markdown')) {
    cleanText = cleanText.substring(11);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }

  // Speichere in DB als external news
  const { rows } = await pool.query(
    `INSERT INTO agency_news (title, content, type, publish_date, is_active)
     VALUES ($1, $2, $3, NOW(), TRUE)
     RETURNING *`,
    ['Daily AI Update', cleanText.trim(), 'external']
  );

  return rows[0];
}
