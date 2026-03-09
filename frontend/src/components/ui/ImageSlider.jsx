'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ImageSlider({ images, autoPlay = true, interval = 3000, className }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Normalize images: if an image is a File object, create a local preview URL
    const normalizedImages = images?.map(img => {
        // If it's a File object (uploaded but not saved), use a local preview URL
        if (img instanceof File) {
            return { url: URL.createObjectURL(img), filename: img.name };
        }

        let rawUrl = (typeof img === 'string') ? img : img.url;
        if (!rawUrl) return { url: '', filename: 'none' };

        // If it's already an absolute HTTP(S) URL, use it
        if (rawUrl.startsWith('http')) {
            return { url: rawUrl, filename: (typeof img !== 'string' ? img.filename : 'image') || 'image' };
        }

        // Handle relative paths
        // In Vercel/Production, we prefer relative paths (/api/...) 
        // In local development, we might need to point to port 5000
        const isLocalhost = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        let finalUrl = rawUrl;

        // If the path doesn't start with /api or /uploads, it might be an old-style filename
        if (!finalUrl.startsWith('/')) {
            finalUrl = '/uploads/rooms/' + finalUrl;
        }

        // Prepend base URL only if on localhost and NEXT_PUBLIC_API_URL isn't set to a relative path
        if (isLocalhost && !process.env.NEXT_PUBLIC_API_URL?.startsWith('/')) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
            finalUrl = `${baseUrl}${finalUrl}`;
        }

        return {
            url: finalUrl,
            filename: (typeof img !== 'string' ? img.filename : 'image') || 'image'
        };
    }) || [];

    useEffect(() => {
        if (!autoPlay || normalizedImages.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % normalizedImages.length);
        }, interval);

        return () => clearInterval(timer);
    }, [autoPlay, interval, normalizedImages.length]);

    const handleNext = (e) => {
        e.preventDefault();
        setCurrentIndex((prev) => (prev + 1) % normalizedImages.length);
    };

    const handlePrev = (e) => {
        e.preventDefault();
        setCurrentIndex((prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length);
    };

    if (normalizedImages.length === 0) {
        return (
            <div className={cn("flex flex-col items-center justify-center bg-muted/50 rounded-sm border border-dashed border-border text-muted-foreground", className)}>
                <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-sm font-noto-medium">No Images Available</span>
            </div>
        );
    }

    return (
        <div className={cn("relative group overflow-hidden rounded-sm bg-black/5", className)}>
            <AnimatePresence mode="wait">
                <motion.img
                    key={currentIndex}
                    src={normalizedImages[currentIndex].url}
                    alt={normalizedImages[currentIndex].filename}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full object-cover"
                />
            </AnimatePresence>

            {normalizedImages.length > 1 && (
                <>
                    <button
                        onClick={handlePrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {normalizedImages.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.preventDefault(); setCurrentIndex(idx); }}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-300 focus:outline-none",
                                    idx === currentIndex ? "bg-white w-4" : "bg-white/50 w-1.5 hover:bg-white/75"
                                )}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Image Counter Badge */}
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-sm bg-black/60 text-white text-[10px] font-noto-bold tracking-wider backdrop-blur-sm">
                {currentIndex + 1} / {normalizedImages.length}
            </div>
        </div>
    );
}
