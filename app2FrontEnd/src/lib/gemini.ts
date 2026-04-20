import { GoogleGenerativeAI } from "@google/generative-ai";

const GET_GEMINI_KEY = () => {
    return import.meta.env.VITE_GEMINI_API_KEY || "";
};

const genAI = new GoogleGenerativeAI(GET_GEMINI_KEY());

/**
 * Interface for the extracted purchase invoice data
 */
export interface ExtractedAchat {
    invoice_no?: string;
    reference_bon?: string;
    date?: string;
    items: {
        designation: string; // The raw name from the invoice
        qty: number;
        unit_price: number;
        vat_rate: number;
    }[];
}

/**
 * Uses Gemini 1.5 Flash to extract structured data from an image file.
 */
export async function extractAchatFromImage(file: File): Promise<ExtractedAchat> {
    const apiKey = GET_GEMINI_KEY();
    if (!apiKey) {
        throw new Error("Clé API Gemini manquante. Veuillez l'ajouter dans votre fichier .env (VITE_GEMINI_API_KEY).");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const prompt = `
        You are an OCR expert specialized in French purchase invoices (factures d'achat).
        Extract the following data into a clean JSON object:
        1. "invoice_no": The invoice number (e.g., FA-2024-001).
        2. "reference_bon": The delivery note or order reference if present.
        3. "date": The date of the invoice in YYYY-MM-DD format.
        4. "items": A list of products/services with:
           - "designation": The description of the item.
           - "qty": The quantity (number).
           - "unit_price": The unit price BEFORE tax (number).
           - "vat_rate": The VAT rate in % (usually 20, 10, or 0). 

        Return ONLY the raw JSON object. No markdown, no comments.
    `;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: base64Data,
                mimeType: file.type
            }
        }
    ]);

    const text = result.response.text();
    try {
        // Clean the response in case Gemini adds markdown fences
        const cleanedText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedText) as ExtractedAchat;
    } catch (e) {
        console.error("Failed to parse Gemini response:", text);
        throw new Error("Impossible de lire les données de cette facture. Le format n'est pas reconnu.");
    }
}

/**
 * AI Professionalizer for invoice line items
 */
export async function professionalizeDescription(description: string): Promise<string> {
    const apiKey = GET_GEMINI_KEY();
    if (!apiKey) return description;

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `Améliore cette description de service pour une facture formelle en français. 
    Règle : Retourne UNIQUEMENT le texte final amélioré. Pas d'introduction, pas d'options, pas de blabla.
    
    Original: "${description}"
    Résultat professionnel (Français) :`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}

/**
 * Conversational AI Assistant
 */
export async function getChatResponse(message: string, history: { role: "user" | "model", parts: string }[], context?: string): Promise<string> {
    const apiKey = GET_GEMINI_KEY();
    if (!apiKey) throw new Error("Clé API Gemini manquante.");

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const systemPrompt = `[INSTRUCTIONS DE L'ASSISTANT FINANCE]
    Vous êtes l'assistant IA de "Société les cinq éléments".
    Objectif: Aider à la gestion des projets, factures et finances.
    Langue: Français.
    Données de l'entreprise: ${context || "Aucune donnée fournie."}
    Règles: Soyez professionnel, concis et technique.
    [/INSTRUCTIONS]`;

    const chatHistory = history
        .filter(h => h.role === "user" || h.role === "model")
        .map(h => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.parts }] }));

    // API requirement: History MUST start with 'user' role
    while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
        chatHistory.shift();
    }

    try {
        const chat = model.startChat({
            history: chatHistory,
        });

        const result = await chat.sendMessage(`${systemPrompt}\n\nUtilisateur: ${message}`);
        return result.response.text();
    } catch (err: any) {
        console.error("DEBUG: Gemini API Full Error:", err);
        let errorMsg = "Erreur de connexion avec l'IA.";

        if (err.message?.includes("API_KEY_INVALID")) {
            errorMsg = "Clé API invalide : Elle semble incomplète (35 caractères au lieu de 39).";
        } else if (err.message?.includes("model not found")) {
            errorMsg = "Modèle introuvable : Le nom du modèle est peut-être incorrect.";
        } else if (err.status === 429) {
            errorMsg = "Limite de requêtes atteinte. Réessayez dans une minute.";
        } else {
            errorMsg = `Erreur AI: ${err.message || 'Problème de connexion'}`;
        }

        throw new Error(errorMsg);
    }
}

/**
 * Generates a professional email for a client based on their financial status.
 */
export async function generateClientEmail(clientData: {
    name: string,
    total: number,
    paid: number,
    remaining: number,
    project: string
}) {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `Tu es un assistant administratif d'élite pour la société "Société les cinq éléments".
    Rédige un email très professionnel, élégant et courtois pour le client suivant :
    Client: ${clientData.name}
    Projet: ${clientData.project}
    Situation financière:
    - Prix Global: ${clientData.total} DH
    - Total déjà versé: ${clientData.paid} DH
    - Reste à payer: ${clientData.remaining} DH

    L'email doit être chaleureux mais formel. Remercie-le pour sa confiance et présente-lui clairement sa situation.
    REMARQUE : Pour le gras, utilise des étoiles simples comme ceci : *texte en gras*.
    Réponds uniquement avec le corps de l'email en format texte brut, sans objet et sans fioritures de type "Voici l'email".`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

/**
 * Improves a WhatsApp message to make it more professional and premium.
 */
export async function improveWhatsAppMessage(currentMessage: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `Améliore ce message WhatsApp pour qu'il soit extrêmement professionnel, clair et "haut de gamme" (premium). 
    Garde les données chiffrées intactes. Utilise un ton poli et rassurant.
    IMPORTANT : Pour le gras, utilise UNIQUEMENT des étoiles simples (*texte*) car c'est pour WhatsApp. Évite les signes **.
    Le message actuel est :
    "${currentMessage}"

    Réponds uniquement avec le nouveau message amélioré.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}
