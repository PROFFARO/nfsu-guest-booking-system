'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Bed, BedDouble, ChevronLeft, ChevronRight, Search, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { RoomBookingModal } from '@/components/rooms/RoomBookingModal';

const getGroupedByFloor = (roomList) => {
    const grouped = {};
    roomList.forEach(r => {
        const f = r.floor || '1';
        if (!grouped[f]) grouped[f] = [];
        grouped[f].push(r);
    });
    return Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));
};

export default function RoomBrowsePage() {
    const [rooms, setRooms] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        type: '',
        floor: '',
        block: '',
        status: '',
        page: 1,
        limit: 100,
    });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
            toast.error('Failed to load official records');
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

    const searchFilteredRooms = rooms.filter(room =>
        room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.block.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const singleRooms = searchFilteredRooms.filter(r => r.type === 'single');
    const doubleRooms = searchFilteredRooms.filter(r => r.type === 'double');

    const categorizedRooms = {
        single: singleRooms,
        double: doubleRooms
    };

    return (
        <div className="container mx-auto px-4 py-6 lg:py-10 max-w-[1600px]">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10"
            >
                <div className="flex items-start gap-3">
                    <div className="h-14 w-1.5 bg-[#004A99] dark:bg-cyan-600 mt-1" />
                    <div className="flex flex-col">
                        <h1 className="text-3xl lg:text-4xl font-noto-bold uppercase tracking-tight text-[#004A99] dark:text-cyan-500 leading-tight">
                            Unit Allocation Ledger
                        </h1>
                        <p className="text-[9px] font-noto-bold text-muted-foreground uppercase tracking-[0.4em] mt-1">
                            Official Accommodations Inventory • Real-time Protocol Status
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative group min-w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#004A99] transition-colors" />
                        <input
                            type="text"
                            placeholder="Find Unit / Block..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border-2 border-border focus:border-[#004A99] outline-none font-noto-medium text-sm transition-all shadow-sm rounded-md"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="rounded-md border-2 border-border h-11 px-6 font-noto-bold text-[10px] uppercase tracking-widest hover:bg-muted"
                    >
                        <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                        Filters
                    </Button>
                    <Button
                        onClick={fetchRooms}
                        variant="outline"
                        className="rounded-md border-2 border-border h-11 px-4 text-[#004A99] dark:text-cyan-600 font-noto-bold flex items-center gap-2 hover:bg-muted"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            </motion.div>

            {showFilters && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid gap-6 border-2 border-slate-300 dark:border-slate-800 bg-muted/5 p-6 sm:grid-cols-2 lg:grid-cols-4 mb-10 rounded-2xl shadow-sm"
                >
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest pl-1">Occupancy Protocol</Label>
                        <Select value={filters.type || 'all'} onValueChange={(v) => updateFilter('type', v)}>
                            <SelectTrigger className="rounded-lg border-2 border-slate-200 dark:border-slate-800 focus:ring-0 focus:border-[#004A99] h-11 font-noto-medium text-xs bg-white dark:bg-slate-900 transition-all"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-lg border-2 border-slate-200 dark:border-slate-800">
                                <SelectItem value="all">All Inventory</SelectItem>
                                <SelectItem value="single">Single Occupancy</SelectItem>
                                <SelectItem value="double">Double Occupancy</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest pl-1">Level / Floor</Label>
                        <Select value={filters.floor || 'all'} onValueChange={(v) => updateFilter('floor', v)}>
                            <SelectTrigger className="rounded-lg border-2 border-slate-200 dark:border-slate-800 focus:ring-0 focus:border-[#004A99] h-11 font-noto-medium text-xs bg-white dark:bg-slate-900 transition-all"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-lg border-2 border-slate-200 dark:border-slate-800">
                                <SelectItem value="all">Global (All Floors)</SelectItem>
                                {['1', '2', '3', '4', '5', '6'].map((f) => (
                                    <SelectItem key={f} value={f}>Floor {f}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest pl-1">Assigned Block</Label>
                        <Select value={filters.block || 'all'} onValueChange={(v) => updateFilter('block', v)}>
                            <SelectTrigger className="rounded-lg border-2 border-slate-200 dark:border-slate-800 focus:ring-0 focus:border-[#004A99] h-11 font-noto-medium text-xs bg-white dark:bg-slate-900 transition-all"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-lg border-2 border-slate-200 dark:border-slate-800">
                                <SelectItem value="all">All Blocks</SelectItem>
                                {['A', 'B', 'C', 'D', 'E', 'F'].map((b) => (
                                    <SelectItem key={b} value={b}>Block {b}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest pl-1">Operational Status</Label>
                        <Select value={filters.status || 'all'} onValueChange={(v) => updateFilter('status', v)}>
                            <SelectTrigger className="rounded-lg border-2 border-slate-200 dark:border-slate-800 focus:ring-0 focus:border-[#004A99] h-11 font-noto-medium text-xs bg-white dark:bg-slate-900 transition-all"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-lg border-2 border-slate-200 dark:border-slate-800">
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="vacant">Vacant / Available</SelectItem>
                                <SelectItem value="booked">Booked / Occupied</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </motion.div>
            )}

            {/* Main Ledger View */}
            {loading ? (
                <div className="grid grid-cols-1 gap-10">
                    <Skeleton className="h-[600px] w-full rounded-2xl" />
                </div>
            ) : rooms.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed border-border rounded-2xl bg-muted/5 mt-4">
                    <BedDouble className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-20" />
                    <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-[0.3em]">No matching official records found in the current inventory.</p>
                </div>
            ) : (
                <div className="space-y-16">
                    {/* Separate Ledgers for Occupancy Types */}
                    {[
                        { title: 'Single Occupancy', icon: Bed, type: 'single', rooms: categorizedRooms.single },
                        { title: 'Double Occupancy', icon: BedDouble, type: 'double', rooms: categorizedRooms.double }
                    ].map((occ, occIdx) => {
                        if (occ.rooms.length === 0) return null;

                        const floorSet = new Set(occ.rooms.map(r => String(r.floor)));
                        const blockSet = new Set(occ.rooms.map(r => String(r.block)));
                        const sortedFloors = Array.from(floorSet).sort((a, b) => Number(a) - Number(b));
                        const sortedBlocks = Array.from(blockSet).sort();

                        return (
                            <div key={occIdx} className="space-y-6">
                                {/* Occupancy Type Header */}
                                <div className="flex items-center gap-4">
                                    <div className="h-8 w-1 bg-[#004A99]" />
                                    <h2 className="text-xl font-noto-bold text-[#004A99] dark:text-cyan-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <occ.icon className="h-6 w-6" />
                                        {occ.title}
                                    </h2>
                                    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                                </div>

                                <div className="border-2 border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden bg-card shadow-xl">
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <div className="min-w-max">
                                            {/* Block Headers Row */}
                                            <div className="flex border-b-2 border-slate-300 dark:border-slate-800 bg-muted/40">
                                                <div className="w-[120px] p-6 flex items-center justify-center border-r-2 border-slate-300 dark:border-slate-800 bg-muted/20 shrink-0">
                                                    <span className="text-[9px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em] text-center">Floor \<br />Block</span>
                                                </div>
                                                {sortedBlocks.map(block => (
                                                    <div key={block} className="flex-1 min-w-[300px] p-6 flex items-center justify-center border-r-2 border-slate-200 dark:border-slate-800 last:border-r-0">
                                                        <span className="text-sm font-noto-bold text-[#004A99] dark:text-cyan-600 uppercase tracking-[0.4em]">Block {block}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Floor Rows */}
                                            {sortedFloors.map(floor => (
                                                <div key={floor} className="flex border-b-2 border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50/30 dark:hover:bg-slate-900/5 transition-colors">
                                                    {/* Floor Label Sidebar */}
                                                    <div className="w-[120px] p-8 flex flex-col items-center justify-center border-r-2 border-slate-300 dark:border-slate-800 bg-muted/5 shrink-0">
                                                        <span className="text-[9px] font-noto-bold text-muted-foreground uppercase tracking-[0.3em] mb-1">Floor</span>
                                                        <span className="text-4xl font-noto-bold text-[#004A99] dark:text-cyan-600 leading-none">{floor}</span>
                                                    </div>

                                                    {/* Block Cells */}
                                                    {sortedBlocks.map(block => {
                                                        const cellRooms = occ.rooms.filter(r => String(r.floor) === String(floor) && String(r.block) === String(block))
                                                            .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

                                                        return (
                                                            <div key={block} className="flex-1 min-w-[300px] p-8 flex flex-wrap gap-6 items-start content-start border-r-2 border-slate-100 dark:border-slate-800 last:border-r-0">
                                                                {cellRooms.length > 0 ? (
                                                                    cellRooms.map((room) => (
                                                                        <div key={room._id} className="relative group">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedRoomId(room._id);
                                                                                    setIsModalOpen(true);
                                                                                }}
                                                                                className="calendar-card w-[115px] h-[80px] p-3 text-left transition-all hover:scale-105 hover:shadow-xl active:scale-95 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800/50 rounded-xl"
                                                                            >
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <span className="text-lg font-noto-bold text-foreground leading-none">{room.roomNumber}</span>
                                                                                    <div className={`h-2.5 w-2.5 rounded-full ${room.status === 'vacant' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' :
                                                                                        room.status === 'booked' ? 'bg-red-500' :
                                                                                            room.status === 'held' ? 'bg-amber-500' :
                                                                                                'bg-slate-400'
                                                                                        }`} />
                                                                                </div>
                                                                                <div className="text-[8px] font-noto-bold text-muted-foreground uppercase tracking-widest mt-4">UNIT RECORD</div>
                                                                            </button>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center opacity-10">
                                                                        <span className="text-[9px] font-noto-bold uppercase tracking-widest text-slate-300">N/A</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Bottom Legend Ledger */}
            {!loading && rooms.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-12 py-10 border-2 border-slate-300 dark:border-slate-800 bg-muted/5 px-8 rounded-2xl mt-12 shadow-md">
                    <span className="text-[11px] font-noto-bold text-[#004A99] dark:text-cyan-500 uppercase tracking-[0.4em] border-r-2 border-slate-300 dark:border-slate-800 pr-10 hidden sm:block">Room Status Inventory Legend</span>
                    {[
                        { label: 'Available / Vacant', color: 'bg-emerald-500' },
                        { label: 'Occupied / Booked', color: 'bg-red-500' },
                        { label: 'Requisition Held', color: 'bg-amber-500' },
                        { label: 'Out of Order', color: 'bg-slate-400' }
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-4 group">
                            <div className={`h-4 w-4 rounded-full ${item.color} shadow-sm transition-transform group-hover:scale-125`} />
                            <span className="text-[11px] font-noto-bold text-foreground uppercase tracking-wider">{item.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Room Booking Modal */}
            <RoomBookingModal
                isOpen={isModalOpen}
                onClose={() => {
                    setSelectedRoomId(null);
                    setIsModalOpen(false);
                }}
                roomId={selectedRoomId}
            />
        </div>
    );
}
