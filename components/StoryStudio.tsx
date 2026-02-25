import React, { useState, useEffect } from 'react';

import { useStoryboard } from '../hooks/useStoryboard';
import { StoryboardSession, StoryAsset, StoryShot } from '../lib/database.types';
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
            await loadHistory();
        }
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

    // Upload image to Cloudflare R2
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

    // Generate image with AI (supports i2i when asset already has an uploaded image)
    const generateAssetImage = async (asset: StoryAsset): Promise<string | null> => {
        if (!user) return null;

        setGeneratingAssetId(asset.id);
        try {
            const typeLabel = asset.type === 'actor' ? 'character/actor' : asset.type === 'environment' ? 'environment/location' : 'product/object';
            const hasRefImage = !!asset.image_url;

            const imagePrompt = hasRefImage
                ? `Refine and reimagine this ${typeLabel} image in ${storyboardStyle} style for a storyboard.
Keep the same subject/identity but enhance for cinematic quality.
Name: ${asset.name}. Description: ${asset.description || `A ${asset.type} asset`}.
${genre ? `Genre: ${genre}.` : ''}${mood ? ` Mood: ${mood}.` : ''}
Cinematic, detailed, professional production design.`
                : `Generate a high-quality ${storyboardStyle} style image of a ${typeLabel} for a storyboard.
Name: ${asset.name}. Description: ${asset.description || `A ${asset.type} asset`}.
${genre ? `Genre: ${genre}.` : ''}${mood ? ` Mood: ${mood}.` : ''}
Cinematic, detailed, professional production design.`;

            // Build parts array — include uploaded image as reference input if available (i2i)
            const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
            if (hasRefImage) {
                try {
                    const fetchUrl = asset.image_url.split('?')[0]; // strip cache-bust timestamp
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

            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-2.5-flash-image',
                contents: [{ role: 'user', parts }],
                config: { imageConfig: { aspectRatio: '1:1' } }
            }) as any;

            if (response?.error) {
                throw new Error(JSON.stringify(response.error));
            }

            const respParts = response.candidates?.[0]?.content?.parts;
            if (respParts) {
                for (const part of respParts) {
                    if (part.inlineData) {
                        const base64Data = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || 'image/png';

                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: mimeType });
                        const file = new File([blob], `${asset.id}-generated.png`, { type: mimeType });

                        const imageUrl = await uploadAssetImage(file, asset.id);
                        return imageUrl;
                    }
                }
            }

            throw new Error('Keine Bilddaten in der Antwort');
        } catch (err) {
            console.error('Generation error:', err);
            setError(`Fehler bei der KI-Bildgenerierung: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
            return null;
        } finally {
            setGeneratingAssetId(null);
        }
    };

    const handleAssetUpload = async (file: File, assetId: string) => {
        const imageUrl = await uploadAssetImage(file, assetId);
        if (imageUrl) {
            updateAsset(assetId, { image_url: imageUrl, source: 'upload' });
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

            const storyPrompt = `You are a creative storyboard writer. Generate a compelling story narrative for a storyboard.
Project: ${sessionTitle}
Genre: ${genre || 'not specified'}
Mood: ${mood || 'not specified'}
Target Audience: ${targetAudience || 'general audience'}
${assetContext ? `\nAssets:\n${assetContext}` : ''}

Write a concise story narrative (3-5 paragraphs) with a clear beginning, middle and end, suitable for visual storytelling. Incorporate the defined assets naturally.`;

            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [{ text: storyPrompt }] }]
            }) as any;

            if (response?.error) {
                throw new Error(JSON.stringify(response.error));
            }

            const generatedStory = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
            setStoryText(generatedStory);

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

            const shotsPrompt = `You are a professional storyboard artist and film director.
Project: "${sessionTitle}"
Genre: ${genre || 'not specified'} | Mood: ${mood || 'not specified'} | Target Audience: ${targetAudience || 'general audience'}

Story:
${storyText || 'A story about the defined assets below.'}

Assets:
${assetList || '(No specific assets defined)'}

Create a storyboard shot list of 6-10 shots. Return ONLY a valid JSON array with NO additional text, markdown, or explanation.
Each shot must follow this exact structure:
[
  {
    "scene_number": "1",
    "title": "Short shot title",
    "description": "What happens in this shot",
    "location": "Where the shot takes place",
    "framing": "close-up|medium-shot|wide-shot|extreme-wide|over-the-shoulder",
    "camera_angle": "eye-level|high-angle|low-angle|dutch-angle|birds-eye",
    "camera_movement": "static|pan|tilt|dolly|handheld|tracking",
    "lighting": "natural|studio|dramatic|soft|harsh",
    "audio_notes": "Sound design notes",
    "movement_notes": "Actor/subject movement description",
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
                model: 'gemini-2.5-flash-image',
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
                        onNext={() => setCurrentPhase('story')}
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
                        onBack={() => setCurrentPhase('setup')}
                        onNext={() => setCurrentPhase('storyboard')}
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
                        onBack={() => setCurrentPhase('story')}
                        onNext={() => setCurrentPhase('review')}
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
                        onBack={() => setCurrentPhase('storyboard')}
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
                    <input
                        type="text"
                        value={sessionTitle}
                        onChange={(e) => setSessionTitle(e.target.value)}
                        className="text-3xl font-bold text-white bg-transparent border-none outline-none mb-4"
                        placeholder="Untitled Storyboard"
                    />

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
        </div>
    );
};
