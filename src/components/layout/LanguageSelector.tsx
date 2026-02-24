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
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentLang = languages.find(l => l.code === language);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm transition-all group"
            >
                <div className="relative">
                    <Globe className={`w-4 h-4 text-white/60 group-hover:text-white transition-colors ${isTranslating ? 'animate-spin' : ''}`} />
                    {isTranslating && (
                        <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                            <div className="w-1 h-1 bg-brand-secondary rounded-full" />
                        </div>
                    )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80 group-hover:text-white">
                    {currentLang?.code}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="py-1">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors group ${language === lang.code ? 'bg-white/5' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{lang.flag}</span>
                                        <span className="text-[11px] font-bold uppercase tracking-tight text-white/70 group-hover:text-white">
                                            {lang.label}
                                        </span>
                                    </div>
                                    {language === lang.code && <Check className="w-3 h-3 text-brand-secondary" />}
                                </button>
                            ))}
                        </div>
                        {isTranslating && (
                            <div className="px-4 py-2 bg-brand-secondary/10 border-t border-white/5">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-secondary animate-pulse">
                                    Translating via Gemini...
                                </span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
