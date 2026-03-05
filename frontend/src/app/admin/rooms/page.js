'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { BedDouble, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
    vacant: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    booked: 'bg-red-500/10 text-red-500 border-red-500/20',
    held: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    maintenance: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function RoomManagementPage() {
    const [rooms, setRooms] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ type: '', floor: '', status: '', page: 1, limit: 20 });

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const params = {};
            Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
            const res = await api.rooms.list(params);
            setRooms(res.data.rooms);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load rooms'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRooms(); }, [filters]);

    const handleStatusChange = async (roomId, newStatus) => {
        try {
            await api.rooms.updateStatus(roomId, newStatus);
            toast.success('Room status updated');
            fetchRooms();
        } catch (err) {
            toast.error(err.message || 'Failed to update');
        }
    };

    const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value === 'all' ? '' : value, page: 1 }));

    return (
        <div className="p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Room Management</h1>
                        <p className="text-muted-foreground">Manage all rooms and their status</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-3">
                    <Select value={filters.type || 'all'} onValueChange={(v) => updateFilter('type', v)}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="double">Double</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filters.floor || 'all'} onValueChange={(v) => updateFilter('floor', v)}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Floors</SelectItem>
                            {['1', '2', '3', '4', '5', '6'].map(f => <SelectItem key={f} value={f}>Floor {f}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filters.status || 'all'} onValueChange={(v) => updateFilter('status', v)}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="vacant">Vacant</SelectItem>
                            <SelectItem value="booked">Booked</SelectItem>
                            <SelectItem value="held">Held</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <Card className="border-border/40 bg-card/50">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Room</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Floor</TableHead>
                                        <TableHead>Block</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rooms.map((room) => (
                                        <TableRow key={room._id}>
                                            <TableCell className="font-medium">{room.roomNumber}</TableCell>
                                            <TableCell className="capitalize">{room.type}</TableCell>
                                            <TableCell>{room.floor}</TableCell>
                                            <TableCell>{room.block}</TableCell>
                                            <TableCell>₹{room.pricePerNight}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={statusColors[room.status]}>{room.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Select value={room.status} onValueChange={(v) => handleStatusChange(room._id, v)}>
                                                    <SelectTrigger className="w-[130px] h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="vacant">Vacant</SelectItem>
                                                        <SelectItem value="booked">Booked</SelectItem>
                                                        <SelectItem value="held">Held</SelectItem>
                                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" disabled={!pagination.hasPrevPage} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-4 text-sm text-muted-foreground">
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
