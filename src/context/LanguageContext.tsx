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
            sa: (state.siteArchitecture as any)?.pages,
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
                siteArchitecture: {
                    ...baseState.siteArchitecture,
                    pages: mergeTranslated(baseState.siteArchitecture.pages, cached.siteArchitecture?.pages),
                },
            });
            lastProcessed.current = hash;
            return;
        }

        setIsTranslating(true);
        isProcessing.current = true;
        
        const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
            let timeoutId: NodeJS.Timeout;
            const timeoutPromise = new Promise<T>((resolve) => {
                timeoutId = setTimeout(() => {
                    console.warn(`Translation timed out after ${ms}ms`);
                    resolve(fallback);
                }, ms);
            });
            return Promise.race([
                promise.then(result => {
                    clearTimeout(timeoutId);
                    return result;
                }),
                timeoutPromise
            ]);
        };

        try {
            // Split translation into smaller requests to reduce malformed/truncated JSON responses.
            const timeoutMs = 20000; // 20 seconds timeout per chunk
            const heroT = await withTimeout(translateObject(baseState.hero, targetLang), timeoutMs, baseState.hero).catch(e => { console.error('Hero translate failed', e); return baseState.hero; });
            const servicesT = await withTimeout(translateCollection(baseState.services, targetLang), timeoutMs, baseState.services).catch(e => { console.error('Services translate failed', e); return baseState.services; });
            const productsT = await withTimeout(translateCollection(baseState.products, targetLang), timeoutMs, baseState.products).catch(e => { console.error('Products translate failed', e); return baseState.products; });
            const siteT = await withTimeout(translateObject({
                name: baseState.site.name,
                description: baseState.site.description,
                contactAddress: baseState.site.contactAddress
            }, targetLang), timeoutMs, { name: baseState.site.name, description: baseState.site.description, contactAddress: baseState.site.contactAddress }).catch(e => { console.error('Site translate failed', e); return { name: baseState.site.name, description: baseState.site.description, contactAddress: baseState.site.contactAddress }; });
            const homePageT = await withTimeout(translateObject((baseState as any).homePage, targetLang), timeoutMs, (baseState as any).homePage).catch(e => { console.error('HomePage translate failed', e); return (baseState as any).homePage; });

            // Translate pages in small batches to improve speed without hitting payload limits
            const siteArchitecturePagesT = [];
            const BATCH_SIZE = 3;
            for (let i = 0; i < baseState.siteArchitecture.pages.length; i += BATCH_SIZE) {
                const batch = baseState.siteArchitecture.pages.slice(i, i + BATCH_SIZE);
                const batchPromises = batch.map(async (page) => {
                    if (page.blocks && page.blocks.length > 0) {
                        return withTimeout(translateObject(page, targetLang), timeoutMs, page).catch(err => {
                            console.error(`Failed to translate page ${page.id}`, err);
                            return page;
                        });
                    }
                    return page;
                });
                const resolvedBatch = await Promise.all(batchPromises);
                siteArchitecturePagesT.push(...resolvedBatch);
            }

            // Extremely defensive merging
            const t = {
                hero: heroT,
                services: servicesT,
                products: productsT,
                site: siteT,
                homePage: homePageT,
                siteArchitecturePages: siteArchitecturePagesT
            } as any;

            const newState: CMSState = {
                ...baseState,
                hero: mergeTranslated(baseState.hero, t.hero),
                services: mergeTranslated(baseState.services, t.services),
                products: mergeTranslated(baseState.products, t.products),
                site: mergeTranslated(baseState.site, { ...baseState.site, ...t.site }),
                homePage: mergeTranslated((baseState as any).homePage, t.homePage),
                siteArchitecture: {
                    ...baseState.siteArchitecture,
                    pages: mergeTranslated(baseState.siteArchitecture.pages, t.siteArchitecturePages),
                },
            };

            const targetLangKey = targetLang as Language;
            if (!cache[targetLangKey]) cache[targetLangKey] = {};
            cache[targetLangKey]![hash] = newState;
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
    }, [translateCollection, language, cmsState]);

    // Effect: Handle CMS State changes or Language changes
    useEffect(() => {
        performTranslation(language, cmsState);
    }, [language, cmsState, performTranslation]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.lang = language;
    }, [language]);

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
