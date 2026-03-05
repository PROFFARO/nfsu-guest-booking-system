'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
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
import { BedDouble, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

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
};

export default function RoomManagementPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [rooms, setRooms] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ type: '', floor: '', status: '', page: 1, limit: 20 });

    // Dialog states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [form, setForm] = useState({ ...emptyRoomForm });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

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
            await api.rooms.create({
                ...form,
                pricePerNight: Number(form.pricePerNight),
            });
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
            await api.rooms.update(selectedRoom._id, {
                ...form,
                pricePerNight: Number(form.pricePerNight),
            });
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

    // --- Room Form Component ---
    const RoomForm = ({ onSubmit, submitLabel }) => (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="roomNumber">Room Number *</Label>
                    <Input
                        id="roomNumber"
                        placeholder="e.g. 101"
                        value={form.roomNumber}
                        onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                        className={errors.roomNumber ? 'border-destructive' : ''}
                    />
                    {errors.roomNumber && <p className="text-xs text-destructive">{errors.roomNumber}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pricePerNight">Price / Night (₹) *</Label>
                    <Input
                        id="pricePerNight"
                        type="number"
                        placeholder="1500"
                        min="0"
                        value={form.pricePerNight}
                        onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
                        className={errors.pricePerNight ? 'border-destructive' : ''}
                    />
                    {errors.pricePerNight && <p className="text-xs text-destructive">{errors.pricePerNight}</p>}
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Room Type *</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                        <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="double">Double</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Floor *</Label>
                    <Select value={form.floor} onValueChange={(v) => setForm({ ...form, floor: v })}>
                        <SelectTrigger className={errors.floor ? 'border-destructive' : ''}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {['1', '2', '3', '4', '5', '6'].map(f => <SelectItem key={f} value={f}>Floor {f}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Block *</Label>
                    <Select value={form.block} onValueChange={(v) => setForm({ ...form, block: v })}>
                        <SelectTrigger className={errors.block ? 'border-destructive' : ''}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {['A', 'B', 'C', 'D', 'E', 'F'].map(b => <SelectItem key={b} value={b}>Block {b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label>Facilities</Label>
                <div className="flex flex-wrap gap-2">
                    {FACILITIES.map(fac => (
                        <button
                            key={fac}
                            type="button"
                            onClick={() => toggleFacility(fac)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${form.facilities.includes(fac)
                                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                                : 'border-border text-muted-foreground hover:border-foreground/30'
                                }`}
                        >
                            {fac}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    placeholder="Optional room description (max 500 chars)"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    maxLength={500}
                    rows={3}
                    className={errors.description ? 'border-destructive' : ''}
                />
                <p className="text-xs text-muted-foreground">{form.description.length}/500</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                    id="notes"
                    placeholder="Staff-only notes (max 1000 chars)"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    maxLength={1000}
                    rows={2}
                />
            </div>
            <DialogFooter className="gap-2 pt-2">
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button variant="cta" onClick={onSubmit} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitLabel}
                </Button>
            </DialogFooter>
        </div>
    );

    return (
        <div className="p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Room Management</h1>
                        <p className="text-muted-foreground">Create, edit, and manage all rooms</p>
                    </div>
                    <Button variant="cta" onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Add Room
                    </Button>
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
                                    <TableRow>
                                        <TableHead>Room</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Floor</TableHead>
                                        <TableHead>Block</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Facilities</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rooms.map((room) => (
                                        <TableRow key={room._id}>
                                            <TableCell className="font-semibold">{room.roomNumber}</TableCell>
                                            <TableCell className="capitalize">{room.type}</TableCell>
                                            <TableCell>{room.floor}</TableCell>
                                            <TableCell>{room.block}</TableCell>
                                            <TableCell className="tabular-nums">₹{room.pricePerNight}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[140px]">
                                                    {(room.facilities || []).slice(0, 3).map(f => (
                                                        <Badge key={f} variant="secondary" className="text-[10px] px-1.5 py-0">{f}</Badge>
                                                    ))}
                                                    {(room.facilities || []).length > 3 && (
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                            +{room.facilities.length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select value={room.status} onValueChange={(v) => handleStatusChange(room._id, v)}>
                                                    <SelectTrigger className={`w-[140px] h-8 text-xs font-medium capitalize ${room.status === 'vacant' ? 'text-emerald-500' :
                                                        room.status === 'booked' ? 'text-red-500' :
                                                            room.status === 'held' ? 'text-amber-500' : 'text-slate-400'
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
                                                    <Button variant="outline" size="sm" onClick={() => openEdit(room)} className="h-7 px-2 text-xs gap-1">
                                                        <Pencil className="h-3 w-3" /> Edit
                                                    </Button>
                                                    {isAdmin && (
                                                        <Button variant="destructive" size="sm" onClick={() => openDelete(room)} className="h-7 px-2 text-xs gap-1">
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
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5 text-cyan-500" /> Add New Room
                            </DialogTitle>
                            <DialogDescription>
                                Fill in the details to create a new room. Fields marked * are required.
                            </DialogDescription>
                        </DialogHeader>
                        <RoomForm onSubmit={handleCreate} submitLabel="Create Room" />
                    </DialogContent>
                </Dialog>

                {/* Edit Room Dialog */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Pencil className="h-5 w-5 text-cyan-500" /> Edit Room {selectedRoom?.roomNumber}
                            </DialogTitle>
                            <DialogDescription>
                                Update the room information. Fields marked * are required.
                            </DialogDescription>
                        </DialogHeader>
                        <RoomForm onSubmit={handleUpdate} submitLabel="Save Changes" />
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="h-5 w-5" /> Delete Room
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete room <strong>{selectedRoom?.roomNumber}</strong> (Block {selectedRoom?.block}, Floor {selectedRoom?.floor})?
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
            </motion.div>
        </div>
    );
}
