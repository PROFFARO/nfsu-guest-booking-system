'use client';

import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Toaster } from "sonner";

export default function ClientProviders({ children }) {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background gap-4">
                <div className="relative">
                    <img
                        src="/logo.png"
                        alt="NFSU"
                        className="h-16 w-auto object-contain animate-pulse"
                    />
                </div>
                <div className="flex items-center gap-2 text-muted-foreground font-noto-bold text-xs uppercase tracking-[0.2em] animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <Loader2 className="h-4 w-4 animate-spin text-[#0056b3]" />
                    <span>Establishing Secure Connection</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-full">{children}</main>
            <ChatWidget />
            <Footer />
            <Toaster richColors position="top-right" />
        </>
    );
}
