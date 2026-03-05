'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { BedDouble, BookOpen, Users, TrendingUp, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
    const [roomStats, setRoomStats] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [roomRes, bookingRes] = await Promise.all([
                    api.rooms.stats(),
                    api.bookings.list({ limit: 5 }),
                ]);
                setRoomStats(roomRes.data);
                setBookings(bookingRes.data.bookings);
            } catch (err) {
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const summary = roomStats?.summary || {};
    const statsCards = [
        { title: 'Total Rooms', value: summary.totalRooms || 0, icon: BedDouble, color: 'from-cyan-500 to-blue-600' },
        { title: 'Available', value: summary.availableRooms || 0, icon: Activity, color: 'from-emerald-500 to-green-600' },
        { title: 'Occupancy Rate', value: `${summary.occupancyRate || 0}%`, icon: TrendingUp, color: 'from-purple-500 to-violet-600' },
        { title: 'Recent Bookings', value: bookings.length, icon: BookOpen, color: 'from-amber-500 to-orange-600' },
    ];

    const pieData = roomStats?.stats?.map((s) => ({
        name: s._id === 'single' ? 'Single' : 'Double',
        vacant: s.vacant,
        booked: s.booked,
        held: s.held,
        maintenance: s.maintenance,
        total: s.total,
    })) || [];

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
            statusBreakdown.push({ name, value });
        });
    }

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-80 rounded-xl" />
                    <Skeleton className="h-80 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
                    {statsCards.map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                                <Card className="border-border/40 bg-card/50 overflow-hidden">
                                    <CardContent className="flex items-center gap-4 p-6">
                                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                                            <Icon className="h-7 w-7 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                                            <p className="text-3xl font-bold">{stat.value}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="border-border/40 bg-card/50">
                        <CardHeader>
                            <CardTitle>Room Status Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                                        paddingAngle={5}
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {statusBreakdown.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 bg-card/50">
                        <CardHeader>
                            <CardTitle>Rooms by Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={pieData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                                    <YAxis stroke="hsl(var(--muted-foreground))" />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                                    <Bar dataKey="vacant" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="booked" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="held" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="maintenance" fill="#6b7280" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Bookings */}
                <Card className="border-border/40 bg-card/50 mt-6">
                    <CardHeader>
                        <CardTitle>Recent Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {bookings.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No bookings yet</p>
                        ) : (
                            <div className="space-y-3">
                                {bookings.map((b) => (
                                    <div key={b._id} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                                        <div>
                                            <p className="font-medium">{b.guestName}</p>
                                            <p className="text-sm text-muted-foreground">Room {b.room?.roomNumber} · {b.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-cyan-500">₹{b.totalAmount}</span>
                                            <Badge variant="outline" className={b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}>
                                                {b.status}
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
