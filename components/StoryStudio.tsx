import React, { useState, useEffect } from 'react';

import { useStoryboard } from '../hooks/useStoryboard';
import { StoryboardSession, StoryAsset, StoryShot } from '../types';
import { uploadFile, normalizeStorageUrl, geminiProxy } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { ShotEditor } from './ShotEditor';
import { SetupPhase, StoryPhase, StoryboardPhase, ReviewPhase } from './StoryStudio/phases';

type Phase = 'setup' | 'story' | 'storyboard' | 'review';

export const StoryStudio: React.FC = () => {
    const { user } = useAuth();
    const { saveStoryboard, loadStoryboards } = useStoryboard();

    const [currentPhase, setCurrentPhase] = useState<Phase>('setup');
    const [sessionTitle, setSessionTitle] = useState('Untitled Storyboard');
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Assets state
    const [actors, setActors] = useState<StoryAsset[]>([]);
    const [environment, setEnvironment] = useState<StoryAsset | null>(null);
    const [product, setProduct] = useState<StoryAsset | null>(null);

    // Story state
    const [storyText, setStoryText] = useState('');
    const [genre, setGenre] = useState('');
    const [mood, setMood] = useState('');
    const [targetAudience, setTargetAudience] = useState('');

    // Storyboard style
    const [storyboardStyle, setStoryboardStyle] = useState<string>('realistic');

    // Storyboard state
    const [shots, setShots] = useState<StoryShot[]>([]);
    const [editingShot, setEditingShot] = useState<StoryShot | null>(null);

    // UI state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingAssetId, setGeneratingAssetId] = useState<string | null>(null);
    const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);
    const [history, setHistory] = useState<StoryboardSession[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [savedFeedback, setSavedFeedback] = useState(false);

    // Load history on mount
    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const { data, error } = await loadStoryboards();
        if (!error && data) {
            setHistory(data as any);
        }
    };

    // Initialize default assets
    useEffect(() => {
        if (actors.length === 0) {
            setActors([
                { id: '1', type: 'actor', name: 'Actor 1', description: '', image_url: '', source: 'upload', created_at: new Date().toISOString() },
                { id: '2', type: 'actor', name: 'Actor 2', description: '', image_url: '', source: 'upload', created_at: new Date().toISOString() },
                { id: '3', type: 'actor', name: 'Actor 3', description: '', image_url: '', source: 'upload', created_at: new Date().toISOString() },
            ]);
        }
        if (!environment) {
            setEnvironment({ id: 'env-1', type: 'environment', name: 'Environment', description: '', image_url: '', source: 'upload', created_at: new Date().toISOString() });
        }
        if (!product) {
            setProduct({ id: 'prod-1', type: 'product', name: 'Product', description: '', image_url: '', source: 'upload', created_at: new Date().toISOString() });
        }
    }, []);

    const handleSave = async () => {
        const allAssets = [...actors];
        if (environment) allAssets.push(environment);
        if (product) allAssets.push(product);

        const sessionData: Partial<StoryboardSession> = {
            id: sessionId || undefined,
            title: sessionTitle,
            config: {
                story_text: storyText,
                genre,
                mood,
                target_audience: targetAudience,
            },
            assets: allAssets,
            shots,
            num_shots: shots.length,
        };

        const { data, error } = await saveStoryboard(sessionData);
        if (!error && data) {
            setSessionId(data.id);
            setLastSaved(new Date());
            setSavedFeedback(true);
            setTimeout(() => setSavedFeedback(false), 3000);
            await loadHistory();
        }
    };

    // Auto-save on every phase transition — fire-and-forget, UI switches immediately
    const navigateTo = (phase: Phase) => {
        handleSave().catch(err => console.warn('[auto-save] Phase transition save failed:', err));
        setCurrentPhase(phase);
    };

    const loadSession = (session: StoryboardSession) => {
        setSessionId(session.id);
        setSessionTitle(session.title || 'Untitled Storyboard');
        setStoryText(session.config.story_text || '');
        setGenre(session.config.genre || '');
        setMood(session.config.mood || '');
        setTargetAudience(session.config.target_audience || '');

        const loadedActors = session.assets.filter(a => a.type === 'actor');
        const loadedEnv = session.assets.find(a => a.type === 'environment');
        const loadedProd = session.assets.find(a => a.type === 'product');

        setActors(loadedActors);
        setEnvironment(loadedEnv || null);
        setProduct(loadedProd || null);
        setShots(session.shots);
    };

    // Upload raw image to Cloudflare R2 (returns URL, no state update here)
    const uploadAssetImage = async (file: File, assetId: string): Promise<string | null> => {
        if (!user) return null;

        setUploadingAssetId(assetId);
        try {
            const publicUrl = await uploadFile(file, 'storyboard-assets');
            return `${publicUrl}?t=${Date.now()}`;
        } catch (err) {
            console.error('Upload error:', err);
            setError('Fehler beim Hochladen des Bildes');
            return null;
        } finally {
            setUploadingAssetId(null);
        }
    };

    // Generate image with AI
    // i2i source is always ref_image_url (never the generated image_url)
    const generateAssetImage = async (asset: StoryAsset): Promise<string | null> => {
        if (!user) return null;

        setGeneratingAssetId(asset.id);
        try {
            // i2i source is the uploaded reference, never the generated result
            const hasRefImage = !!asset.ref_image_url;
            const isActor = asset.type === 'actor';

            // --- Prompt system ---
            // Actors: professional multi-angle photographic identity sheet
            // Environments/Products: simpler cinematic prompt
            let imagePrompt: string;

            if (isActor) {
                const descriptionLine = asset.description
                    ? `Person description: ${asset.description}.`
                    : '';

                if (asset.is_character_sheet && hasRefImage) {
                    // Wardrobe-change mode: ref IS already a character sheet, only change clothing
                    imagePrompt = `Use the uploaded photographic identity sheet as reference.

Maintain the EXACT same person: face, body, age, proportions, posture, and expression across all views.

Change ONLY the clothing/styling to the following:
${asset.description ? asset.description : '(no specific outfit described)'}

Constraints:
- Clothing must behave like real fabric on a real body.
- No change to lighting, camera angle, or body posture.
- No change to the layout — preserve the same contact sheet format.
- The person must still feel like the same individual photographed on the same day, just wearing different clothes.
- No stylization, no CGI look, no character redesign.
- NOT a 3D render. NOT CGI. NOT stylized.
${genre ? `Genre context: ${genre}.` : ''}${mood ? ` Mood: ${mood}.` : ''}`;
                } else if (hasRefImage) {
                    imagePrompt = `Create a photorealistic multi-angle photographic identity sheet based strictly on the uploaded reference image.

CRITICAL IDENTITY LOCK — ALL 8 PANELS MUST SHOW THE EXACT SAME PERSON:
- This is ONE real person photographed 8 times from different angles. Not 8 different people.
- Preserve with 100% accuracy: face shape, bone structure, eye color, skin tone, age, hair, any asymmetry or imperfection.
- The face in panel 1 (full-body front) must be recognizably identical to the face in panel 5 (close-up front). If they look like different people, the result is wrong.
- The reference image defines this person's identity. Do not idealize, smooth over, or alter any facial feature.

CHARACTER CONTEXT (apply to all 8 panels):
- Name: ${asset.name}.${asset.description ? `\n- Appearance/Styling: ${asset.description}.` : ''}${genre ? `\n- Genre context: ${genre}.` : ''}${mood ? `\n- Mood: ${mood}.` : ''}

LAYOUT — 2 rows × 4 columns (8 panels total, like a professional character turnaround sheet):

Top row — 4 full-body photographs (head to feet), evenly spaced rotational angles:
  Panel 1: Facing directly at camera (0° — front view)
  Panel 2: Turned 45° to the left (¾ view)
  Panel 3: Turned 90° to the left (full left-side profile)
  Panel 4: Turned 180° — back fully facing camera (rear view)

Bottom row — 4 close-up head/shoulder portraits, matching the exact same rotational angles as the top row:
  Panel 5: Facing directly at camera (0° — front close-up)
  Panel 6: Turned 45° to the left (¾ close-up)
  Panel 7: Turned 90° to the left (full left-side profile close-up)
  Panel 8: Turned 180° — back of head (rear close-up)

Division: clean white or light grey border lines between all panels. Consistent neutral studio background behind subject.

Pose: relaxed, natural stance in all full-body panels. Arms resting at sides. No exaggerated or dramatic pose.

Lighting: consistent soft studio lighting (softbox or window light) across all 8 panels. Same light direction, same exposure. No dramatic shadows.

NOT a 3D render. NOT CGI. NOT stylized. NOT illustrated. Real photographic studio imagery.`;
                } else {
                    imagePrompt = `Create a photorealistic photographic character identity sheet of the following person:

Subject:
${descriptionLine}
Name: ${asset.name}.

CRITICAL IDENTITY LOCK — ALL 8 PANELS MUST SHOW THE EXACT SAME PERSON:
- This is ONE real person photographed 8 times from different angles. Not 8 different people.
- Maintain 100% consistent face shape, bone structure, eye color, skin tone, age, and hair across all panels.
- The face seen from the front (panels 1 and 5) must be clearly the same individual as the profiles and rear view.
- Do not idealize or smooth the character — preserve natural asymmetry and real human features.

LAYOUT — 2 rows × 4 columns (8 panels total):

Top row — 4 full-body photographs (head to feet):
  Panel 1: Facing directly at camera (0° — front view)
  Panel 2: Turned 45° to the left (¾ view)
  Panel 3: Turned 90° to the left (full left-side profile)
  Panel 4: Turned 180° — back fully facing camera

Bottom row — 4 close-up head/shoulder portraits at the same angles:
  Panel 5: Facing directly at camera (0°)
  Panel 6: Turned 45° to the left (¾ close-up)
  Panel 7: Turned 90° to the left (full left-side profile)
  Panel 8: Turned 180° — back of head

Division: clean separator lines between all panels. Neutral studio background behind subject.

Pose: relaxed natural stance. Arms at sides. No posed or dramatic stance.

Lighting: soft consistent studio lighting across all 8 panels.

NOT a 3D render. NOT CGI. NOT stylized. NOT illustrated. Real photographic studio imagery.${genre ? ` Genre context: ${genre}.` : ''}${mood ? ` Mood: ${mood}.` : ''}`;
                }
            } else if (asset.type === 'product') {
                // Product: multi-angle turnaround reference sheet
                const descLine = asset.description ? `Product description: ${asset.description}.` : '';
                if (hasRefImage) {
                    imagePrompt = `Create a photorealistic multi-angle product reference sheet based strictly on the uploaded reference image.

Match the exact real-world appearance of the object: shape, material, texture, color, and proportions. The result must look like real studio photography of a real physical product.

Layout — two horizontal rows as a clean product reference sheet:
- Top row: four views of the same product: (1) front view, (2) left side view, (3) right side view, (4) back view.
- Bottom row: three close-up detail shots highlighting key features, surface texture, and materials.

Lighting: neutral studio lighting (softbox or diffused light). Consistent lighting direction across all views. Clean, simple background (white, light grey, or gradient). No dramatic shadows.

Consistency: same product, same color, same material across all views. Perfectly matched scale and proportions.

NOT a 3D render. NOT CGI. NOT stylized. Pure product photography.${genre ? ` Production context: ${genre}.` : ''}`;
                } else {
                    imagePrompt = `Create a photorealistic product reference sheet for the following product:

Name: ${asset.name}.
${descLine}

Layout — two horizontal rows as a product reference sheet:
- Top row: four views: (1) front view, (2) left side view, (3) right side view, (4) back view.
- Bottom row: three close-up detail shots of materials, texture, and key features.

The product must look like a real, physical, manufactured object photographed in a studio. Clean neutral background, professional product photography lighting from a softbox. No stylization or CGI look.

NOT a 3D render. NOT CGI. NOT an illustration.${genre ? ` Production context: ${genre}.` : ''}`;
                }
            } else {
                // Environment: location scout reference board
                const descLine = asset.description ? `Location description: ${asset.description}.` : '';
                if (hasRefImage) {
                    imagePrompt = `Create a photorealistic location scout reference board based on the uploaded reference image.

Layout — a 2x2 grid of real-world photographs of the same location:
- (1) Wide establishing shot showing the full scope of the space.
- (2) Mid-range shot focusing on key architectural or environmental features.
- (3) Detail/texture shot of a characteristic surface or element.
- (4) Atmospheric shot showing the overall light, mood, and feeling of the location.

Lighting: realistic and consistent with the location's natural or ambient light source. Preserve the mood and atmosphere of the reference.

Consistency: same location, same time of day, same weather and lighting conditions across all views.

NOT a 3D render. NOT CGI. NOT stylized. Real location photography.${genre ? ` Genre: ${genre}.` : ''}${mood ? ` Mood: ${mood}.` : ''}`;
                } else {
                    imagePrompt = `Create a photorealistic location scout reference board for the following place:

Name: ${asset.name}.
${descLine}

Layout — a 2x2 grid of photographs of the same location:
- (1) Wide establishing shot.
- (2) Mid-range shot of key architectural or environmental features.
- (3) Close-up detail of a characteristic surface or texture.
- (4) Atmospheric mood shot capturing the light and ambiance.

The location must look like real-world photography, not a digital set or CGI environment. Realistic lighting consistent with the described setting.

NOT a 3D render. NOT CGI. NOT a digital set.${genre ? ` Genre: ${genre}.` : ''}${mood ? ` Mood: ${mood}.` : ''}`;
                }
            }

            // Helper: attempt a single generation call and return base64 data if found
            const attemptGenerate = async (parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>): Promise<{ data: string; mimeType: string } | null> => {
                const response = await geminiProxy({
                    action: 'generateContent',
                    model: 'gemini-3.1-flash-image-preview',
                    contents: [{ role: 'user', parts }],
                    // Aspect ratio matched to layout: actors/products 4:3 (landscape contact sheet), environments 16:9 (cinematic wide)
                    config: { imageConfig: { aspectRatio: asset.type === 'environment' ? '16:9' : '4:3' } }
                }) as any;

                if (response?.error) throw new Error(JSON.stringify(response.error));

                const respParts = response.candidates?.[0]?.content?.parts;
                if (respParts) {
                    for (const part of respParts) {
                        if (part.inlineData) return { data: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
                    }
                }
                return null;
            };

            // Build parts array — use ref_image_url as i2i source (not the generated image_url)
            const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
            if (hasRefImage) {
                try {
                    const fetchUrl = asset.ref_image_url!.split('?')[0]; // strip cache-bust timestamp
                    const imgResponse = await fetch(fetchUrl);
                    const blob = await imgResponse.blob();
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve((reader.result as string).split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    parts.push({ inlineData: { mimeType: blob.type || 'image/png', data: base64 } });
                    console.log('[StoryStudio] i2i: Reference image loaded for', asset.name);
                } catch (e) {
                    console.warn('[StoryStudio] i2i: Could not load reference image, falling back to text-only:', e);
                }
            }
            parts.push({ text: imagePrompt });

            // --- First attempt ---
            let result = await attemptGenerate(parts);

            // --- Auto-retry with simplified neutral prompt (safety filter bypass) ---
            if (!result) {
                console.warn('[StoryStudio] No image on first attempt — retrying with simplified prompt...');
                const fallbackPrompt = isActor
                    ? `A photorealistic photo contact sheet of a person. ${asset.description ? asset.description.slice(0, 80) + '.' : ''} Multiple angles: front, side profile, and back. Natural studio lighting, neutral background. Real photography style.`
                    : `A professional ${storyboardStyle} style image of a ${asset.type}. ${asset.description ? asset.description.slice(0, 80) + '.' : ''} Cinematic quality, clean background.`;
                result = await attemptGenerate([{ text: fallbackPrompt }]);
            }

            if (result) {
                const byteCharacters = atob(result.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: result.mimeType });
                const file = new File([blob], `${asset.id}-generated.png`, { type: result.mimeType });
                const imageUrl = await uploadAssetImage(file, asset.id);
                return imageUrl;
            }

            // Both attempts failed — likely a safety filter issue with the description
            throw new Error('SAFETY_FILTER');
        } catch (err) {
            console.error('Generation error:', err);
            const isSafetyError = err instanceof Error && (err.message === 'SAFETY_FILTER' || err.message === 'Keine Bilddaten in der Antwort');
            setError(
                isSafetyError
                    ? `⚠️ Die KI konnte für diese Beschreibung kein Bild erstellen — der Inhalt wurde möglicherweise vom Sicherheitsfilter blockiert. Bitte versuche es mit einer anderen oder kürzeren Beschreibung.`
                    : `Fehler bei der KI-Bildgenerierung: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`
            );
            return null;
        } finally {
            setGeneratingAssetId(null);
        }
    };

    const handleAssetUpload = async (file: File, assetId: string) => {
        // Upload always writes to ref_image_url (the reference source for i2i)
        // This way uploading a new reference never destroys the generated image_url
        const imageUrl = await uploadAssetImage(file, assetId);
        if (imageUrl) {
            updateAsset(assetId, { ref_image_url: imageUrl, source: 'upload' });
        }
    };

    const handleAssetGenerate = async (asset: StoryAsset) => {
        const imageUrl = await generateAssetImage(asset);
        if (imageUrl) {
            updateAsset(asset.id, { image_url: imageUrl, source: 'ai-generated' });
        }
    };

    const updateAsset = (assetId: string, updates: Partial<StoryAsset>) => {
        const actorIndex = actors.findIndex(a => a.id === assetId);
        if (actorIndex !== -1) {
            const newActors = [...actors];
            newActors[actorIndex] = { ...newActors[actorIndex], ...updates };
            setActors(newActors);
        } else if (environment?.id === assetId) {
            setEnvironment({ ...environment, ...updates });
        } else if (product?.id === assetId) {
            setProduct({ ...product, ...updates });
        }
    };

    // Generate story with AI
    const generateStory = async () => {
        if (!user) return;

        setIsGenerating(true);
        setError(null);

        try {
            // Build story prompt from all available session context
            const assetContext = [
                ...actors.map(a => `Actor "${a.name}": ${a.description}`),
                environment ? `Environment "${environment.name}": ${environment.description}` : null,
                product ? `Product/Object "${product.name}": ${product.description}` : null,
            ].filter(Boolean).join('\n');

            const storyPrompt = `Du bist ein kreativer Storyboard-Autor. Generiere eine fesselnde Story-Narration für ein Storyboard.
WICHTIG: Schreibe ALLES auf Deutsch!
WICHTIG: Gib NUR die Story-Absätze zurück. Keine Einleitung wie "Hier ist..." und keinen Markdown-Titel davor!
Projekt: ${sessionTitle}
Genre: ${genre || 'nicht angegeben'}
Stimmung: ${mood || 'nicht angegeben'}
Zielgruppe: ${targetAudience || 'allgemeines Publikum'}
${assetContext ? `\nAssets:\n${assetContext}` : ''}

Schreibe eine prägnante Story (3-5 Absätze) mit klarem Anfang, Mitte und Ende, geeignet für visuelles Storytelling. Baue die definierten Assets natürlich ein. Beginne sofort mit dem ersten Absatz der Story.`;

            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [{ text: storyPrompt }] }]
            }) as any;

            if (response?.error) {
                throw new Error(JSON.stringify(response.error));
            }

            // Strip any AI preamble like "Hier ist..." or markdown headings
            const generatedStory = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleaned = generatedStory
                .replace(/^\*\*[^*]+\*\*\n?/m, '') // remove **Titel: ...** lines
                .replace(/^Hier ist[^\n]*\n?/im, '') // remove "Hier ist..." line
                .trim();
            setStoryText(cleaned);

        } catch (err) {
            console.error('Story generation error:', err);
            setError(`Fehler bei der Story-Generierung: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate shots with AI
    const generateShots = async () => {
        if (!user) return;

        setIsGenerating(true);
        setError(null);

        try {
            // Build shot list prompt from full story context
            const assetList = [
                ...actors.map(a => `- Actor: "${a.name}" (${a.description})`),
                environment ? `- Environment: "${environment.name}" (${environment.description})` : null,
                product ? `- Product/Object: "${product.name}" (${product.description})` : null,
            ].filter(Boolean).join('\n');

            const shotsPrompt = `Du bist ein professioneller Storyboard-Artist und Filmregisseur.
WICHTIG: Schreibe ALLE Texte (title, description, location, audio_notes, movement_notes, dialog) auf Deutsch!
Projekt: "${sessionTitle}"
Genre: ${genre || 'nicht angegeben'} | Stimmung: ${mood || 'nicht angegeben'} | Zielgruppe: ${targetAudience || 'allgemeines Publikum'}

Story:
${storyText || 'Eine Geschichte über die definierten Assets.'}

Assets:
${assetList || '(Keine spezifischen Assets definiert)'}

Erstelle eine Storyboard Shot-Liste mit 6-10 Shots. Gib NUR ein valides JSON-Array zurück, OHNE zusätzlichen Text, Markdown oder Erklärungen.
Für das Feld "dialog": Schreibe den gesprochenen Dialog im Format "ACTORNAME: Text\nACTORNAME2: Antwort". Leerer String wenn kein Dialog.
Jeder Shot muss exakt dieser Struktur folgen:
[
  {
    "scene_number": "1",
    "title": "Kurzer Shot-Titel",
    "description": "Was in diesem Shot passiert",
    "location": "Wo der Shot stattfindet",
    "framing": "close-up|medium-shot|wide-shot|extreme-wide|over-the-shoulder",
    "camera_angle": "eye-level|high-angle|low-angle|dutch-angle|birds-eye",
    "camera_movement": "static|pan|tilt|dolly|handheld|tracking",
    "lighting": "natural|studio|dramatic|soft|harsh",
    "audio_notes": "Sound Design Notizen",
    "movement_notes": "Beschreibung der Schauspieler/Subjekt-Bewegung",
    "dialog": "ACTOR1: Hallo!\nACTOR2: Hey!",
    "duration": 5
  }
]`;

            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [{ text: shotsPrompt }] }]
            }) as any;

            if (response?.error) {
                throw new Error(JSON.stringify(response.error));
            }

            const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error('Invalid response format from AI');

            const generatedShots = JSON.parse(jsonMatch[0]);

            const newShots: StoryShot[] = generatedShots.map((shot: any, index: number) => ({
                id: Date.now().toString() + index,
                order: index,
                scene_number: shot.scene_number || `${index + 1}`,
                title: shot.title || `Shot ${index + 1}`,
                description: shot.description || '',
                location: shot.location || '',
                framing: shot.framing || 'medium-shot',
                camera_angle: shot.camera_angle || 'eye-level',
                camera_movement: shot.camera_movement || 'static',
                focal_length: '50mm',
                lighting: shot.lighting || 'natural',
                equipment: '',
                audio_notes: shot.audio_notes || '',
                estimated_duration: shot.duration || 5,
                movement_notes: shot.movement_notes || '',
                vfx_notes: '',
                actors: actors.map(a => a.id),
                environment: environment?.id || '',
                products: product ? [product.id] : [],
                dialog: shot.dialog || '',
                notes: '',
                duration: shot.duration || 5,
                created_at: new Date().toISOString(),
            }));

            setShots(newShots);

        } catch (err) {
            console.error('Shot generation error:', err);
            setError(`Fehler bei der Shot-Generierung: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate shot image with AI using i2i from setup assets
    const generateShotImage = async (shot: StoryShot): Promise<string | null> => {
        if (!user) return null;

        setIsGenerating(true);
        try {
            // Prepare parts for i2i generation
            const parts: any[] = [];

            // Add reference images from setup assets
            // Priority: actors > environment > product
            const referenceImages: string[] = [];

            // Add actor images if available
            actors.forEach(actor => {
                if (actor.image_url && !actor.image_url.startsWith('data:')) {
                    referenceImages.push(actor.image_url);
                }
            });

            // Add environment image
            if (environment?.image_url && !environment.image_url.startsWith('data:')) {
                referenceImages.push(environment.image_url);
            }

            // Add product image
            if (product?.image_url && !product.image_url.startsWith('data:')) {
                referenceImages.push(product.image_url);
            }

            // If we have reference images, fetch and convert to base64
            if (referenceImages.length > 0) {
                // Use the first available image as primary reference
                const primaryImageUrl = referenceImages[0];

                try {
                    const response = await fetch(primaryImageUrl);
                    const blob = await response.blob();
                    const base64Data = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const result = reader.result as string;
                            const base64 = result.split(',')[1];
                            resolve(base64);
                        };
                        reader.readAsDataURL(blob);
                    });

                    parts.push({
                        inlineData: {
                            mimeType: 'image/png',
                            data: base64Data
                        }
                    });
                } catch (err) {
                    console.warn('Could not load reference image, using text-only generation:', err);
                }
            }

            // Build comprehensive prompt for storyboard frame
            const styleDescriptions: Record<string, string> = {
                'realistic': 'Photorealistic, cinematic photography style, high detail, professional film production quality',
                'illustrated': 'Hand-drawn illustration style, artistic storyboard sketch, professional concept art',
                'comic': 'Comic book style, bold lines, dynamic composition, graphic novel aesthetic',
                'sketch': 'Pencil sketch style, traditional storyboard drawing, loose artistic lines',
                'anime': 'Anime/manga style, expressive characters, vibrant colors, Japanese animation aesthetic',
                'noir': 'Film noir style, high contrast black and white, dramatic shadows, classic cinema',
                'watercolor': 'Watercolor painting style, soft edges, artistic brushstrokes, painterly quality'
            };

            const styleDescription = styleDescriptions[storyboardStyle] || styleDescriptions['realistic'];

            const prompt = `Create a professional storyboard frame based on this shot description:

Title: ${shot.title}
Description: ${shot.description}
Location: ${shot.location || 'Not specified'}

Camera Setup:
- Framing: ${shot.framing}
- Angle: ${shot.camera_angle}
- Movement: ${shot.camera_movement}
- Focal Length: ${shot.focal_length}

Lighting: ${shot.lighting}
${shot.movement_notes ? `\nMovement: ${shot.movement_notes}` : ''}
${shot.vfx_notes ? `\nVFX: ${shot.vfx_notes}` : ''}

Visual Style: ${styleDescription}

${parts.length > 0 ? 'Use the reference image(s) for character/environment consistency. Maintain the same visual style across all shots.' : 'Create based on description only.'}`;

            parts.push({ text: prompt });

            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-3.1-flash-image-preview',
                contents: [{ role: 'user', parts: parts }],
                config: {
                    imageConfig: {
                        aspectRatio: '16:9',
                    }
                }
            }) as any;

            if (response?.error) {
                throw new Error(JSON.stringify(response.error));
            }

            // Parse response
            const respParts = response.candidates?.[0]?.content?.parts;
            if (respParts) {
                for (const part of respParts) {
                    if (part.inlineData) {
                        const base64Data = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || 'image/png';

                        // Convert to blob and upload to Supabase
                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: mimeType });
                        const file = new File([blob], `shot-${shot.id}.png`, { type: mimeType });

                        // Upload to Cloudflare R2
                        const shotFile = new File([blob], `shot-${shot.id}.png`, { type: mimeType });
                        const publicUrl = await uploadFile(shotFile, 'storyboard-shots');
                        const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

                        return cacheBustedUrl;
                    }
                }
            }

            throw new Error('Keine Bilddaten in der Antwort');
        } catch (err) {
            console.error('Shot image generation error:', err);
            setError(`Fehler bei der Shot-Bildgenerierung: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateShotImage = async (shot: StoryShot) => {
        const imageUrl = await generateShotImage(shot);
        if (imageUrl) {
            // Update shot with new image URL
            setShots(shots.map(s => s.id === shot.id ? { ...s, image_url: imageUrl } : s));
        }
    };

    const handleAddShot = () => {
        const newShot: StoryShot = {
            id: Date.now().toString(),
            order: shots.length,
            scene_number: `${shots.length + 1}`,
            title: `Shot ${shots.length + 1}`,
            description: '',
            location: '',
            framing: 'medium-shot',
            camera_angle: 'eye-level',
            camera_movement: 'static',
            focal_length: '50mm',
            lighting: 'natural',
            equipment: '',
            audio_notes: '',
            estimated_duration: 5,
            movement_notes: '',
            vfx_notes: '',
            actors: [],
            environment: environment?.id || '',
            products: [],
            dialog: '',
            notes: '',
            duration: 5,
            created_at: new Date().toISOString(),
        };
        setShots([...shots, newShot]);
    };

    const renderPhaseContent = () => {
        switch (currentPhase) {
            case 'setup':
                return (
                    <SetupPhase
                        actors={actors}
                        environment={environment}
                        product={product}
                        onUpdateActor={(index, actor) => {
                            const newActors = [...actors];
                            newActors[index] = actor;
                            setActors(newActors);
                        }}
                        onUpdateEnvironment={setEnvironment}
                        onUpdateProduct={setProduct}
                        onAssetUpload={handleAssetUpload}
                        onAssetGenerate={handleAssetGenerate}
                        uploadingAssetId={uploadingAssetId}
                        generatingAssetId={generatingAssetId}
                        onAssetPreview={setPreviewImageUrl}
                        onNext={() => navigateTo('story')}
                    />
                );
            case 'story':
                return (
                    <StoryPhase
                        genre={genre}
                        mood={mood}
                        targetAudience={targetAudience}
                        storyText={storyText}
                        storyboardStyle={storyboardStyle}
                        onGenreChange={setGenre}
                        onMoodChange={setMood}
                        onTargetAudienceChange={setTargetAudience}
                        onStoryTextChange={setStoryText}
                        onStoryboardStyleChange={setStoryboardStyle}
                        onGenerateStory={generateStory}
                        isGenerating={isGenerating}
                        onBack={() => navigateTo('setup')}
                        onNext={() => navigateTo('storyboard')}
                    />
                );
            case 'storyboard':
                return (
                    <StoryboardPhase
                        shots={shots}
                        environment={environment}
                        isGenerating={isGenerating}
                        onGenerateShots={generateShots}
                        onAddShot={handleAddShot}
                        onEditShot={setEditingShot}
                        onDeleteShot={(shotId) => setShots(shots.filter(s => s.id !== shotId))}
                        onBack={() => navigateTo('story')}
                        onNext={() => navigateTo('review')}
                    />
                );
            case 'review':
                return (
                    <ReviewPhase
                        sessionTitle={sessionTitle}
                        shots={shots}
                        actorsCount={actors.length}
                        isGenerating={isGenerating}
                        onEditShot={setEditingShot}
                        onGenerateShotImage={handleGenerateShotImage}
                        onBack={() => navigateTo('storyboard')}
                        onSave={handleSave}
                    />
                );
        }
    };

    return (
        <div className="h-full flex overflow-hidden bg-[#0a0f18]">
            {/* History Sidebar */}
            <aside className="w-80 border-r border-white/10 p-4 overflow-y-auto hide-scrollbar">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white">Story Studio</h2>
                    <button
                        onClick={() => {
                            // Reset ALL session state to blank defaults
                            setSessionId(null);
                            setSessionTitle('Untitled Storyboard');
                            setStoryText('');
                            setGenre('');
                            setMood('');
                            setTargetAudience('');
                            setShots([]);
                            setActors([
                                { id: '1', type: 'actor', name: 'Actor 1', description: '', image_url: '', source: 'upload', created_at: new Date().toISOString() },
                                { id: '2', type: 'actor', name: 'Actor 2', description: '', image_url: '', source: 'upload', created_at: new Date().toISOString() },
                                { id: '3', type: 'actor', name: 'Actor 3', description: '', image_url: '', source: 'upload', created_at: new Date().toISOString() },
                            ]);
                            setEnvironment({ id: 'env-1', type: 'environment', name: 'Environment', description: '', image_url: '', source: 'upload', created_at: new Date().toISOString() });
                            setProduct({ id: 'prod-1', type: 'product', name: 'Product', description: '', image_url: '', source: 'upload', created_at: new Date().toISOString() });
                            setCurrentPhase('setup');
                        }}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all"
                    >
                        New
                    </button>
                </div>

                {history.length > 0 && (
                    <div className="space-y-2">
                        {history.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => loadSession(session)}
                                className="w-full text-left p-3 bg-slate-800/40 hover:bg-slate-700/40 border border-white/10 rounded-lg transition-all"
                            >
                                <p className="text-white text-sm font-medium truncate">{session.title}</p>
                                <p className="text-slate-400 text-xs mt-1">{session.shots.length} shots</p>
                            </button>
                        ))}
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <input
                            type="text"
                            value={sessionTitle}
                            onChange={(e) => setSessionTitle(e.target.value)}
                            className="flex-1 text-3xl font-bold text-white bg-transparent border-none outline-none"
                            placeholder="Untitled Storyboard"
                        />
                        {/* Persistent Save Button */}
                        <button
                            onClick={handleSave}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                savedFeedback
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                            }`}
                        >
                            <span className="material-icons-round text-sm">
                                {savedFeedback ? 'check_circle' : 'save'}
                            </span>
                            {savedFeedback
                                ? `Gespeichert ${lastSaved?.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
                                : 'Speichern'
                            }
                        </button>
                    </div>

                    {/* Phase Tabs */}
                    <div className="flex gap-2">
                        {(['setup', 'story', 'storyboard', 'review'] as Phase[]).map((phase) => (
                            <button
                                key={phase}
                                onClick={() => setCurrentPhase(phase)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPhase === phase
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-800/40 text-slate-400 hover:text-white'
                                    }`}
                            >
                                {phase.charAt(0).toUpperCase() + phase.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                        <span className="material-icons-round text-red-400">error</span>
                        <div className="flex-1">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-400 hover:text-red-300"
                        >
                            <span className="material-icons-round text-sm">close</span>
                        </button>
                    </div>
                )}

                {/* Phase Content */}
                {renderPhaseContent()}
            </main>

            {/* Shot Editor Modal */}
            {editingShot && (
                <ShotEditor
                    shot={editingShot}
                    actors={actors}
                    environment={environment}
                    products={product ? [product] : []}
                    onSave={(updatedShot) => {
                        setShots(shots.map(s => s.id === updatedShot.id ? updatedShot : s));
                        setEditingShot(null);
                    }}
                    onClose={() => setEditingShot(null)}
                />
            )}

            {/* Lightbox Modal — fullscreen image preview */}
            {previewImageUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-zoom-out"
                    onClick={() => setPreviewImageUrl(null)}
                    onKeyDown={(e) => e.key === 'Escape' && setPreviewImageUrl(null)}
                    tabIndex={0}
                >
                    <button
                        onClick={() => setPreviewImageUrl(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10"
                    >
                        <span className="material-icons-round">close</span>
                    </button>
                    <img
                        src={previewImageUrl}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
