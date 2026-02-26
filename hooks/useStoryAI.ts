import { useState } from 'react';
import { geminiProxy } from '../lib/apiClient';
import { StoryAsset, StoryShot } from '../types';

interface StoryParams {
    actors: StoryAsset[];
    environment: StoryAsset | null;
    product: StoryAsset | null;
    genre: string;
    mood: string;
    targetAudience: string;
}

interface ShotParams extends StoryParams {
    storyText: string;
}

export const useStoryAI = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateStory = async (params: StoryParams): Promise<string | null> => {
        setIsGenerating(true);
        setError(null);

        try {
            const prompt = `
            Erstelle eine detaillierte, fesselnde kreative Story basierend auf den folgenden Parametern. 
            Die Story sollte ca. 50-100 Wörter umfassen und eine klare Handlung haben.
            
            Darsteller: ${params.actors.map(a => a.name).join(', ')}
            Location/Umgebung: ${params.environment?.name || 'Nicht spezifiziert'}
            Produkt: ${params.product?.name || 'Nicht spezifiziert'}
            Genre: ${params.genre}
            Stimmung: ${params.mood}
            Zielgruppe: ${params.targetAudience}
            `;

            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-2.0-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            }) as any;

            if (response?.error) {
                throw new Error(response.error);
            }

            const generatedStory = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return generatedStory;

        } catch (err) {
            console.error('Story generation error:', err);
            setError(`Fehler bei der Story-Generierung: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const generateShots = async (params: ShotParams): Promise<StoryShot[] | null> => {
        setIsGenerating(true);
        setError(null);

        try {
            const prompt = `
            Erstelle eine Shot-Liste basierend auf der folgenden Story.
            Storyboard Parameter:
            Darsteller: ${params.actors.map(a => a.name).join(', ')}
            Location/Umgebung: ${params.environment?.name || 'Nicht spezifiziert'}
            Produkt: ${params.product?.name || 'Nicht spezifiziert'}
            Genre: ${params.genre}
            Stimmung: ${params.mood}
            
            Story:
            ${params.storyText}
            
            Gib die Antwort **ausschließlich** als valides JSON-Array zurück, das eine Liste von Shots enthält.
            Benutze exakt dieses Format für jeden Shot in der Liste:
            [
              {
                "scene_number": "1",
                "title": "Titel des Shots",
                "description": "Bildbeschreibung was passiert",
                "location": "Ort des Geschehens",
                "framing": "medium-shot",
                "camera_angle": "eye-level",
                "camera_movement": "static",
                "lighting": "natural",
                "audio_notes": "Audio Notizen",
                "duration": 5,
                "movement_notes": "Bewegungsnotizen"
              }
            ]
            `;

            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-2.0-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            }) as any;

            if (response?.error) {
                throw new Error(response.error);
            }

            const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Parse JSON response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('Invalid response format from AI');
            }

            const generatedShots = JSON.parse(jsonMatch[0]);

            // Convert to StoryShot format
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
                actors: params.actors.map(a => a.id),
                environment: params.environment?.id || '',
                products: params.product ? [params.product.id] : [],
                notes: '',
                duration: shot.duration || 5,
                created_at: new Date().toISOString(),
            }));

            return newShots;

        } catch (err) {
            console.error('Shot generation error:', err);
            setError(`Fehler bei der Shot-Generierung: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const generateAssetImage = async (
        asset: StoryAsset,
        uploadCallback: (file: File, assetId: string) => Promise<string | null>
    ): Promise<string | null> => {
        try {
            const prompt = `Generiere ein realistisches, professionelles Bild für:
                Typ: ${asset.type}
                Name: ${asset.name}
                Beschreibung: ${asset.description}
                Das Bild sollte einen neutralen Hintergrund haben und isoliert dargestellt sein.
            `;

            const response = await geminiProxy({
                action: 'generateContent',
                model: 'gemini-2.5-flash-image',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { imageConfig: { aspectRatio: '1:1' } }
            }) as any;

            if (response?.error) {
                throw new Error(response.error);
            }

            // Parse response to find image part
            const respParts = response.candidates?.[0]?.content?.parts;
            if (respParts) {
                for (const part of respParts) {
                    if (part.inlineData) {
                        const base64Data = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || 'image/png';

                        // Convert base64 to blob and upload to R2 via labs-api
                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: mimeType });
                        const file = new File([blob], `${asset.id}-generated.png`, { type: mimeType });

                        // Upload to Supabase Storage
                        const imageUrl = await uploadCallback(file, asset.id);
                        console.log('Generated and uploaded:', imageUrl);
                        return imageUrl;
                    }
                }
            }

            throw new Error('Keine Bilddaten in der Antwort');
        } catch (err) {
            console.error('Generation error:', err);
            setError(`Fehler bei der KI-Bildgenerierung: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
            return null;
        }
    };

    return {
        generateStory,
        generateShots,
        generateAssetImage,
        isGenerating,
        error,
        setError,
    };
};
