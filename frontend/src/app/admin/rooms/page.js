'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { compressImage } from '@/lib/imageUtils';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { BedDouble, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Wrench, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ImageSlider } from '@/components/ui/ImageSlider';

const statusColors = {
    vacant: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    booked: 'bg-red-500/10 text-red-500 border-red-500/20',
    held: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    maintenance: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const FACILITIES = ['Gym', 'WiFi', 'AC', 'TV', 'Refrigerator', 'Balcony', 'Parking'];

const emptyRoomForm = {
    roomNumber: '',
    type: 'single',
    floor: '1',
    block: 'A',
    pricePerNight: '',
    description: '',
    facilities: [],
    notes: '',
    images: [],
};

export default function RoomManagementPage() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const isAdmin = user?.role === 'admin';

    const [rooms, setRooms] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ type: '', floor: '', block: '', status: '', page: 1, limit: 20 });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Dialog states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [form, setForm] = useState({ ...emptyRoomForm });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Maintenance dialog state
    const [maintOpen, setMaintOpen] = useState(false);
    const [maintForm, setMaintForm] = useState({ startDate: '', endDate: '', reason: '' });

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const params = {};
            Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
            if (debouncedSearch) params.search = debouncedSearch;
            const res = await api.rooms.list(params);
            setRooms(res.data.rooms);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load rooms'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRooms(); }, [filters, debouncedSearch]);

    // Socket.io Real-time updates
    useEffect(() => {
        if (!socket) return;
        const handler = (data) => {
            setRooms((prev) => prev.map((room) =>
                room._id === data.roomId ? { ...room, status: data.status } : room
            ));
        };
        socket.on('roomStatusUpdated', handler);
        return () => socket.off('roomStatusUpdated', handler);
    }, [socket]);

    // --- Validation ---
    const validate = () => {
        const e = {};
        if (!form.roomNumber.trim()) e.roomNumber = 'Room number is required';
        if (!form.pricePerNight || Number(form.pricePerNight) <= 0) e.pricePerNight = 'Enter a valid price';
        if (!form.type) e.type = 'Room type is required';
        if (!form.floor) e.floor = 'Floor is required';
        if (!form.block) e.block = 'Block is required';
        if (form.description && form.description.length > 500) e.description = 'Max 500 characters';
        if (form.notes && form.notes.length > 1000) e.notes = 'Max 1000 characters';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // --- Handlers ---
    const handleStatusChange = async (roomId, newStatus) => {
        try {
            await api.rooms.updateStatus(roomId, newStatus);
            toast.success('Room status updated');
            fetchRooms();
        } catch (err) {
            toast.error(err.message || 'Failed to update');
        }
    };

    const handleScheduleMaintenance = async () => {
        if (!maintForm.startDate || !maintForm.endDate) {
            toast.error('Start and end dates are required');
            return;
        }
        setSaving(true);
        try {
            await api.rooms.scheduleMaintenance(selectedRoom._id, maintForm);
            toast.success(`Maintenance scheduled for Room ${selectedRoom.roomNumber}`);
            setMaintOpen(false);
            fetchRooms();
        } catch (err) {
            toast.error(err.message || 'Failed to schedule maintenance');
        } finally { setSaving(false); }
    };

    const handleClearMaintenance = async (roomId) => {
        try {
            await api.rooms.clearMaintenance(roomId);
            toast.success('Maintenance cleared. Room restored.');
            fetchRooms();
        } catch (err) {
            toast.error(err.message || 'Failed to clear maintenance');
        }
    };

    const openCreate = () => {
        setForm({ ...emptyRoomForm });
        setErrors({});
        setCreateOpen(true);
    };

    const openEdit = (room) => {
        setSelectedRoom(room);
        setForm({
            roomNumber: room.roomNumber,
            type: room.type,
            floor: room.floor,
            block: room.block,
            pricePerNight: String(room.pricePerNight),
            description: room.description || '',
            facilities: room.facilities || [],
            notes: room.notes || '',
            images: room.images || [],
        });
        setErrors({});
        setEditOpen(true);
    };

    const openDelete = (room) => {
        setSelectedRoom(room);
        setDeleteOpen(true);
    };

    const handleCreate = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const formData = new FormData();
            // Process and compress images
            const compressedImages = await Promise.all(
                (form.images || []).map(async (item) => {
                    if (item instanceof File) {
                        try {
                            return await compressImage(item);
                        } catch (err) {
                            console.error('Compression failed for', item.name, err);
                            return item; // Fallback to original
                        }
                    }
                    return item;
                })
            );

            Object.entries(form).forEach(([key, value]) => {
                if (key === 'facilities') {
                    formData.append(key, JSON.stringify(value));
                } else if (key === 'images') {
                    compressedImages.forEach(file => {
                        if (file instanceof File) formData.append('images', file);
                    });
                } else if (key === 'pricePerNight') {
                    formData.append(key, Number(value));
                } else {
                    formData.append(key, value);
                }
            });

            await api.rooms.create(formData);
            toast.success('Room created successfully');
            setCreateOpen(false);
            fetchRooms();
        } catch (err) {
            toast.error(err.message || 'Failed to create room');
        } finally { setSaving(false); }
    };

    const handleUpdate = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const formData = new FormData();
            const existingImages = [];

            // Process and compress images
            const compressedImages = await Promise.all(
                (form.images || []).map(async (item) => {
                    if (item instanceof File) {
                        try {
                            return await compressImage(item);
                        } catch (err) {
                            console.error('Compression failed for', item.name, err);
                            return item; // Fallback to original
                        }
                    }
                    return item;
                })
            );

            Object.entries(form).forEach(([key, value]) => {
                if (key === 'facilities') {
                    formData.append(key, JSON.stringify(value));
                } else if (key === 'images') {
                    compressedImages.forEach(item => {
                        if (item instanceof File) {
                            formData.append('images', item);
                        } else {
                            existingImages.push(item);
                        }
                    });
                    formData.append('existingImages', JSON.stringify(existingImages));
                } else if (key === 'pricePerNight') {
                    formData.append(key, Number(value));
                } else {
                    formData.append(key, value);
                }
            });

            await api.rooms.update(selectedRoom._id, formData);
            toast.success('Room updated successfully');
            setEditOpen(false);
            fetchRooms();
        } catch (err) {
            toast.error(err.message || 'Failed to update room');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            await api.rooms.delete(selectedRoom._id);
            toast.success('Room deleted successfully');
            setDeleteOpen(false);
            fetchRooms();
        } catch (err) {
            toast.error(err.message || 'Failed to delete room');
        } finally { setSaving(false); }
    };

    const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value === 'all' ? '' : value, page: 1 }));

    const toggleFacility = (fac) => {
        setForm(prev => ({
            ...prev,
            facilities: prev.facilities.includes(fac)
                ? prev.facilities.filter(f => f !== fac)
                : [...prev.facilities, fac]
        }));
    };

    // --- Room Form Renderer ---
    const renderRoomForm = (onSubmit, submitLabel) => (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="roomNumber" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Room Number *</Label>
                    <Input
                        id="roomNumber"
                        placeholder="e.g. 101"
                        value={form.roomNumber}
                        onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                        className={`rounded-sm border-border bg-background h-10 ${errors.roomNumber ? 'border-red-500' : ''}`}
                    />
                    {errors.roomNumber && <p className="text-[11px] font-noto-medium text-red-500">{errors.roomNumber}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="pricePerNight" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Price / Night (₹) *</Label>
                    <Input
                        id="pricePerNight"
                        type="number"
                        placeholder="1500"
                        min="0"
                        value={form.pricePerNight}
                        onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
                        className={`rounded-sm border-border bg-background h-10 ${errors.pricePerNight ? 'border-red-500' : ''}`}
                    />
                    {errors.pricePerNight && <p className="text-[11px] font-noto-medium text-red-500">{errors.pricePerNight}</p>}
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Room Type *</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                        <SelectTrigger className={`rounded-sm border-border bg-background h-10 ${errors.type ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="double">Double</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Floor *</Label>
                    <Select value={form.floor} onValueChange={(v) => setForm({ ...form, floor: v })}>
                        <SelectTrigger className={`rounded-sm border-border bg-background h-10 ${errors.floor ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select floor" />
                        </SelectTrigger>
                        <SelectContent>
                            {['1', '2', '3', '4', '5', '6'].map(f => <SelectItem key={f} value={f}>Floor {f}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Block *</Label>
                    <Select value={form.block} onValueChange={(v) => setForm({ ...form, block: v })}>
                        <SelectTrigger className={`rounded-sm border-border bg-background h-10 ${errors.block ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select block" />
                        </SelectTrigger>
                        <SelectContent>
                            {['A', 'B', 'C', 'D', 'E', 'F'].map(b => <SelectItem key={b} value={b}>Block {b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Facilities</Label>
                <div className="flex flex-wrap gap-2">
                    {FACILITIES.map(fac => (
                        <button
                            key={fac}
                            type="button"
                            onClick={() => toggleFacility(fac)}
                            className={`rounded-sm border px-3 py-1.5 text-[11px] font-noto-medium uppercase tracking-wider transition-colors ${form.facilities.includes(fac)
                                ? 'border-[#0056b3] bg-[#0056b3]/10 text-[#0056b3] dark:border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400'
                                : 'border-border bg-background text-muted-foreground hover:bg-muted'
                                }`}
                        >
                            {fac}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Description</Label>
                <Textarea
                    id="description"
                    placeholder="Optional room description (max 500 chars)"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    maxLength={500}
                    rows={3}
                    className={`rounded-sm border-border bg-background ${errors.description ? 'border-red-500' : ''}`}
                />
                <p className="text-[10px] text-muted-foreground font-noto-medium text-right">{form.description.length}/500</p>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Internal Notes</Label>
                <Textarea
                    id="notes"
                    placeholder="Staff-only notes (max 1000 chars)"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    maxLength={1000}
                    rows={2}
                    className="rounded-sm border-border bg-background"
                />
                <p className="text-[10px] text-muted-foreground font-noto-medium text-right">{form.notes.length}/1000</p>
            </div>

            <div className="space-y-3 pt-2">
                <Label className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Room Images</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="h-40 border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center relative bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group">
                        <input
                            type="file"
                            multiple
                            accept="image/jpeg, image/png, image/webp"
                            onChange={(e) => {
                                if (e.target.files) {
                                    const newFiles = Array.from(e.target.files);
                                    setForm(prev => ({ ...prev, images: [...(prev.images || []), ...newFiles] }));
                                }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="text-center p-4">
                            <Plus className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2 group-hover:text-primary transition-colors" />
                            <p className="text-sm font-noto-medium text-foreground">Add Images</p>
                            <p className="text-[10px] text-muted-foreground mt-1">JPEG, PNG, WEBP allowed</p>
                        </div>
                    </div>
                    <div className="h-40 rounded-sm overflow-hidden bg-muted/10 border border-border">
                        <ImageSlider images={form.images} autoPlay className="h-full w-full" />
                    </div>
                </div>
                {form.images?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {form.images.map((img, idx) => (
                            <div key={idx} className="relative group bg-muted rounded-sm px-2 py-1 flex items-center gap-2 border border-border">
                                <span className="text-[10px] max-w-25 truncate font-noto-medium">
                                    {img instanceof File ? img.name : img.filename}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
                                    }}
                                    className="text-red-500 hover:text-red-700 opacity-50 group-hover:opacity-100 focus:outline-none"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <DialogFooter className="gap-2 pt-4 border-t border-border mt-2">
                <DialogClose asChild>
                    <Button variant="outline" className="rounded-sm font-noto-medium h-9 px-4">Cancel</Button>
                </DialogClose>
                <Button onClick={onSubmit} disabled={saving} className="rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-medium h-9 px-6 shadow-sm">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitLabel}
                </Button>
            </DialogFooter>
        </div>
    );

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-full mx-auto space-y-4 sm:space-y-6 overflow-hidden box-border">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-noto-bold text-foreground">Room Management</h1>
                        <p className="text-sm font-noto-medium text-muted-foreground mt-1 tracking-wide">Create, edit, and manage all rooms</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={fetchRooms}
                            disabled={loading}
                            variant="outline"
                            className="border-2 border-border flex items-center gap-2 uppercase text-[10px] font-noto-bold tracking-widest h-10 px-4 rounded-sm bg-card hover:bg-muted"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button onClick={openCreate} className="gap-2 bg-[#0056b3] text-white hover:bg-[#004494] font-noto-medium h-10 px-4 rounded-sm shadow-sm">
                            <Plus className="h-4 w-4" /> Add Room
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-col gap-4">
                    {/* Top Row: Search */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                        <div className="relative w-full sm:max-w-md flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by room number..."
                                className="pl-9 text-xs border-2 border-border bg-background h-10 rounded-sm font-noto-medium w-full"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); updateFilter('page', 1); }}
                            />
                        </div>
                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto shrink-0">
                            <div className="text-[11px] font-noto-bold text-muted-foreground uppercase tracking-widest border-2 border-border px-3 py-2 bg-muted/30 rounded-sm h-10 flex items-center flex-1 sm:flex-none justify-center whitespace-nowrap">
                                Total Rooms: {pagination?.totalRooms || 0}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Dropdowns */}
                    <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full">
                        <Select value={filters.type || 'all'} onValueChange={(v) => updateFilter('type', v)}>
                            <SelectTrigger className="w-full sm:w-[130px] h-10 rounded-sm border-2 border-border bg-background font-noto-bold text-[10px] sm:text-xs uppercase tracking-widest"><SelectValue placeholder="TYPE" /></SelectTrigger>
                            <SelectContent className="border-2 border-border rounded-sm">
                                <SelectItem value="all" className="font-noto-bold text-xs uppercase tracking-widest">All Types</SelectItem>
                                <SelectItem value="single" className="font-noto-bold text-xs uppercase tracking-widest">Single</SelectItem>
                                <SelectItem value="double" className="font-noto-bold text-xs uppercase tracking-widest">Double</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.floor || 'all'} onValueChange={(v) => updateFilter('floor', v)}>
                            <SelectTrigger className="w-full sm:w-[130px] h-10 rounded-sm border-2 border-border bg-background font-noto-bold text-[10px] sm:text-xs uppercase tracking-widest"><SelectValue placeholder="FLOOR" /></SelectTrigger>
                            <SelectContent className="border-2 border-border rounded-sm">
                                <SelectItem value="all" className="font-noto-bold text-xs uppercase tracking-widest">All Floors</SelectItem>
                                {['1', '2', '3', '4', '5', '6'].map(f => <SelectItem key={f} value={f} className="font-noto-bold text-xs uppercase tracking-widest">Floor {f}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.block || 'all'} onValueChange={(v) => updateFilter('block', v)}>
                            <SelectTrigger className="w-full sm:w-[130px] h-10 rounded-sm border-2 border-border bg-background font-noto-bold text-[10px] sm:text-xs uppercase tracking-widest"><SelectValue placeholder="BLOCK" /></SelectTrigger>
                            <SelectContent className="border-2 border-border rounded-sm">
                                <SelectItem value="all" className="font-noto-bold text-xs uppercase tracking-widest">All Blocks</SelectItem>
                                {['A', 'B', 'C', 'D', 'E', 'F'].map(b => <SelectItem key={b} value={b} className="font-noto-bold text-xs uppercase tracking-widest">Block {b}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.status || 'all'} onValueChange={(v) => updateFilter('status', v)}>
                            <SelectTrigger className="w-full sm:w-[140px] h-10 rounded-sm border-2 border-border bg-background font-noto-bold text-[10px] sm:text-xs uppercase tracking-widest"><SelectValue placeholder="STATUS" /></SelectTrigger>
                            <SelectContent className="border-2 border-border rounded-sm">
                                <SelectItem value="all" className="font-noto-bold text-xs uppercase tracking-widest">All Status</SelectItem>
                                <SelectItem value="vacant" className="font-noto-bold text-xs uppercase tracking-widest">Vacant</SelectItem>
                                <SelectItem value="booked" className="font-noto-bold text-xs uppercase tracking-widest">Booked</SelectItem>
                                <SelectItem value="held" className="font-noto-bold text-xs uppercase tracking-widest">Held</SelectItem>
                                <SelectItem value="maintenance" className="font-noto-bold text-xs uppercase tracking-widest">Maintenance</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <Card className="border border-border bg-card shadow-sm rounded-sm">
                    <CardContent className="p-0 overflow-x-auto">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <BedDouble className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <p className="text-lg font-semibold">No rooms found</p>
                                <p className="text-sm text-muted-foreground">Try adjusting your filters or add a new room</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border">
                                        <TableHead className="font-noto-bold text-muted-foreground w-[100px]">Room</TableHead>
                                        <TableHead className="font-noto-bold text-muted-foreground">Type</TableHead>
                                        <TableHead className="font-noto-bold text-muted-foreground">Floor</TableHead>
                                        <TableHead className="font-noto-bold text-muted-foreground">Block</TableHead>
                                        <TableHead className="font-noto-bold text-muted-foreground">Price</TableHead>
                                        <TableHead className="font-noto-bold text-muted-foreground">Facilities</TableHead>
                                        <TableHead className="font-noto-bold text-muted-foreground">Status</TableHead>
                                        <TableHead className="text-right font-noto-bold text-muted-foreground">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rooms.map((room) => (
                                        <TableRow key={room._id} className="border-border">
                                            <TableCell className="font-noto-bold text-sm text-foreground">{room.roomNumber}</TableCell>
                                            <TableCell className="capitalize font-noto-medium text-sm text-muted-foreground">{room.type}</TableCell>
                                            <TableCell className="font-noto-medium text-sm text-muted-foreground">{room.floor}</TableCell>
                                            <TableCell className="font-noto-medium text-sm text-muted-foreground">{room.block}</TableCell>
                                            <TableCell className="font-noto-bold text-sm text-[#0056b3] dark:text-cyan-500 tabular-nums">₹{room.pricePerNight}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[140px]">
                                                    {(room.facilities || []).slice(0, 3).map(f => (
                                                        <Badge key={f} variant="outline" className="text-[10px] font-noto-medium uppercase tracking-wider px-1.5 py-0 border-border bg-muted/30">{f}</Badge>
                                                    ))}
                                                    {(room.facilities || []).length > 3 && (
                                                        <Badge variant="outline" className="text-[10px] font-noto-bold px-1.5 py-0 border-border bg-muted/30">
                                                            +{room.facilities.length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select value={room.status} onValueChange={(v) => handleStatusChange(room._id, v)}>
                                                    <SelectTrigger className={`w-[130px] h-8 text-xs font-noto-bold uppercase tracking-wider rounded-sm border-transparent ${room.status === 'vacant' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                        room.status === 'booked' ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400' :
                                                            room.status === 'held' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-400'
                                                        }`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent align="end" side="bottom">
                                                        <SelectItem value="vacant">Vacant</SelectItem>
                                                        <SelectItem value="booked">Booked</SelectItem>
                                                        <SelectItem value="held">Held</SelectItem>
                                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => openEdit(room)} className="h-7 px-2 text-xs font-noto-medium gap-1 rounded-sm border-border bg-background hover:bg-muted/50">
                                                        <Pencil className="h-3 w-3" /> Edit
                                                    </Button>
                                                    {/* Maintenance buttons for both admin and staff */}
                                                    {room.maintenanceSchedule?.startDate ? (
                                                        <Button variant="outline" size="sm" onClick={() => handleClearMaintenance(room._id)} className="h-7 px-2 text-xs font-noto-medium gap-1 rounded-sm border-orange-500 text-orange-600 hover:bg-orange-600 hover:text-white">
                                                            <Wrench className="h-3 w-3" /> Clear Maint.
                                                        </Button>
                                                    ) : (
                                                        <Button variant="outline" size="sm" onClick={() => { setSelectedRoom(room); setMaintForm({ startDate: '', endDate: '', reason: '' }); setMaintOpen(true); }} className="h-7 px-2 text-xs font-noto-medium gap-1 rounded-sm border-slate-500 text-slate-600 dark:text-slate-400 hover:bg-slate-600 hover:text-white">
                                                            <Wrench className="h-3 w-3" /> Maint.
                                                        </Button>
                                                    )}
                                                    {isAdmin && (
                                                        <Button variant="destructive" size="sm" onClick={() => openDelete(room)} className="h-7 px-2 text-xs font-noto-medium gap-1 rounded-sm bg-red-600 hover:bg-red-700 text-white">
                                                            <Trash2 className="h-3 w-3" /> Delete
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
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

                {/* Create Room Dialog */}
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm border-border bg-card shadow-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 font-noto-bold text-xl text-foreground">
                                <Plus className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" /> Add New Room
                            </DialogTitle>
                            <DialogDescription className="font-noto-medium text-muted-foreground text-sm mt-1">
                                Fill in the details to create a new room. Fields marked * are required.
                            </DialogDescription>
                        </DialogHeader>
                        {renderRoomForm(handleCreate, "Create Room")}
                    </DialogContent>
                </Dialog>

                {/* Edit Room Dialog */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm border-border bg-card shadow-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 font-noto-bold text-xl text-foreground">
                                <Pencil className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" /> Edit Room {selectedRoom?.roomNumber}
                            </DialogTitle>
                            <DialogDescription className="font-noto-medium text-muted-foreground text-sm mt-1">
                                Update the room information. Fields marked * are required.
                            </DialogDescription>
                        </DialogHeader>
                        {renderRoomForm(handleUpdate, "Save Changes")}
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent className="max-w-sm rounded-sm border-border bg-card shadow-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 font-noto-bold text-xl text-red-600 dark:text-red-500">
                                <AlertTriangle className="h-5 w-5" /> Delete Room
                            </DialogTitle>
                            <DialogDescription className="font-noto-medium text-muted-foreground text-sm mt-1">
                                Are you sure you want to delete room <strong className="text-foreground">{selectedRoom?.roomNumber}</strong> (Block {selectedRoom?.block}, Floor {selectedRoom?.floor})?
                                This will deactivate the room and it won&apos;t appear in listings.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 pt-4">
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete Room
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Maintenance Scheduling Dialog */}
                <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
                    <DialogContent className="max-w-sm rounded-sm border-border bg-card shadow-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 font-noto-bold text-xl text-foreground">
                                <Wrench className="h-5 w-5 text-slate-500" /> Schedule Maintenance
                            </DialogTitle>
                            <DialogDescription className="font-noto-medium text-muted-foreground text-sm mt-1">
                                Set maintenance window for Room <strong>{selectedRoom?.roomNumber}</strong> (Block {selectedRoom?.block}, Floor {selectedRoom?.floor})
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div>
                                <Label className="text-xs font-noto-bold uppercase tracking-widest">Start Date *</Label>
                                <Input type="date" value={maintForm.startDate} onChange={(e) => setMaintForm(p => ({ ...p, startDate: e.target.value }))} className="mt-1 rounded-sm border-2 border-border" />
                            </div>
                            <div>
                                <Label className="text-xs font-noto-bold uppercase tracking-widest">End Date *</Label>
                                <Input type="date" value={maintForm.endDate} onChange={(e) => setMaintForm(p => ({ ...p, endDate: e.target.value }))} className="mt-1 rounded-sm border-2 border-border" />
                            </div>
                            <div>
                                <Label className="text-xs font-noto-bold uppercase tracking-widest">Reason</Label>
                                <Textarea value={maintForm.reason} onChange={(e) => setMaintForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Plumbing repair, deep cleaning..." className="mt-1 rounded-sm border-2 border-border" />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 pt-4">
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleScheduleMaintenance} disabled={saving} className="bg-[#0056b3] hover:bg-[#004494] text-white rounded-sm">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Schedule
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </motion.div>
        </div>
    );
}
