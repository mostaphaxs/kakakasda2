import { GoogleGenerativeAI } from "@google/generative-ai";

import { getAppSettings } from './appSettings';

// Key & models come from Paramètres → Intelligence artificielle, falling back
// to the build-time .env key and the original models when nothing is set.
const ENV_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const currentKey = () => {
    const k = getAppSettings().ai.gemini_key;
    return (k && k !== '•' ? k : '') || ENV_KEY || '';
};
const textModel = (fallback: string) => getAppSettings().ai.model_text || fallback;
const visionModel = (fallback: string) => getAppSettings().ai.model_vision || fallback;
const genAI = {
    getGenerativeModel: (opts: Parameters<GoogleGenerativeAI['getGenerativeModel']>[0]) =>
        new GoogleGenerativeAI(currentKey()).getGenerativeModel(opts),
};
const API_KEY_MISSING = () => !currentKey();

/** Quick check used by the "Tester" button in Paramètres. */
export async function testAiConnection(): Promise<string> {
    if (API_KEY_MISSING()) throw new Error('Aucune clé configurée.');
    const model = genAI.getGenerativeModel({ model: textModel('gemini-3-flash-preview') });
    const r = await model.generateContent('Réponds uniquement par le mot : OK');
    return r.response.text().trim();
}

/**
 * Converts a File object to a format compatible with Gemini API
 */
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type,
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Analyzes a document (Image or PDF) using Gemini AI
 * @param file The file to analyze
 * @param prompt The instructions for Gemini
 * @returns Parsed JSON or raw text response
 */
export async function analyzeDocument(file: File, prompt: string) {
    try {
        if (API_KEY_MISSING()) {
            throw new Error("IA non configurée : ajoutez une clé dans Paramètres → Intelligence artificielle.");
        }

        const model = genAI.getGenerativeModel({ model: visionModel("gemini-3-flash-preview"), });
        const imagePart = await fileToGenerativePart(file);

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Handle JSON response extraction from markdown blocks
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.error("Failed to parse AI JSON response", e);
                return text;
            }
        }
        return text;
    } catch (error) {
        console.error("AI Analysis Error:", error);
        throw error;
    }
}

/**
 * Generates a professional email for a client
 */
export async function generateClientEmail(data: { name: string; total: number; paid: number; remaining: number; project: string }) {
    try {
        const prompt = `Génère un email professionnel et courtois en français pour un client nommé ${data.name}.
        Détails du projet: ${data.project}
        Total à payer: ${data.total} DH
        Montant déjà versé: ${data.paid} DH
        Reste à payer: ${data.remaining} DH
        L'email doit être poli, professionnel, et inviter le client à régulariser sa situation si nécessaire.
        Utilise un ton chaleureux mais formel.
        Réponds uniquement avec le contenu de l'email.`;

        const model = genAI.getGenerativeModel({ model: textModel("gemini-3-flash-preview") });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating email:", error);
        throw error;
    }
}

/**
 * Improves a WhatsApp message with AI
 */
export async function improveWhatsAppMessage(message: string) {
    try {
        const prompt = `Améliore ce message WhatsApp pour le rendre plus professionnel, clair et engageant tout en gardant un ton convivial. 
        Message original: "${message}"
        Réponds uniquement avec le message amélioré.`;


        const model = genAI.getGenerativeModel({ model: textModel("gemini-3-flash-preview") });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error improving message:", error);
        throw error;
    }
}

/**
 * Professionalizes an item description for invoices
 */
export async function professionalizeDescription(description: string) {
    try {
        const prompt = `Agis comme un expert en facturation. Reformule cette désignation d'article de facture pour la rendre plus professionnelle et précise : "${description}".
        Réponds uniquement avec la désignation améliorée.`;

        const model = genAI.getGenerativeModel({ model: textModel("gemini-3-flash-preview") });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error professionalizing description:", error);
        throw error;
    }
}

/**
 * Gets a chat response from Gemini relative to the company context
 */
export async function getChatResponse(message: string, history: any[], context: string) {
    try {

        const model = genAI.getGenerativeModel({
            model: textModel("gemini-3-flash-preview"),
            systemInstruction: `Tu es l'assistant IA de la "Amical El Ouaha", un système de gestion immobilière et de construction.
            Ton but est d'aider l'utilisateur avec ses données financières, ses projets et ses clients.
            Voici le contexte actuel de l'entreprise :
            ${context}
            Réponds de manière concise, professionnelle et utile.`
        });

        const chat = model.startChat({
            history: history.map(m => ({
                role: m.role,
                parts: [{ text: m.parts }]
            }))
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error in AI Chat:", error);
        throw error;
    }
}

/**
 * Extracts data from purchase invoices (multi-item)
 */
export async function extractAchatFromImage(file: File) {
    try {
        const prompt = `Analyses cette facture d'achat. Extraits les informations suivantes au format JSON :
        {
            "invoice_no": "numéro de facture",
            "reference_bon": "référence du bon de commande ou livraison",
            "items": [
                {
                    "designation": "nom de l'article",
                    "qty": quantité (nombre),
                    "unit_price": prix unitaire HT (nombre),
                    "vat_rate": taux de TVA (nombre, ex: 20)
                }
            ]
        }
        Réponds uniquement avec le JSON.`;


        const model = genAI.getGenerativeModel({ model: visionModel("gemini-3-flash-preview") });
        const imagePart = await fileToGenerativePart(file);
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Impossible d'extraire les données JSON");
    } catch (error) {
        console.error("Error extracting purchase data:", error);
        throw error;
    }
}

/**
 * Advanced invoice analysis with vendor detection and anomaly check
 */
export async function analyzeInvoicePremium(file: File, existingSocietes: string[]) {
    try {
        const prompt = `Analyses cette facture de manière approfondie. 
        1. Extraits : Numéro de facture, Date, Montant TTC.
        2. Identifie le NOM du FOURNISSEUR de manière précise.
        3. Vérifie s'il y a des ANOMALIES (ex: montant inhabituel, date illisible, ratures, apparence suspecte).
        
        Liste des sociétés connues dans le système : [${existingSocietes.join(', ')}]
        
        Réponds UNIQUEMENT au format JSON :
        {
            "invoice_no": "string",
            "date": "YYYY-MM-DD",
            "amount": number,
            "vendor_name": "nom détecté",
            "matched_vendor": "nom de la société correspondante dans la liste fournie (si match proche, sinon null)",
            "anomaly_detected": boolean,
            "anomaly_description": "explication de l'anomalie si detected est true",
            "confidence_score": number (0-100)
        }`;

        const model = genAI.getGenerativeModel({ model: visionModel("gemini-3-flash-preview") });
        const imagePart = await fileToGenerativePart(file);
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Impossible d'extraire les données JSON Premium");
    } catch (error) {
        console.error("AI Premium Analysis Error:", error);
        throw error;
    }
}

/**
 * Extracts structured mission data from a voice transcript (Voice-to-Action)
 */
export async function extractMissionFromVoice(
    transcript: string,
    workers: { id: number; name: string }[],
    terrains: { id: number; nom_projet: string }[]
): Promise<Record<string, string>> {
    try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const prompt = `Tu es un assistant de chantier. Extrais les informations d'une commande vocale en français et retourne un JSON structuré.

Commande vocale : "${transcript}"
Ouvriers : ${JSON.stringify(workers.map(w => ({ id: w.id, name: w.name })))}
Projets : ${JSON.stringify(terrains.map(t => ({ id: t.id, nom: t.nom_projet })))}
Aujourd'hui : ${today} | Hier : ${yesterday}

Types possibles: "journalier" (1 jour), "periode" (multi-jours), "m2" (mètre carré), "ml" (mètre linéaire), "forfait" (montant fixe)

Réponds UNIQUEMENT avec ce JSON (null si inconnu) :
{"ouvrier_id":"id ou null","terrain_id":"id ou null","type":"journalier|periode|m2|ml|forfait ou null","quantity":"nombre ou null","unit_price":"prix DH ou null","description":"travail effectué","start_date":"YYYY-MM-DD ou null"}`;

        const model = genAI.getGenerativeModel({ model: visionModel("gemini-2.0-flash") });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const cleaned: Record<string, string> = {};
            for (const [k, v] of Object.entries(parsed)) {
                if (v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== 'null') {
                    cleaned[k] = String(v);
                }
            }
            return cleaned;
        }
        return {};
    } catch (error) {
        console.error("Voice extraction error:", error);
        return {};
    }
}

