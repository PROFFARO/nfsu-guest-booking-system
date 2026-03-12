'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Calendar, BookOpen, BedDouble, ArrowRight, Clock, Copy, Check, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusColors = {
    pending: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-600',
    confirmed: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-600',
    cancelled: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-600',
    completed: 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-600',
    'no-show': 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-600',
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = async () => {
        try {
            const res = await api.bookings.list({ limit: 5 });
            setBookings(res.data.bookings);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();

        // Add polling fallback for production/Vercel (45s for users)
        const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
        let interval;
        if (isProduction) {
            interval = setInterval(fetchBookings, 45000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        window.addEventListener('booking-updated', fetchBookings);
        return () => window.removeEventListener('booking-updated', fetchBookings);
    }, []);

    const upcomingBookings = bookings.filter(
        (b) => b.status === 'confirmed' && new Date(b.checkIn) > new Date()
    );

    return (
        <div className="p-4 md:p-6 max-w-full mx-auto space-y-6 overflow-x-hidden">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between border-b-2 border-border pb-4 gap-4">
                    <div>
                        <h1 className="text-2xl font-noto-bold text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">Portal Dashboard</h1>
                        <p className="mt-1 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                            Official Overview for {user?.name}
                        </p>
                    </div>
                    <Button
                        onClick={fetchBookings}
                        disabled={loading}
                        variant="outline"
                        className="border-2 border-border flex items-center gap-1.5 sm:gap-2 uppercase text-[10px] font-noto-bold tracking-widest h-9 px-4 rounded-sm bg-card hover:bg-muted ml-auto md:ml-0"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Compact Stats */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-0 border-2 border-border rounded-sm overflow-hidden bg-card shadow-sm">
                    <div className="flex items-center gap-4 p-4 border-b sm:border-b-0 sm:border-r border-border bg-background">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted/30 border border-border">
                            <BookOpen className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Bookings</p>
                            <p className="text-xl font-noto-bold text-foreground leading-none">{bookings.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 border-b sm:border-b-0 sm:border-r border-border bg-background">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted/30 border border-border">
                            <Calendar className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Upcoming Stay</p>
                            <p className="text-xl font-noto-bold text-foreground leading-none">{upcomingBookings.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted/5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#0056b3]/10 dark:bg-cyan-500/10 border border-[#0056b3]/20 dark:border-cyan-500/20">
                            <BedDouble className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" />
                        </div>
                        <div>
                            <Link href="/rooms" className="text-xs font-noto-bold text-[#0056b3] dark:text-cyan-500 hover:underline uppercase tracking-wide flex items-center">
                                New Request <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-wider mt-0.5">Browse Real-Time Catalog</p>
                        </div>
                    </div>
                </div>

                {/* Recent Bookings */}
                <Card className="rounded-sm border-2 border-border bg-card shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border bg-muted/10">
                        <CardTitle className="text-sm font-noto-bold text-foreground uppercase tracking-wide">Recent Applications</CardTitle>
                        <Link href="/dashboard/bookings" className="text-[10px] font-noto-bold text-[#0056b3] dark:text-cyan-500 hover:underline uppercase tracking-widest flex items-center">
                            View Ledger <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full rounded-sm" />
                                ))}
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="py-8 text-center border-b border-border">
                                <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50" />
                                <p className="text-xs font-noto-bold text-foreground uppercase tracking-wide">No Records Found</p>
                                <Link href="/rooms" className="text-[10px] font-noto-bold text-[#0056b3] dark:text-cyan-500 hover:underline uppercase tracking-widest mt-1 inline-block">
                                    Initiate New Request
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {bookings.slice(0, 5).map((booking) => (
                                    <div
                                        key={booking._id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background hover:bg-muted/30 transition-colors gap-3 sm:gap-4"
                                    >
                                        <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted/30 border border-border">
                                                <BedDouble className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-noto-bold text-foreground uppercase tracking-tight truncate">
                                                    Room {booking.room?.roomNumber || 'N/A'}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mt-1">
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <Clock className="h-3 w-3 shrink-0" />
                                                        <span>{format(new Date(booking.checkIn), 'dd MMM yyyy')} — {format(new Date(booking.checkOut), 'dd MMM yyyy')}</span>
                                                    </div>
                                                    <span className="hidden sm:inline text-border">•</span>
                                                    <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-sm border border-border group/id relative cursor-pointer active:scale-95 transition-transform max-w-fit" onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(booking._id);
                                                        toast.success('Booking ID Copied');
                                                    }}>
                                                        <span className="font-mono text-[9px] lowercase opacity-70 tracking-normal truncate">ID: {booking._id.substring(0, 8)}...</span>
                                                        <Copy className="h-2.5 w-2.5 opacity-40 group-hover/id:opacity-100 transition-opacity" />
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-[3.25rem] sm:pl-0">
                                            <span className="text-sm font-noto-bold text-[#0056b3] dark:text-cyan-500">₹{booking.totalAmount}</span>
                                            <Badge variant="outline" className={`rounded-sm border uppercase text-[10px] font-noto-bold tracking-widest px-2 py-0 h-5 shrink-0 ${statusColors[booking.status]}`}>
                                                {booking.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
