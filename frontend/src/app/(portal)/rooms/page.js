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

    // Dynamic Filter Options derived from Master Data
    const availableFloors = Array.from(new Set(rooms.map(r => String(r.floor)))).sort((a, b) => Number(a) - Number(b));
    const availableBlocks = Array.from(new Set(rooms.map(r => String(r.block)))).sort();

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
                        <Label className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest pl-1">Floor Selection</Label>
                        <Select value={filters.floor || 'all'} onValueChange={(v) => updateFilter('floor', v)}>
                            <SelectTrigger className="rounded-lg border-2 border-slate-200 dark:border-slate-800 focus:ring-0 focus:border-[#004A99] h-11 font-noto-medium text-xs bg-white dark:bg-slate-900 transition-all"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-lg border-2 border-slate-200 dark:border-slate-800">
                                <SelectItem value="all">Global (All Floors)</SelectItem>
                                {availableFloors.map((f) => (
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
                                {availableBlocks.map((b) => (
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
                                <SelectItem value="suspended">Suspended / Reserved</SelectItem>
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
                                    {/* Desktop Matrix View (md and up) */}
                                    <div className="hidden md:block overflow-x-auto custom-scrollbar">
                                        <div className="min-w-max">
                                            {/* Block Headers Row */}
                                            <div className="flex border-b-2 border-slate-300 dark:border-slate-800 bg-muted/40">
                                                <div className="w-[100px] p-4 flex items-center justify-center border-r-2 border-slate-300 dark:border-slate-800 bg-muted/20 shrink-0">
                                                    <span className="text-[8px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em] text-center">Floor \<br />Block</span>
                                                </div>
                                                {sortedBlocks.map(block => (
                                                    <div key={block} className="flex-1 min-w-[250px] p-4 flex items-center justify-center border-r-2 border-slate-200 dark:border-slate-800 last:border-r-0">
                                                        <span className="text-xs font-noto-bold text-[#004A99] dark:text-cyan-600 uppercase tracking-[0.4em]">Block {block}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Floor Rows */}
                                            {sortedFloors.map(floor => (
                                                <div key={floor} className="flex border-b-2 border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50/30 dark:hover:bg-slate-900/5 transition-colors">
                                                    {/* Floor Label Sidebar */}
                                                    <div className="w-[100px] p-6 flex flex-col items-center justify-center border-r-2 border-slate-300 dark:border-slate-800 bg-muted/5 shrink-0">
                                                        <span className="text-[8px] font-noto-bold text-muted-foreground uppercase tracking-[0.3em] mb-1">Floor</span>
                                                        <span className="text-3xl font-noto-bold text-[#004A99] dark:text-cyan-600 leading-none">{floor}</span>
                                                    </div>

                                                    {/* Block Cells */}
                                                    {sortedBlocks.map(block => {
                                                        const cellRooms = occ.rooms.filter(r => String(r.floor) === String(floor) && String(r.block) === String(block))
                                                            .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

                                                        return (
                                                            <div key={block} className="flex-1 min-w-[250px] p-6 flex flex-wrap gap-4 items-start content-start border-r-2 border-slate-100 dark:border-slate-800 last:border-r-0">
                                                                {cellRooms.length > 0 ? (
                                                                    cellRooms.map((room) => (
                                                                        <div key={room._id} className="relative group">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedRoomId(room._id);
                                                                                    setIsModalOpen(true);
                                                                                }}
                                                                                className={`calendar-card w-[100px] h-[70px] p-2.5 text-left transition-all hover:scale-105 hover:shadow-xl active:scale-95 rounded-xl border-2 ${room.status === 'vacant'
                                                                                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/50'
                                                                                    : room.status === 'booked'
                                                                                        ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200/60 dark:border-red-800/40'
                                                                                        : room.status === 'held'
                                                                                            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40'
                                                                                            : room.status === 'suspended'
                                                                                                ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-800/40'
                                                                                                : 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-700/40'
                                                                                    }`}
                                                                            >
                                                                                <div className="flex justify-between items-start mb-1">
                                                                                    <span className={`text-base font-noto-bold leading-none ${room.status === 'booked' ? 'text-red-900 dark:text-red-400' :
                                                                                        room.status === 'held' ? 'text-amber-900 dark:text-amber-400' :
                                                                                            'text-foreground'
                                                                                        }`}>{room.roomNumber}</span>
                                                                                    <div className={`h-2 w-2 rounded-full ${room.status === 'vacant' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                                                                                        room.status === 'booked' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.2)]' :
                                                                                            room.status === 'held' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' :
                                                                                                room.status === 'suspended' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]' :
                                                                                                    'bg-slate-400'
                                                                                        }`} />
                                                                                </div>
                                                                                <div className={`text-[7px] font-noto-bold uppercase tracking-widest mt-2 opacity-70 ${room.status === 'booked' ? 'text-red-700/60 dark:text-red-400/60' :
                                                                                    room.status === 'held' ? 'text-amber-700/60 dark:text-amber-400/60' :
                                                                                        room.status === 'suspended' ? 'text-purple-700/60 dark:text-purple-400/60' :
                                                                                            'text-muted-foreground'
                                                                                    }`}>
                                                                                    {room.status === 'suspended' ? 'BLOCKED' : room.status === 'maintenance' ? 'MAINTENANCE' : 'UNIT RECORD'}
                                                                                </div>
                                                                                {room.status === 'suspended' && room.suspensionRecord?.startDate && (
                                                                                    <div className="text-[6.5px] font-noto-bold text-purple-600 dark:text-purple-400 mt-1 uppercase leading-none">
                                                                                        {new Date(room.suspensionRecord.startDate).toLocaleDateString()} - {room.suspensionRecord.endDate ? new Date(room.suspensionRecord.endDate).toLocaleDateString() : 'IND.'}
                                                                                    </div>
                                                                                )}
                                                                                {room.status === 'maintenance' && room.maintenanceSchedule?.startDate && (
                                                                                    <div className="text-[6.5px] font-noto-bold text-slate-500 dark:text-slate-400 mt-1 uppercase leading-none">
                                                                                        {new Date(room.maintenanceSchedule.startDate).toLocaleDateString()} - {room.maintenanceSchedule.endDate ? new Date(room.maintenanceSchedule.endDate).toLocaleDateString() : 'IND.'}
                                                                                    </div>
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center opacity-30">
                                                                        <span className="text-[9px] font-noto-bold uppercase tracking-widest text-muted-foreground">N/A</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Mobile Stacked View (below md) */}
                                    <div className="md:hidden divide-y-2 divide-slate-100 dark:divide-slate-800">
                                        {sortedFloors.map(floor => (
                                            <div key={floor} className="p-5 space-y-8 bg-white dark:bg-slate-950">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-[#004A99] text-white px-3 py-1 rounded text-xs font-noto-bold uppercase tracking-widest">Floor {floor}</div>
                                                    <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-900" />
                                                </div>

                                                <div className="space-y-10 pl-2">
                                                    {sortedBlocks.map(block => {
                                                        const cellRooms = occ.rooms.filter(r => String(r.floor) === String(floor) && String(r.block) === String(block))
                                                            .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

                                                        if (cellRooms.length === 0) return null;

                                                        return (
                                                            <div key={block} className="space-y-4">
                                                                <h4 className="text-[10px] font-noto-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                                    BLOCK {block}
                                                                    <div className="h-[1px] w-8 bg-slate-100/50" />
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    {cellRooms.map((room) => (
                                                                        <div key={room._id} className="relative group">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedRoomId(room._id);
                                                                                    setIsModalOpen(true);
                                                                                }}
                                                                                className={`calendar-card w-full h-[65px] p-2.5 text-left transition-all active:scale-95 rounded-xl border-2 ${room.status === 'vacant'
                                                                                    ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80'
                                                                                    : room.status === 'booked'
                                                                                        ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200/60 dark:border-red-800/40'
                                                                                        : room.status === 'held'
                                                                                            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40'
                                                                                            : room.status === 'suspended'
                                                                                                ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-800/40'
                                                                                                : 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-700/40'
                                                                                    }`}
                                                                            >
                                                                                <div className="flex justify-between items-start mb-1">
                                                                                    <span className={`text-base font-noto-bold leading-none ${room.status === 'booked' ? 'text-red-900 dark:text-red-400' :
                                                                                        room.status === 'held' ? 'text-amber-900 dark:text-amber-400' :
                                                                                            'text-foreground'
                                                                                        }`}>{room.roomNumber}</span>
                                                                                    <div className={`h-2 w-2 rounded-full ${room.status === 'vacant' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                                                                                        room.status === 'booked' ? 'bg-red-500' :
                                                                                            room.status === 'held' ? 'bg-amber-500' :
                                                                                                room.status === 'suspended' ? 'bg-purple-500 font-noto-bold' :
                                                                                                    'bg-slate-400'
                                                                                        }`} />
                                                                                </div>
                                                                                <div className={`text-[7px] font-noto-bold uppercase tracking-widest mt-2 opacity-60 font-noto-black ${room.status === 'booked' ? 'text-red-700/60 dark:text-red-400/60' :
                                                                                    room.status === 'held' ? 'text-amber-700/60 dark:text-amber-400/60' :
                                                                                        'text-muted-foreground'
                                                                                    }`}>
                                                                                    {room.status === 'suspended' ? 'BLOCKED' : room.status === 'maintenance' ? 'MAINTENANCE' : 'UNIT RECORD'}
                                                                                </div>
                                                                                {room.status === 'suspended' && room.suspensionRecord?.startDate && (
                                                                                    <div className="text-[6.5px] font-noto-bold text-purple-600 dark:text-purple-400 mt-1 uppercase leading-none">
                                                                                        {new Date(room.suspensionRecord.startDate).toLocaleDateString()} - {room.suspensionRecord.endDate ? new Date(room.suspensionRecord.endDate).toLocaleDateString() : 'IND.'}
                                                                                    </div>
                                                                                )}
                                                                                {room.status === 'maintenance' && room.maintenanceSchedule?.startDate && (
                                                                                    <div className="text-[6.5px] font-noto-bold text-slate-500 dark:text-slate-400 mt-1 uppercase leading-none">
                                                                                        {new Date(room.maintenanceSchedule.startDate).toLocaleDateString()} - {room.maintenanceSchedule.endDate ? new Date(room.maintenanceSchedule.endDate).toLocaleDateString() : 'IND.'}
                                                                                    </div>
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Bottom Legend Ledger */}
            {!loading && rooms.length > 0 && (
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:flex lg:flex-wrap items-center justify-center gap-y-4 gap-x-6 sm:gap-8 py-6 sm:py-6 border-2 border-slate-300 dark:border-slate-800 bg-muted/5 px-6 sm:px-8 rounded-2xl mt-12 shadow-md">
                    <span className="text-[9px] font-noto-bold text-[#004A99] dark:text-cyan-500 uppercase tracking-[0.4em] border-r-2 border-slate-300 dark:border-slate-800 pr-8 hidden lg:block">Status Legend</span>
                    {[
                        { label: 'Available / Vacant', dot: 'bg-emerald-500', fill: 'bg-white dark:bg-slate-900 border-slate-200' },
                        { label: 'Occupied / Booked', dot: 'bg-red-500', fill: 'bg-red-50/70 dark:bg-red-950/20 border-red-200/60' },
                        { label: 'Requisition Held', dot: 'bg-amber-500', fill: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60' },
                        { label: 'Official Block', dot: 'bg-purple-500', fill: 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200/60' },
                        { label: 'Maintenance / Service', dot: 'bg-slate-400', fill: 'bg-slate-100 dark:bg-slate-800/30 border-slate-200/60' }
                    ].map((item, idx) => (
                        <div key={item.label} className={`flex items-center gap-2 group transition-all ${idx === 4 ? 'xs:col-span-2 xs:justify-self-center lg:col-auto' : ''}`}>
                            <div className={`h-6 w-10 rounded-md ${item.fill} border flex items-center justify-center relative overflow-hidden shadow-sm px-1.5`}>
                                <div className={`h-1.5 w-1.5 rounded-full ${item.dot} shadow-sm`} />
                            </div>
                            <span className="text-[9px] font-noto-bold text-foreground uppercase tracking-widest whitespace-nowrap">{item.label}</span>
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
