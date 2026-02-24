import { useLanguage, type Language } from '../../context/LanguageContext';
import { Globe, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'es', label: 'Castellano', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

export function LanguageSelector() {
    const { language, setLanguage, isTranslating } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [isConfigured, setIsConfigured] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Import check at runtime
        import('../../lib/gemini').then(m => {
            setIsConfigured(m.isGeminiConfigured());
        });
    }, [language]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all group"
            >
                <div className="relative">
                    <Globe className={`w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors ${isTranslating ? 'animate-spin' : ''}`} />
                    {isTranslating && (
                        <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                            <div className="w-1 h-1 bg-brand-secondary rounded-full" />
                        </div>
                    )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-900">
                    {language}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="py-1">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors group ${language === lang.code ? 'bg-slate-50' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{lang.flag}</span>
                                        <span className="text-[11px] font-bold uppercase tracking-tight text-slate-600 group-hover:text-slate-900">
                                            {lang.label}
                                        </span>
                                    </div>
                                    {language === lang.code && <Check className="w-3 h-3 text-brand-secondary" />}
                                </button>
                            ))}
                        </div>
                        {isTranslating && (
                            <div className="px-4 py-2 bg-brand-secondary/10 border-t border-slate-100">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-secondary animate-pulse">
                                    Translating via Gemini...
                                </span>
                            </div>
                        )}
                        {!isConfigured && (
                            <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-red-500">
                                    API Key not found
                                </span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
