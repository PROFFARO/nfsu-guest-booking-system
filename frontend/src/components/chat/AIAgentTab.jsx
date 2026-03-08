'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, BedDouble, Calendar, CircleX, Star, Plus, Trash2, MessageSquare, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

export function AIAgentTab() {
    const [threads, setThreads] = useState([]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [threadId, setThreadId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('activeAIThreadId');
        }
        return null;
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const scrollRef = useRef(null);

    // Fetch all threads on mount
    useEffect(() => {
        fetchThreads();
    }, []);

    // Fetch history when threadId changes
    useEffect(() => {
        if (threadId) {
            fetchHistory(threadId);
            localStorage.setItem('activeAIThreadId', threadId);
        } else {
            setMessages([]);
        }
    }, [threadId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchThreads = async () => {
        try {
            const result = await api.chats.getAIThreads();
            if (result.status === 'success') {
                setThreads(result.data.threads);
            }
        } catch (err) {
            console.error("Failed to fetch threads:", err);
        }
    };

    const fetchHistory = async (id) => {
        try {
            const result = await api.chats.getMessages(id);
            if (result.status === 'success') {
                setMessages(result.data.messages);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
        }
    };

    const createNewChat = async () => {
        try {
            const result = await api.chats.createAIThread();
            if (result.status === 'success') {
                setThreads(prev => [result.data.thread, ...prev]);
                setThreadId(result.data.thread._id);
                setMessages([]);
            }
        } catch (err) {
            console.error("Failed to create chat:", err);
        }
    };

    const deleteThread = async (e, id) => {
        e.stopPropagation();

        try {
            const result = await api.chats.deleteAIThread(id);
            if (result.status === 'success') {
                setThreads(prev => prev.filter(t => t._id !== id));
                if (threadId === id) {
                    setThreadId(null);
                    localStorage.removeItem('activeAIThreadId');
                }
            }
        } catch (err) {
            console.error("Failed to delete thread:", err);
        }
    };

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

                // If this was a new thread, refresh thread list to get the generated title
                if (!threadId || result.data.threadTitle) {
                    setThreadId(result.data.threadId);
                    fetchThreads();
                }
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
        <div className="flex-1 flex overflow-hidden h-full">
            {/* Thread Sidebar */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 240, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="border-r border-border bg-muted/10 flex flex-col overflow-hidden whitespace-nowrap"
                    >
                        <div className="p-4 border-b border-border flex justify-between items-center bg-background/50">
                            <h3 className="text-[11px] font-noto-bold text-muted-foreground uppercase tracking-widest">Your Chats</h3>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm hover:bg-[#0056b3]/10 text-[#0056b3]" onClick={createNewChat}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {threads.length === 0 ? (
                                <div className="text-[10px] text-muted-foreground text-center mt-8 px-4 opacity-60 italic">
                                    No chat history yet.
                                </div>
                            ) : (
                                threads.map(t => (
                                    <div
                                        key={t._id}
                                        onClick={() => setThreadId(t._id)}
                                        className={`group relative p-2.5 rounded-sm cursor-pointer transition-all flex items-start gap-3 border ${threadId === t._id
                                            ? 'bg-[#0056b3]/5 border-[#0056b3]/20'
                                            : 'hover:bg-muted/50 border-transparent'
                                            }`}
                                    >
                                        <MessageSquare className={`h-4 w-4 mt-0.5 shrink-0 ${threadId === t._id ? 'text-[#0056b3]' : 'text-muted-foreground'}`} />
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className={`text-[11px] truncate font-noto-medium ${threadId === t._id ? 'text-[#0056b3]' : 'text-foreground'}`}>
                                                {t.title || 'New Conversation'}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground mt-0.5 opacity-70">
                                                {new Date(t.lastMessageAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all rounded-sm scale-90"
                                            onClick={(e) => deleteThread(e, t._id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col relative min-w-0 bg-background">
                {/* Sidebar Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-2 z-10 h-7 w-7 rounded-full bg-background border shadow-sm hover:bg-muted"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar mb-4 p-4 pt-12" ref={scrollRef}>
                    {messages.length === 0 && !loading && (
                        <div className="h-full flex flex-col items-center justify-center text-center px-6">
                            <div className="p-4 bg-[#0056b3]/5 rounded-full mb-6">
                                <Sparkles className="h-10 w-10 text-[#0056b3] animate-pulse" />
                            </div>
                            <h3 className="text-sm font-noto-bold text-foreground">Campus AI Assistant</h3>
                            <p className="text-[11px] font-noto-regular leading-relaxed mt-2 text-muted-foreground max-w-[280px]">
                                {threadId
                                    ? "Start by asking something about this conversation."
                                    : "Hello! I am your AI assistant. I can help you find rooms, check bookings, or automate your stay. How can I assist you today?"
                                }
                            </p>

                            {!threadId && (
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
                            )}
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

                <div className="p-4 pt-0">
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder={threadId ? "Message AI..." : "Start a new conversation..."}
                            className="flex-1 text-xs h-11 rounded-sm border-2 font-noto-regular shadow-sm focus-visible:ring-[#0056b3]"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <Button
                            size="icon"
                            className="h-11 w-11 bg-[#0056b3] hover:bg-[#004494] shadow-md flex-shrink-0 transition-all active:scale-95"
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
