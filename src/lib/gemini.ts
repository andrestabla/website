import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadIntegrations } from "../admin/lib/integrationsStore";

/**
 * Gemini Service — Handlers for text and object translation.
 */

let genAI: GoogleGenerativeAI | null = null;

function getAI() {
    if (genAI) return genAI;

    // Priority 1: integrationsStore (Admin UI)
    const integrations = loadIntegrations();
    const apiKey = integrations.gemini.config.apiKey || import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        console.warn("Gemini API Key not found in store or env.");
        return null;
    }

    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
}

const LANGUAGE_NAMES: Record<string, string> = {
    es: "Spanish",
    en: "English",
    fr: "French"
};

export async function translateText(text: string, targetLang: string): Promise<string> {
    const ai = getAI();
    if (!ai || !text || targetLang === 'es') return text;

    try {
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
        const targetLanguageName = LANGUAGE_NAMES[targetLang] || targetLang;

        const prompt = `Translate the following text from Spanish to ${targetLanguageName}. 
        Return ONLY the translated text without any explanations or additional formatting.
        
        Text to translate:
        "${text}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Gemini translation error:", error);
        return text;
    }
}

/**
 * Translates an object recursively.
 * Translates string values while preserving keys and structure.
 */
export async function translateObject<T>(obj: T, targetLang: string): Promise<T> {
    const ai = getAI();
    if (!ai || targetLang === 'es') return obj;

    try {
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
        const targetLanguageName = LANGUAGE_NAMES[targetLang] || targetLang;

        const prompt = `Translate the string values in the following JSON object from Spanish to ${targetLanguageName}. 
        Keep the keys exactly as they are. If a value is not a string, keep it as is.
        Return ONLY the valid JSON object.
        
        Object to translate:
        ${JSON.stringify(obj, null, 2)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleanedText = response.text().replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedText) as T;
    } catch (error) {
        console.error("Gemini object translation error:", error);
        return obj;
    }
}
