'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useAnimation, useMotionValue } from 'framer-motion';
import { Star, MessageSquareQuote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

export function ReviewCarousel({ reviews = [] }) {
    const [containerWidth, setContainerWidth] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const controls = useAnimation();
    const x = useMotionValue(0);

    // Duplicate reviews to create infinite effect
    const displayReviews = [...reviews, ...reviews, ...reviews];

    useEffect(() => {
        const updateWidths = () => {
            if (containerRef.current && contentRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
                setContentWidth(contentRef.current.scrollWidth / 3);
            }
        };

        updateWidths();
        window.addEventListener('resize', updateWidths);

        const observer = new ResizeObserver(updateWidths);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => {
            window.removeEventListener('resize', updateWidths);
            observer.disconnect();
        };
    }, [reviews]);

    useEffect(() => {
        if (contentWidth > 0) {
            startAnimation();
        }
    }, [contentWidth]);

    const startAnimation = async () => {
        if (reviews.length === 0) return;

        const duration = (contentWidth / 50); // Consistent speed: 50px per second

        await controls.start({
            x: -contentWidth,
            transition: {
                duration: duration,
                ease: "linear",
                repeat: Infinity,
                repeatType: "loop"
            },
        });
    };

    if (reviews.length === 0) return null;

    return (
        <div
            ref={containerRef}
            className="relative w-full overflow-hidden py-4 select-none"
            onMouseEnter={() => controls.stop()}
            onMouseLeave={() => startAnimation()}
        >
            <motion.div
                ref={contentRef}
                className="flex gap-4 cursor-grab active:cursor-grabbing"
                animate={controls}
                style={{ x }}
                drag="x"
                dragConstraints={{ left: -contentWidth * 2, right: 0 }}
                onDragStart={() => controls.stop()}
                onDragEnd={(e, info) => {
                    // Normalize position to stay within the first set of clones
                    const currentX = x.get();
                    if (currentX > 0) x.set(currentX - contentWidth);
                    if (currentX < -contentWidth) x.set(currentX + contentWidth);
                    startAnimation();
                }}
            >
                {displayReviews.map((review, idx) => (
                    <Card
                        key={`${review._id}-${idx}`}
                        className="flex-shrink-0 w-[240px] sm:w-[280px] md:w-[320px] rounded-sm border-2 border-border bg-card shadow-sm hover:border-[#0056b3] dark:hover:border-cyan-600 transition-colors"
                    >
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                                <div className="flex flex-col">
                                    <span className="font-noto-bold text-xs text-foreground truncate max-w-[150px]">
                                        {review.user?.name || 'Guest User'}
                                    </span>
                                    <span className="text-[10px] font-noto-medium text-muted-foreground uppercase tracking-widest">
                                        {format(new Date(review.createdAt), 'dd MMM yyyy')}
                                    </span>
                                </div>
                                <div className="flex gap-0.5 mt-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                            key={s}
                                            className={`h-3 w-3 ${review.rating >= s ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/20'}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="relative">
                                <MessageSquareQuote className="absolute -top-1 -left-1 h-3 w-3 text-muted-foreground/20 italic" />
                                <p className="text-xs font-noto-medium text-muted-foreground leading-relaxed pl-3 line-clamp-3 italic">
                                    {review.comment || "Excellent accommodation and official standards maintained."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            {/* Fading Edges for better visual focus */}
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        </div>
    );
}
