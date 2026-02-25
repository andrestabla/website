import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useCMS, type CMSState } from '../admin/pages/../context/CMSContext';
import { translateObject } from '../lib/gemini';
import { getUICopy } from '../i18n/uiCopy';

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
    uiText: ReturnType<typeof getUICopy>;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const CACHE_KEY = 'algoritmot_translations_v3';

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

function mergeTranslated<T>(base: T, translated: unknown): T {
    if (translated === undefined || translated === null) return base;

    if (typeof base === 'string') {
        return (typeof translated === 'string' ? translated : base) as T;
    }

    if (Array.isArray(base)) {
        if (!Array.isArray(translated)) return base;
        return base.map((item, index) => mergeTranslated(item, translated[index])) as T;
    }

    if (base && typeof base === 'object') {
        if (!translated || typeof translated !== 'object' || Array.isArray(translated)) return base;
        const out: any = { ...(base as any) };
        for (const key of Object.keys(base as any)) {
            out[key] = mergeTranslated((base as any)[key], (translated as any)[key]);
        }
        return out as T;
    }

    return (translated as T) ?? base;
}

// Simple but robust hash function for CMS state
function getCMSHash(state: CMSState): string {
    try {
        const text = JSON.stringify({
            h: state.hero,
            s: state.services,
            p: state.products,
            st: state.site,
            hp: (state as any).homePage,
        });
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = (hash << 5) - hash + text.charCodeAt(i);
            hash |= 0;
        }
        return `h${hash}l${text.length}`;
    } catch (e) {
        return `err-${Date.now()}`;
    }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const { state: cmsState } = useCMS();
    const [language, setLanguageState] = useState<Language>(() => {
        return (localStorage.getItem('algoritmot_lang') as Language) || 'es';
    });
    const [translatedState, setTranslatedState] = useState<CMSState>(cmsState);
    const [isTranslating, setIsTranslating] = useState(false);
    const lastProcessed = useRef<string>("");
    const isProcessing = useRef<boolean>(false);

    const translateCollection = useCallback(async <T,>(items: T[], targetLang: Language): Promise<T[]> => {
        const results = await Promise.allSettled(items.map(item => translateObject(item, targetLang)));
        return items.map((item, index) => {
            const result = results[index];
            if (result?.status === 'fulfilled') return result.value;
            return item;
        });
    }, []);

    /**
     * Perform translation with caching logic
     */
    const performTranslation = useCallback(async (targetLang: Language, baseState: CMSState) => {
        if (targetLang === 'es') {
            setTranslatedState(baseState);
            lastProcessed.current = getCMSHash(baseState) + 'es';
            return;
        }

        const hash = getCMSHash(baseState) + targetLang;
        if (lastProcessed.current === hash || isProcessing.current) {
            return;
        }

        const cache = loadCache();
        if (cache[targetLang]?.[hash]) {
            const cached = cache[targetLang]![hash];
            setTranslatedState({
                ...baseState,
                hero: mergeTranslated(baseState.hero, cached.hero),
                services: mergeTranslated(baseState.services, cached.services),
                products: mergeTranslated(baseState.products, cached.products),
                site: mergeTranslated(baseState.site, cached.site),
                design: baseState.design,
                homePage: mergeTranslated((baseState as any).homePage, (cached as any).homePage),
            });
            lastProcessed.current = hash;
            return;
        }

        setIsTranslating(true);
        isProcessing.current = true;
        try {
            // Split translation into smaller requests to reduce malformed/truncated JSON responses.
            const [heroT, servicesT, productsT, siteT, homePageT] = await Promise.all([
                translateObject(baseState.hero, targetLang),
                translateCollection(baseState.services, targetLang),
                translateCollection(baseState.products, targetLang),
                translateObject({
                    name: baseState.site.name,
                    description: baseState.site.description,
                    contactAddress: baseState.site.contactAddress
                }, targetLang),
                translateObject((baseState as any).homePage, targetLang),
            ]);

            // Extremely defensive merging
            const t = {
                hero: heroT,
                services: servicesT,
                products: productsT,
                site: siteT,
                homePage: homePageT,
            } as any;
            const newState: CMSState = {
                ...baseState,
                hero: mergeTranslated(baseState.hero, t.hero),
                services: mergeTranslated(baseState.services, t.services),
                products: mergeTranslated(baseState.products, t.products),
                site: mergeTranslated(baseState.site, { ...baseState.site, ...t.site }),
                homePage: mergeTranslated((baseState as any).homePage, t.homePage),
            };

            if (!cache[targetLang]) cache[targetLang] = {};
            cache[targetLang]![hash] = newState;
            saveCache(cache);

            setTranslatedState(newState);
            lastProcessed.current = hash;
        } catch (error) {
            console.error("Translation logic error:", error);
            setTranslatedState(baseState);
            lastProcessed.current = hash;
        } finally {
            setIsTranslating(false);
            isProcessing.current = false;
        }
    }, [translateCollection]);

    // Effect: Handle CMS State changes or Language changes
    useEffect(() => {
        performTranslation(language, cmsState);
    }, [language, cmsState, performTranslation]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('algoritmot_lang', lang);
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, translatedState, isTranslating, uiText: getUICopy(language) }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
    return ctx;
}
