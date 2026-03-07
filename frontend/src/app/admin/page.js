'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { BedDouble, BookOpen, Users, TrendingUp, Activity, IndianRupee, FileText, Settings, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const COLORS = {
    standard: ['#0056b3', '#0f766e', '#b45309', '#be123c', '#4338ca'],
    status: { vacant: '#0f766e', booked: '#be123c', held: '#b45309', maintenance: '#475569' },
    payment: { paid: '#0f766e', unpaid: '#be123c' }
};

function SortableWidget({ id, children, title, visible, onToggleVisibility }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 border rounded bg-background hover:bg-muted/50">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex-1 flex items-center gap-2">
                <div className="text-muted-foreground">⋮⋮</div>
                <span className="text-sm font-medium flex-1">{title}</span>
            </div>
            <Switch
                checked={visible}
                onCheckedChange={onToggleVisibility}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

function DashboardWidget({ id, children }) {
    const { setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            {children}
        </div>
    );
}

export default function AdminDashboard() {
    const [roomStats, setRoomStats] = useState(null);
    const [recentBookings, setRecentBookings] = useState([]);
    const [analyticsBookings, setAnalyticsBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [widgets, setWidgets] = useState([
        { id: 'metrics', title: 'Key Metrics', visible: true },
        { id: 'inventory', title: 'Facility Inventory Distribution', visible: true },
        { id: 'status', title: 'Global Status Proportion', visible: true },
        { id: 'revenue', title: '7-Day Revenue Ledger', visible: true },
        { id: 'financial', title: 'Financial Clearance Logs', visible: true },
        { id: 'bookings', title: 'Recent Applications & Directives', visible: true },
    ]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const savedWidgets = localStorage.getItem('adminDashboardWidgets');
        if (savedWidgets) {
            setWidgets(JSON.parse(savedWidgets));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('adminDashboardWidgets', JSON.stringify(widgets));
    }, [widgets]);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setWidgets((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const toggleWidgetVisibility = (id) => {
        setWidgets(widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
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
                <div className="bg-card border-2 border-border p-3 rounded-sm shadow-md">
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
        <div className="p-4 md:p-6 space-y-8 max-w-400 mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="mb-8 border-b-2 border-border pb-5 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-noto-bold text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">Executive Management Console</h1>
                        <p className="mt-1 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                            Centralized System Analytics & Facility Oversight
                        </p>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="border-2 border-border">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Dashboard Customization</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Toggle widgets and drag to reorder.</p>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={widgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-2">
                                            {widgets.map((widget) => (
                                                <SortableWidget 
                                                    key={widget.id} 
                                                    id={widget.id}
                                                    title={widget.title}
                                                    visible={widget.visible}
                                                    onToggleVisibility={() => toggleWidgetVisibility(widget.id)}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

{/* Dashboard Widgets */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={widgets.filter(w => w.visible).map(w => w.id)} strategy={verticalListSortingStrategy}>
                        {widgets.filter(w => w.visible).map((widget) => (
                            <DashboardWidget key={widget.id} id={widget.id}>
                                {widget.id === 'metrics' && (
                                    /* Key Metrics Grid */
                                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
                                        {statsCards.map((stat, i) => {
                                            const Icon = stat.icon;
                                            return (
                                                <motion.div key={stat.title} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                                    <Card className="border-2 border-border bg-card shadow-none rounded-sm overflow-hidden h-full flex flex-col justify-center">
                                                        <div className="flex items-center h-full">
                                                            <div className={`flex h-full min-h-22 w-22 shrink-0 items-center justify-center ${stat.color} text-white border-r-2`}>
                                                                <Icon className="h-8 w-8" />
                                                            </div>
                                                            <div className="p-4 flex-1">
                                                                <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.title}</p>
                                                                <p className="text-2xl font-noto-bold text-foreground leading-none">{stat.value}</p>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                                {widget.id === 'inventory' && (
                                    /* Facility Occupancy Analytics */
                                    <Card className="border-2 border-border rounded-sm shadow-none mb-6">
                                        <div className="bg-muted/30 border-b-2 border-border px-4 py-3">
                                            <h2 className="text-xs font-noto-bold text-foreground uppercase tracking-widest">Facility Inventory Distribution</h2>
                                        </div>
                                        <CardContent className="pt-6">
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={roomsByType} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} className="font-noto-bold uppercase tracking-widest" />
                                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} className="font-noto-bold" />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'inherit', fontWeight: 'bold' }} />
                                                    <Bar dataKey="Vacant" stackId="a" fill={COLORS.status.vacant} />
                                                    <Bar dataKey="Booked" stackId="a" fill={COLORS.status.booked} />
                                                    <Bar dataKey="Held" stackId="a" fill={COLORS.status.held} />
                                                    <Bar dataKey="Maintenance" stackId="a" fill={COLORS.status.maintenance} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                )}
                                {widget.id === 'status' && (
                                    /* Room Status Global */
                                    <Card className="border-2 border-border rounded-sm shadow-none mb-6">
                                        <div className="bg-muted/30 border-b-2 border-border px-4 py-3">
                                            <h2 className="text-xs font-noto-bold text-foreground uppercase tracking-widest">Global Status Proportion</h2>
                                        </div>
                                        <CardContent className="pt-6 flex justify-center">
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie
                                                        data={statusBreakdown}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={100}
                                                        innerRadius={60}
                                                        paddingAngle={2}
                                                    >
                                                        {statusBreakdown.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'inherit', fontWeight: 'bold' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                )}
                                {widget.id === 'revenue' && (
                                    /* Financial Trend */
                                    <Card className="border-2 border-border rounded-sm shadow-none mb-6">
                                        <div className="bg-muted/30 border-b-2 border-border px-4 py-3 flex justify-between items-center">
                                            <h2 className="text-xs font-noto-bold text-foreground uppercase tracking-widest">7-Day Revenue Ledger (INR)</h2>
                                            <IndianRupee className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <CardContent className="pt-6">
                                            <ResponsiveContainer width="100%" height={300}>
                                                <AreaChart data={revenueTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                                        </CardContent>
                                    </Card>
                                )}
                                {widget.id === 'financial' && (
                                    /* Financial Status Pie */
                                    <Card className="border-2 border-border rounded-sm shadow-none mb-6">
                                        <div className="bg-muted/30 border-b-2 border-border px-4 py-3">
                                            <h2 className="text-xs font-noto-bold text-foreground uppercase tracking-widest">Financial Clearance Logs</h2>
                                        </div>
                                        <CardContent className="pt-6 flex justify-center">
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie
                                                        data={paymentStatusData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={100}
                                                        innerRadius={0}
                                                        paddingAngle={2}
                                                    >
                                                        {paymentStatusData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'inherit', fontWeight: 'bold' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                )}
                                {widget.id === 'bookings' && (
                                    /* Recent Directives (Bookings Table) */
                                    <div className="border-2 border-border rounded-sm bg-card shadow-sm overflow-hidden">
                                        <div className="bg-[#0056b3] dark:bg-cyan-900 border-b-2 border-border px-4 py-3 flex justify-between items-center">
                                            <h2 className="text-xs font-noto-bold text-white uppercase tracking-widest">Recent Applications & Directives</h2>
                                            <Badge variant="outline" className="border-white/20 text-white font-noto-bold uppercase text-[10px] tracking-widest bg-transparent">Latest 5 Records</Badge>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-muted/30 border-b-2 border-border">
                                                    <tr>
                                                        <th className="px-4 py-3 text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Applicant</th>
                                                        <th className="px-4 py-3 text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Facility</th>
                                                        <th className="px-4 py-3 text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Duration</th>
                                                        <th className="px-4 py-3 text-[10px] font-noto-bold text-foreground uppercase tracking-widest text-right">Price (INR)</th>
                                                        <th className="px-4 py-3 text-[10px] font-noto-bold text-foreground uppercase tracking-widest text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {recentBookings.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="5" className="px-4 py-8 text-center text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                                                                No Recent Records Found
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        recentBookings.map((b) => (
                                                            <tr key={b._id} className="hover:bg-muted/10 transition-colors">
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    <div className="font-noto-bold text-foreground text-xs uppercase tracking-tight">{b.guestName}</div>
                                                                    <div className="text-[10px] text-muted-foreground font-noto-medium">{b.email}</div>
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    <div className="font-noto-bold text-foreground text-xs uppercase tracking-tight">Room {b.room?.roomNumber || 'N/A'}</div>
                                                                    <div className="text-[10px] text-muted-foreground font-noto-medium uppercase tracking-widest">{b.room?.type}</div>
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">
                                                                    {format(new Date(b.checkIn), 'dd MMM yyy')} - {format(new Date(b.checkOut), 'dd MMM yyy')}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-right font-noto-bold text-[#0056b3] dark:text-cyan-500 text-xs">
                                                                    ₹{b.totalAmount}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                                    <Badge variant="outline" className={`rounded-sm border uppercase text-[10px] font-noto-bold tracking-widest px-2 py-0.5 h-6 ${b.status === 'confirmed' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-600' :
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
                                    </div>
                                )}
                            </DashboardWidget>
                        ))}
                    </SortableContext>
                </DndContext>

            </motion.div>
        </div>
    );
}

