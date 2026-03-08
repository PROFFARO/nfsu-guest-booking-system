'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, BedDouble, Calendar, CircleX, Star, Plus, Trash2, MessageSquare, History, ChevronLeft, ChevronRight, Search, AlertCircle, CheckCircle2, Headphones, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
            const result = await api.chats.getThreadMessages(id);
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
                content: "I'm having trouble connecting right now. Please try sending your message again.",
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
                        <div key={i} className="p-3 border border-border rounded-md bg-muted/20 text-[10px] space-y-2 font-noto-regular">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="font-noto-bold text-sm">Room {room.roomNumber}</span>
                                        <div className="flex items-center bg-amber-50 text-amber-700 px-1.5 rounded-sm border border-amber-100 scale-90">
                                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500 mr-1" />
                                            <span className="text-[9px] font-noto-bold">{room.rating || 'New'}</span>
                                        </div>
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-2">
                                        <span className="capitalize">{room.type}</span>
                                        <span className="opacity-30">•</span>
                                        <span>Block {room.block}</span>
                                        <span className="opacity-30">•</span>
                                        <span>Floor {room.floor}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-noto-bold text-xs text-[#0056b3]">₹{room.price}</span>
                                    <p className="text-[8px] text-muted-foreground opacity-70">per night</p>
                                </div>
                            </div>

                            {room.facilities && room.facilities.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {room.facilities.slice(0, 4).map((f, idx) => (
                                        <span key={idx} className="bg-background/80 px-1.5 py-0.5 rounded-sm border border-border text-[8px] text-muted-foreground">
                                            {f}
                                        </span>
                                    ))}
                                    {room.facilities.length > 4 && (
                                        <span className="text-[8px] text-muted-foreground opacity-50 px-1">+{room.facilities.length - 4} more</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }


        // Support Escalation Confirmation
        if (action === 'escalate_to_staff' && result && result.success) {
            return (
                <div className="mt-2 p-3 border border-indigo-100 rounded-md bg-indigo-50/20 text-[10px] space-y-2 font-noto-regular">
                    <div className="flex items-center gap-2 text-indigo-700">
                        <div className="bg-indigo-100 p-1 rounded-full">
                            <Headphones className="h-3 w-3" />
                        </div>
                        <span className="font-noto-bold text-xs">Support Ticket Opened</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                        I've escalated your request to our human support team. A staff member has been notified of your issue: <span className="italic">"{result.data.reason}"</span>
                    </p>
                    <div className="text-center pt-2">
                        <p className="text-[9px] text-indigo-600 font-noto-bold mb-1">Please check the "Support" tab to continue the conversation with a staff member.</p>
                    </div>
                </div>
            );
        }

        // Booking Modification Confirmation
        if (action === 'modify_booking' && result && result.success) {
            return (
                <div className="mt-2 p-3 border border-emerald-100 rounded-md bg-emerald-50/20 text-[10px] space-y-2 font-noto-regular">
                    <div className="flex items-center gap-2 text-emerald-700">
                        <div className="bg-emerald-100 p-1 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                        </div>
                        <span className="font-noto-bold text-xs">Booking Modified</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-white/50 p-2 rounded border border-emerald-100/50">
                        <div>
                            <p className="text-muted-foreground opacity-60 uppercase text-[8px]">New Check-in</p>
                            <p className="font-noto-bold text-foreground">{new Date(result.data.newDates.in).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground opacity-60 uppercase text-[8px]">New Check-out</p>
                            <p className="font-noto-bold text-foreground">{new Date(result.data.newDates.out).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center px-1">
                        <span className="text-muted-foreground">Price Adjustment:</span>
                        <span className={`font-noto-bold ${result.data.priceDiff >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {result.data.priceDiff >= 0 ? `+ ₹${result.data.priceDiff}` : `- ₹${Math.abs(result.data.priceDiff)}`}
                        </span>
                    </div>
                    <p className="text-muted-foreground border-t border-emerald-100 pt-2 text-[9px]">
                        Your stay has been officially updated in the system.
                    </p>
                </div>
            );
        }

        // Smart Gatepass Display
        if (action === 'get_my_gatepass' && result && result.success) {
            return (
                <div className="mt-2 p-3 border border-border rounded-lg bg-card space-y-3 font-noto-regular shadow-sm max-w-[280px]">
                    <div className="text-center font-noto-bold text-[10px] text-muted-foreground uppercase tracking-widest border-b border-border pb-2">
                        Official Gatepass
                    </div>
                    <div className="flex justify-center py-2 bg-white rounded-md">
                        <img
                            src={result.qrCode}
                            alt="Gatepass QR"
                            className="h-32 w-32"
                        />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-noto-bold">Check-in Token</p>
                        <p className="text-xl font-noto-bold tracking-[0.3em] text-[#0056b3] uppercase">{result.token}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-[9px] text-muted-foreground">
                        <div>
                            <p className="opacity-60 uppercase">Room</p>
                            <p className="font-noto-bold text-foreground">{result.roomNumber}</p>
                        </div>
                        <div className="text-right">
                            <p className="opacity-60 uppercase">Date</p>
                            <p className="font-noto-bold text-foreground">{new Date(result.checkIn).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="bg-muted/30 p-2 rounded text-[8px] text-muted-foreground text-center">
                        Please present this QR code at the reception scanning station during arrival.
                    </div>
                </div>
            );
        }

        // Maintenance Issue Report
        if (action === 'report_room_issue' && result && result.success) {
            return (
                <div className="mt-2 p-3 border border-red-100 rounded-md bg-red-50/20 text-[10px] space-y-2 font-noto-regular">
                    <div className="flex items-center gap-2 text-red-700">
                        <div className="bg-red-100 p-1 rounded-full">
                            <AlertCircle className="h-3 w-3" />
                        </div>
                        <span className="font-noto-bold text-xs">Maintenance Logged</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                        The issue for <span className="font-noto-bold text-foreground">Room {result.data.roomNumber}</span> has been officially recorded in the maintenance log.
                    </p>
                    <div className="flex justify-between items-center pt-1 opacity-60 text-[8px]">
                        <span>Reference: {result.data.timestamp}</span>
                        <span className="bg-red-100/50 px-1.5 rounded-sm">Urgent Internal Notification Sent</span>
                    </div>
                </div>
            );
        }

        // Room Details (Deep Dive)
        if (action === 'get_room_details' && result && !result.error) {
            return (
                <div className="mt-2 p-4 border border-border rounded-lg bg-card space-y-3 shadow-sm font-noto-regular">
                    {result.primaryImage && (
                        <div className="relative aspect-video rounded-md overflow-hidden border border-border mb-2">
                            <img
                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${result.primaryImage}`}
                                alt={`Room ${result.roomNumber}`}
                                className="object-cover w-full h-full"
                            />
                            <div className="absolute top-2 right-2 bg-background/90 px-2 py-0.5 rounded text-[10px] font-noto-bold border border-border">
                                {result.status === 'vacant' ? '🟢 Vacant' : '🔴 Occupied'}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <h4 className="font-noto-bold text-base">Room {result.roomNumber}</h4>
                        <span className="text-[#0056b3] font-noto-bold">₹{result.price}/night</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed italic">
                        "{result.description || 'No description available for this room.'}"
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                        <div className="flex flex-col">
                            <span className="text-muted-foreground opacity-60">Type</span>
                            <span className="capitalize">{result.type}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-muted-foreground opacity-60">Location</span>
                            <span>Block {result.block}, Floor {result.floor}</span>
                        </div>
                    </div>
                    {result.amenities && result.amenities.length > 0 && (
                        <div className="pt-2 border-t border-border">
                            <p className="text-[9px] font-noto-bold mb-1 opacity-60 uppercase">Room Amenities</p>
                            <div className="flex flex-wrap gap-1.5">
                                {result.amenities.map((a, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded text-[9px]">
                                        <span className={a.available ? "text-green-600" : "text-red-400 opacity-50"}>•</span>
                                        <span className={!a.available ? "line-through opacity-50" : ""}>{a.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // FAQ Search Results
        if (action === 'find_faq' && Array.isArray(result)) {
            if (result.length === 0) return <div className="text-[10px] text-muted-foreground italic mt-2">No matching FAQs found.</div>;
            return (
                <div className="mt-2 space-y-2">
                    {result.map((faq, i) => (
                        <div key={i} className="p-3 border border-border rounded-md bg-sky-50/30 text-[10px] space-y-1 font-noto-regular">
                            <div className="flex items-start gap-2">
                                <Search className="h-3 w-3 mt-0.5 text-[#0056b3]" />
                                <span className="font-noto-bold text-[#0056b3]">{faq.question}</span>
                            </div>
                            <div className="pl-5 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {faq.answer}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (action === 'get_my_bookings' && Array.isArray(result)) {
            return (
                <div className="mt-2 space-y-2">
                    {result.map((b, i) => (
                        <div key={i} className="p-2.5 border border-border rounded-md bg-muted/10 text-[10px] space-y-1.5 font-noto-regular relative overflow-hidden">
                            <div className="flex justify-between">
                                <span className="font-noto-bold text-xs">Room {b.room}</span>
                                <div className="flex gap-1.5">
                                    <span className={`px-1.5 py-0.5 rounded-sm font-noto-bold text-[8px] uppercase ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        b.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                        {b.status}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-sm font-noto-bold text-[8px] uppercase ${b.paymentStatus === 'paid' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {b.paymentStatus}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground opacity-80">
                                <span>{new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className="font-noto-bold text-foreground opacity-100">₹{b.total}</span>
                            </div>
                            {b.status === 'cancelled' && b.cancellationReason && (
                                <div className="text-[9px] text-red-500/80 bg-red-50/50 p-1.5 rounded-sm mt-1 border-l-2 border-red-200">
                                    Reason: {b.cancellationReason}
                                </div>
                            )}
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
                        <div key={idx} className={`flex gap-3 ${msg.senderType === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <Avatar className="h-8 w-8 flex-shrink-0 border border-border mt-1">
                                {msg.senderType === 'user' ? (
                                    <>
                                        <AvatarFallback className="bg-[#0056b3] text-white"><User className="h-4 w-4" /></AvatarFallback>
                                    </>
                                ) : (
                                    <>
                                        <AvatarFallback className="bg-muted text-foreground"><Bot className="h-4 w-4" /></AvatarFallback>
                                    </>
                                )}
                            </Avatar>
                            <div className={`flex flex-col max-w-[92%] sm:max-w-[85%] ${msg.senderType === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm transition-all duration-200 ${msg.senderType === 'user'
                                    ? 'bg-[#0056b3] text-white font-noto-regular rounded-tr-none'
                                    : msg.isError
                                        ? 'bg-red-50 text-red-700 border border-red-200 font-noto-regular rounded-tl-none'
                                        : 'bg-card text-foreground border border-border font-noto-regular rounded-tl-none shadow-xs'
                                    }`}>
                                    {msg.senderType === 'user' ? (
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    ) : (
                                        <div className="prose prose-sm dark:prose-invert max-w-none 
                                            prose-p:leading-relaxed prose-p:mb-3 last:prose-p:mb-0
                                            prose-strong:font-noto-bold prose-strong:text-[#0056b3] dark:prose-strong:text-cyan-400
                                            prose-ul:list-disc prose-ul:pl-4 prose-li:mb-1">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    )}
                                    {renderMetadata(msg)}
                                </div>
                                <div className={`text-[9px] mt-1.5 px-1 opacity-40 font-noto-medium flex items-center gap-1.5 uppercase tracking-tighter`}>
                                    <span>{msg.senderType === 'user' ? 'You' : 'Assistant'}</span>
                                    <span>•</span>
                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

                <div className="px-4 pb-3">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-end gap-2 bg-background border-2 rounded-lg p-1 focus-within:ring-2 focus-within:ring-[#0056b3] transition-all shadow-sm">
                            <Textarea
                                placeholder={threadId ? "Message AI..." : "Start a new conversation..."}
                                className="flex-1 min-h-[42px] max-h-32 border-none focus-visible:ring-0 resize-none text-[13px] font-noto-regular py-2.5 px-3 custom-scrollbar"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <Button
                                size="icon"
                                className="h-8 w-8 bg-[#0056b3] hover:bg-[#004494] shadow-md flex-shrink-0 transition-all active:scale-95 mb-1 mr-1"
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                        <div className="px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 opacity-70">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <AlertCircle className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />
                                <p className="text-[9px] text-muted-foreground font-noto-medium truncate">
                                    AI may occasionally make mistakes. Verify important details.
                                </p>
                            </div>
                            <div className="hidden sm:block text-[8px] text-muted-foreground font-noto-bold uppercase tracking-wider flex-shrink-0 whitespace-nowrap">
                                <span className="opacity-50 font-noto-medium mr-1">Shift+Enter for</span> newline
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
