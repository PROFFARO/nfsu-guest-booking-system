'use client';

import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

export default function ThemeToggle() {
    const { theme, toggleTheme, mounted } = useTheme();

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon-sm" className="rounded-full" disabled>
                <div className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={toggleTheme}
                    className="relative rounded-full border border-border/50 hover:border-cyan-500/30 hover:bg-cyan-500/5"
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    <AnimatePresence mode="wait">
                        {theme === 'dark' ? (
                            <motion.div
                                key="sun"
                                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Sun className="h-4 w-4 text-amber-400" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="moon"
                                initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Moon className="h-4 w-4 text-blue-500" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                <p className="text-xs">
                    {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </p>
            </TooltipContent>
        </Tooltip>
    );
}
