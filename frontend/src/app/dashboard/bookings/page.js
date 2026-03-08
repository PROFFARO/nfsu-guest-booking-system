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
import { BedDouble, Calendar, Clock, X, ChevronLeft, ChevronRight, FileText, Star, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusColors = {
    pending: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-600',
    confirmed: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-600',
    cancelled: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-600',
    completed: 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-600',
    'no-show': 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-600',
};

const paymentColors = {
    unpaid: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-600',
    paid: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-600',
};

export default function MyBookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [cancelReason, setCancelReason] = useState('');
    const [reviewBookingId, setReviewBookingId] = useState(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');

    const handleDownloadInvoice = async (bookingId) => {
        try {
            await api.bookings.downloadInvoice(bookingId);
            toast.success('Invoice downloaded successfully');
        } catch {
            toast.error('Failed to download invoice');
        }
    };

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

    const handleReviewSubmit = async () => {
        if (!reviewBookingId) return;
        try {
            await api.reviews.create({
                booking: reviewBookingId,
                rating: reviewRating,
                comment: reviewComment
            });
            toast.success('Feedback submitted successfully');
            setReviewBookingId(null);
            setReviewRating(5);
            setReviewComment('');
            fetchBookings();
        } catch (err) {
            toast.error(err.message || 'Failed to submit feedback');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between border-b-2 border-border pb-4 gap-4">
                    <div>
                        <h1 className="text-2xl font-noto-bold text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">Booking Ledger</h1>
                        <p className="mt-1 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                            Official Room Reservation Records
                        </p>
                    </div>
                    <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="w-[180px] rounded-sm border-2 border-border h-10 font-noto-bold text-xs uppercase tracking-wide">
                            <SelectValue placeholder="Filter By Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-sm border-2 border-border">
                            <SelectItem value="all" className="font-noto-medium text-xs uppercase tracking-wide">All Statuses</SelectItem>
                            <SelectItem value="pending" className="font-noto-medium text-xs uppercase tracking-wide">Pending</SelectItem>
                            <SelectItem value="confirmed" className="font-noto-medium text-xs uppercase tracking-wide">Confirmed</SelectItem>
                            <SelectItem value="cancelled" className="font-noto-medium text-xs uppercase tracking-wide">Cancelled</SelectItem>
                            <SelectItem value="completed" className="font-noto-medium text-xs uppercase tracking-wide">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-sm border-2 border-border" />)}
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="py-20 text-center border-2 border-border rounded-sm bg-card shadow-sm">
                        <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                        <h3 className="text-sm font-noto-bold uppercase tracking-wide">No Records Found</h3>
                        <p className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest mt-1">You haven&apos;t filed any applications yet</p>
                    </div>
                ) : (
                    <div className="border-2 border-border rounded-sm bg-card shadow-sm overflow-hidden">
                        <div className="divide-y divide-border">
                            {bookings.map((booking) => (
                                <div key={booking._id} className="p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-background hover:bg-muted/30 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-muted/30 border border-border">
                                            <BedDouble className="h-6 w-6 text-[#0056b3] dark:text-cyan-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-noto-bold text-foreground uppercase tracking-tight">Room {booking.room?.roomNumber || 'N/A'}</h3>
                                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex flex-wrap gap-2 items-center">
                                                <span>{booking.room?.type}</span> <span className="text-border mx-[-2px]">•</span>
                                                <span>Floor {booking.room?.floor}</span> <span className="text-border mx-[-2px]">•</span>
                                                <span>Block {booking.room?.block}</span>
                                            </p>
                                            <div className="flex flex-wrap items-center gap-4 text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded-sm border border-border/50">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(booking.checkIn), 'dd MMM yyyy')} — {format(new Date(booking.checkOut), 'dd MMM yyyy')}
                                                </span>
                                                <span className="font-noto-bold text-[#0056b3] dark:text-cyan-500 text-xs">₹{booking.totalAmount}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                        <Badge variant="outline" className={`rounded-sm border uppercase text-[10px] font-noto-bold tracking-widest px-2 py-0.5 h-6 ${paymentColors[booking.paymentStatus]}`}>
                                            Pay: {booking.paymentStatus}
                                        </Badge>
                                        <Badge variant="outline" className={`rounded-sm border uppercase text-[10px] font-noto-bold tracking-widest px-2 py-0.5 h-6 ${statusColors[booking.status]}`}>
                                            Status: {booking.status}
                                        </Badge>
                                        {booking.checkedInAt && (
                                            <Badge variant="outline" className="rounded-sm border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 uppercase text-[10px] font-noto-bold tracking-widest px-2 py-0.5 h-6">
                                                In: {format(new Date(booking.checkedInAt), 'dd MMM, HH:mm')}
                                            </Badge>
                                        )}
                                        {booking.checkedOutAt && (
                                            <Badge variant="outline" className="rounded-sm border border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 uppercase text-[10px] font-noto-bold tracking-widest px-2 py-0.5 h-6">
                                                Out: {format(new Date(booking.checkedOutAt), 'dd MMM, HH:mm')}
                                            </Badge>
                                        )}
                                        {['confirmed', 'completed'].includes(booking.status) && (
                                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-sm border-[#0056b3] dark:border-cyan-600 text-[#0056b3] dark:text-cyan-500 hover:bg-[#0056b3] hover:text-white dark:hover:bg-cyan-700" onClick={() => handleDownloadInvoice(booking._id)} title="Download Invoice">
                                                <FileText className="h-3 w-3" />
                                            </Button>
                                        )}
                                        {booking.qrCode && booking.status === 'confirmed' && !booking.checkedInAt && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-6 rounded-sm border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-600 text-[10px] font-noto-bold uppercase tracking-widest px-3 flex items-center gap-1">
                                                        <QrCode className="h-3 w-3" /> Gatepass
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="rounded-sm border-2 border-border shadow-md text-center max-w-sm">
                                                    <DialogHeader>
                                                        <DialogTitle className="font-noto-bold text-foreground uppercase tracking-wide">Smart Gatepass</DialogTitle>
                                                        <DialogDescription className="text-xs font-noto-medium text-muted-foreground">
                                                            Show this QR code at the reception or gate for touchless check-in.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="flex flex-col items-center justify-center p-4">
                                                        <div className="bg-white p-2 rounded-md shadow-sm border-2 border-emerald-100">
                                                            <img src={booking.qrCode} alt="Check-in QR Code" className="w-48 h-48" />
                                                        </div>
                                                        <div className="mt-4 bg-muted/30 px-3 py-2 rounded-sm border border-border w-full">
                                                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-1">Pass Code</p>
                                                            <p className="text-xs font-mono text-foreground font-bold break-all">{booking.checkInToken}</p>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        {booking.status === 'completed' && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-6 rounded-sm border-[#0056b3] dark:border-cyan-600 text-[#0056b3] dark:text-cyan-500 hover:bg-[#0056b3] hover:text-white dark:hover:bg-cyan-700 text-[10px] font-noto-bold uppercase tracking-widest px-3" onClick={() => setReviewBookingId(booking._id)}>
                                                        Rate Stay
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="rounded-sm border-2 border-border shadow-md">
                                                    <DialogHeader>
                                                        <DialogTitle className="font-noto-bold text-foreground uppercase tracking-wide">Guest Feedback</DialogTitle>
                                                        <DialogDescription className="text-xs font-noto-medium text-muted-foreground">
                                                            Please rate your stay and leave an official comment to help us maintain government standards.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 mt-4">
                                                        <div>
                                                            <Label className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest mb-2 block">Rating (1-5 Stars)</Label>
                                                            <div className="flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <button
                                                                        key={star}
                                                                        type="button"
                                                                        onClick={() => setReviewRating(star)}
                                                                        className="focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0056b3] rounded-sm p-1 transition-transform active:scale-95"
                                                                    >
                                                                        <Star className={`h-6 w-6 ${reviewRating >= star ? 'fill-[#0056b3] text-[#0056b3] dark:fill-cyan-500 dark:text-cyan-500' : 'text-muted-foreground/30'}`} />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Comments (Optional)</Label>
                                                            <Textarea
                                                                className="rounded-sm border-2 border-border text-sm font-noto-medium focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#0056b3] dark:focus-visible:border-cyan-600 transition-none"
                                                                value={reviewComment}
                                                                onChange={(e) => setReviewComment(e.target.value)}
                                                                placeholder="Enter your overall feedback here..."
                                                                rows={4}
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter className="mt-6 gap-2 sm:gap-0">
                                                        <DialogClose asChild>
                                                            <Button variant="outline" className="rounded-sm border-2 border-border font-noto-bold uppercase text-xs tracking-wide" onClick={() => { setReviewBookingId(null); setReviewRating(5); setReviewComment(''); }}>Cancel</Button>
                                                        </DialogClose>
                                                        <DialogClose asChild>
                                                            <Button className="bg-[#0056b3] hover:bg-[#004494] text-white rounded-sm font-noto-bold uppercase text-xs tracking-wide" onClick={handleReviewSubmit}>Submit Feedback</Button>
                                                        </DialogClose>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        {!['cancelled', 'completed'].includes(booking.status) && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="icon" className="h-6 w-6 rounded-sm border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="rounded-sm border-2 border-border shadow-md">
                                                    <DialogHeader>
                                                        <DialogTitle className="font-noto-bold text-foreground uppercase tracking-wide">Revoke Application</DialogTitle>
                                                        <DialogDescription className="text-xs font-noto-medium text-muted-foreground">
                                                            Are you certain you wish to withdraw this booking request? This official action cannot be undone.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-3 mt-4">
                                                        <Label className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Justification (Optional)</Label>
                                                        <Textarea
                                                            className="rounded-sm border-2 border-border text-sm font-noto-medium focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#0056b3] dark:focus-visible:border-cyan-600 transition-none"
                                                            value={cancelReason}
                                                            onChange={(e) => setCancelReason(e.target.value)}
                                                            placeholder="Enter official reason for cancellation..."
                                                        />
                                                    </div>
                                                    <DialogFooter className="mt-6 gap-2 sm:gap-0">
                                                        <DialogClose asChild>
                                                            <Button variant="outline" className="rounded-sm border-2 border-border font-noto-bold uppercase text-xs tracking-wide">Retain Application</Button>
                                                        </DialogClose>
                                                        <DialogClose asChild>
                                                            <Button variant="destructive" className="rounded-sm font-noto-bold uppercase text-xs tracking-wide" onClick={() => handleCancel(booking._id)}>Execute Withdrawal</Button>
                                                        </DialogClose>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <Button variant="outline" size="sm" className="rounded-sm border-2 border-border h-8 w-8 p-0" disabled={!pagination.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 text-[10px] font-noto-bold text-foreground uppercase tracking-widest bg-muted/30 border border-border rounded-sm py-1.5">
                            Page {pagination.currentPage} / {pagination.totalPages}
                        </span>
                        <Button variant="outline" size="sm" className="rounded-sm border-2 border-border h-8 w-8 p-0" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
