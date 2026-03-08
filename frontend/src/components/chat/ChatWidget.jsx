'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Sparkles, CircleHelp, Headset, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { toast } from 'sonner';

// Helper components for tabs
import { FAQTab } from './FAQTab';
import { AIAgentTab } from './AIAgentTab';
import { SupportTab } from './SupportTab';

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('faq'); // 'faq', 'ai', 'support'
    const { user } = useAuth();

    if (!user || user.role === 'admin' || user.role === 'staff') return null;

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="mb-4 w-[calc(100vw-32px)] sm:w-[420px] max-h-[75vh] sm:max-h-[85vh] shadow-2xl rounded-sm overflow-hidden border-2 border-border bg-background flex flex-col"
                    >
                        <CardHeader className="p-3 sm:p-4 bg-[#0056b3] dark:bg-cyan-950 text-white flex flex-row items-center justify-between pointer-events-auto">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/10 rounded-sm">
                                    <MessageCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-noto-semibold tracking-tight">NFSU Desk Assistant</CardTitle>
                                    <p className="text-[10px] font-noto-regular text-white/80 mt-0.5">Campus Stay Support</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="text-white hover:bg-white/10 h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>

                        {/* Tab Switcher */}
                        <div className="flex border-b border-border bg-muted/30">
                            {[
                                { id: 'faq', icon: CircleHelp, label: 'Queries' },
                                { id: 'ai', icon: Sparkles, label: 'Campus AI' },
                                { id: 'support', icon: Headset, label: 'Live Desk' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${activeTab === tab.id
                                        ? 'bg-background text-[#0056b3] dark:text-cyan-500 border-b-2 border-[#0056b3] dark:border-cyan-500'
                                        : 'text-muted-foreground hover:bg-muted/50'
                                        }`}
                                >
                                    <tab.icon className="h-4 w-4" />
                                    <span className="text-[10px] font-noto-semibold tracking-wide">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden min-h-0 flex flex-col relative">
                            {activeTab === 'faq' && <FAQTab />}
                            {activeTab === 'ai' && <AIAgentTab />}
                            {activeTab === 'support' && <SupportTab />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                size="lg"
                onClick={() => setIsOpen(!isOpen)}
                className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-xl transition-all duration-300 ${isOpen ? 'bg-red-500 hover:bg-red-600 scale-90' : 'bg-[#0056b3] hover:bg-[#004494] hover:scale-105'
                    }`}
            >
                {isOpen ? <X className="h-6 w-6 text-white" /> : <MessageCircle className="h-6 w-6 text-white" />}
            </Button>
        </div>
    );
}
