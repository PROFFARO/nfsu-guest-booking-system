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
import { Calendar, BookOpen, BedDouble, ArrowRight, Clock } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
    pending: 'bg-amber-500/10 text-amber-500',
    confirmed: 'bg-emerald-500/10 text-emerald-500',
    cancelled: 'bg-red-500/10 text-red-500',
    completed: 'bg-blue-500/10 text-blue-500',
    'no-show': 'bg-slate-500/10 text-slate-400',
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const res = await api.bookings.list({ limit: 5 });
                setBookings(res.data.bookings);
            } catch {
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    const upcomingBookings = bookings.filter(
        (b) => b.status === 'confirmed' && new Date(b.checkIn) > new Date()
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                    <p className="mt-1 text-muted-foreground">Here&apos;s an overview of your bookings</p>
                </div>

                {/* Quick Stats */}
                <div className="mb-8 grid gap-4 sm:grid-cols-3">
                    <Card className="border-border/40 bg-card/50">
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                                <BookOpen className="h-6 w-6 text-cyan-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{bookings.length}</p>
                                <p className="text-sm text-muted-foreground">Total Bookings</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/40 bg-card/50">
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                                <Calendar className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{upcomingBookings.length}</p>
                                <p className="text-sm text-muted-foreground">Upcoming</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/40 bg-card/50">
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                                <BedDouble className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <Button variant="link" className="h-auto p-0 text-cyan-500" asChild>
                                    <Link href="/rooms">Browse Rooms →</Link>
                                </Button>
                                <p className="text-sm text-muted-foreground">Find your next stay</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Bookings */}
                <Card className="border-border/40 bg-card/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Bookings</CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/dashboard/bookings">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="py-8 text-center">
                                <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                                <p className="text-muted-foreground">No bookings yet</p>
                                <Button variant="link" className="text-cyan-500" asChild>
                                    <Link href="/rooms">Browse rooms to make your first booking</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {bookings.slice(0, 5).map((booking) => (
                                    <div
                                        key={booking._id}
                                        className="flex items-center justify-between rounded-lg border border-border/40 p-4 transition-colors hover:bg-accent/30"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                                                <BedDouble className="h-5 w-5 text-cyan-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    Room {booking.room?.roomNumber || 'N/A'}
                                                </p>
                                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(booking.checkIn), 'MMM dd')} — {format(new Date(booking.checkOut), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-semibold text-cyan-500">₹{booking.totalAmount}</span>
                                            <Badge variant="outline" className={statusColors[booking.status]}>
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
