import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useCMS, type CMSState } from '../admin/pages/../context/CMSContext';
import { translateObject } from '../lib/gemini';

/**
 * LanguageContext — Manages the current site language and handles on-the-fly 
 * translation using Gemini with caching.
 */

export type Language = 'es' | 'en' | 'fr';

type TranslationCache = {
    [lang in Language]?: {
        [cmsHash: string]: CMSState;
    };
};

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    translatedState: CMSState;
    isTranslating: boolean;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const CACHE_KEY = 'algoritmot_translations_v1';

function loadCache(): TranslationCache {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveCache(cache: TranslationCache) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch { }
}

// Simple hash function for CMS state to detect changes
function getCMSHash(state: CMSState): string {
    try {
        // We only hash content, not design tokens or URLs
        const content = JSON.stringify({
            hero: state.hero,
            services: state.services,
            products: state.products,
            site: {
                name: state.site.name,
                description: state.site.description
            }
        });
        // Use a simple but Unicode-safe "hash": string length + first/last chars
        return `${content.length}-${content.slice(0, 10)}-${content.slice(-10)}`;
    } catch (e) {
        console.error("Hash calculation failed:", e);
        return "fallback-hash-" + Date.now();
    }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const { state: cmsState } = useCMS();
    const [language, setLanguageState] = useState<Language>(() => {
        return (localStorage.getItem('algoritmot_lang') as Language) || 'es';
    });
    const [translatedState, setTranslatedState] = useState<CMSState>(cmsState);
    const [isTranslating, setIsTranslating] = useState(false);

    /**
     * Perform translation with caching logic
     */
    const performTranslation = useCallback(async (targetLang: Language, baseState: CMSState) => {
        if (targetLang === 'es') {
            setTranslatedState(baseState);
            return;
        }

        const hash = getCMSHash(baseState);
        console.log("CMS Hash calculated:", hash);
        const cache = loadCache();

        if (cache[targetLang]?.[hash]) {
            // Apply translated content to current design tokens
            const cached = cache[targetLang]![hash];
            setTranslatedState({
                ...cached,
                design: baseState.design // Always use latest design tokens
            });
            return;
        }

        // Need new translation
        setIsTranslating(true);
        try {
            // We only translate the text-heavy parts
            const toTranslate = {
                hero: baseState.hero,
                services: baseState.services,
                products: baseState.products,
                site: {
                    name: baseState.site.name,
                    description: baseState.site.description,
                    contactAddress: baseState.site.contactAddress
                }
            };

            console.log("Starting translation to:", targetLang);
            const translated = await translateObject(toTranslate, targetLang);
            console.log("Translation received successfully");

            const newState: CMSState = {
                ...baseState,
                hero: translated.hero,
                services: translated.services,
                products: translated.products,
                site: {
                    ...baseState.site,
                    ...translated.site
                }
            };

            // Save to cache
            if (!cache[targetLang]) cache[targetLang] = {};
            cache[targetLang]![hash] = newState;
            saveCache(cache);

            setTranslatedState(newState);
        } catch (error) {
            console.error("Translation error details:", error);
            setTranslatedState(baseState);
        } finally {
            setIsTranslating(false);
        }
    }, []);

    // Effect: Handle CMS State changes or Language changes
    useEffect(() => {
        performTranslation(language, cmsState);
    }, [language, cmsState, performTranslation]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('algoritmot_lang', lang);
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, translatedState, isTranslating }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
    return ctx;
}
