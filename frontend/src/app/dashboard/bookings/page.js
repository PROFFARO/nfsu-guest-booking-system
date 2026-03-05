'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { BedDouble, Calendar, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusColors = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    confirmed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'no-show': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const paymentColors = {
    pending: 'bg-amber-500/10 text-amber-500',
    paid: 'bg-emerald-500/10 text-emerald-500',
    failed: 'bg-red-500/10 text-red-500',
    refunded: 'bg-blue-500/10 text-blue-500',
};

export default function MyBookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [cancelReason, setCancelReason] = useState('');

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 10 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.bookings.list(params);
            setBookings(res.data.bookings);
            setPagination(res.data.pagination);
        } catch {
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [statusFilter, page]);

    const handleCancel = async (bookingId) => {
        try {
            await api.bookings.cancel(bookingId, cancelReason || 'Cancelled by user');
            toast.success('Booking cancelled');
            setCancelReason('');
            fetchBookings();
        } catch (err) {
            toast.error(err.message || 'Failed to cancel');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">My Bookings</h1>
                        <p className="text-muted-foreground">Manage your room reservations</p>
                    </div>
                    <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="py-20 text-center">
                        <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">No bookings found</h3>
                        <p className="text-muted-foreground">You haven&apos;t made any bookings yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => (
                            <Card key={booking._id} className="border-border/40 bg-card/50">
                                <CardContent className="p-6">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
                                                <BedDouble className="h-6 w-6 text-cyan-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">Room {booking.room?.roomNumber || 'N/A'}</h3>
                                                <p className="text-sm text-muted-foreground capitalize">
                                                    {booking.room?.type} · Floor {booking.room?.floor} · Block {booking.room?.block}
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {format(new Date(booking.checkIn), 'MMM dd')} — {format(new Date(booking.checkOut), 'MMM dd, yyyy')}
                                                    </span>
                                                    <span className="font-semibold text-cyan-500">₹{booking.totalAmount}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={paymentColors[booking.paymentStatus]}>
                                                {booking.paymentStatus}
                                            </Badge>
                                            <Badge variant="outline" className={statusColors[booking.status]}>
                                                {booking.status}
                                            </Badge>
                                            {!['cancelled', 'completed'].includes(booking.status) && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Cancel Booking</DialogTitle>
                                                            <DialogDescription>Are you sure? This cannot be undone.</DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-2">
                                                            <Label>Reason (optional)</Label>
                                                            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why are you cancelling?" />
                                                        </div>
                                                        <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button variant="outline">Keep Booking</Button>
                                                            </DialogClose>
                                                            <DialogClose asChild>
                                                                <Button variant="destructive" onClick={() => handleCancel(booking._id)}>Cancel Booking</Button>
                                                            </DialogClose>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" disabled={!pagination.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-4 text-sm text-muted-foreground">
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
