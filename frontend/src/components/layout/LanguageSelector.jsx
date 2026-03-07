'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'kok', name: 'Konkani', native: 'कोंकणी' },
    { code: 'ks', name: 'Kashmiri', native: 'كٲشِر' },
    { code: 'mni-Mtei', name: 'Manipuri', native: 'ꯃꯤꯇꯩꯂꯣꯟ' },
    { code: 'ur', name: 'Urdu', native: 'اردو' },
];

// Initialize Google Translate
function initGoogleTranslate() {
    if (typeof window === 'undefined') return;

    // Only initialize once
    if (window.__googleTranslateInit) return;
    window.__googleTranslateInit = true;

    // Create the hidden element for Google Translate
    if (!document.getElementById('google_translate_element')) {
        const div = document.createElement('div');
        div.id = 'google_translate_element';
        div.style.display = 'none';
        document.body.appendChild(div);
    }

    // Define the callback
    window.googleTranslateElementInit = function () {
        new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        }, 'google_translate_element');
    };

    // Load the script dynamically
    if (!document.getElementById('google-translate-script')) {
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        document.body.appendChild(script);
    }
}

// Trigger translation to a specific language
function translateTo(langCode) {
    if (typeof window === 'undefined') return;

    // For English, reset translation
    if (langCode === 'en') {
        // Remove the Google Translate cookie to restore original
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
        window.location.reload();
        return;
    }

    // Set the translation cookie
    document.cookie = `googtrans=/en/${langCode}; path=/;`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${window.location.hostname};`;

    // Try to trigger the Google Translate widget
    const selectEl = document.querySelector('.goog-te-combo');
    if (selectEl) {
        selectEl.value = langCode;
        selectEl.dispatchEvent(new Event('change'));
    } else {
        // If widget hasn't loaded yet, reload to apply cookie-based translation
        window.location.reload();
    }
}

export default function LanguageSelector({ open, onClose }) {
    const [currentLang, setCurrentLang] = useState('en');

    useEffect(() => {
        initGoogleTranslate();

        // Check current language from cookie
        try {
            const match = document.cookie.match(/googtrans=\/en\/([a-z\-]+)/i);
            if (match) {
                setCurrentLang(match[1]);
            }
        } catch { }
    }, []);

    const handleLanguageSelect = useCallback((langCode) => {
        setCurrentLang(langCode);
        localStorage.setItem('preferred-language', langCode);
        translateTo(langCode);
        onClose();
    }, [onClose]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-16 right-4 z-[70] w-[360px] max-h-[80vh] overflow-y-auto rounded-sm border-2 border-border bg-card shadow-xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/10">
                            <h3 className="text-sm font-noto-bold text-foreground uppercase tracking-widest">
                                Select Language
                            </h3>
                            <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-sm h-7 w-7">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Language Grid */}
                        <div className="p-4">
                            <div className="grid grid-cols-2 gap-2">
                                {LANGUAGES.map((lang) => {
                                    const isActive = currentLang === lang.code;
                                    return (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLanguageSelect(lang.code)}
                                            className={`flex flex-col items-start p-3 rounded-sm border-2 transition-all text-left ${isActive
                                                ? 'border-[#0056b3] dark:border-cyan-500 bg-[#0056b3]/5 dark:bg-cyan-500/5'
                                                : 'border-border hover:border-muted-foreground/50 hover:bg-muted/20'
                                                }`}
                                        >
                                            <span className={`text-sm font-noto-bold ${isActive ? 'text-[#0056b3] dark:text-cyan-500' : 'text-foreground'}`}>
                                                {lang.name}
                                            </span>
                                            <span className="text-xs font-noto-medium text-muted-foreground mt-0.5">
                                                {lang.native}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer note */}
                        <div className="px-5 py-3 border-t border-border bg-muted/5">
                            <p className="text-[10px] font-noto-medium text-muted-foreground text-center uppercase tracking-widest">
                                Translation powered by Google Translate
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
