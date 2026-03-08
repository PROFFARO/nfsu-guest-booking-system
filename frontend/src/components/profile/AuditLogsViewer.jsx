'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { History, Search, ChevronLeft, ChevronRight, Download, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_TYPES = [
    { value: 'ALL', label: 'All Actions' },
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGOUT', label: 'Logout' },
    { value: 'PASSWORD_CHANGE', label: 'Password Change' },
    { value: 'PROFILE_UPDATE', label: 'Profile Update' },
    { value: 'BOOKING_CREATE', label: 'Booking Created' },
    { value: 'BOOKING_UPDATE', label: 'Booking Updated' },
    { value: 'BOOKING_CANCEL', label: 'Booking Cancelled' },
];

export default function AuditLogsViewer() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalEntries: 0 });

    // Filters
    const [actionFilter, setActionFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchLogs = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                page,
                limit: 10,
            };

            if (actionFilter !== 'ALL') params.action = actionFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await api.auditLogs.get(params);

            if (response.success) {
                setLogs(response.data);
                setPagination(response.pagination);
            }
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
            setError('Failed to load activity logs.');
            toast.error(err.message || 'Failed to load activity logs');
        } finally {
            setLoading(false);
        }
    }, [actionFilter, startDate, endDate]);

    useEffect(() => {
        fetchLogs(1); // Fetch page 1 whenever filters change
    }, [actionFilter, startDate, endDate, fetchLogs]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage);
        }
    };

    const getActionBadge = (action, status) => {
        let color = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

        if (status === 'FAILED') {
            color = 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20';
        } else if (action.includes('REVENUE') || action.includes('PAYMENT')) {
            color = 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400 border-green-200 dark:border-green-500/20';
        } else if (action.includes('DELETE') || action.includes('CANCEL')) {
            color = 'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/20';
        } else if (action === 'LOGIN' || action === 'LOGOUT') {
            color = 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
        }

        return (
            <Badge variant="outline" className={`${color} font-mono text-[10px] tracking-widest`}>
                {action}
            </Badge>
        );
    };

    return (
        <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-noto-bold flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            Activity Logs
                        </CardTitle>
                        <CardDescription className="mt-1 font-noto-medium text-xs tracking-wide">
                            Track your personal account activity and security events.
                        </CardDescription>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-noto-bold uppercase tracking-widest text-muted-foreground">Action Type</label>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="All Actions" />
                            </SelectTrigger>
                            <SelectContent>
                                {ACTION_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-noto-bold uppercase tracking-widest text-muted-foreground">Start Date</label>
                        <div className="relative">
                            <Input
                                type="date"
                                className="h-9 pl-3 text-sm"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-noto-bold uppercase tracking-widest text-muted-foreground">End Date</label>
                        <div className="relative">
                            <Input
                                type="date"
                                className="h-9 pl-3 text-sm"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 md:flex md:items-end">
                        <Button
                            variant="outline"
                            className="h-9 w-full md:w-auto"
                            onClick={() => {
                                setActionFilter('ALL');
                                setStartDate('');
                                setEndDate('');
                            }}
                        >
                            Reset Filters
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {loading && logs.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
                        <p className="font-noto-medium text-sm animate-pulse">Loading activity logs...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-destructive flex flex-col items-center">
                        <AlertCircle className="h-8 w-8 mb-4 opacity-50" />
                        <p className="font-noto-medium text-sm">{error}</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="font-noto-medium text-base text-foreground">No recent activity found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto relative">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40 font-noto-bold border-b border-border sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-4 font-normal">Date & Time</th>
                                    <th className="px-6 py-4 font-normal">Action</th>
                                    <th className="px-6 py-4 font-normal">Details</th>
                                    <th className="px-6 py-4 font-normal">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-noto-medium text-foreground">
                                                {format(new Date(log.createdAt), 'MMM dd, yyyy')}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                {format(new Date(log.createdAt), 'h:mm a')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getActionBadge(log.action, log.status)}
                                            {log.status === 'FAILED' && (
                                                <span className="ml-2 text-xs font-noto-bold text-red-500">FAILED</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-muted-foreground max-w-md truncate">
                                                {log.details?.message || log.details?.reason ||
                                                    (log.details?.updatedFields ? `Updated: ${log.details.updatedFields.join(', ')}` :
                                                        (log.details?.bookingId ? `Booking ID: ${log.details.bookingId}` :
                                                            'System logged action'))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-mono text-xs">
                                            {log.ipAddress}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
                        <p className="text-xs text-muted-foreground font-noto-medium">
                            Showing <span className="font-noto-bold text-foreground">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                            <span className="font-noto-bold text-foreground">{Math.min(pagination.page * pagination.limit, pagination.totalEntries)}</span> of{' '}
                            <span className="font-noto-bold text-foreground">{pagination.totalEntries}</span> logs
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1 || loading}
                                className="h-8"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages || loading}
                                className="h-8"
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
