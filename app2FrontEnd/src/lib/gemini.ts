import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Define allowed categories for consistency
const CATEGORIES = ["Smartphone", "Tablette", "Ordinateur", "Audio", "Accessoire", "Lumina", "Autre"];

export async function analyzeDeviceDocument(file: File) {
    // Using the model you found working: gemini-3-flash-preview
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });

    const prompt = `Extraire les spécifications techniques de cet appareil.
CRITIQUE: Pour la clé "category", tu DOIS choisir EXACTEMENT l'une de ces valeurs : ${CATEGORIES.join(", ")}.
Ne pas inventer de catégorie. Si tu hésites, choisis la plus proche ou "Autre".

Format JSON attendu :
{
  "brand": "Marque",
  "model": "Modèle précis",
  "category": "Smartphone | Tablette | Ordinateur | Audio | Accessoire | Lumina | Autre",
  "storage_capacity": "Capacité (ex: 128GB)",
  "color": "Couleur",
  "processeur": "CPU",
  "ram": "RAM",
  "batterie": "Batterie",
  "ecran": "Ecran",
  "appareil_photo": "Caméra",
  "os": "Système"
}

Réponds UNIQUEMENT en JSON brut.`;

    try {
        const result = await model.generateContent([
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: prompt }
        ]);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error: any) {
        console.error("Gemini Scan Error:", error);
        throw error;
    }
}

export async function identifyDeviceByQuery(query: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `Identifier cet appareil : "${query}".
Tu DOIS choisir une catégorie parmi : ${CATEGORIES.join(", ")}.
Réponds UNIQUEMENT en JSON avec les clés standards.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
}

/**
 * Interprets a voice command and returns a structured action.
 */
export async function interpretVoiceCommand(transcript: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `Tu es l'assistant vocal de l'ERP TechStock. Interprète cette commande : "${transcript}"
    
    Retourne un JSON avec :
    - action : "search" | "check_stock" | "navigate" | "unknown"
    - target : l'objet de la recherche (ex: "iPhone", "S23", "Stock total")
    - page : si action=navigate, le nom de la page (ex: "Stock", "Ventes", "Fournisseurs")
    
    Réponds UNIQUEMENT avec le JSON brut.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { action: "unknown" };
    } catch (error) {
        console.error("Voice Interpretation Error:", error);
        return { action: "unknown" };
    }
}

