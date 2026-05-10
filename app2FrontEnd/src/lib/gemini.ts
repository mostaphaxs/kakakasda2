import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export async function analyzeDeviceDocument(file: File) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
    });
    reader.readAsDataURL(file);
    const base64Data = await base64Promise;

    const prompt = `Analyze this image/document and extract device specifications.
Return ONLY a JSON object with these keys:
- brand
- model
- category (Smartphone, Tablette, Ordinateur, Audio, Accessoire, Lumina, Autre)
- storage_capacity
- color
- processeur
- ram
- batterie
- ecran
- appareil_photo
- os

Respond ONLY with RAW JSON.`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: base64Data,
                mimeType: file.type
            }
        }
    ]);

    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI response");

    return JSON.parse(jsonMatch[0]);
}

export async function identifyDeviceByQuery(query: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

    const prompt = `Identify this device: "${query}"
Return ONLY a JSON object with these keys: 
- brand, model, category, storage_capacity, color, processeur, ram, batterie, ecran, appareil_photo, os.

Respond ONLY with RAW JSON.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI response");

    return JSON.parse(jsonMatch[0]);
}
