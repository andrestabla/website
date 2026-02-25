import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini Service — Handlers for text and object translation.
 */

let genAI: GoogleGenerativeAI | null = null;

async function translateViaServer<T>(payload: unknown, targetLang: string, mode: 'text' | 'object'): Promise<T | null> {
    try {
        const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload, targetLang, mode }),
        });
        if (!res.ok) return null;
        const json = await res.json();
        return (json?.ok ? json.data : null) as T | null;
    } catch {
        return null;
    }
}

type GeminiRuntimeConfig = {
    apiKey: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
};

function getGeminiConfig(): GeminiRuntimeConfig | null {
    const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const envModel = import.meta.env.VITE_GEMINI_MODEL;

    const apiKey = envApiKey;
    if (!apiKey) return null;

    return {
        apiKey,
        model: envModel || "gemini-2.0-flash",
        maxTokens: undefined,
        temperature: 0.2,
    };
}

export function getAI() {
    if (genAI) return genAI;

    const cfg = getGeminiConfig();
    const apiKey = cfg?.apiKey;

    if (!apiKey) {
        if (import.meta.env.DEV) console.warn("Gemini API Key not found in store or env.");
        return null;
    }

    if (import.meta.env.DEV) console.log("Gemini API Key initialized successfully");

    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
}

export function isGeminiConfigured() {
    // Client-side env key may be absent even when server-side /api/translate is configured.
    return true;
}

const LANGUAGE_NAMES: Record<string, string> = {
    es: "Spanish",
    en: "English",
    fr: "French"
};

export async function translateText(text: string, targetLang: string): Promise<string> {
    if (!text || targetLang === 'es') return text;

    const serverResult = await translateViaServer<string>(text, targetLang, 'text');
    if (typeof serverResult === 'string' && serverResult.trim()) {
        return serverResult;
    }

    const ai = getAI();
    if (!ai) return text;

    try {
        const cfg = getGeminiConfig();
        const model = ai.getGenerativeModel({
            model: cfg?.model || "gemini-2.0-flash",
            generationConfig: {
                temperature: cfg?.temperature ?? 0.2,
                maxOutputTokens: cfg?.maxTokens,
            }
        });
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

function extractJson(text: string): string {
    const cleaned = text.replace(/```json|```/gi, "").trim();
    if (!cleaned) throw new Error("Empty Gemini response");

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return cleaned.slice(firstBrace, lastBrace + 1);
    }

    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        return cleaned.slice(firstBracket, lastBracket + 1);
    }

    return cleaned;
}

/**
 * Translates an object recursively.
 * Translates string values while preserving keys and structure.
 */
export async function translateObject<T>(obj: T, targetLang: string): Promise<T> {
    if (targetLang === 'es') return obj;

    const serverResult = await translateViaServer<T>(obj, targetLang, 'object');
    if (serverResult && typeof serverResult === 'object') {
        return serverResult;
    }

    const ai = getAI();
    if (!ai) {
        throw new Error("Gemini API key is not configured. Please add it in the Admin Integrations panel.");
    }

    try {
        const cfg = getGeminiConfig();
        const model = ai.getGenerativeModel({
            model: cfg?.model || "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
                maxOutputTokens: cfg?.maxTokens,
            }
        });
        const targetLanguageName = LANGUAGE_NAMES[targetLang] || targetLang;

        const prompt = `Translate all user-facing string values in the following JSON from Spanish to ${targetLanguageName}.
        Preserve the JSON structure and keys exactly.
        Do not rename keys.
        Do not add or remove fields.
        Keep URLs, emails, slugs, handles, and identifiers unchanged.
        If a value is not a string (object, array, number, boolean, null), preserve its type and structure.
        Return valid JSON only.
        
        Object to translate:
        ${JSON.stringify(obj, null, 2)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleanedText = extractJson(response.text());
        return JSON.parse(cleanedText) as T;
    } catch (error) {
        console.error("Gemini object translation error:", error);
        return obj;
    }
}
