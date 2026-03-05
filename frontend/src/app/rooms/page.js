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
    vacant: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    booked: 'bg-red-500/10 text-red-500 border-red-500/20',
    held: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    maintenance: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
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
                className="mb-8"
            >
                <h1 className="mb-2 text-3xl font-bold">Browse Rooms</h1>
                <p className="text-muted-foreground">Find the perfect room for your stay at NFSU Guest House</p>
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
                        className="grid gap-4 rounded-xl border border-border/40 bg-card/50 p-4 sm:grid-cols-2 lg:grid-cols-4"
                    >
                        <div className="space-y-2">
                            <Label>Room Type</Label>
                            <Select value={filters.type || 'all'} onValueChange={(v) => updateFilter('type', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="single">Single</SelectItem>
                                    <SelectItem value="double">Double</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Floor</Label>
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
                        <div className="space-y-2">
                            <Label>Block</Label>
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
                        <div className="space-y-2">
                            <Label>Status</Label>
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
                        <Card key={i} className="border-border/40">
                            <CardContent className="p-4 space-y-3">
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-8 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : rooms.length === 0 ? (
                <div className="py-20 text-center">
                    <BedDouble className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No rooms found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters</p>
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
                                    <Card className="group h-full border-border/40 bg-card/50 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5 cursor-pointer">
                                        <CardContent className="p-5">
                                            <div className="mb-3 flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold">Room {room.roomNumber}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Floor {room.floor} · Block {room.block}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className={statusColors[room.status]}>
                                                    {room.status}
                                                </Badge>
                                            </div>

                                            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                                                <BedDouble className="h-4 w-4" />
                                                <span className="capitalize">{room.type}</span>
                                            </div>

                                            {room.facilities?.length > 0 && (
                                                <div className="mb-4 flex flex-wrap gap-1">
                                                    {room.facilities.slice(0, 4).map((f) => {
                                                        const Icon = facilityIcons[f];
                                                        return (
                                                            <Badge key={f} variant="secondary" className="text-xs gap-1">
                                                                {Icon && <Icon className="h-3 w-3" />}
                                                                {f}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <p className="text-lg font-bold text-cyan-500">
                                                    ₹{room.pricePerNight}
                                                    <span className="text-xs font-normal text-muted-foreground">/night</span>
                                                </p>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-cyan-500 group-hover:bg-cyan-500/10"
                                                >
                                                    View →
                                                </Button>
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
