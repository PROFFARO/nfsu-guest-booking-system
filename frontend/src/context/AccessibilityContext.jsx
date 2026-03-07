'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AccessibilityContext = createContext(null);

const DEFAULTS = {
    contrast: 'normal', // 'normal' | 'high'
    fontSize: 0, // -2 to +4 steps (each step = 2px on base)
    textSpacing: false,
    lineHeight: false,
};

export function AccessibilityProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULTS);
    const [mounted, setMounted] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('a11y-settings');
            if (stored) {
                setSettings({ ...DEFAULTS, ...JSON.parse(stored) });
            }
        } catch { }
        setMounted(true);
    }, []);

    // Persist to localStorage and apply to DOM
    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem('a11y-settings', JSON.stringify(settings));

        const root = document.documentElement;

        // Font size: base is 16px, each step adds/removes 2px
        const baseFontSize = 16 + (settings.fontSize * 2);
        root.style.fontSize = `${baseFontSize}px`;

        // Text spacing
        if (settings.textSpacing) {
            root.style.letterSpacing = '0.12em';
            root.style.wordSpacing = '0.16em';
        } else {
            root.style.letterSpacing = '';
            root.style.wordSpacing = '';
        }

        // Line height
        if (settings.lineHeight) {
            root.style.setProperty('--a11y-line-height', '2');
            root.classList.add('a11y-line-height');
        } else {
            root.style.removeProperty('--a11y-line-height');
            root.classList.remove('a11y-line-height');
        }

        // Contrast
        if (settings.contrast === 'high') {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }
    }, [settings, mounted]);

    const setContrast = useCallback((mode) => {
        setSettings(prev => ({ ...prev, contrast: mode }));
    }, []);

    const increaseFontSize = useCallback(() => {
        setSettings(prev => ({ ...prev, fontSize: Math.min(prev.fontSize + 1, 4) }));
    }, []);

    const decreaseFontSize = useCallback(() => {
        setSettings(prev => ({ ...prev, fontSize: Math.max(prev.fontSize - 1, -2) }));
    }, []);

    const resetFontSize = useCallback(() => {
        setSettings(prev => ({ ...prev, fontSize: 0 }));
    }, []);

    const toggleTextSpacing = useCallback(() => {
        setSettings(prev => ({ ...prev, textSpacing: !prev.textSpacing }));
    }, []);

    const toggleLineHeight = useCallback(() => {
        setSettings(prev => ({ ...prev, lineHeight: !prev.lineHeight }));
    }, []);

    const resetAll = useCallback(() => {
        setSettings(DEFAULTS);
    }, []);

    return (
        <AccessibilityContext.Provider value={{
            ...settings,
            mounted,
            setContrast,
            increaseFontSize,
            decreaseFontSize,
            resetFontSize,
            toggleTextSpacing,
            toggleLineHeight,
            resetAll,
        }}>
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const ctx = useContext(AccessibilityContext);
    if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
    return ctx;
}
