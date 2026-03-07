'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { BookOpen, ChevronLeft, ChevronRight, FileText, LogIn, LogOut, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusColors = {
    pending: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-600',
    confirmed: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-600',
    cancelled: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-600',
    completed: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-600',
    'no-show': 'bg-slate-50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400 border-slate-600',
};

const paymentColors = {
    unpaid: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-600',
    paid: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-600',
};

export default function BookingManagementPage() {
    const [bookings, setBookings] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
    const [exporting, setExporting] = useState(false);
    const [page, setPage] = useState(1);

    const handleDownloadInvoice = async (bookingId) => {
        try {
            await api.bookings.downloadInvoice(bookingId);
            toast.success('Invoice downloaded');
        } catch {
            toast.error('Failed to download invoice');
        }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.bookings.list(params);
            setBookings(res.data.bookings);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load recent applications'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchBookings(); }, [statusFilter, page]);

    const handleStatusChange = async (bookingId, newStatus) => {
        try {
            await api.bookings.updateStatus(bookingId, { status: newStatus });
            toast.success('Directive status forcefully updated');
            fetchBookings();
        } catch (err) {
            toast.error(err.message || 'Failed to update system status');
        }
    };

    const handlePaymentStatusChange = async (bookingId, newPaymentStatus) => {
        try {
            await api.bookings.updatePayment(bookingId, newPaymentStatus);
            toast.success(`Financial clearing updated to: ${newPaymentStatus.toUpperCase()}`);
            fetchBookings();
        } catch (err) {
            toast.error(err.message || 'Failed to update financial status');
        }
    };

    const handleCheckin = async (bookingId) => {
        try {
            await api.bookings.checkin(bookingId);
            toast.success('Guest checked in successfully');
            fetchBookings();
        } catch (err) {
            toast.error(err.message || 'Check-in failed');
        }
    };

    const handleCheckout = async (bookingId) => {
        try {
            await api.bookings.checkout(bookingId);
            toast.success('Guest checked out. Booking completed.');
            fetchBookings();
        } catch (err) {
            toast.error(err.message || 'Check-out failed');
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (dateRange.startDate) params.startDate = dateRange.startDate;
            if (dateRange.endDate) params.endDate = dateRange.endDate;
            await api.bookings.export(params);
            toast.success('Report downloaded successfully');
        } catch (err) {
            toast.error('Failed to export report');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-full mx-auto space-y-6 overflow-x-hidden">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="mb-8 border-b-2 border-border pb-5">
                    <h1 className="text-2xl font-noto-bold text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">Application & Directive Management</h1>
                    <p className="mt-1 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                        Central Database of Lodging Provisions and Clearances
                    </p>
                </div>

                {/* Filters & Actions */}
                <div className="mb-6 flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="w-[160px] h-10 rounded-sm border-2 border-border bg-background font-noto-bold text-xs uppercase tracking-widest">
                                <SelectValue placeholder="STATUS" />
                            </SelectTrigger>
                            <SelectContent className="border-2 border-border rounded-sm">
                                <SelectItem value="all" className="font-noto-bold text-xs uppercase tracking-widest">All Records</SelectItem>
                                <SelectItem value="pending" className="font-noto-bold text-xs uppercase tracking-widest">Pending</SelectItem>
                                <SelectItem value="confirmed" className="font-noto-bold text-xs uppercase tracking-widest">Confirmed</SelectItem>
                                <SelectItem value="cancelled" className="font-noto-bold text-xs uppercase tracking-widest">Cancelled</SelectItem>
                                <SelectItem value="completed" className="font-noto-bold text-xs uppercase tracking-widest">Completed</SelectItem>
                                <SelectItem value="no-show" className="font-noto-bold text-xs uppercase tracking-widest">No Show</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                            <Input type="date" className="w-[140px] h-10 rounded-sm border-2 border-border text-xs font-noto-medium uppercase tracking-widest" value={dateRange.startDate} onChange={(e) => setDateRange(p => ({ ...p, startDate: e.target.value }))} title="Start Date" />
                            <span className="text-muted-foreground font-noto-bold">—</span>
                            <Input type="date" className="w-[140px] h-10 rounded-sm border-2 border-border text-xs font-noto-medium uppercase tracking-widest" value={dateRange.endDate} onChange={(e) => setDateRange(p => ({ ...p, endDate: e.target.value }))} title="End Date" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto self-end md:self-auto">
                        <div className="text-[11px] font-noto-bold text-muted-foreground uppercase tracking-widest border-2 border-border px-3 py-2 bg-muted/30 rounded-sm h-10 flex items-center">
                            Records: {pagination?.totalBookings || 0}
                        </div>
                        <Button onClick={handleExport} disabled={exporting} className="h-10 px-4 rounded-sm font-noto-bold text-xs uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white gap-2" title="Download filtered report as CSV">
                            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* Main Datagrid */}
                <Card className="border-2 border-border bg-card shadow-none rounded-sm overflow-hidden">
                    <div className="bg-[#0056b3] dark:bg-cyan-900 border-b-2 border-border px-4 py-3 flex justify-between items-center">
                        <h2 className="text-xs font-noto-bold text-white uppercase tracking-widest">Official Directives Ledger</h2>
                    </div>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-none border-b-2 border-border" />)}
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="py-16 text-center border-b-2 border-border bg-muted/10">
                                <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
                                <p className="text-xs text-muted-foreground font-noto-bold uppercase tracking-widest">No Official Records Found in Database</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-b-2 border-border hover:bg-transparent">
                                            <TableHead className="py-4 text-[10px] font-noto-bold text-foreground uppercase tracking-widest min-w-[140px]">Applicant/Personnel</TableHead>
                                            <TableHead className="py-4 text-[10px] font-noto-bold text-foreground uppercase tracking-widest min-w-[160px]">Facility Allocation</TableHead>
                                            <TableHead className="py-4 text-[10px] font-noto-bold text-foreground uppercase tracking-widest min-w-[120px]">Authorized Duration</TableHead>
                                            <TableHead className="py-4 text-[10px] font-noto-bold text-foreground uppercase tracking-widest text-right min-w-[80px]">Price (INR)</TableHead>
                                            <TableHead className="py-4 text-[10px] font-noto-bold text-foreground uppercase tracking-widest text-center min-w-[100px]">Clearance Logs</TableHead>
                                            <TableHead className="py-4 text-[10px] font-noto-bold text-foreground uppercase tracking-widest text-center min-w-[140px]">Directives Override</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-border">
                                        {bookings.map((b) => (
                                            <TableRow key={b._id} className="hover:bg-muted/10 transition-colors border-border">
                                                <TableCell className="align-top py-4">
                                                    <div className="font-noto-bold text-foreground text-xs uppercase tracking-tight">{b.guestName}</div>
                                                    <div className="text-[10px] text-muted-foreground font-noto-medium mt-0.5">{b.email}</div>
                                                    <div className="text-[10px] text-muted-foreground font-noto-medium mt-0.5 font-mono">{b.phone}</div>
                                                </TableCell>
                                                <TableCell className="align-top py-4">
                                                    <div className="font-noto-bold text-foreground text-xs uppercase tracking-tight">Room {b.room?.roomNumber || 'N/A'}</div>
                                                    <div className="text-[10px] text-muted-foreground font-noto-medium uppercase tracking-widest mt-0.5">{b.room?.type} / Floor {b.room?.floor} / Block {b.room?.block}</div>
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                                                    <div>{format(new Date(b.checkIn), 'dd MMM yyyy')}</div>
                                                    <div className="text-border mx-1">↓</div>
                                                    <div>{format(new Date(b.checkOut), 'dd MMM yyyy')}</div>
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-right font-noto-bold text-[#0056b3] dark:text-cyan-500 text-sm">
                                                    ₹{b.totalAmount}
                                                </TableCell>
                                                <TableCell className="align-top py-4 text-center">
                                                    <div className="flex flex-col gap-2 items-center">
                                                        <Badge variant="outline" className={`w-[90px] justify-center rounded-sm border-2 uppercase text-[9px] font-noto-bold tracking-widest px-1 py-0.5 h-6 ${paymentColors[b.paymentStatus]}`}>
                                                            {b.paymentStatus}
                                                        </Badge>
                                                        <Badge variant="outline" className={`w-[90px] justify-center rounded-sm border-2 uppercase text-[9px] font-noto-bold tracking-widest px-1 py-0.5 h-6 ${statusColors[b.status]}`}>
                                                            {b.status}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-top py-4">
                                                    <div className="flex flex-col gap-2 items-center">
                                                        {/* Status Override */}
                                                        <Select value={b.status} onValueChange={(v) => handleStatusChange(b._id, v)}>
                                                            <SelectTrigger className="w-[130px] h-7 text-[9px] font-noto-bold uppercase tracking-widest rounded-sm border-2 border-border bg-background focus:ring-0">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="border-2 border-border rounded-sm">
                                                                <SelectItem value="pending" className="text-[10px] font-noto-bold uppercase tracking-widest">Pending</SelectItem>
                                                                <SelectItem value="confirmed" className="text-[10px] font-noto-bold uppercase tracking-widest">Confirmed</SelectItem>
                                                                <SelectItem value="cancelled" className="text-[10px] font-noto-bold uppercase tracking-widest">Cancelled</SelectItem>
                                                                <SelectItem value="completed" className="text-[10px] font-noto-bold uppercase tracking-widest">Completed</SelectItem>
                                                                <SelectItem value="no-show" className="text-[10px] font-noto-bold uppercase tracking-widest">No Show</SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        {/* Financial Override */}
                                                        <Select value={b.paymentStatus} onValueChange={(v) => handlePaymentStatusChange(b._id, v)}>
                                                            <SelectTrigger className="w-[130px] h-7 text-[9px] font-noto-bold uppercase tracking-widest rounded-sm border-2 border-border bg-background focus:ring-0 text-[#0056b3] dark:text-cyan-500">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="border-2 border-border rounded-sm">
                                                                <SelectItem value="unpaid" className="text-[10px] font-noto-bold uppercase tracking-widest">Fin: Unpaid</SelectItem>
                                                                <SelectItem value="paid" className="text-[10px] font-noto-bold uppercase tracking-widest">Fin: Paid</SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        {/* Invoice Download */}
                                                        {['confirmed', 'completed'].includes(b.status) && (
                                                            <Button variant="outline" size="sm" className="w-[130px] h-7 text-[9px] font-noto-bold uppercase tracking-widest rounded-sm border-2 border-[#0056b3] dark:border-cyan-600 text-[#0056b3] dark:text-cyan-500 hover:bg-[#0056b3] hover:text-white dark:hover:bg-cyan-700" onClick={() => handleDownloadInvoice(b._id)}>
                                                                <FileText className="h-3 w-3 mr-1" /> Invoice
                                                            </Button>
                                                        )}

                                                        {/* Check-in / Check-out */}
                                                        {b.status === 'confirmed' && !b.checkedInAt && (
                                                            <Button variant="outline" size="sm" className="w-[130px] h-7 text-[9px] font-noto-bold uppercase tracking-widest rounded-sm border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white" onClick={() => handleCheckin(b._id)}>
                                                                <LogIn className="h-3 w-3 mr-1" /> Check In
                                                            </Button>
                                                        )}
                                                        {b.status === 'confirmed' && b.checkedInAt && !b.checkedOutAt && (
                                                            <Button variant="outline" size="sm" className="w-[130px] h-7 text-[9px] font-noto-bold uppercase tracking-widest rounded-sm border-2 border-orange-600 text-orange-700 dark:text-orange-400 hover:bg-orange-600 hover:text-white" onClick={() => handleCheckout(b._id)}>
                                                                <LogOut className="h-3 w-3 mr-1" /> Check Out
                                                            </Button>
                                                        )}
                                                        {b.checkedInAt && (
                                                            <div className="text-[8px] font-noto-medium text-muted-foreground text-center w-[130px]">
                                                                IN: {format(new Date(b.checkedInAt), 'dd MMM, HH:mm')}
                                                                {b.checkedOutAt && <><br />OUT: {format(new Date(b.checkedOutAt), 'dd MMM, HH:mm')}</>}
                                                            </div>
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

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-sm border-2 border-border font-noto-bold uppercase tracking-widest text-xs h-9" disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                        </Button>
                        <span className="px-4 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                            Folio {pagination.currentPage} / {pagination.totalPages}
                        </span>
                        <Button variant="outline" size="sm" className="rounded-sm border-2 border-border font-noto-bold uppercase tracking-widest text-xs h-9" disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
