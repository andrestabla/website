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
const MAX_CACHE_SNAPSHOTS_PER_LANG = 4;

function pruneCache(cache: TranslationCache): TranslationCache {
    const next: TranslationCache = {};
    (['es', 'en', 'fr'] as Language[]).forEach((lang) => {
        const entries = Object.entries(cache[lang] || {});
        if (entries.length === 0) return;
        const kept = entries.slice(-MAX_CACHE_SNAPSHOTS_PER_LANG);
        next[lang] = Object.fromEntries(kept) as Record<string, CMSState>;
    });
    return next;
}

function loadCache(): TranslationCache {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return pruneCache(parsed as TranslationCache);
    } catch {
        return {};
    }
}

function saveCache(cache: TranslationCache) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(pruneCache(cache)));
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
    const cacheRef = useRef<TranslationCache>(loadCache());
    const pendingRequestRef = useRef<{ targetLang: Language; baseState: CMSState; hash: string } | null>(null);

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
            pendingRequestRef.current = null;
            setTranslatedState(baseState);
            lastProcessed.current = getCMSHash(baseState) + 'es';
            return;
        }

        const hash = getCMSHash(baseState) + targetLang;
        if (lastProcessed.current === hash) {
            return;
        }
        if (isProcessing.current) {
            pendingRequestRef.current = { targetLang, baseState, hash };
            return;
        }

        const cache = cacheRef.current;
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
            // Split translation in chunks and run the top-level chunks in parallel for faster first paint.
            const timeoutMs = 20000; // 20 seconds timeout per chunk
            const translatePages = async () => {
                const pages = baseState.siteArchitecture.pages;
                if (pages.length === 0) return pages;
                const translatedPages = [...pages];
                const concurrency = Math.min(4, pages.length);
                let cursor = 0;

                const worker = async () => {
                    while (cursor < pages.length) {
                        const index = cursor++;
                        const page = pages[index];
                        if (!page?.blocks?.length) {
                            translatedPages[index] = page;
                            continue;
                        }
                        translatedPages[index] = await withTimeout(translateObject(page, targetLang), timeoutMs, page).catch(err => {
                            console.error(`Failed to translate page ${page.id}`, err);
                            return page;
                        });
                    }
                };

                await Promise.all(Array.from({ length: concurrency }, () => worker()));
                return translatedPages;
            };

            const siteFallback = {
                name: baseState.site.name,
                description: baseState.site.description,
                contactAddress: baseState.site.contactAddress,
            };

            const [heroT, servicesT, productsT, siteT, homePageT, siteArchitecturePagesT] = await Promise.all([
                withTimeout(translateObject(baseState.hero, targetLang), timeoutMs, baseState.hero).catch(e => {
                    console.error('Hero translate failed', e);
                    return baseState.hero;
                }),
                withTimeout(translateCollection(baseState.services, targetLang), timeoutMs, baseState.services).catch(e => {
                    console.error('Services translate failed', e);
                    return baseState.services;
                }),
                withTimeout(translateCollection(baseState.products, targetLang), timeoutMs, baseState.products).catch(e => {
                    console.error('Products translate failed', e);
                    return baseState.products;
                }),
                withTimeout(translateObject(siteFallback, targetLang), timeoutMs, siteFallback).catch(e => {
                    console.error('Site translate failed', e);
                    return siteFallback;
                }),
                withTimeout(translateObject((baseState as any).homePage, targetLang), timeoutMs, (baseState as any).homePage).catch(e => {
                    console.error('HomePage translate failed', e);
                    return (baseState as any).homePage;
                }),
                translatePages(),
            ]);

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
            cacheRef.current = cache;
            saveCache(cache);

            setTranslatedState(newState);
            lastProcessed.current = hash;
        } catch (error) {
            console.error("Translation logic error:", error);
            setTranslatedState(baseState);
            lastProcessed.current = hash;
        } finally {
            isProcessing.current = false;
            const pending = pendingRequestRef.current;
            const shouldProcessPending = Boolean(pending && pending.hash !== hash && pending.hash !== lastProcessed.current);
            if (shouldProcessPending && pending) {
                pendingRequestRef.current = null;
                setTimeout(() => {
                    void performTranslation(pending.targetLang, pending.baseState);
                }, 0);
            } else {
                pendingRequestRef.current = null;
            }
            setIsTranslating(false);
        }
    }, [translateCollection]);

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
