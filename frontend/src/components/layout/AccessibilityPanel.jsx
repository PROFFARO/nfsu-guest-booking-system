'use client';

import { useAccessibility } from '@/context/AccessibilityContext';
import { Button } from '@/components/ui/button';
import {
    Moon, Sun, ChevronUp, ChevronDown, RotateCcw, Type, AlignJustify, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccessibilityPanel({ open, onClose }) {
    const {
        contrast, fontSize, textSpacing, lineHeight,
        setContrast, increaseFontSize, decreaseFontSize,
        resetFontSize, toggleTextSpacing, toggleLineHeight, resetAll
    } = useAccessibility();

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
                        className="fixed top-16 right-4 z-[70] w-[340px] max-h-[80vh] overflow-y-auto rounded-sm border-2 border-border bg-card shadow-xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/10">
                            <h3 className="text-sm font-noto-bold text-foreground uppercase tracking-widest">
                                Accessibility Tools
                            </h3>
                            <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-sm h-7 w-7">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Contrast */}
                            <div>
                                <h4 className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest mb-3">
                                    Contrast Adjustment
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setContrast('high')}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-sm border-2 transition-all ${contrast === 'high'
                                            ? 'border-[#0056b3] dark:border-cyan-500 bg-[#0056b3]/5 dark:bg-cyan-500/5'
                                            : 'border-border hover:border-muted-foreground/50'
                                            }`}
                                    >
                                        <Moon className="h-5 w-5 text-foreground" />
                                        <span className="text-[10px] font-noto-bold uppercase tracking-widest text-foreground">High Contrast</span>
                                    </button>
                                    <button
                                        onClick={() => setContrast('normal')}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-sm border-2 transition-all ${contrast === 'normal'
                                            ? 'border-[#0056b3] dark:border-cyan-500 bg-[#0056b3]/5 dark:bg-cyan-500/5'
                                            : 'border-border hover:border-muted-foreground/50'
                                            }`}
                                    >
                                        <Sun className="h-5 w-5 text-foreground" />
                                        <span className="text-[10px] font-noto-bold uppercase tracking-widest text-foreground">Normal</span>
                                    </button>
                                </div>
                            </div>

                            {/* Text Size */}
                            <div>
                                <h4 className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest mb-3">
                                    Text Size <span className="text-muted-foreground/60">({fontSize >= 0 ? '+' : ''}{fontSize})</span>
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={increaseFontSize}
                                        disabled={fontSize >= 4}
                                        className="flex flex-col items-center gap-1.5 p-3 rounded-sm border-2 border-border hover:border-[#0056b3] dark:hover:border-cyan-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ChevronUp className="h-5 w-5 text-foreground" />
                                        <span className="text-[9px] font-noto-bold uppercase tracking-widest text-foreground">Increase</span>
                                    </button>
                                    <button
                                        onClick={decreaseFontSize}
                                        disabled={fontSize <= -2}
                                        className="flex flex-col items-center gap-1.5 p-3 rounded-sm border-2 border-border hover:border-[#0056b3] dark:hover:border-cyan-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ChevronDown className="h-5 w-5 text-foreground" />
                                        <span className="text-[9px] font-noto-bold uppercase tracking-widest text-foreground">Decrease</span>
                                    </button>
                                    <button
                                        onClick={resetFontSize}
                                        className="flex flex-col items-center gap-1.5 p-3 rounded-sm border-2 border-border hover:border-[#0056b3] dark:hover:border-cyan-500 transition-all"
                                    >
                                        <RotateCcw className="h-5 w-5 text-foreground" />
                                        <span className="text-[9px] font-noto-bold uppercase tracking-widest text-foreground">Reset</span>
                                    </button>
                                </div>
                            </div>

                            {/* Spacing & Line Height */}
                            <div>
                                <h4 className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest mb-3">
                                    Readability
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={toggleTextSpacing}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-sm border-2 transition-all ${textSpacing
                                            ? 'border-[#0056b3] dark:border-cyan-500 bg-[#0056b3]/5 dark:bg-cyan-500/5'
                                            : 'border-border hover:border-muted-foreground/50'
                                            }`}
                                    >
                                        <Type className="h-5 w-5 text-foreground" />
                                        <span className="text-[9px] font-noto-bold uppercase tracking-widest text-foreground">Text Spacing</span>
                                    </button>
                                    <button
                                        onClick={toggleLineHeight}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-sm border-2 transition-all ${lineHeight
                                            ? 'border-[#0056b3] dark:border-cyan-500 bg-[#0056b3]/5 dark:bg-cyan-500/5'
                                            : 'border-border hover:border-muted-foreground/50'
                                            }`}
                                    >
                                        <AlignJustify className="h-5 w-5 text-foreground" />
                                        <span className="text-[9px] font-noto-bold uppercase tracking-widest text-foreground">Line Height</span>
                                    </button>
                                </div>
                            </div>

                            {/* Reset All */}
                            <div className="pt-2 border-t border-border">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={resetAll}
                                    className="w-full rounded-sm border-border font-noto-medium text-xs h-9"
                                >
                                    <RotateCcw className="mr-2 h-3 w-3" />
                                    Reset All Settings
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
