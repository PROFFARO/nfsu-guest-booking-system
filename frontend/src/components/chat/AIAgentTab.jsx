'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, BedDouble, Calendar, CircleX, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

export function AIAgentTab() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [threadId, setThreadId] = useState(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { senderType: 'user', content: input, createdAt: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const result = await api.chats.aiChat({ content: input, threadId });

            if (result.status === 'success') {
                setMessages(prev => [...prev, result.data.aiMessage]);
                setThreadId(result.data.threadId);
            } else {
                setMessages(prev => [...prev, {
                    senderType: 'ai',
                    content: result.message || "I'm having trouble connecting to my brain. Please check the API config.",
                    createdAt: new Date(),
                    isError: true
                }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                senderType: 'ai',
                content: "Network error. Please try again later.",
                createdAt: new Date(),
                isError: true
            }]);
        } finally {
            setLoading(false);
        }
    };

    const renderMetadata = (msg) => {
        if (!msg.metadata || !msg.metadata.action) return null;

        const { action, result } = msg.metadata;

        if (action === 'get_available_rooms' && Array.isArray(result)) {
            return (
                <div className="mt-2 space-y-2">
                    {result.map((room, i) => (
                        <div key={i} className="p-2 border border-border rounded-sm bg-muted/20 text-[10px] flex justify-between items-center font-noto-regular">
                            <div>
                                <span className="font-noto-semibold">Room {room.roomNumber}</span>
                                <span className="ml-2 text-muted-foreground capitalize">{room.type}</span>
                            </div>
                            <span className="font-noto-bold text-[#0056b3]">₹{room.price}</span>
                        </div>
                    ))}
                </div>
            );
        }

        if (action === 'get_my_bookings' && Array.isArray(result)) {
            return (
                <div className="mt-2 space-y-2">
                    {result.map((b, i) => (
                        <div key={i} className="p-2 border border-border rounded-sm bg-muted/20 text-[10px] font-noto-regular">
                            <div className="flex justify-between font-noto-semibold">
                                <span>Room {b.room}</span>
                                <span className={`capitalize ${b.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'}`}>{b.status}</span>
                            </div>
                            <div className="text-muted-foreground mt-1">
                                {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="flex-1 flex flex-col p-4 min-h-0">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar mb-4" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="p-4 bg-[#0056b3]/5 dark:bg-cyan-500/5 rounded-full mb-6">
                            <Sparkles className="h-10 w-10 text-[#0056b3] dark:text-cyan-500 animate-pulse" />
                        </div>
                        <h3 className="text-sm font-noto-bold tracking-tight text-foreground">Campus AI Assistant</h3>
                        <p className="text-[11px] font-noto-regular leading-relaxed mt-2 text-muted-foreground max-w-[280px]">
                            "Hello! I am your AI assistant. I can help you find rooms, check bookings, or automate your stay. How can I assist you today?"
                        </p>

                        <div className="mt-8 w-full max-w-[300px] space-y-2">
                            <p className="text-[10px] font-noto-semibold text-muted-foreground uppercase tracking-widest text-center mb-4 opacity-70">Suggested Tasks</p>
                            {[
                                "Show available double rooms",
                                "Check my current check-in status",
                                "How do I cancel my booking?"
                            ].map((task, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setInput(task); }}
                                    className="w-full p-2.5 text-left text-[11px] font-noto-medium text-foreground bg-muted/20 hover:bg-muted/40 border border-border rounded-sm transition-colors"
                                >
                                    {task}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-md text-[13px] leading-relaxed shadow-xs ${msg.senderType === 'user'
                            ? 'bg-[#0056b3] text-white font-noto-regular'
                            : msg.isError ? 'bg-red-50 text-red-700 border border-red-200 font-noto-regular' : 'bg-muted/30 text-foreground border border-border font-noto-regular'
                            }`}>
                            {msg.content}
                            {renderMetadata(msg)}
                            <div className={`text-[9px] mt-1 opacity-50 font-noto-medium ${msg.senderType === 'user' ? 'text-right' : 'text-left'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-muted/30 p-3 rounded-md border border-border flex items-center gap-3">
                            <Loader2 className="h-3 w-3 animate-spin text-[#0056b3]" />
                            <span className="text-[10px] font-noto-semibold tracking-wide text-muted-foreground">AI is processing...</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Input
                    placeholder="Ask AI to automate tasks..."
                    className="flex-1 text-xs h-11 rounded-sm border-2 font-noto-regular"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button
                    size="icon"
                    className="h-11 w-11 bg-[#0056b3] hover:bg-[#004494] shadow-md flex-shrink-0 transition-all hover:scale-105"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
            </div>
        </div>
    );
}
