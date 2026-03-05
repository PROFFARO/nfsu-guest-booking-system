'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { BookOpen, ChevronLeft, ChevronRight, CheckCircle, DollarSign } from 'lucide-react';
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

export default function BookingManagementPage() {
    const [bookings, setBookings] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.bookings.list(params);
            setBookings(res.data.bookings);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load bookings'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchBookings(); }, [statusFilter, page]);

    const handleStatusChange = async (bookingId, newStatus) => {
        try {
            await api.bookings.updateStatus(bookingId, { status: newStatus });
            toast.success('Booking status updated');
            fetchBookings();
        } catch (err) {
            toast.error(err.message || 'Failed to update');
        }
    };

    const handleMarkPaid = async (bookingId) => {
        try {
            await api.bookings.markPaid(bookingId);
            toast.success('Booking marked as paid');
            fetchBookings();
        } catch (err) {
            toast.error(err.message || 'Failed to mark paid');
        }
    };

    return (
        <div className="p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Booking Management</h1>
                    <p className="text-muted-foreground">View and manage all bookings</p>
                </div>

                <div className="mb-6">
                    <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="no-show">No Show</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Card className="border-border/40 bg-card/50">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="py-16 text-center">
                                <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                                <p className="text-muted-foreground">No bookings found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Guest</TableHead>
                                            <TableHead>Room</TableHead>
                                            <TableHead>Check-in</TableHead>
                                            <TableHead>Check-out</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Payment</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bookings.map((b) => (
                                            <TableRow key={b._id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{b.guestName}</p>
                                                        <p className="text-xs text-muted-foreground">{b.email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{b.room?.roomNumber || 'N/A'}</TableCell>
                                                <TableCell className="text-sm">{format(new Date(b.checkIn), 'MMM dd, yyyy')}</TableCell>
                                                <TableCell className="text-sm">{format(new Date(b.checkOut), 'MMM dd, yyyy')}</TableCell>
                                                <TableCell className="font-semibold text-cyan-500">₹{b.totalAmount}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={paymentColors[b.paymentStatus]}>
                                                        {b.paymentStatus}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={statusColors[b.status]}>{b.status}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Select value={b.status} onValueChange={(v) => handleStatusChange(b._id, v)}>
                                                            <SelectTrigger className="w-[120px] h-7 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="pending">Pending</SelectItem>
                                                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                                                <SelectItem value="completed">Completed</SelectItem>
                                                                <SelectItem value="no-show">No Show</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {b.paymentStatus !== 'paid' && b.status !== 'cancelled' && (
                                                            <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-500" onClick={() => handleMarkPaid(b._id)}>
                                                                <DollarSign className="h-3 w-3 mr-1" /> Paid
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-4 text-sm text-muted-foreground">Page {pagination.currentPage} of {pagination.totalPages}</span>
                        <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
