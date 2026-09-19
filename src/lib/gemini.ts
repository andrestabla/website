/**
 * Gemini Service — Handlers for text and object translation.
 */

const REQUEST_TIMEOUT_MS = 18000;
const MAX_MEMORY_CACHE_ENTRIES = 120;
const responseCache = new Map<string, unknown>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function buildCacheKey(payload: unknown, targetLang: string, mode: 'text' | 'object'): string {
    let serialized = '';
    try {
        serialized = JSON.stringify(payload);
    } catch {
        serialized = String(payload);
    }
    return `${mode}:${targetLang}:${serialized}`;
}

function setMemoryCache(key: string, value: unknown) {
    if (responseCache.has(key)) responseCache.delete(key);
    responseCache.set(key, value);
    if (responseCache.size > MAX_MEMORY_CACHE_ENTRIES) {
        const oldest = responseCache.keys().next().value as string | undefined;
        if (oldest) responseCache.delete(oldest);
    }
}

function runDeduped<T>(key: string, run: () => Promise<T>): Promise<T> {
    const existing = inFlightRequests.get(key);
    if (existing) return existing as Promise<T>;

    const promise = run()
        .finally(() => {
            inFlightRequests.delete(key);
        });
    inFlightRequests.set(key, promise as Promise<unknown>);
    return promise;
}

async function translateViaServer<T>(payload: unknown, targetLang: string, mode: 'text' | 'object'): Promise<T | null> {
    const cacheKey = buildCacheKey(payload, targetLang, mode);
    if (responseCache.has(cacheKey)) {
        return responseCache.get(cacheKey) as T;
    }

    return runDeduped<T | null>(`server:${cacheKey}`, async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload, targetLang, mode }),
                signal: controller.signal,
            });
            if (!res.ok) return null;
            const json = await res.json();
            const data = (json?.ok ? json.data : null) as T | null;
            if (data !== null) {
                setMemoryCache(cacheKey, data);
            }
            return data;
        } catch {
            return null;
        } finally {
            clearTimeout(timeout);
        }
    });
}

export function isGeminiConfigured() {
    // Keep translations on server to avoid exposing provider keys in the browser.
    return true;
}

export async function translateText(text: string, targetLang: string): Promise<string> {
    if (!text || targetLang === 'es') return text;

    const key = buildCacheKey(text, targetLang, 'text');
    if (responseCache.has(key)) {
        return responseCache.get(key) as string;
    }

    return runDeduped<string>(`text:${key}`, async () => {
        const serverResult = await translateViaServer<string>(text, targetLang, 'text');
        if (typeof serverResult === 'string' && serverResult.trim()) {
            setMemoryCache(key, serverResult);
            return serverResult;
        }

        return text;
    });
}

/**
 * Translates an object recursively.
 * Translates string values while preserving keys and structure.
 */
export async function translateObject<T>(obj: T, targetLang: string): Promise<T> {
    if (targetLang === 'es') return obj;

    const key = buildCacheKey(obj, targetLang, 'object');
    if (responseCache.has(key)) {
        return responseCache.get(key) as T;
    }

    return runDeduped<T>(`object:${key}`, async () => {
        const serverResult = await translateViaServer<T>(obj, targetLang, 'object');
        if (serverResult && typeof serverResult === 'object') {
            setMemoryCache(key, serverResult);
            return serverResult;
        }

        return obj;
    });
}
