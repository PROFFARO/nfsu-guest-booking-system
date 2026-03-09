'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { BedDouble, TrendingUp, Activity, IndianRupee, FileText, QrCode, Wrench, Clock, Package, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';

const COLORS = {
    standard: ['#0056b3', '#0f766e', '#b45309', '#be123c', '#4338ca'],
    status: { vacant: '#0f766e', booked: '#be123c', held: '#b45309', maintenance: '#475569' },
    payment: { paid: '#0f766e', unpaid: '#be123c' }
};

export default function AdminDashboard() {
    const [roomStats, setRoomStats] = useState(null);
    const [recentBookings, setRecentBookings] = useState([]);
    const [maintenanceReports, setMaintenanceReports] = useState([]);
    const [supplyRequests, setSupplyRequests] = useState([]);
    const [analyticsBookings, setAnalyticsBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                api.rooms.stats(),
                api.bookings.list({ limit: 100 }),
                api.auditLogs.getAll({ action: 'MAINTENANCE_REPORT', limit: 10 }),
                api.auditLogs.getAll({ action: 'SUPPLY_REQUEST', limit: 10 })
            ]);

            if (results[0].status === 'fulfilled') setRoomStats(results[0].value.data);
            if (results[1].status === 'fulfilled') {
                const allBookings = results[1].value.data.bookings || [];
                setAnalyticsBookings(allBookings);
                setRecentBookings(allBookings.slice(0, 5));
            }
            if (results[2].status === 'fulfilled') setMaintenanceReports(results[2].value.data || []);
            if (results[3].status === 'fulfilled') setSupplyRequests(results[3].value.data || []);

            // Log rejection for debugging
            results.forEach((res, i) => {
                if (res.status === 'rejected') console.warn(`Dashboard fetch failed for endpoint ${i}:`, res.reason);
            });

        } catch (err) {
            console.error('Critical dashboard fetch error:', err);
            toast.error('Failed to load analytical data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Add polling fallback for production/Vercel (30s)
        const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
        let interval;
        if (isProduction) {
            interval = setInterval(fetchData, 30000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);

    // 1. Room Summary Stats
    const summary = roomStats?.summary || {};
    const statsCards = [
        { title: 'Total Facilities', value: summary.totalRooms || 0, icon: BedDouble, color: 'bg-[#0056b3] dark:bg-cyan-800 border-[#004494] dark:border-cyan-700' },
        { title: 'Current Vacancy', value: summary.availableRooms || 0, icon: Activity, color: 'bg-emerald-700 dark:bg-emerald-800 border-emerald-800 dark:border-emerald-700' },
        { title: 'System Occupancy', value: `${summary.occupancyRate || 0}%`, icon: TrendingUp, color: 'bg-indigo-700 dark:bg-indigo-800 border-indigo-800 dark:border-indigo-700' },
        { title: 'Active Applications', value: analyticsBookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length, icon: FileText, color: 'bg-amber-600 dark:bg-amber-700 border-amber-700 dark:border-amber-600' },
    ];

    // 2. Room Status Breakdown
    const statusBreakdown = [];
    if (roomStats?.stats) {
        const totals = { Vacant: 0, Booked: 0, Held: 0, Maintenance: 0 };
        roomStats.stats.forEach((s) => {
            totals.Vacant += s.vacant;
            totals.Booked += s.booked;
            totals.Held += s.held;
            totals.Maintenance += s.maintenance;
        });
        Object.entries(totals).forEach(([name, value]) => {
            if (value > 0) statusBreakdown.push({ name, value, fill: COLORS.status[name.toLowerCase()] });
        });
    }

    // 3. Rooms by Type
    const roomsByType = roomStats?.stats?.map((s) => ({
        name: s._id === 'single' ? 'Single ' : 'Double ',
        Vacant: s.vacant,
        Booked: s.booked,
        Held: s.held,
        Maintenance: s.maintenance,
    })) || [];

    // 4. Booking Status Distribution
    const bookingStatusCounts = analyticsBookings.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {});
    const bookingStatusData = Object.entries(bookingStatusCounts).map(([name, value], idx) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: COLORS.standard[idx % COLORS.standard.length]
    }));

    // 5. Payment Status Distribution
    const paymentStatusCounts = analyticsBookings.reduce((acc, curr) => {
        acc[curr.paymentStatus] = (acc[curr.paymentStatus] || 0) + 1;
        return acc;
    }, {});
    const paymentStatusData = Object.entries(paymentStatusCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: COLORS.payment[name.toLowerCase()] || COLORS.standard[0]
    }));

    // 6. Revenue Trend (last 7 days based on bookings)
    const revenueByDate = {};
    for (let i = 6; i >= 0; i--) {
        const d = format(subDays(new Date(), i), 'MMM dd');
        revenueByDate[d] = 0;
    }

    analyticsBookings.forEach(booking => {
        if (booking.createdAt && booking.paymentStatus === 'paid') {
            const dateStr = format(new Date(booking.createdAt), 'MMM dd');
            if (revenueByDate[dateStr] !== undefined) {
                revenueByDate[dateStr] += booking.totalAmount || 0;
            }
        }
    });

    const revenueTrendData = Object.entries(revenueByDate).map(([date, amount]) => ({
        date,
        Revenue: amount
    }));

    // Custom Tooltip for charts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border-2 border-border p-3 rounded-sm shadow-md z-50 relative">
                    <p className="font-noto-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label || payload[0].name}</p>
                    {payload.map((entry, idx) => (
                        <p key={idx} className="font-noto-bold text-sm text-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill }}></span>
                            {entry.name}: {entry.value} {entry.name === 'Revenue' ? 'INR' : ''}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-sm border-2 border-border" />)}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-80 rounded-sm border-2 border-border" />
                    <Skeleton className="h-80 rounded-sm border-2 border-border" />
                </div>
            </div>
        );
    }

    // Helper wrapper for strict mobile sizing
    const WidgetWrapper = ({ children, title }) => (
        <div
            className="bg-card border-2 border-border rounded-sm shadow-sm flex flex-col overflow-hidden w-full relative
                       lg:h-[320px] h-[300px] max-sm:max-w-[339px] max-sm:h-[280px] max-sm:mx-auto"
        >
            {title && (
                <div className="bg-muted/30 border-b-2 border-border px-3 py-2 flex items-center justify-between group cursor-default h-10 shrink-0">
                    <h2 className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest truncate">{title}</h2>
                </div>
            )}
            <div className={`flex-1 min-h-0 relative ${title ? 'p-4' : ''}`}>
                {children}
            </div>
        </div>
    );

    return (
        <div className="p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8 mx-auto w-full overflow-x-hidden box-border max-w-[1400px]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="mb-6 sm:mb-8 border-b-2 border-border pb-4 sm:pb-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl md:text-2xl font-noto-bold text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">Executive Management Console</h1>
                        <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                            Centralized System Analytics & Facility Oversight
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:gap-3 shrink-0 mt-2 sm:mt-0">
                        <Link href="/admin/gatepass">
                            <Button className="bg-[#0f766e] text-white hover:bg-[#0f766e]/90 border-0 flex items-center gap-1.5 sm:gap-2 uppercase text-[9px] sm:text-[10px] font-noto-bold tracking-widest h-8 sm:h-9 px-2.5 sm:px-4 rounded-sm">
                                <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Scan
                            </Button>
                        </Link>
                        <Button
                            onClick={fetchData}
                            disabled={loading}
                            variant="outline"
                            className="border-2 border-border flex items-center gap-1.5 sm:gap-2 uppercase text-[9px] sm:text-[10px] font-noto-bold tracking-widest h-8 sm:h-9 px-2.5 sm:px-4 rounded-sm bg-card hover:bg-muted"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-sm:max-w-[339px] max-sm:mx-auto">
                        {statsCards.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.title} className="bg-card border-2 border-border rounded-sm overflow-hidden h-24 sm:h-28 flex flex-col justify-center relative group">
                                    <div className="flex items-center h-full">
                                        <div className={`flex h-full w-12 sm:w-16 shrink-0 items-center justify-center ${stat.color} text-white border-r-2 border-border/50`}>
                                            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                                        </div>
                                        <div className="p-2 sm:p-4 flex-1 min-w-0">
                                            <p className="text-[7px] sm:text-[9px] font-noto-bold text-muted-foreground uppercase tracking-wider leading-tight">{stat.title}</p>
                                            <p className="text-xl sm:text-2xl font-noto-bold text-foreground leading-none mt-1">{stat.value}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Middle Row - Inventory & Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <WidgetWrapper title="Facility Inventory Distribution">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={roomsByType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} className="font-noto-bold uppercase tracking-widest" />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} className="font-noto-bold" />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                                    <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'inherit', fontWeight: 'bold' }} />
                                    <Bar dataKey="Vacant" stackId="a" fill={COLORS.status.vacant} />
                                    <Bar dataKey="Booked" stackId="a" fill={COLORS.status.booked} />
                                    <Bar dataKey="Held" stackId="a" fill={COLORS.status.held} />
                                    <Bar dataKey="Maintenance" stackId="a" fill={COLORS.status.maintenance} />
                                </BarChart>
                            </ResponsiveContainer>
                        </WidgetWrapper>

                        <WidgetWrapper title="Global Status Proportion">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" innerRadius="50%" paddingAngle={2}>
                                        {statusBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'inherit', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </WidgetWrapper>
                    </div>

                    {/* Revenue Ledger - Full Width */}
                    <WidgetWrapper title="7-Day Revenue Ledger">
                        <div className="absolute top-0 right-0 z-10 hidden sm:block">
                            <Badge variant="outline" className="border-border text-muted-foreground text-[9px] uppercase font-noto-bold bg-background/50 backdrop-blur-sm rounded-none border-t-0 border-r-0">
                                <IndianRupee className="h-2.5 w-2.5 mr-1 inline" /> INR Ledger
                            </Badge>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0056b3" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0056b3" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} className="font-noto-bold uppercase tracking-widest" />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} className="font-noto-bold" />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="Revenue" stroke="#0056b3" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </WidgetWrapper>

                    {/* Bottom Row - Financial & Bookings */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <WidgetWrapper title="Financial Clearance Logs">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={paymentStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" innerRadius={0} paddingAngle={2}>
                                        {paymentStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'inherit', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </WidgetWrapper>

                        <WidgetWrapper title="Recent Applications & Directives">
                            <div className="h-full min-h-0 overflow-auto scrollbar-hide">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-muted/30 border-b-2 border-border sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2 text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Applicant</th>
                                            <th className="px-3 py-2 text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Facility</th>
                                            <th className="px-3 py-2 text-[10px] font-noto-bold text-foreground uppercase tracking-widest text-right">INR</th>
                                            <th className="px-3 py-2 text-[10px] font-noto-bold text-foreground uppercase tracking-widest text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {recentBookings.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-8 text-center text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                                                    No Recent Records
                                                </td>
                                            </tr>
                                        ) : (
                                            recentBookings.map((b) => (
                                                <tr key={b._id} className="hover:bg-muted/10 transition-colors">
                                                    <td className="px-3 py-2">
                                                        <div className="font-noto-bold text-foreground text-[11px] uppercase tracking-tight">{b.guestName}</div>
                                                        <div className="text-[9px] text-muted-foreground font-noto-medium truncate max-w-[100px]">{b.email}</div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="font-noto-bold text-foreground text-[11px] uppercase tracking-tight">Room {b.room?.roomNumber || 'N/A'}</div>
                                                        <div className="text-[9px] text-muted-foreground font-noto-medium uppercase tracking-widest">{b.room?.type}</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-noto-bold text-[#0056b3] dark:text-cyan-500 text-[11px]">
                                                        ₹{b.totalAmount}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <Badge variant="outline" className={`rounded-sm border uppercase text-[9px] font-noto-bold tracking-widest px-1.5 py-0 h-5 ${b.status === 'confirmed' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-600' :
                                                            b.status === 'cancelled' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-600' :
                                                                'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-600'}`}>
                                                            {b.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </WidgetWrapper>

                        <WidgetWrapper title="AI-Reported Issues & Service Requests">
                            <div className="h-full min-h-0 overflow-auto scrollbar-hide">
                                <div className="space-y-4">
                                    {maintenanceReports.length === 0 && supplyRequests.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <Wrench className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">No Active Reports</p>
                                        </div>
                                    ) : (
                                        <>
                                            {maintenanceReports.map((log) => (
                                                <div key={log._id} className="p-3 bg-red-50/30 dark:bg-red-950/10 border-2 border-red-200 dark:border-red-800/40 rounded-sm group hover:border-red-400 transition-colors">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-sm bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                                <Wrench className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                                            </div>
                                                            <span className="text-xs font-noto-bold text-foreground uppercase tracking-tight">Room {log.details?.roomNumber}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-[9px] font-noto-bold border-red-500 text-red-600 uppercase bg-red-500/5">Maintenance</Badge>
                                                    </div>
                                                    <p className="text-[11px] font-noto-medium text-foreground line-clamp-2 mb-2 leading-relaxed italic">
                                                        "{log.details?.issue}"
                                                    </p>
                                                    <div className="flex items-center justify-between text-[9px] font-noto-bold text-muted-foreground uppercase tracking-widest border-t border-red-200 dark:border-red-800/40 pt-2 mt-auto">
                                                        <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {format(new Date(log.createdAt), 'MMM dd, HH:mm')}</span>
                                                        <span className="text-red-600 dark:text-red-400">Via AI Assistant</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {supplyRequests.map((log) => (
                                                <div key={log._id} className="p-3 bg-emerald-50/30 dark:bg-emerald-950/10 border-2 border-emerald-200 dark:border-emerald-800/40 rounded-sm group hover:border-emerald-400 transition-colors">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-sm bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                                                <Package className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                                            </div>
                                                            <span className="text-xs font-noto-bold text-foreground uppercase tracking-tight">Room {log.details?.roomNumber}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-[9px] font-noto-bold border-emerald-500 text-emerald-600 uppercase bg-emerald-500/5">Service</Badge>
                                                    </div>
                                                    <p className="text-[11px] font-noto-medium text-foreground line-clamp-2 mb-2 leading-relaxed">
                                                        {Array.isArray(log.details?.items) ? log.details.items.map(i => `${i.quantity || 1}× ${i.name}`).join(', ') : 'Supply request'}
                                                    </p>
                                                    {log.details?.instructions && (
                                                        <p className="text-[10px] text-muted-foreground italic mb-2">Note: {log.details.instructions}</p>
                                                    )}
                                                    <div className="flex items-center justify-between text-[9px] font-noto-bold text-muted-foreground uppercase tracking-widest border-t border-emerald-200 dark:border-emerald-800/40 pt-2 mt-auto">
                                                        <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {format(new Date(log.createdAt), 'MMM dd, HH:mm')}</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400">Via AI Assistant</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        </WidgetWrapper>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
