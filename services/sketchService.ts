import { geminiProxy } from '../lib/apiClient';
import { ContextOption, StyleOption } from "../components/SketchStudio/types";

const GEMINI_MODEL = 'gemini-2.5-flash-image';

/**
 * Helper to strip the data:image/...;base64, prefix
 */
const cleanBase64 = (base64Data: string) => {
    return base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

const invokeProxy = async (payload: any) => {
    const data = await geminiProxy(payload) as any;
    
    if (data?.error) {
        console.error("Gemini API Error via Proxy:", data.error);
        throw new Error(`API Error: ${JSON.stringify(data.error)}`);
    }
    
    return data;
};

/**
 * Generates an image based on a drawing, context, and style.
 */
export const generateImageFromSketch = async (
    sketchBase64: string,
    context: ContextOption,
    style: StyleOption,
    aspectRatio: '1:1' | '16:9' | '9:16' = '16:9',
    additionalPrompt: string = ""
): Promise<string> => {
    try {
        const prompt = `
      You are an expert digital artist.
      Transform the attached sketch into a high-quality, fully rendered image.
      
      Subject Context: ${context}
      Artistic Style: ${style}
      
      Key Requirements:
      - Cinematic lighting and composition.
      - High resolution and detailed textures.
      - Strictly follow the structure and composition of the sketch.
      - ${additionalPrompt}
      
      Output the image only.
    `;

        const response = await invokeProxy({
            action: 'generateContent',
            model: GEMINI_MODEL,
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt.trim() },
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: cleanBase64(sketchBase64),
                        }
                    }
                ]
            }],
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio,
                }
            }
        });

        return extractImageFromResponse(response);
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        throw error;
    }
};

/**
 * Edits an existing image based on a text prompt.
 */
export const editGeneratedImage = async (
    imageBase64: string,
    editInstruction: string
): Promise<string> => {
    try {
        const prompt = `
      Edit this image.
      Instruction: ${editInstruction}
      Maintain the original style and composition unless instructed otherwise.
      Ensure the result is cinematic and high quality.
    `;

        const response = await invokeProxy({
            action: 'generateContent',
            model: GEMINI_MODEL,
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt.trim() },
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: cleanBase64(imageBase64),
                        }
                    }
                ]
            }]
        });

        return extractImageFromResponse(response);
    } catch (error) {
        console.error("Gemini Edit Error:", error);
        throw error;
    }
};

const extractImageFromResponse = (response: any): string => {
    // Check safely 
    const parts = response.candidates?.[0]?.content?.parts;

    if (!parts || !Array.isArray(parts)) {
        throw new Error("No content parts in response");
    }

    // Find the part with inlineData (the image)
    const imagePart = parts.find((part: any) => part.inlineData && part.inlineData.data);

    if (imagePart) {
        return `data:image/png;base64,${imagePart.inlineData.data}`;
    }

    // If there's text but no image, it might be an error or refusal
    const textPart = parts.find((part: any) => part.text);
    if (textPart) {
        throw new Error(`Model returned text instead of image: ${textPart.text}`);
    }

    throw new Error("No image generated.");
};
