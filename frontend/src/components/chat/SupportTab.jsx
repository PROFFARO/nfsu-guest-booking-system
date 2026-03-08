'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Headset, CircleCheckBig, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocket } from '@/context/SocketContext';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export function SupportTab() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [thread, setThread] = useState(null);
    const { socket } = useSocket();
    const { user } = useAuth();
    const scrollRef = useRef(null);

    useEffect(() => {
        const initChat = async () => {
            try {
                const res = await api.chats.getMyThread();
                setThread(res.data.thread);
                setMessages(res.data.messages);
            } catch (err) {
                console.error("Failed to init support chat", err);
            } finally {
                setLoading(false);
            }
        };
        initChat();
    }, []);

    // Dedicated room management
    useEffect(() => {
        if (socket && thread?._id) {
            socket.emit('joinChat', thread._id);
            return () => {
                socket.emit('leaveChat', thread._id);
            };
        }
    }, [socket, thread?._id]);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message) => {
            // Only add if it belongs to this thread
            if (thread && message.thread === thread._id) {
                setMessages(prev => {
                    // Prevent duplicates (e.g. if socket sends back our own message)
                    if (prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });
            }
        };

        socket.on('newMessage', handleNewMessage);
        return () => socket.off('newMessage', handleNewMessage);
    }, [socket, thread?._id]);

    useEffect(() => {
        const scrollToBottom = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        };
        // Use a small timeout to ensure DOM has updated
        const timer = setTimeout(scrollToBottom, 50);
        return () => clearTimeout(timer);
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !thread) return;

        const content = input;
        setInput('');

        try {
            const res = await api.chats.sendMessage({
                threadId: thread._id,
                content
            });

            if (res.status === 'success') {
                // Emit via socket for real-time delivery
                socket.emit('sendMessage', {
                    threadId: thread._id,
                    message: res.data.message
                });
            }
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center opacity-50">
                <Loader2 className="h-6 w-6 animate-spin mb-2 text-[#0056b3]" />
                <span className="text-[10px] font-noto-semibold tracking-wide">Connecting to desk...</span>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col p-4 min-h-0">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-sm border border-emerald-200 dark:border-emerald-800 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-noto-semibold text-emerald-700 dark:text-emerald-400">Desk is active</span>
                </div>
                <span className="text-[9px] font-noto-medium text-muted-foreground/70">Response in ~5 mins</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar mb-4" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-50">
                        <Headset className="h-8 w-8 mb-3 text-[#0056b3] dark:text-cyan-500" />
                        <h3 className="text-xs font-noto-semibold tracking-wide">Support Desk</h3>
                        <p className="text-[10px] font-noto-regular leading-relaxed mt-1 opacity-80">
                            "Can I get an extra towel?"<br />
                            "The Wi-Fi in Block B is slow"<br />
                            "I need a late check-out"
                        </p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-md text-[13px] leading-relaxed shadow-xs ${msg.senderType === 'user'
                            ? 'bg-[#0056b3] text-white font-noto-regular'
                            : 'bg-muted/30 text-foreground border border-border font-noto-regular'
                            }`}>
                            <span>{msg.content}</span>
                            <div className={`text-[9px] mt-1 opacity-60 font-noto-medium flex items-center gap-1 ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {msg.senderType === 'user' && <CircleCheckBig className="h-2.5 w-2.5" />}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2">
                <Input
                    placeholder="Type your message..."
                    className="flex-1 text-xs h-11 rounded-sm border-2 font-noto-regular"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button
                    size="icon"
                    className="h-11 w-11 bg-[#0056b3] hover:bg-[#004494] shadow-md flex-shrink-0 transition-all hover:scale-105"
                    onClick={handleSend}
                    disabled={!input.trim()}
                >
                    <Send className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
