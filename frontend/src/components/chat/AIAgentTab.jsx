'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, Sparkles, BedDouble, Calendar, CircleX, Star, Plus, Trash2, MessageSquare, History, ChevronLeft, ChevronRight, Search, AlertCircle, CheckCircle2, Headphones, User, Bot, Copy, Check, Square, CheckSquare, Trash, Edit3, User2, Briefcase, Tag, ChevronDown, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { api } from '@/lib/api';

export function AIAgentTab() {
    const router = useRouter();
    const [threads, setThreads] = useState([]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState(null);
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

    const handleCopy = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
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

                // Auto-refresh the page if a cancellation or modification was performed
                const metadata = result.data.aiMessage.metadata;
                const isCancellation = metadata && metadata.action === 'cancel_multiple_bookings' && (metadata.result?.success || metadata.result?.successCount > 0);
                const isModification = metadata && metadata.action === 'modify_booking' && metadata.result?.success;

                if (isCancellation || isModification) {
                    window.dispatchEvent(new CustomEvent('booking-updated'));
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
                        <div key={i} className="p-3 border border-border rounded-sm bg-muted/20 text-[10px] space-y-2 font-noto-regular overflow-hidden shadow-xs">
                            {room.primaryImage && (
                                <div className="aspect-video w-full rounded overflow-hidden border border-border/50 mb-1">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${room.primaryImage}`}
                                        className="w-full h-full object-cover"
                                        alt={room.roomNumber}
                                    />
                                </div>
                            )}
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
                                        <span>{room.location || `Block ${room.block}, Floor ${room.floor}`}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-noto-bold text-xs text-[#1a365d]">₹{room.price}</span>
                                    <p className="text-[8px] text-muted-foreground opacity-70">per night</p>
                                </div>
                            </div>

                            {room.description && (
                                <p className="text-[9px] text-muted-foreground italic line-clamp-2 mt-1">"{room.description}"</p>
                            )}

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

        // Quote Display
        if (action === 'calculate_stay_quote' && result && !result.error) {
            return (
                <div className="mt-2 p-3 border border-blue-100 rounded-md bg-blue-50/20 text-[10px] space-y-2 font-noto-regular">
                    <div className="flex items-center gap-2 text-blue-700">
                        <Tag className="h-3 w-3" />
                        <span className="font-noto-bold text-xs">Estimated Quote</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded border border-blue-100/50 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Stay for Room {result.roomNumber}</span>
                            <span className="font-noto-bold text-[#1a365d]">₹{result.totalAmount}</span>
                        </div>
                        <div className="flex flex-col text-[9px] text-muted-foreground border-t border-blue-50 pt-1">
                            <span>Dates: {result.dates}</span>
                            <span>Calculation: ₹{result.pricePerNight} × {result.totalNights} nights</span>
                        </div>
                    </div>
                </div>
            );
        }

        // Profile Display
        if (action === 'get_my_profile' && result && !result.error) {
            return (
                <div className="mt-2 p-3 border border-border rounded-md bg-muted/10 text-[10px] space-y-2 font-noto-regular max-w-[240px]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-xs bg-[#1a365d]/10 flex items-center justify-center border border-[#1a365d]/20">
                            <User2 className="h-5 w-5 text-[#1a365d]" />
                        </div>
                        <div>
                            <p className="font-noto-bold text-xs">{result.name}</p>
                            <p className="text-[9px] text-[#1a365d] uppercase font-noto-bold opacity-80">{result.role}</p>
                        </div>
                    </div>
                    <div className="space-y-1.5 border-t border-border pt-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Email</span>
                            <span className="font-noto-medium">{result.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone</span>
                            <span className="font-noto-medium">{result.phone}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Account Since</span>
                            <span className="font-noto-medium">{result.joined}</span>
                        </div>
                    </div>
                </div>
            );
        }

        // System Info
        if (action === 'get_system_info' && result) {
            return (
                <div className="mt-2 p-3 border border-border rounded-md bg-card shadow-xs text-[10px] space-y-2 font-noto-regular">
                    <div className="flex items-center gap-2 text-muted-foreground border-b border-border pb-1.5">
                        <Bot className="h-3 w-3" />
                        <span className="font-noto-bold text-[9px] uppercase tracking-widest">Campus Guidelines</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                            <p className="text-[8px] text-muted-foreground uppercase opacity-60 font-noto-bold mb-0.5">Check-in</p>
                            <p className="font-noto-bold text-foreground">{result.checkInTime}</p>
                        </div>
                        <div>
                            <p className="text-[8px] text-muted-foreground uppercase opacity-60 font-noto-bold mb-0.5">Check-out</p>
                            <p className="font-noto-bold text-foreground">{result.checkOutTime}</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[8px] text-muted-foreground uppercase opacity-60 font-noto-bold">Main Amenities</p>
                        <div className="flex flex-wrap gap-1">
                            {result.facilities.map((f, idx) => (
                                <span key={idx} className="bg-muted px-1.5 py-0.5 rounded-sm text-[8px]">{f}</span>
                            ))}
                        </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground italic border-t border-border pt-1.5">{result.policy}</p>
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
                        <p className="text-xl font-noto-bold tracking-[0.3em] text-[#1a365d] uppercase">{result.token}</p>
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

        // Supply Request Confirmation
        if (action === 'request_supplies' && result && result.success) {
            const items = result.data?.items || [];
            return (
                <div className="mt-2 p-3 border border-emerald-200 rounded-md bg-emerald-50/30 text-[10px] space-y-2 font-noto-regular">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <div className="bg-emerald-100 p-1 rounded-full">
                                <CheckCircle2 className="h-3 w-3" />
                            </div>
                            <span className="font-noto-bold text-xs">Service Request Confirmed</span>
                        </div>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-noto-bold">
                            Room {result.data.roomNumber}
                        </span>
                    </div>
                    <div className="bg-white/60 rounded-md border border-emerald-100 divide-y divide-emerald-100">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between px-3 py-1.5">
                                <span className="text-foreground">{item.name}</span>
                                <span className="font-noto-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm text-[9px]">
                                    ×{item.quantity || 1}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-1 opacity-60 text-[8px]">
                        <span>Submitted: {result.data.timestamp}</span>
                        <span className="bg-emerald-100/50 px-1.5 rounded-sm">Housekeeping Notified</span>
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
                        <span className="text-[#1a365d] font-noto-bold">₹{result.price}/night</span>
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
                        <div key={i} className="p-3 border border-border rounded-sm bg-sky-50/30 text-[10px] space-y-1 font-noto-regular shadow-xs">
                            <div className="flex items-start gap-2">
                                <Search className="h-3 w-3 mt-0.5 text-[#1a365d]" />
                                <span className="font-noto-bold text-[#1a365d]">{faq.question}</span>
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
                <div className="mt-3 space-y-3">
                    <p className="text-[10px] font-noto-bold text-[#1a365d] uppercase tracking-widest px-1">Active Bookings:</p>
                    {result.length === 0 ? (
                        <div className="text-[10px] text-muted-foreground italic px-1">No active bookings found.</div>
                    ) : (
                        result.map((b) => (
                            <BookingActionCard
                                key={b.id}
                                booking={b}
                                onCancel={() => handleSendWithContent(`Cancel my booking for Room ${b.room} (ID: ${b.id})`)}
                                onUpdate={(updates) => {
                                    const updateStr = Object.entries(updates)
                                        .filter(([_, v]) => v)
                                        .map(([k, v]) => `${k}: ${v}`)
                                        .join(', ');
                                    handleSendWithContent(`Update booking ${b.id}: ${updateStr}`);
                                }}
                            />
                        ))
                    )}
                </div>
            );
        }

        if (action === 'modify_booking' && result) {
            return (
                <div className="mt-2 p-3 border border-emerald-100 rounded-md bg-emerald-50/20 text-[10px] space-y-2 font-noto-regular">
                    <div className="flex items-center gap-2 text-emerald-700">
                        <div className="bg-emerald-100 p-1 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                        </div>
                        <span className="font-noto-bold text-xs">Update Successful</span>
                    </div>
                    <div className="space-y-1 pl-1">
                        <p className="text-muted-foreground">Modified: <span className="text-[#1a365d] font-bold italic">{result.updatedFields?.join(', ') || 'dates'}</span></p>
                        {result.priceDiff !== 0 && (
                            <p className="text-muted-foreground">
                                Price Adjustment: <span className={result.priceDiff > 0 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                                    {result.priceDiff > 0 ? '+' : ''}₹{result.priceDiff}
                                </span>
                            </p>
                        )}
                        <p className="text-muted-foreground font-noto-bold mt-1">New Total: ₹{result.newTotal}</p>
                    </div>
                </div>
            );
        }

        if (action === 'cancel_multiple_bookings' && result) {
            return (
                <div className="mt-2 p-3 border border-red-100 rounded-md bg-red-50/20 text-[10px] space-y-2 font-noto-regular">
                    <div className="flex items-center gap-2 text-red-700">
                        <div className="bg-red-100 p-1 rounded-full">
                            <Trash className="h-3 w-3" />
                        </div>
                        <span className="font-noto-bold text-xs">Bulk Cancellation Processed</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Successful: <span className="text-green-600 font-bold">{result.successCount}</span></p>
                        {result.errorCount > 0 && <p className="text-muted-foreground">Failed: <span className="text-red-600 font-bold">{result.errorCount}</span></p>}
                    </div>
                    <div className="pt-2 border-t border-red-100/50">
                        {result.results.map((r, i) => (
                            <div key={i} className="flex justify-between items-center text-[9px] py-0.5">
                                <span className="text-muted-foreground italic">Room {r.room}</span>
                                <span className="text-green-600 font-bold uppercase tracking-widest">Cancelled</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    };

    // Helper to send a message programmatically
    const handleSendWithContent = async (content) => {
        if (!content || loading) return;
        const userMsg = { senderType: 'user', content: content, createdAt: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const res = await api.chats.aiChat({ content: content, threadId });
            if (res.status === 'success') {
                setMessages(prev => [...prev, res.data.aiMessage]);
                if (!threadId || res.data.threadTitle) {
                    setThreadId(res.data.threadId);
                    fetchThreads();
                }

                // Auto-refresh the page if a cancellation or modification was performed
                const metadata = res.data.aiMessage.metadata;
                const isCancellation = metadata && metadata.action === 'cancel_multiple_bookings' && (metadata.result?.success || metadata.result?.successCount > 0);
                const isModification = metadata && metadata.action === 'modify_booking' && metadata.result?.success;

                if (isCancellation || isModification) {
                    window.dispatchEvent(new CustomEvent('booking-updated'));
                }
            } else {
                setMessages(prev => [...prev, { senderType: 'ai', content: res.message || "Failed.", createdAt: new Date(), isError: true }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { senderType: 'ai', content: "Connection error.", createdAt: new Date(), isError: true }]);
        } finally {
            setLoading(false);
        }
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
                        className="border-r border-border bg-muted/5 flex flex-col overflow-hidden whitespace-nowrap"
                    >
                        <div className="p-4 border-b-2 border-border flex justify-between items-center bg-white/50">
                            <h3 className="text-[10px] font-noto-bold text-[#1a365d] uppercase tracking-[0.15em]">Official Logs</h3>
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-xs border-[#1a365d]/20 text-[#1a365d] hover:bg-[#1a365d] hover:text-white transition-colors" title="New Inquiry" onClick={createNewChat}>
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
                                        className={`group relative p-3 rounded-xs cursor-pointer transition-all flex items-start gap-3 border-b border-border ${threadId === t._id
                                            ? 'bg-[#1a365d]/5 border-l-4 border-l-[#1a365d]'
                                            : 'hover:bg-muted/30 border-l-4 border-l-transparent'
                                            }`}
                                    >
                                        <MessageSquare className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${threadId === t._id ? 'text-[#1a365d]' : 'text-muted-foreground/50'}`} />
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className={`text-[10px] truncate font-noto-bold uppercase tracking-tight ${threadId === t._id ? 'text-[#1a365d]' : 'text-foreground/80'}`}>
                                                {t.title || 'Official Inquiry'}
                                            </p>
                                            <p className="text-[8px] text-muted-foreground mt-1 font-noto-bold opacity-60">
                                                ID: {t._id.slice(-6).toUpperCase()} • {new Date(t.lastMessageAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 absolute right-1 top-1/2 -translate-y-1/2 opacity-100 sm:opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all rounded-sm scale-90"
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
                        <div className="flex flex-col items-center justify-center text-center py-4 px-2">
                            {/* Header */}
                            <div className="p-3 bg-[#1a365d]/5 rounded-sm border border-[#1a365d]/10 mb-3 relative overflow-hidden group inline-flex">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-[#1a365d]/5 rounded-full -mr-6 -mt-6 blur-xl group-hover:bg-amber-500/10 transition-colors duration-700" />
                                <Bot className="h-7 w-7 text-[#1a365d] relative z-10" strokeWidth={1.5} />
                            </div>

                            <div className="space-y-0.5 mb-3">
                                <h3 className="text-[13px] font-noto-bold text-[#1a365d] uppercase tracking-tight flex items-center justify-center gap-1.5">
                                    <span className="w-5 h-[1.5px] bg-[#1a365d]/20 hidden sm:block" />
                                    Official AI Desk Assistant
                                    <span className="w-5 h-[1.5px] bg-[#1a365d]/20 hidden sm:block" />
                                </h3>
                                <p className="text-[8px] font-noto-bold text-amber-700 uppercase tracking-[0.15em] opacity-80">National Forensic Sciences University</p>
                            </div>

                            <p className="text-[10px] font-noto-medium leading-relaxed text-muted-foreground max-w-[340px] bg-muted/20 p-2.5 border-y border-border/40 mb-4">
                                {threadId
                                    ? "Welcome back. I am ready to process your inquiries regarding this official correspondence log."
                                    : "I am the authorized digital representative for NFSU Guest Relations. I can facilitate lodging requisitions, verify clearance statuses, and provide campus guidelines."
                                }
                            </p>

                            {!threadId && (
                                <div className="w-full max-w-[420px] space-y-2.5">
                                    <div className="flex items-center gap-2 justify-center">
                                        <div className="h-[1px] flex-1 bg-border" />
                                        <p className="text-[8px] font-noto-bold text-muted-foreground uppercase tracking-[0.12em] whitespace-nowrap">Quick Actions</p>
                                        <div className="h-[1px] flex-1 bg-border" />
                                    </div>

                                    {/* Rooms & Lodging */}
                                    <div className="space-y-1">
                                        <p className="text-[7px] font-noto-bold text-[#1a365d] uppercase tracking-wider pl-0.5 opacity-60">Rooms & Lodging</p>
                                        <div className="grid grid-cols-3 gap-1">
                                            {[
                                                { label: "Search Rooms", query: "Show me all available rooms" },
                                                { label: "Room Details", query: "Show me details of room 101" },
                                                { label: "Stay Quote", query: "Calculate the price for a 3-night stay" }
                                            ].map((task, i) => (
                                                <button key={i} onClick={() => handleSendWithContent(task.query)}
                                                    className="p-1.5 text-[8px] font-noto-bold text-[#1a365d] bg-white hover:bg-[#1a365d] hover:text-white border border-[#1a365d]/10 rounded-sm transition-all text-left truncate">
                                                    {task.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reservations */}
                                    <div className="space-y-1">
                                        <p className="text-[7px] font-noto-bold text-[#1a365d] uppercase tracking-wider pl-0.5 opacity-60">Reservations</p>
                                        <div className="grid grid-cols-3 gap-1">
                                            {[
                                                { label: "Book a Room", query: "I want to book a room" },
                                                { label: "My Bookings", query: "Show all my bookings" },
                                                { label: "Booking Details", query: "Show details of my latest booking" },
                                                { label: "Modify Booking", query: "I want to modify one of my booking" },
                                                { label: "Cancel Booking", query: "I need to cancel my booking" },
                                                { label: "Cancel Multiple", query: "Cancel all my pending bookings" }
                                            ].map((task, i) => (
                                                <button key={i} onClick={() => handleSendWithContent(task.query)}
                                                    className="p-1.5 text-[8px] font-noto-bold text-[#1a365d] bg-white hover:bg-[#1a365d] hover:text-white border border-[#1a365d]/10 rounded-sm transition-all text-left truncate">
                                                    {task.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Personnel & Access */}
                                    <div className="space-y-1">
                                        <p className="text-[7px] font-noto-bold text-amber-700 uppercase tracking-wider pl-0.5 opacity-70">Personnel & Access</p>
                                        <div className="grid grid-cols-2 gap-1">
                                            {[
                                                { label: "My Gatepass", query: "Show my official gatepass for check-in" },
                                                { label: "My Profile", query: "Show my account details and role" }
                                            ].map((task, i) => (
                                                <button key={i} onClick={() => handleSendWithContent(task.query)}
                                                    className="p-1.5 text-[8px] font-noto-bold text-[#1a365d] bg-white hover:bg-amber-500 hover:text-white border border-amber-500/15 rounded-sm transition-all text-left truncate">
                                                    {task.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Services & Support */}
                                    <div className="space-y-1">
                                        <p className="text-[7px] font-noto-bold text-[#1a365d] uppercase tracking-wider pl-0.5 opacity-60">Services & Support</p>
                                        <div className="grid grid-cols-2 gap-1">
                                            {[
                                                { label: "Report Room Issue", query: "I want to report a maintenance issue in my room" },
                                                { label: "Request Supplies", query: "I need extra towels and toiletries for my room" },
                                                { label: "Submit Feedback", query: "I want to submit feedback about my stay" },
                                                { label: "Escalate to Staff", query: "I need to speak with a staff member about an urgent matter" }
                                            ].map((task, i) => (
                                                <button key={i} onClick={() => handleSendWithContent(task.query)}
                                                    className="p-1.5 text-[8px] font-noto-bold text-[#1a365d] bg-white hover:bg-[#1a365d] hover:text-white border border-[#1a365d]/10 rounded-sm transition-all text-left truncate">
                                                    {task.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Information */}
                                    <div className="space-y-1 pb-2">
                                        <p className="text-[7px] font-noto-bold text-[#1a365d] uppercase tracking-wider pl-0.5 opacity-60">Information</p>
                                        <div className="grid grid-cols-3 gap-1">
                                            {[
                                                { label: "System Info", query: "What are the check-in and check-out times?" },
                                                { label: "Search FAQ", query: "Search FAQs about guest house policies" },
                                                { label: "Facilities", query: "What facilities are available on campus?" }
                                            ].map((task, i) => (
                                                <button key={i} onClick={() => handleSendWithContent(task.query)}
                                                    className="p-1.5 text-center text-[8px] font-noto-bold text-muted-foreground bg-muted/15 hover:bg-muted/40 border border-border/60 rounded-sm transition-colors uppercase tracking-tight truncate">
                                                    {task.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-3 ${msg.senderType === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`flex flex-col max-w-[92%] sm:max-w-[85%] ${msg.senderType === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`p-4 rounded-sm text-[12px] leading-relaxed shadow-xs transition-all duration-200 border-2 ${msg.senderType === 'user'
                                    ? 'bg-[#1a365d] text-white border-[#1a365d] font-noto-medium'
                                    : msg.isError
                                        ? 'bg-red-50 text-red-900 border-red-200 font-noto-medium'
                                        : 'bg-card text-foreground border-border/80 font-noto-medium'
                                    }`}>
                                    {msg.senderType === 'ai' && (
                                        <div className="flex items-center gap-1.5 mb-3 border-b border-border pb-2 opacity-80 uppercase tracking-widest text-[9px] font-noto-bold text-[#1a365d]">
                                            <Bot className="h-3 w-3" />
                                            <span>Official Response</span>
                                        </div>
                                    )}
                                    {msg.senderType === 'user' ? (
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    ) : (
                                        <div className="prose prose-sm dark:prose-invert max-w-none 
                                            prose-p:leading-relaxed prose-p:mb-3 last:prose-p:mb-0
                                            prose-strong:font-noto-bold prose-strong:text-[#1a365d] dark:prose-strong:text-cyan-400
                                            prose-ul:list-disc prose-ul:pl-4 prose-li:mb-1">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    )}
                                    {renderMetadata(msg)}
                                </div>
                                <div className={`text-[8px] mt-1.5 px-1 opacity-50 hover:opacity-100 transition-all font-noto-bold flex items-center gap-2 uppercase tracking-widest text-[#1a365d]`}>
                                    <span className="bg-[#1a365d]/10 px-1.5 py-0.5 rounded-xs">{msg.senderType === 'user' ? 'Inquirer' : 'Authorized Asst'}</span>
                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    <button
                                        onClick={() => handleCopy(msg.content, msg._id || idx)}
                                        className="ml-1 flex items-center gap-1 cursor-pointer hover:text-amber-600 transition-colors bg-muted/30 px-1 rounded-xs"
                                        title="Copy to clipboard"
                                    >
                                        {copiedMessageId === (msg._id || idx) ? (
                                            <>
                                                <Check className="h-2 w-2 text-emerald-600" />
                                            </>
                                        ) : (
                                            <Copy className="h-2 w-2" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-[#1a365d]/5 p-3 rounded-sm border border-[#1a365d]/20 flex items-center gap-3">
                                <Loader2 className="h-3 w-3 animate-spin text-[#1a365d]" />
                                <span className="text-[9px] font-noto-bold uppercase tracking-widest text-[#1a365d] opacity-70">Processing Official Response...</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-4 pb-4 bg-background">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-end gap-2 bg-background border-2 border-border/60 rounded-sm p-1.5 focus-within:border-[#1a365d] focus-within:ring-0 transition-all shadow-xs">
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Enter your official inquiry here..."
                                className="min-h-[44px] max-h-[160px] resize-none border-0 focus-visible:ring-0 text-[12px] font-noto-medium pt-2.5"
                                rows={1}
                            />
                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="h-9 w-9 rounded-xs bg-[#1a365d] hover:bg-[#2a4a7d] text-white transition-all shrink-0 mb-0.5"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <div className="hidden sm:block text-[8px] text-muted-foreground font-noto-bold uppercase tracking-wider flex-shrink-0 whitespace-nowrap">
                        <span className="opacity-50 font-noto-medium mr-1">Shift+Enter for</span> newline
                    </div>
                </div>
            </div>
        </div>
    );
}

function BookingActionCard({ booking, onCancel, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    if (isEditing) {
        return (
            <div className="border border-[#1a365d]/20 rounded-xs overflow-hidden bg-white shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="bg-[#1a365d]/5 px-3 py-2 border-b border-[#1a365d]/10 flex justify-between items-center text-[10px] font-noto-bold text-[#1a365d] uppercase tracking-widest">
                    <div className="flex items-center gap-1.5"><Edit3 className="h-3 w-3" /> Update Official Record</div>
                    <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground"><ChevronDown className="h-3.5 w-3.5 rotate-180" /></button>
                </div>
                <BookingModifier booking={booking} onCancel={() => setIsEditing(false)} onSave={onUpdate} />
            </div>
        );
    }

    return (
        <div className="group border border-border rounded-sm p-3 bg-muted/5 hover:bg-muted/10 transition-all hover:shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-noto-bold text-[#1a365d] uppercase tracking-tight">Room {booking.room}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-xs font-noto-bold uppercase border ${booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            {booking.status}
                        </span>
                    </div>
                    <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-2.5 w-2.5" /> ID: <span className="font-mono">{booking.id}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[11px] font-noto-bold text-[#1a365d]">₹{booking.total}</div>
                    <div className="text-[8px] text-muted-foreground uppercase tracking-widest font-noto-bold opacity-60">Total Amount</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                    <div className="text-[8px] text-muted-foreground uppercase font-noto-bold flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> Stay Dates</div>
                    <div className="text-[10px] font-noto-medium">{new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}</div>
                </div>
                <div className="space-y-1">
                    <div className="text-[8px] text-muted-foreground uppercase font-noto-bold flex items-center gap-1"><History className="h-2.5 w-2.5" /> Payment</div>
                    <div className="text-[10px] font-noto-bold uppercase text-emerald-600">
                        {booking.paymentStatus} {booking.paymentMethod && `(${booking.paymentMethod})`}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="flex-1 h-7 text-[9px] rounded-xs font-noto-bold uppercase tracking-wider gap-1.5 border-[#1a365d]/20 text-[#1a365d] hover:bg-[#1a365d]/5"
                >
                    <Edit3 className="h-2.5 w-2.5" /> Update
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancel()}
                    className="h-7 text-[9px] rounded-sm font-noto-bold uppercase tracking-wider gap-1.5 text-red-600 hover:bg-red-50"
                >
                    <Trash className="h-2.5 w-2.5" /> Cancel
                </Button>
            </div>
        </div>
    );
}

function BookingModifier({ booking, onCancel, onSave }) {
    const [formData, setFormData] = useState({
        bookingId: booking.id,
        newCheckIn: booking.checkIn ? new Date(booking.checkIn).toISOString().split('T')[0] : '',
        newCheckOut: booking.checkOut ? new Date(booking.checkOut).toISOString().split('T')[0] : '',
        purpose: booking.purpose || 'personal',
        purposeDetails: booking.purposeDetails || '',
        guestName: booking.guestName || '',
        numberOfGuests: booking.numberOfGuests || 1,
        specialRequests: booking.specialRequests || ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="p-3 space-y-3 font-noto-regular">
            <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                    <label className="text-[8px] font-noto-bold text-muted-foreground uppercase flex items-center gap-1"><Calendar className="h-2.5 w-2.5 text-[#1a365d]" /> Check-In</label>
                    <input
                        type="date"
                        name="newCheckIn"
                        value={formData.newCheckIn}
                        onChange={handleChange}
                        className="w-full text-[10px] p-1.5 border rounded-xs bg-muted/5 focus:outline-none focus:ring-1 focus:ring-[#1a365d]/30"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-noto-bold text-muted-foreground uppercase flex items-center gap-1"><Calendar className="h-2.5 w-2.5 text-[#1a365d]" /> Check-Out</label>
                    <input
                        type="date"
                        name="newCheckOut"
                        value={formData.newCheckOut}
                        onChange={handleChange}
                        className="w-full text-[10px] p-1.5 border rounded-xs bg-muted/5 focus:outline-none focus:ring-1 focus:ring-[#1a365d]/30"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[8px] font-noto-bold text-muted-foreground uppercase flex items-center gap-1"><User2 className="h-2.5 w-2.5 text-[#1a365d]" /> Guest Name</label>
                <input
                    type="text"
                    name="guestName"
                    placeholder="Enter guest name"
                    value={formData.guestName}
                    onChange={handleChange}
                    className="w-full text-[10px] p-1.5 border rounded-xs bg-muted/5 focus:outline-none focus:ring-1 focus:ring-[#1a365d]/30"
                />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                    <label className="text-[8px] font-noto-bold text-muted-foreground uppercase flex items-center gap-1"><Briefcase className="h-2.5 w-2.5 text-[#1a365d]" /> Purpose</label>
                    <select
                        name="purpose"
                        value={formData.purpose}
                        onChange={handleChange}
                        className="w-full text-[10px] p-1.5 border rounded-xs bg-muted/5 focus:outline-none focus:ring-1 focus:ring-[#1a365d]/30"
                    >
                        <option value="personal">Personal</option>
                        <option value="academic">Academic</option>
                        <option value="business">Business</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-noto-bold text-muted-foreground uppercase flex items-center gap-1"><Tag className="h-2.5 w-2.5 text-[#1a365d]" /> Guests</label>
                    <input
                        type="number"
                        name="numberOfGuests"
                        min="1"
                        max="4"
                        value={formData.numberOfGuests}
                        onChange={handleChange}
                        className="w-full text-[10px] p-1.5 border rounded-xs bg-muted/5 focus:outline-none focus:ring-1 focus:ring-[#1a365d]/30"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[8px] font-noto-bold text-muted-foreground uppercase">Update Purpose Details (Optional)</label>
                <textarea
                    name="purposeDetails"
                    rows="2"
                    placeholder="Briefly describe the reason for your visit..."
                    value={formData.purposeDetails}
                    onChange={handleChange}
                    className="w-full text-[10px] p-2 border rounded-xs bg-muted/5 focus:outline-none focus:ring-1 focus:ring-[#1a365d]/30 resize-none"
                />
            </div>

            <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => onSave(formData)} className="flex-1 h-8 rounded-xs text-[9px] font-noto-bold uppercase bg-[#1a365d] hover:bg-[#2a4a7d] text-white">
                    Apply Updates
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel} className="h-8 rounded-sm text-[9px] font-noto-bold uppercase text-muted-foreground">
                    Cancel
                </Button>
            </div>
        </div>
    );
}

function BookingSelector({ bookings, onConfirm }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [confirmed, setConfirmed] = useState(false);

    const activeBookings = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));

    const toggleBooking = (id) => {
        if (confirmed) return;
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    if (activeBookings.length === 0) {
        return <div className="mt-2 text-[10px] text-muted-foreground italic">No eligible bookings found.</div>;
    }

    return (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
            <p className="text-[9px] font-noto-bold text-[#1a365d] uppercase tracking-widest mb-2">Select Bookings to Process:</p>
            <div className="space-y-1.5">
                {activeBookings.map((b) => (
                    <div
                        key={b.id}
                        onClick={() => toggleBooking(b.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-sm border cursor-pointer transition-all ${selectedIds.includes(b.id)
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-muted/10 border-border hover:bg-muted/20'
                            }`}
                    >
                        <div className="shrink-0">
                            {selectedIds.includes(b.id)
                                ? <CheckSquare className="h-4 w-4 text-[#0056b3]" />
                                : <Square className="h-4 w-4 text-muted-foreground opacity-30" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <span className="text-[11px] font-noto-bold font-mono">Room {b.room}</span>
                                <span className="text-[9px] font-noto-bold text-[#1a365d]">₹{b.total}</span>
                            </div>
                            <div className="text-[9px] text-muted-foreground opacity-80 flex items-center gap-1 mt-0.5">
                                <Calendar className="h-2.5 w-2.5" />
                                {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Button
                disabled={selectedIds.length === 0 || confirmed}
                onClick={() => {
                    setConfirmed(true);
                    onConfirm(selectedIds);
                }}
                className={`w-full h-8 mt-2 rounded-xs font-noto-bold uppercase text-[10px] tracking-widest transition-all ${confirmed ? 'bg-emerald-600 text-white' : 'bg-[#1a365d] hover:bg-[#2a4a7d] text-white shadow-xs'}`}
            >
                {confirmed ? (
                    <span className="flex items-center gap-1.5"><Check className="h-3 w-3" /> Processing...</span>
                ) : (
                    <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Confirm Selection ({selectedIds.length})</span>
                )}
            </Button>
        </div>
    );
}
