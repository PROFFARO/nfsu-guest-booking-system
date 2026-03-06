'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
    BedDouble,
    Users,
    MapPin,
    Wifi,
    Dumbbell,
    Wind,
    Tv,
    Car,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    SlidersHorizontal,
    ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

const facilityIcons = {
    WiFi: Wifi,
    Gym: Dumbbell,
    AC: Wind,
    TV: Tv,
    Parking: Car,
};

const statusColors = {
    vacant: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-600',
    booked: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-600',
    held: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-600',
    maintenance: 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-600',
};

export default function RoomBrowsePage() {
    const [rooms, setRooms] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        type: '',
        floor: '',
        block: '',
        status: '',
        page: 1,
        limit: 12,
    });
    const [showFilters, setShowFilters] = useState(false);
    const { socket } = useSocket();

    const fetchRooms = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            Object.entries(filters).forEach(([k, v]) => {
                if (v) params[k] = v;
            });
            const res = await api.rooms.list(params);
            setRooms(res.data.rooms);
            setPagination(res.data.pagination);
        } catch (err) {
            toast.error('Failed to load rooms');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    useEffect(() => {
        if (!socket) return;
        const handler = ({ roomId, status }) => {
            setRooms((prev) =>
                prev.map((r) => (r._id === roomId ? { ...r, status } : r))
            );
        };
        socket.on('roomStatusUpdated', handler);
        return () => socket.off('roomStatusUpdated', handler);
    }, [socket]);

    const updateFilter = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value === 'all' ? '' : value, page: 1 }));
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 border-b-2 border-border pb-4"
            >
                <h1 className="mb-2 text-3xl font-noto-bold uppercase tracking-tight text-[#0056b3] dark:text-cyan-500">Official Stay Accommodations</h1>
                <p className="text-sm font-noto-medium text-muted-foreground uppercase tracking-widest">NFSU Delhi Campus</p>
            </motion.div>

            {/* Filters */}
            <div className="mb-8">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="mb-4"
                >
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>

                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid gap-4 rounded-sm border-2 border-border bg-card shadow-sm p-4 sm:grid-cols-2 lg:grid-cols-4"
                    >
                        <div className="space-y-1.5">
                            <Label className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Room Type</Label>
                            <Select value={filters.type || 'all'} onValueChange={(v) => updateFilter('type', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="single">Single</SelectItem>
                                    <SelectItem value="double">Double</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Floor</Label>
                            <Select value={filters.floor || 'all'} onValueChange={(v) => updateFilter('floor', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Floors</SelectItem>
                                    {['1', '2', '3', '4', '5', '6'].map((f) => (
                                        <SelectItem key={f} value={f}>Floor {f}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Block</Label>
                            <Select value={filters.block || 'all'} onValueChange={(v) => updateFilter('block', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Blocks</SelectItem>
                                    {['A', 'B', 'C', 'D', 'E', 'F'].map((b) => (
                                        <SelectItem key={b} value={b}>Block {b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Status</Label>
                            <Select value={filters.status || 'all'} onValueChange={(v) => updateFilter('status', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="vacant">Vacant</SelectItem>
                                    <SelectItem value="booked">Booked</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Room Grid */}
            {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i} className="rounded-sm border-2 border-border shadow-sm">
                            <CardContent className="p-4 space-y-4">
                                <Skeleton className="h-6 w-1/3 rounded-sm" />
                                <Skeleton className="h-4 w-1/2 rounded-sm" />
                                <div className="flex gap-2"><Skeleton className="h-5 w-16 rounded-sm" /><Skeleton className="h-5 w-16 rounded-sm" /></div>
                                <div className="pt-4 border-t border-border flex justify-between"><Skeleton className="h-6 w-20 rounded-sm" /><Skeleton className="h-8 w-16 rounded-sm" /></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : rooms.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-border rounded-sm bg-muted/10">
                    <BedDouble className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-50" />
                    <h3 className="text-base font-noto-bold text-foreground tracking-wide">No Data Available</h3>
                    <p className="text-sm font-noto-medium text-muted-foreground mt-1">Adjust filters to find available rooms.</p>
                </div>
            ) : (
                <>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {rooms.map((room, i) => (
                            <motion.div
                                key={room._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Link href={`/rooms/${room._id}`}>
                                    <Card className="group h-full rounded-sm border-2 border-border bg-card shadow-sm hover:border-[#0056b3] dark:hover:border-cyan-500 transition-colors cursor-pointer flex flex-col">
                                        <CardContent className="p-0 flex-1 flex flex-col">
                                            <div className="p-4 border-b border-border bg-muted/10 flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-base font-noto-bold tracking-tight text-foreground uppercase">Room {room.roomNumber}</h3>
                                                    <p className="text-xs font-noto-bold text-muted-foreground mt-0.5 uppercase tracking-widest">
                                                        Floor {room.floor} · Block {room.block}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className={`rounded-sm border uppercase text-[10px] font-noto-bold tracking-widest px-2 py-0 h-5 ${statusColors[room.status]}`}>
                                                    {room.status}
                                                </Badge>
                                            </div>

                                            <div className="p-4 flex-1">
                                                <div className="mb-3 flex items-center gap-2 text-sm font-noto-medium text-foreground">
                                                    <BedDouble className="h-4 w-4 text-[#0056b3] dark:text-cyan-500" />
                                                    <span className="capitalize">{room.type} Occupancy</span>
                                                </div>

                                                {room.facilities?.length > 0 && (
                                                    <div className="mb-4 flex flex-wrap gap-1.5">
                                                        {room.facilities.slice(0, 4).map((f) => {
                                                            const Icon = facilityIcons[f];
                                                            return (
                                                                <Badge key={f} variant="outline" className="rounded-sm bg-background border-border text-[10px] uppercase font-noto-bold tracking-wide gap-1 pr-2">
                                                                    {Icon && <Icon className="h-3 w-3 text-[#0056b3] dark:text-cyan-600" />}
                                                                    {f}
                                                                </Badge>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-3 px-4 border-t border-border bg-muted/5 flex items-center justify-between mt-auto">
                                                <p className="text-xl font-noto-bold text-foreground">
                                                    ₹{room.pricePerNight}
                                                    <span className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest ml-1">/ Night</span>
                                                </p>
                                                <div className="text-[#0056b3] dark:text-cyan-500 group-hover:underline text-xs font-noto-bold uppercase tracking-widest flex items-center">
                                                    Details <ArrowRight className="ml-1 h-3 w-3" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!pagination.hasPrevPage}
                                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-4 text-sm text-muted-foreground">
                                Page {pagination.currentPage} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!pagination.hasNextPage}
                                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
