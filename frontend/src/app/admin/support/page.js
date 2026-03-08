'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Headset, MessageCircle, Send, CircleCheckBig, Clock, Inbox, Loader2, ChevronLeft, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

export default function SupportInbox() {
    const [threads, setThreads] = useState([]);
    const [activeThread, setActiveThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [threadToDelete, setThreadToDelete] = useState(null);
    const { socket } = useSocket();
    const scrollRef = useRef(null);

    useEffect(() => {
        const fetchThreads = async () => {
            try {
                const res = await api.chats.getAdminInbox();
                setThreads(res.data.threads);
            } catch (err) {
                console.error("Failed to load inbox", err);
            } finally {
                setLoading(false);
            }
        };
        fetchThreads();
    }, []);

    useEffect(() => {
        if (!socket) return;
        const handleNewMessage = (message) => {
            if (activeThread && message.thread === activeThread._id) {
                setMessages(prev => {
                    if (prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });
            }
            // Update threads list last message hint
            setThreads(prev => prev.map(t => 
                t._id === message.thread ? { ...t, lastMessageAt: message.createdAt } : t
            ));
        };
        socket.on('newMessage', handleNewMessage);
        return () => socket.off('newMessage', handleNewMessage);
    }, [socket, activeThread?._id]);

    useEffect(() => {
        if (socket && activeThread?._id) {
            socket.emit('joinChat', activeThread._id);
            return () => {
                socket.emit('leaveChat', activeThread._id);
            };
        }
    }, [socket, activeThread?._id]);

    useEffect(() => {
        const scrollToBottom = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        };
        const timer = setTimeout(scrollToBottom, 50);
        return () => clearTimeout(timer);
    }, [messages]);

    const selectThread = async (thread) => {
        setActiveThread(thread);
        const res = await api.chats.getThreadMessages(thread._id);
        setMessages(res.data.messages);
    };

    const handleDeleteThread = (e, thread) => {
        e.stopPropagation();
        setThreadToDelete(thread);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!threadToDelete) return;

        setIsDeleting(true);
        try {
            const res = await api.chats.deleteAdminThread(threadToDelete._id);
            if (res.status === 'success') {
                toast.success('Thread deleted successfully');
                setThreads(prev => prev.filter(t => t._id !== threadToDelete._id));
                if (activeThread?._id === threadToDelete._id) {
                    setActiveThread(null);
                    setMessages([]);
                }
                setDeleteModalOpen(false);
                setThreadToDelete(null);
            }
        } catch (err) {
            console.error("Failed to delete thread", err);
            toast.error(err.message || 'Failed to delete thread');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !activeThread) return;
        const content = input;
        setInput('');
        try {
            const res = await api.chats.sendMessage({
                threadId: activeThread._id,
                content
            });
            if (res.status === 'success') {
                socket.emit('sendMessage', {
                    threadId: activeThread._id,
                    message: res.data.message
                });
            }
        } catch (err) {
            console.error("Failed to send reply", err);
        }
    };

    return (
        <div className="flex h-[calc(100vh-120px)] border-2 border-border rounded-sm overflow-hidden bg-card shadow-sm">
            {/* Sidebar: Open Threads */}
            <div className={`flex flex-col bg-muted/10 transition-all ${activeThread ? 'hidden md:flex' : 'flex'} w-full md:w-80 md:border-r-2 border-border border-r-0`}>
                <div className="p-4 border-b-2 border-border flex items-center gap-2 bg-background font-noto-semibold text-xs tracking-wide text-muted-foreground">
                    <Inbox className="h-4 w-4" />
                    Support Ledger {threads.length > 0 && `(${threads.length})`}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-10 flex flex-col items-center opacity-50">
                            <Loader2 className="h-6 w-6 animate-spin mb-2 text-[#0056b3]" />
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="p-10 text-center text-xs text-muted-foreground italic">No active support requests.</div>
                    ) : (
                        threads.map(t => (
                            <div
                                key={t._id}
                                onClick={() => selectThread(t)}
                                className={`group relative w-full p-4 text-left border-b border-border transition-colors hover:bg-muted/30 cursor-pointer ${
                                    activeThread?._id === t._id ? 'bg-muted/50 border-l-4 border-l-[#0056b3]' : 'bg-background'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-noto-semibold text-foreground truncate max-w-[140px]">{t.user?.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-noto-medium text-muted-foreground opacity-70">
                                            {format(new Date(t.lastMessageAt), 'HH:mm')}
                                        </span>
                                        <button
                                            onClick={(e) => handleDeleteThread(e, t)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-all rounded-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                                            title="Delete Thread"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[11px] font-noto-regular text-muted-foreground/80 truncate truncate-tight">{t.user?.email}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main: Chat View */}
            <div className={`flex flex-col bg-background flex-1 transition-all ${!activeThread ? 'hidden md:flex' : 'flex'} w-full md:w-auto`}>
                {activeThread ? (
                    <>
                        <div className="p-4 border-b-2 border-border flex items-center bg-muted/5 gap-3">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="md:hidden shrink-0 h-8 w-8"
                                onClick={() => setActiveThread(null)}
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h3 className="text-sm font-noto-semibold text-foreground tracking-tight">{activeThread.user?.name}</h3>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <Badge variant="outline" className="text-[9px] sm:text-[10px] h-5 rounded-sm border-emerald-500/20 bg-emerald-500/5 text-emerald-600 font-noto-medium px-1.5 shrink-0">Connected</Badge>
                                    <span className="text-[10px] sm:text-[11px] text-muted-foreground font-noto-regular truncate max-w-[150px] sm:max-w-none">{activeThread.user?.email}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20" ref={scrollRef}>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.senderType === 'staff' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-md text-[12px] sm:text-[13px] leading-relaxed shadow-xs ${
                                        msg.senderType === 'staff' 
                                        ? 'bg-[#0056b3] text-white font-noto-regular' 
                                        : 'bg-card text-foreground border border-border font-noto-regular'
                                    }`}>
                                        {msg.content}
                                        <div className={`text-[9px] mt-1 opacity-60 font-noto-medium ${msg.senderType === 'staff' ? 'text-right' : 'text-left'}`}>
                                            {format(new Date(msg.createdAt), 'HH:mm')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 sm:p-4 border-t-2 border-border bg-background">
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Type your official response..."
                                    className="flex-1 text-[11px] sm:text-xs border-2 rounded-sm"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <Button 
                                    size="sm"
                                    className="bg-[#0056b3] hover:bg-[#004494] px-4 sm:px-6 font-noto-semibold shrink-0"
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                >
                                    <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Send</span>
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-6 hidden md:flex">
                        <Headset className="h-16 w-16 mb-4 text-muted-foreground" />
                        <h2 className="text-lg font-noto-semibold tracking-tight">Support Inbox</h2>
                        <p className="max-w-xs text-xs font-noto-regular mt-2">Select a thread from the ledger to begin assisting guests.</p>
                    </div>
                )}
            </div>

            <ConfirmationModal 
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                title="Delete Support Thread"
                description={`Are you sure you want to delete the chat thread with ${threadToDelete?.user?.name}? All messages and history will be permanently removed.`}
                onConfirm={confirmDelete}
                confirmText="Delete Chat"
                variant="destructive"
                loading={isDeleting}
            />
        </div>
    );
}
