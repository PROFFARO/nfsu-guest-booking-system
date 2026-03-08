'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { BedDouble, BookOpen, Users, TrendingUp, Activity, IndianRupee, FileText, Settings, GripHorizontal, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

// React Grid Layout Imports
import { ResponsiveGridLayout as Responsive, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const COLORS = {
    standard: ['#0056b3', '#0f766e', '#b45309', '#be123c', '#4338ca'],
    status: { vacant: '#0f766e', booked: '#be123c', held: '#b45309', maintenance: '#475569' },
    payment: { paid: '#0f766e', unpaid: '#be123c' }
};

const DEFAULT_WIDGETS = [
    { id: 'metrics', title: 'Key Metrics', visible: true, layout: { i: 'metrics', x: 0, y: 0, w: 12, h: 1, minW: 12, minH: 1 } },
    { id: 'inventory', title: 'Facility Inventory Distribution', visible: true, layout: { i: 'inventory', x: 0, y: 1, w: 6, h: 4, minW: 4, minH: 3 } },
    { id: 'status', title: 'Global Status Proportion', visible: true, layout: { i: 'status', x: 6, y: 1, w: 6, h: 4, minW: 4, minH: 3 } },
    { id: 'revenue', title: '7-Day Revenue Ledger', visible: true, layout: { i: 'revenue', x: 0, y: 5, w: 12, h: 4, minW: 6, minH: 3 } },
    { id: 'financial', title: 'Financial Clearance Logs', visible: true, layout: { i: 'financial', x: 0, y: 9, w: 6, h: 4, minW: 4, minH: 3 } },
    { id: 'bookings', title: 'Recent Applications & Directives', visible: true, layout: { i: 'bookings', x: 6, y: 9, w: 6, h: 4, minW: 6, minH: 3 } },
];

export default function AdminDashboard() {
    const { width, containerRef, mounted } = useContainerWidth();
    const [roomStats, setRoomStats] = useState(null);
    const [recentBookings, setRecentBookings] = useState([]);
    const [analyticsBookings, setAnalyticsBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);

    useEffect(() => {
        const savedWidgets = localStorage.getItem('adminDashboardGrid');
        if (savedWidgets) {
            try {
                // Merge saved layout with default static widget properties in case of schema updates
                const parsed = JSON.parse(savedWidgets);
                const merged = DEFAULT_WIDGETS.map(dw => {
                    const saved = parsed.find(pw => pw.id === dw.id);
                    return saved ? { ...dw, visible: saved.visible, layout: saved.layout || dw.layout } : dw;
                });
                setWidgets(merged);
            } catch {
                setWidgets(DEFAULT_WIDGETS);
            }
        }
    }, []);

    const handleLayoutChange = (newLayout) => {
        const updatedWidgets = widgets.map(widget => {
            const l = newLayout.find(nl => nl.i === widget.id);
            if (l) {
                // Persist the new layout coordinates
                return { ...widget, layout: l };
            }
            return widget;
        });
        setWidgets(updatedWidgets);
        localStorage.setItem('adminDashboardGrid', JSON.stringify(updatedWidgets));
    };

    const toggleWidgetVisibility = (id) => {
        const updated = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
        setWidgets(updated);
        localStorage.setItem('adminDashboardGrid', JSON.stringify(updated));
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [roomRes, bookingRes] = await Promise.all([
                    api.rooms.stats(),
                    api.bookings.list({ limit: 100 }), // Fetch more for analytics
                ]);
                setRoomStats(roomRes.data);

                const allBookings = bookingRes.data.bookings || [];
                setAnalyticsBookings(allBookings);
                setRecentBookings(allBookings.slice(0, 5)); // Just the 5 most recent for the table
            } catch (err) {
                toast.error('Failed to load analytical data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
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

    return (
        <div className="p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8 mx-auto w-full overflow-hidden box-border">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="mb-6 sm:mb-8 border-b-2 border-border pb-4 sm:pb-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl md:text-2xl font-noto-bold text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">Executive Management Console</h1>
                        <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                            Centralized System Analytics & Facility Oversight
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <Link href="/admin/gatepass">
                            <Button className="bg-[#0f766e] text-white hover:bg-[#0f766e]/90 border-0 flex items-center gap-1.5 sm:gap-2 uppercase text-[9px] sm:text-[10px] font-noto-bold tracking-widest h-8 sm:h-9 px-2.5 sm:px-4 rounded-sm">
                                <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Scan
                            </Button>
                        </Link>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="border-2 border-border gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-noto-bold uppercase tracking-widest h-8 sm:h-9 px-2.5 sm:px-4 rounded-sm">
                                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Layout
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Dashboard Initialization</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Toggle widgets to show or hide them from your customizable grid.</p>
                                <div className="space-y-2">
                                    {widgets.map((widget) => (
                                        <div key={widget.id} className="flex items-center justify-between p-3 border rounded bg-background hover:bg-muted/50 transition-colors">
                                            <span className="text-sm font-medium flex-1 uppercase tracking-widest">{widget.title}</span>
                                            <Switch
                                                checked={widget.visible}
                                                onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    </div>
                </div>

                {/* Grafana-style Draggable Dashboard Grid */}
                <div ref={containerRef} className="w-full overflow-hidden">
                    {mounted && (
                        <Responsive
                            className="layout"
                        layouts={{ lg: widgets.map(w => w.layout) }}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                        rowHeight={80}
                        draggableHandle=".drag-handle"
                        onLayoutChange={handleLayoutChange}
                        isBounded={true}
                        margin={[16, 16]}
                        width={width}
                    >
                    {widgets.filter(w => w.visible).map((widget) => (
                        <div key={widget.id} className="bg-card border-2 border-border rounded-sm shadow-sm flex flex-col overflow-hidden">
                            {/* Widget Header - Dynamic Drag Handle */}
                            {widget.id !== 'metrics' && (
                                <div className="bg-muted/30 border-b-2 border-border px-3 py-2 flex items-center justify-between group cursor-default">
                                    <h2 className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest truncate">{widget.title}</h2>
                                    <div className="drag-handle cursor-move opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-sm" title="Drag to move">
                                        <GripHorizontal className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                            )}

                            {/* Widget Body */}
                            <div className={`${widget.id === 'metrics' ? '' : 'p-4 flex-1 h-full flex flex-col min-h-0'}`}>
                                {widget.id === 'metrics' && (
                                    /* Key Metrics Row */
                                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 h-full">
                                        {statsCards.map((stat, i) => {
                                            const Icon = stat.icon;
                                            return (
                                                <div key={stat.title} className="bg-card border border-border rounded-sm overflow-hidden h-full flex flex-col justify-center relative group">
                                                    <div className="drag-handle absolute top-1 right-1 cursor-move opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/50 dark:bg-black/50 rounded-sm z-10" title="Drag to move entire metrics block">
                                                        <GripHorizontal className="h-3 w-3 text-muted-foreground" />
                                                    </div>
                                                    <div className="flex items-center h-full">
                                                        <div className={`flex h-full min-h-16 w-16 shrink-0 items-center justify-center ${stat.color} text-white border-r`}>
                                                            <Icon className="h-6 w-6" />
                                                        </div>
                                                        <div className="p-3 flex-1 overflow-hidden">
                                                            <p className="text-[9px] font-noto-bold text-muted-foreground uppercase tracking-widest truncate">{stat.title}</p>
                                                            <p className="text-xl font-noto-bold text-foreground leading-none mt-1">{stat.value}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {widget.id === 'inventory' && (
                                    /* Facility Occupancy Analytics */
                                    <div className="h-full min-h-0 relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={roomsByType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} className="font-noto-bold uppercase tracking-widest" />
                                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} className="font-noto-bold" />
                                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted))', opacity: 0.4}} />
                                                <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'inherit', fontWeight: 'bold' }} />
                                                <Bar dataKey="Vacant" stackId="a" fill={COLORS.status.vacant} />
                                                <Bar dataKey="Booked" stackId="a" fill={COLORS.status.booked} />
                                                <Bar dataKey="Held" stackId="a" fill={COLORS.status.held} />
                                                <Bar dataKey="Maintenance" stackId="a" fill={COLORS.status.maintenance} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                {widget.id === 'status' && (
                                    /* Room Status Global */
                                    <div className="h-full min-h-0 relative flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={statusBreakdown}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius="80%"
                                                    innerRadius="50%"
                                                    paddingAngle={2}
                                                >
                                                    {statusBreakdown.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'inherit', fontWeight: 'bold' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                {widget.id === 'revenue' && (
                                    /* Financial Trend */
                                    <div className="h-full min-h-0 relative">
                                        <div className="absolute top-0 right-0 z-10 hidden md:block">
                                            <Badge variant="outline" className="border-border text-muted-foreground text-[10px] uppercase font-noto-bold">
                                                <IndianRupee className="h-3 w-3 mr-1 inline" /> INR Ledger
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
                                    </div>
                                )}
                                {widget.id === 'financial' && (
                                    /* Financial Status Pie */
                                    <div className="h-full min-h-0 relative flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={paymentStatusData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius="80%"
                                                    innerRadius={0}
                                                    paddingAngle={2}
                                                >
                                                    {paymentStatusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'inherit', fontWeight: 'bold' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                {widget.id === 'bookings' && (
                                    /* Recent Directives (Bookings Table) */
                                    <div className="h-full min-h-0 overflow-auto">
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
                                )}
                            </div>
                        </div>
                    ))}
                    </Responsive>
                )}
                </div>
            </motion.div>
        </div>
    );
}
