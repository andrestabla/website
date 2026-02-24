import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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

// Simple but robust hash function for CMS state
function getCMSHash(state: CMSState): string {
    try {
        const text = JSON.stringify({
            h: state.hero,
            s: state.services,
            p: state.products,
            st: state.site
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
                ...cached,
                design: baseState.design
            });
            lastProcessed.current = hash;
            return;
        }

        setIsTranslating(true);
        isProcessing.current = true;
        try {
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

            const translated = await translateObject(toTranslate, targetLang);

            if (!translated || typeof translated !== 'object') {
                throw new Error("Invalid translation response");
            }

            // Extremely defensive merging
            const t = translated as any;
            const newState: CMSState = {
                ...baseState,
                hero: {
                    ...baseState.hero,
                    title: t.hero?.title || baseState.hero.title,
                    subtitle: t.hero?.subtitle || baseState.hero.subtitle,
                    highlight: t.hero?.highlight || baseState.hero.highlight,
                    cta: t.hero?.cta || baseState.hero.cta,
                    secondaryCta: t.hero?.secondaryCta || baseState.hero.secondaryCta,
                },
                services: baseState.services.map((s, i) => {
                    const ts = t.services?.[i];
                    return ts ? {
                        ...s,
                        title: ts.title || s.title,
                        highlight: ts.highlight || s.highlight,
                        subtitle: ts.subtitle || s.subtitle,
                        description: ts.description || s.description,
                        descriptionLong: ts.descriptionLong || s.descriptionLong,
                        ctaPrimary: ts.ctaPrimary || s.ctaPrimary,
                        ctaSecondary: ts.ctaSecondary || s.ctaSecondary,
                        features: Array.isArray(ts.features) ? ts.features : s.features,
                    } : s;
                }),
                products: baseState.products.map((p, i) => {
                    const tp = t.products?.[i];
                    return tp ? {
                        ...p,
                        title: tp.title || p.title,
                        highlight: tp.highlight || p.highlight,
                        description: tp.description || p.description,
                        descriptionLong: tp.descriptionLong || p.descriptionLong,
                        price: tp.price || p.price,
                        ctaText: tp.ctaText || p.ctaText,
                    } : p;
                }),
                site: {
                    ...baseState.site,
                    name: t.site?.name || baseState.site.name,
                    description: t.site?.description || baseState.site.description,
                    contactAddress: t.site?.contactAddress || baseState.site.contactAddress,
                }
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
