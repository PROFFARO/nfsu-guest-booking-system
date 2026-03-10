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
import { motion, AnimatePresence } from 'framer-motion';
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
    const canManage = user?.role === 'admin' || user?.role === 'staff';

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

    // Bulk delete state
    const [selectedRoomIds, setSelectedRoomIds] = useState([]);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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
            await api.rooms.delete(selectedRoomIds[0] || selectedRoom._id);
            toast.success('Room deleted successfully');
            setDeleteOpen(false);
            fetchRooms();
        } catch (err) {
            toast.error(err.message || 'Failed to delete room');
        } finally { setSaving(false); }
    };

    const toggleSelection = (roomId) => {
        setSelectedRoomIds(prev =>
            prev.includes(roomId)
                ? prev.filter(id => id !== roomId)
                : [...prev, roomId]
        );
    };

    const toggleAllSelection = () => {
        if (selectedRoomIds.length === rooms.length && rooms.length > 0) {
            setSelectedRoomIds([]);
        } else {
            setSelectedRoomIds(rooms.map(r => r._id));
        }
    };

    const handleBulkDelete = async () => {
        setSaving(true);
        try {
            await api.rooms.bulkDelete(selectedRoomIds);
            toast.success(`${selectedRoomIds.length} rooms deleted successfully`);
            setSelectedRoomIds([]);
            setBulkDeleteOpen(false);
            fetchRooms();
        } catch (err) {
            toast.error(err.message || 'Failed to delete rooms');
        } finally {
            setSaving(false);
        }
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
        <div className="grid gap-6 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="roomNumber" className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em]">Room Number *</Label>
                    <Input
                        id="roomNumber"
                        placeholder="e.g. 101"
                        value={form.roomNumber}
                        onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                        className={`rounded-md border-2 border-border bg-background h-12 px-4 focus:border-[#0056b3] transition-all ${errors.roomNumber ? 'border-red-500' : ''}`}
                    />
                    {errors.roomNumber && <p className="text-[11px] font-noto-medium text-red-500">{errors.roomNumber}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pricePerNight" className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em]">Price / Night (₹) *</Label>
                    <Input
                        id="pricePerNight"
                        type="number"
                        placeholder="1500"
                        min="0"
                        value={form.pricePerNight}
                        onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
                        className={`rounded-md border-2 border-border bg-background h-12 px-4 focus:border-[#0056b3] transition-all ${errors.pricePerNight ? 'border-red-500' : ''}`}
                    />
                    {errors.pricePerNight && <p className="text-[11px] font-noto-medium text-red-500">{errors.pricePerNight}</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em]">Room Type *</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                        <SelectTrigger className={`rounded-md border-2 border-border bg-background h-12 focus:ring-0 focus:border-[#0056b3] transition-all ${errors.type ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-md border-2 border-border">
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="double">Double</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em]">Floor *</Label>
                    <Select value={form.floor} onValueChange={(v) => setForm({ ...form, floor: v })}>
                        <SelectTrigger className={`rounded-md border-2 border-border bg-background h-12 focus:ring-0 focus:border-[#0056b3] transition-all ${errors.floor ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select floor" />
                        </SelectTrigger>
                        <SelectContent className="rounded-md border-2 border-border">
                            {['1', '2', '3', '4', '5', '6'].map(f => <SelectItem key={f} value={f}>Floor {f}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em]">Block *</Label>
                    <Select value={form.block} onValueChange={(v) => setForm({ ...form, block: v })}>
                        <SelectTrigger className={`rounded-md border-2 border-border bg-background h-12 focus:ring-0 focus:border-[#0056b3] transition-all ${errors.block ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select block" />
                        </SelectTrigger>
                        <SelectContent className="rounded-md border-2 border-border">
                            {['A', 'B', 'C', 'D', 'E', 'F'].map(b => <SelectItem key={b} value={b}>Block {b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-3">
                <Label className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em]">Facilities</Label>
                <div className="flex flex-wrap gap-2.5">
                    {FACILITIES.map(fac => (
                        <button
                            key={fac}
                            type="button"
                            onClick={() => toggleFacility(fac)}
                            className={`rounded-md border-2 px-4 py-2 text-[10px] font-noto-bold uppercase tracking-widest transition-all ${form.facilities.includes(fac)
                                ? 'border-[#0056b3] bg-[#0056b3]/10 text-[#0056b3] dark:border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400 shadow-sm'
                                : 'border-slate-200 dark:border-slate-800 bg-background text-muted-foreground hover:bg-muted hover:border-slate-300'
                                }`}
                        >
                            {fac}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description" className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em]">Description</Label>
                <Textarea
                    id="description"
                    placeholder="Provide a detailed room description..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    maxLength={500}
                    rows={4}
                    className={`rounded-md border-2 border-border bg-background p-4 focus:border-[#0056b3] transition-all resize-none ${errors.description ? 'border-red-500' : ''}`}
                />
                <p className="text-[10px] text-muted-foreground font-noto-bold uppercase tracking-tighter text-right opacity-60">{form.description.length} / 500</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="notes" className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em]">Staff Internal Notes</Label>
                <Textarea
                    id="notes"
                    placeholder="Administrative or maintenance notes..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    maxLength={1000}
                    rows={2}
                    className="rounded-md border-2 border-border bg-background p-4 focus:border-[#0056b3] transition-all resize-none"
                />
                <p className="text-[10px] text-muted-foreground font-noto-bold uppercase tracking-tighter text-right opacity-60">{form.notes.length} / 1000</p>
            </div>

            <div className="space-y-3 pt-2">
                <Label className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em]">Room Media Inventory</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="h-44 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center relative bg-muted/20 hover:bg-muted/40 hover:border-[#0056b3] transition-all cursor-pointer group overflow-hidden">
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
                        <div className="text-center p-6">
                            <Plus className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3 group-hover:text-[#0056b3] transition-colors" />
                            <p className="text-xs font-noto-bold text-foreground">Add Institutional Assets</p>
                            <p className="text-[9px] font-noto-medium text-muted-foreground mt-2 uppercase tracking-widest">JPEG, PNG, WEBP (Max 5MB)</p>
                        </div>
                    </div>
                    <div className="h-44 rounded-xl overflow-hidden bg-muted/10 border-2 border-slate-200 dark:border-slate-800 shadow-inner">
                        <ImageSlider images={form.images} autoPlay className="h-full w-full" />
                    </div>
                </div>
                {form.images?.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 mt-2">
                        {form.images.map((img, idx) => (
                            <div key={idx} className="relative group bg-muted/30 rounded-md px-3 py-2 flex items-center gap-3 border-2 border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:bg-muted">
                                <span className="text-[10px] max-w-[120px] truncate font-noto-bold text-muted-foreground uppercase tracking-tight">
                                    {img instanceof File ? img.name : img.filename}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
                                    }}
                                    className="text-red-500 hover:text-red-700 opacity-60 group-hover:opacity-100 focus:outline-none transition-opacity"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <DialogFooter className="gap-3 pt-6 border-t-2 border-slate-100 dark:border-slate-800 mt-6 flex-col sm:flex-row">
                <DialogClose asChild>
                    <Button variant="outline" className="rounded-md font-noto-bold text-[10px] uppercase tracking-[0.2em] h-12 flex-1 sm:flex-none">Cancel</Button>
                </DialogClose>
                <Button onClick={onSubmit} disabled={saving} className="rounded-md bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold text-[10px] uppercase tracking-[0.2em] h-12 px-8 flex-1 sm:flex-none shadow-lg">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitLabel}
                </Button>
            </DialogFooter>
        </div>
    );

    return (
        <div className="p-2 sm:p-4 md:p-6 max-w-full mx-auto space-y-4 sm:space-y-6 overflow-x-hidden box-border">
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

                {/* Bulk Actions Bar */}
                <AnimatePresence>
                    {canManage && selectedRoomIds.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-[#0056b3]/5 dark:bg-cyan-500/5 border border-[#0056b3]/20 dark:border-cyan-500/20 rounded-md p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm">
                                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                                    <div className="bg-[#0056b3] dark:bg-cyan-600 text-white rounded-full h-12 w-12 shrink-0 flex items-center justify-center font-noto-bold text-lg shadow-lg">
                                        {selectedRoomIds.length}
                                    </div>
                                    <div>
                                        <p className="font-noto-bold text-base text-foreground uppercase tracking-tight">Delete Active Room(s)</p>
                                        <p className="text-[11px] font-noto-medium text-muted-foreground mt-0.5 tracking-wide">Managing {selectedRoomIds.length} units from inventory.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedRoomIds([])}
                                        className="flex-1 md:flex-none h-11 px-5 text-[10px] font-noto-bold uppercase tracking-[0.2em] bg-background border-border hover:bg-muted"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setBulkDeleteOpen(true)}
                                        className="flex-1 md:flex-none h-11 px-6 text-[10px] font-noto-bold uppercase tracking-[0.2em] bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Bulk Delete
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                                        {canManage && (
                                            <TableHead className="w-[50px] font-noto-bold">
                                                <div className="flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-border bg-background transition-all accent-[#0056b3]"
                                                        checked={selectedRoomIds.length === rooms.length && rooms.length > 0}
                                                        onChange={toggleAllSelection}
                                                    />
                                                </div>
                                            </TableHead>
                                        )}
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
                                        <TableRow key={room._id} className={`border-border transition-colors ${selectedRoomIds.includes(room._id) ? 'bg-muted/50' : ''}`}>
                                            {canManage && (
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-border bg-background transition-all accent-[#0056b3]"
                                                            checked={selectedRoomIds.includes(room._id)}
                                                            onChange={() => toggleSelection(room._id)}
                                                        />
                                                    </div>
                                                </TableCell>
                                            )}
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
                                                    {canManage && (
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

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col p-0 rounded-2xl border-2 border-border bg-card shadow-2xl">
                        <DialogHeader className="p-4 sm:p-6 pb-0">
                            <DialogTitle className="flex items-center gap-3 font-noto-bold text-xl sm:text-2xl text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">
                                <Plus className="h-6 w-6 sm:h-7 sm:w-7" /> Add New Unit
                            </DialogTitle>
                            <DialogDescription className="font-noto-medium text-muted-foreground text-xs sm:text-sm mt-2">
                                Register a new unit into the official accommodations inventory.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar">
                            {renderRoomForm(handleCreate, "Register Unit")}
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col p-0 rounded-2xl border-2 border-border bg-card shadow-2xl">
                        <DialogHeader className="p-4 sm:p-6 pb-0">
                            <DialogTitle className="flex items-center gap-3 font-noto-bold text-xl sm:text-2xl text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">
                                <Pencil className="h-5 w-5 sm:h-6 sm:w-6" /> Edit Unit {selectedRoom?.roomNumber}
                            </DialogTitle>
                            <DialogDescription className="font-noto-medium text-muted-foreground text-xs sm:text-sm mt-2">
                                Update the official records for this unit.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar">
                            {renderRoomForm(handleUpdate, "Acknowledge Update")}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent className="sm:max-w-md rounded-2xl border-2 border-border bg-card shadow-2xl p-8">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 font-noto-bold text-2xl text-red-600 dark:text-red-500 uppercase tracking-tight">
                                <AlertTriangle className="h-7 w-7" /> Deactivate Unit
                            </DialogTitle>
                            <DialogDescription className="font-noto-medium text-muted-foreground text-sm mt-3 leading-relaxed">
                                You are about to deactivate room <strong className="text-foreground">{selectedRoom?.roomNumber}</strong>.
                                This record will be moved to the archive and will no longer be available for public requisition.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-3 pt-6 mt-4">
                            <DialogClose asChild>
                                <Button variant="outline" className="rounded-md font-noto-bold text-[10px] uppercase tracking-widest h-12 px-6">Abort</Button>
                            </DialogClose>
                            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="rounded-md bg-red-600 hover:bg-red-700 text-white font-noto-bold text-[10px] uppercase tracking-widest h-12 px-8 shadow-lg">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Deletion
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Maintenance Scheduling Dialog */}
                <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
                    <DialogContent className="sm:max-w-md rounded-2xl border-2 border-border bg-card shadow-2xl p-8">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 font-noto-bold text-2xl text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">
                                <Wrench className="h-7 w-7" /> Protocol Scheduled
                            </DialogTitle>
                            <DialogDescription className="font-noto-medium text-muted-foreground text-sm mt-3">
                                Define the maintenance window for Unit <strong>{selectedRoom?.roomNumber}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-noto-bold uppercase tracking-[0.2em] text-muted-foreground">Start Date *</Label>
                                    <Input type="date" value={maintForm.startDate} onChange={(e) => setMaintForm(p => ({ ...p, startDate: e.target.value }))} className="rounded-md border-2 border-border h-11" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-noto-bold uppercase tracking-[0.2em] text-muted-foreground">End Date *</Label>
                                    <Input type="date" value={maintForm.endDate} onChange={(e) => setMaintForm(p => ({ ...p, endDate: e.target.value }))} className="rounded-md border-2 border-border h-11" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-noto-bold uppercase tracking-[0.2em] text-muted-foreground">Reason / Directive</Label>
                                <Textarea
                                    value={maintForm.reason}
                                    onChange={(e) => setMaintForm(p => ({ ...p, reason: e.target.value }))}
                                    placeholder="e.g. Plumbing deep-clean, lighting audit..."
                                    className="rounded-md border-2 border-border p-4 resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-3 pt-6 mt-4">
                            <DialogClose asChild>
                                <Button variant="outline" className="rounded-md font-noto-bold text-[10px] uppercase tracking-widest h-12 px-6">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleScheduleMaintenance} disabled={saving} className="bg-[#0056b3] hover:bg-[#004494] text-white rounded-md font-noto-bold text-[10px] uppercase tracking-widest h-12 px-8 shadow-lg">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Schedule
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Bulk Delete Confirmation Dialog */}
                <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                    <DialogContent className="sm:max-w-md rounded-2xl border-2 border-border bg-card shadow-2xl p-8">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 font-noto-bold text-2xl text-red-600 dark:text-red-500 uppercase tracking-tight">
                                <AlertTriangle className="h-7 w-7" /> Mass Deactivation
                            </DialogTitle>
                            <DialogDescription className="font-noto-medium text-muted-foreground text-sm mt-3 leading-relaxed">
                                CRITICAL: You are about to deactivate <strong className="text-foreground">{selectedRoomIds.length}</strong> room units simultaneously.
                                This will remove these records from the active inventory and terminate their availability. This operation should be treated with utmost scrutiny.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-md p-4 mt-4">
                            <p className="font-noto-bold text-xs text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5" /> High Impact Action
                            </p>
                            <p className="text-[11px] text-red-500/80 font-noto-medium mt-1">
                                This action is logged in the central auditing ledger. Please ensure you have verification for this bulk operation.
                            </p>
                        </div>
                        <DialogFooter className="gap-3 pt-6 mt-4">
                            <DialogClose asChild>
                                <Button variant="outline" className="rounded-md font-noto-bold text-[10px] uppercase tracking-widest h-12 px-6">Abort Operation</Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={handleBulkDelete}
                                disabled={saving}
                                className="rounded-md bg-red-600 hover:bg-red-700 text-white font-noto-bold text-[10px] uppercase tracking-widest h-12 px-8 shadow-lg shadow-red-500/20"
                            >
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Mass Deactivation
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </motion.div>
        </div>
    );
}
