'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CircleHelp, ChevronRight, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

export function FAQTab() {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        const fetchFaqs = async () => {
            try {
                const res = await api.faq.list();
                setFaqs(res.data.faqs);
            } catch (err) {
                console.error("Failed to load FAQs", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFaqs();
    }, []);

    const filteredFaqs = faqs.filter(f =>
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col p-4 space-y-4 min-h-0">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    placeholder="Search queries..."
                    className="pl-9 text-xs h-9 rounded-sm border-2"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <Loader2 className="h-6 w-6 animate-spin mb-2" />
                        <span className="text-[10px] font-noto-semibold tracking-wide">Loading records...</span>
                    </div>
                ) : filteredFaqs.length === 0 ? (
                    <div className="text-center py-10 opacity-60">
                        <CircleHelp className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-xs font-noto-regular text-muted-foreground tracking-wide">No records found matching your query.</p>
                    </div>
                ) : (
                    filteredFaqs.map((faq, idx) => (
                        <div
                            key={faq._id}
                            className="border-2 border-border rounded-sm overflow-hidden transition-all hover:border-[#0056b3]/30"
                        >
                            <button
                                onClick={() => setExpanded(expanded === idx ? null : idx)}
                                className="w-full flex items-center justify-between p-3 text-left bg-muted/20 hover:bg-muted/40 transition-colors"
                            >
                                <span className="text-xs font-noto-semibold text-foreground pr-4 leading-tight">{faq.question}</span>
                                <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${expanded === idx ? 'rotate-90' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {expanded === idx && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        className="bg-background overflow-hidden"
                                    >
                                        <div className="p-3 text-[11px] font-noto-regular text-muted-foreground leading-relaxed border-t border-border">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))
                )}
            </div>

            <div className="pt-2 border-t border-border mt-auto">
                <p className="text-[10px] font-noto-semibold text-muted-foreground tracking-wide text-center opacity-40">
                    NFSU Official Knowledge Base
                </p>
            </div>
        </div>
    );
}
