'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Users, ChevronLeft, ChevronRight, Search, UserX, UserCheck, KeyRound, RotateCcw, RefreshCw, UserPlus, Trash2, User, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const roleColors = {
    admin: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-600',
    staff: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-600',
    user: 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-600',
};

export default function UserManagementPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const [newPassword, setNewPassword] = useState('');

    // CRUD States
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'user' });
    const [saving, setSaving] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;
            const res = await api.users.list(params);
            setUsers(res.data.users);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load users'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, [roleFilter, page]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    const handleResetSearch = () => {
        setSearch('');
        setPage(1);
        // We use an explicit call or rely on the dependency array if we change roleFilter/page
        // But for search we need to call it manually as search isn't in fetchUsers dependency
        setTimeout(() => {
            setLoading(true);
            api.users.list({ page: 1, limit: 15 }).then(res => {
                setUsers(res.data.users);
                setPagination(res.data.pagination);
                setLoading(false);
            });
        }, 0);
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.users.update(userId, { role: newRole });
            toast.success('User role updated');
            fetchUsers();
        } catch (err) { toast.error(err.message || 'Failed to update role'); }
    };

    const handleToggleActive = async (userId, isActive) => {
        try {
            if (isActive) {
                await api.users.deactivate(userId);
                toast.success('User deactivated');
            } else {
                await api.users.activate(userId);
                toast.success('User activated');
            }
            fetchUsers();
        } catch (err) { toast.error(err.message || 'Failed to update'); }
    };

    const handleResetPassword = async (userId) => {
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        try {
            await api.users.resetPassword(userId, newPassword);
            toast.success('Password reset');
            setNewPassword('');
        } catch (err) { toast.error(err.message || 'Failed to reset password'); }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.users.create(form);
            toast.success('Personnel registered successfully');
            setCreateOpen(false);
            setForm({ name: '', email: '', phone: '', password: '', role: 'user' });
            fetchUsers();
        } catch (err) {
            toast.error(err.message || 'Registration failed');
        } finally { setSaving(false); }
    };

    const handleDeleteUser = async () => {
        setSaving(true);
        try {
            await api.users.delete(selectedUser._id);
            toast.success('User permanently deleted');
            setDeleteOpen(false);
            fetchUsers();
        } catch (err) {
            toast.error(err.message || 'Deletion failed');
        } finally { setSaving(false); }
    };

    const openDelete = (u) => {
        setSelectedUser(u);
        setDeleteOpen(true);
    };

    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center p-20">
                <p className="text-muted-foreground">Admin access required</p>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-full mx-auto space-y-4 sm:space-y-6 overflow-hidden box-border">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-6 border-b-2 border-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h1 className="text-2xl font-noto-bold text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">Registered Personnel</h1>
                        <p className="mt-1 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                            Official System Access Directory
                        </p>
                    </div>
                    <Button 
                        onClick={() => {
                            setForm({ name: '', email: '', phone: '', password: '', role: 'user' });
                            setCreateOpen(true);
                        }}
                        className="rounded-sm bg-[#0056b3] hover:bg-[#004494] text-white font-noto-bold uppercase text-[10px] tracking-widest h-9 px-4 flex items-center gap-2"
                    >
                        <UserPlus className="h-4 w-4" />
                        <span>Register Personnel</span>
                    </Button>
                </div>

                <div className="mb-6 flex flex-col gap-4 bg-muted/5 p-3 rounded-sm border border-border/50 sm:bg-transparent sm:p-0 sm:border-0">
                    <div className="flex flex-col md:flex-row gap-3 w-full">
                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 flex-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search identification..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 rounded-sm border-2 border-border h-10 font-noto-medium text-sm focus-visible:ring-0 focus-visible:border-[#0056b3] transition-none placeholder:uppercase placeholder:font-noto-bold placeholder:text-[10px] placeholder:tracking-widest"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" className="flex-1 sm:flex-none rounded-sm bg-[#0056b3] hover:bg-[#004494] text-white font-noto-bold uppercase text-[10px] sm:text-xs tracking-wider h-10 px-6">
                                    Search
                                </Button>
                                <Button
                                    type="button"
                                    onClick={fetchUsers}
                                    disabled={loading}
                                    className="flex-1 sm:flex-none rounded-sm border-2 border-border h-10 px-4 flex items-center justify-center gap-2 font-noto-bold uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground bg-card"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    <span>Refresh</span>
                                </Button>
                                {search && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleResetSearch}
                                        className="flex-1 sm:flex-none rounded-sm border-2 border-border h-10 px-4 flex items-center justify-center gap-2 font-noto-bold uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground whitespace-nowrap"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        <span>Reset</span>
                                    </Button>
                                )}
                            </div>
                        </form>
                        <Select value={roleFilter || 'all'} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="w-full md:w-[200px] rounded-sm border-2 border-border h-10 font-noto-bold text-[10px] sm:text-xs uppercase tracking-wide bg-background">
                                <SelectValue placeholder="Clearance Filter" />
                            </SelectTrigger>
                            <SelectContent className="rounded-sm border-2 border-border">
                                <SelectItem value="all" className="font-noto-medium text-xs uppercase tracking-wide">All Clearances</SelectItem>
                                <SelectItem value="admin" className="font-noto-medium text-xs uppercase tracking-wide">Administrator</SelectItem>
                                <SelectItem value="staff" className="font-noto-medium text-xs uppercase tracking-wide">Staff</SelectItem>
                                <SelectItem value="user" className="font-noto-medium text-xs uppercase tracking-wide">Standard User</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="border-2 border-border rounded-sm bg-card shadow-sm overflow-hidden">
                    <div className="p-0">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-sm border-2 border-border" />)}
                            </div>
                        ) : users.length === 0 ? (
                            <div className="py-20 text-center bg-card">
                                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                                <h3 className="text-sm font-noto-bold uppercase tracking-wide">No Personnel Found</h3>
                                <p className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest mt-1">Adjust query parameters</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30 border-b-2 border-border">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest h-12">Identification</TableHead>
                                            <TableHead className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest h-12">Registered Comm.</TableHead>
                                            <TableHead className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest h-12">Clearance</TableHead>
                                            <TableHead className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest h-12">Status</TableHead>
                                            <TableHead className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest h-12">Registration Date</TableHead>
                                            <TableHead className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest h-12 text-right">Directives</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((u) => (
                                            <TableRow key={u._id} className="border-b border-border hover:bg-muted/10">
                                                <TableCell className="py-4">
                                                    <div className="font-noto-bold text-foreground uppercase tracking-tight text-xs">{u.name}</div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="text-[10px] font-noto-medium text-foreground">{u.email}</div>
                                                    <div className="text-[10px] font-noto-medium text-muted-foreground">{u.phone}</div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Badge variant="outline" className={`rounded-sm border uppercase text-[10px] font-noto-bold tracking-widest px-2 py-0.5 h-6 ${roleColors[u.role]}`}>
                                                        {u.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Badge variant="outline" className={`rounded-sm border uppercase text-[10px] font-noto-bold tracking-widest px-2 py-0.5 h-6 ${u.isActive ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-600' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-600'}`}>
                                                        {u.isActive ? 'Active' : 'Revoked'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4 text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">
                                                    {format(new Date(u.createdAt), 'dd MMM yyyy')}
                                                </TableCell>
                                                <TableCell className="py-4 text-right">
                                                     <div className="flex items-center justify-end gap-1.5">
                                                        <Select 
                                                            value={u.role} 
                                                            onValueChange={(v) => handleRoleChange(u._id, v)}
                                                            disabled={u.role === 'admin' || u.role === 'staff'}
                                                        >
                                                            <SelectTrigger className="w-[115px] h-8 rounded-sm border-2 border-border font-noto-bold text-[10px] uppercase tracking-wider disabled:opacity-50">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-sm border-2 border-border">
                                                                <SelectItem value="user" className="font-noto-medium text-[10px] uppercase tracking-widest">Standard</SelectItem>
                                                                <SelectItem value="staff" className="font-noto-medium text-[10px] uppercase tracking-widest">Staff</SelectItem>
                                                                <SelectItem value="admin" className="font-noto-medium text-[10px] uppercase tracking-widest">Admin</SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            className={`h-8 w-8 rounded-sm border-2 ${u.isActive ? 'border-destructive/40 text-destructive/70 hover:bg-destructive hover:text-destructive-foreground' : 'border-emerald-600/40 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                                                            onClick={() => handleToggleActive(u._id, u.isActive)}
                                                            disabled={u._id === currentUser?._id || u._id === currentUser?.id}
                                                            title={u.isActive ? "Deactivate Account" : "Activate Account"}
                                                        >
                                                            {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                        </Button>

                                                        {u.role === 'user' && (
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-8 w-8 rounded-sm border-2 border-red-200 text-red-600 hover:bg-red-600 hover:text-white"
                                                                onClick={() => openDelete(u)}
                                                                title="Delete Permanently"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}

                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-sm border-2 border-border" title="Reset Credentials">
                                                                    <KeyRound className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="rounded-sm border-2 border-border shadow-md">
                                                                <DialogHeader>
                                                                    <DialogTitle className="font-noto-bold text-foreground uppercase tracking-wide">Override Credentials</DialogTitle>
                                                                    <DialogDescription className="text-xs font-noto-medium text-muted-foreground">
                                                                        Assign new centralized access credentials for {u.name}.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="space-y-3 mt-4">
                                                                    <Label className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">New Authorization Key</Label>
                                                                    <Input
                                                                        type="password"
                                                                        value={newPassword}
                                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                                        placeholder="Minimum 6 characters..."
                                                                        className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm focus-visible:ring-0 focus-visible:border-[#0056b3] transition-none"
                                                                    />
                                                                </div>
                                                                <DialogFooter className="mt-6 gap-2 sm:gap-0">
                                                                    <DialogClose asChild><Button variant="outline" className="rounded-sm border-2 border-border font-noto-bold uppercase text-xs tracking-wide">Cancel Directive</Button></DialogClose>
                                                                    <DialogClose asChild>
                                                                        <Button variant="cta" onClick={() => handleResetPassword(u._id)} className="rounded-sm font-noto-bold uppercase text-xs tracking-wide bg-[#0056b3] hover:bg-[#004494] text-white">
                                                                            Execute Override
                                                                        </Button>
                                                                    </DialogClose>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>

                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <Button variant="outline" size="sm" className="rounded-sm border-2 border-border h-8 w-8 p-0" disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 text-[10px] font-noto-bold text-foreground uppercase tracking-widest bg-muted/30 border border-border rounded-sm py-1.5">
                            Page {pagination.currentPage} / {pagination.totalPages}
                        </span>
                        <Button variant="outline" size="sm" className="rounded-sm border-2 border-border h-8 w-8 p-0" disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Create Personnel Dialog */}
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="rounded-sm border-2 border-border shadow-md max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-noto-bold text-foreground uppercase tracking-wide">Register New Personnel</DialogTitle>
                            <DialogDescription className="text-xs font-noto-medium text-muted-foreground">
                                Provision a new system user with specific administrative or standard clearance.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Full Name</Label>
                                    <Input 
                                        value={form.name} 
                                        onChange={(e) => setForm({...form, name: e.target.value})}
                                        placeholder="John Doe" 
                                        required
                                        className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm focus-visible:ring-0 focus-visible:border-[#0056b3] transition-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Phone</Label>
                                    <Input 
                                        value={form.phone} 
                                        onChange={(e) => setForm({...form, phone: e.target.value})}
                                        placeholder="10 digit number" 
                                        required
                                        className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm focus-visible:ring-0 focus-visible:border-[#0056b3] transition-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Email Address</Label>
                                <Input 
                                    type="email" 
                                    value={form.email} 
                                    onChange={(e) => setForm({...form, email: e.target.value})}
                                    placeholder="email@example.com" 
                                    required
                                    className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm focus-visible:ring-0 focus-visible:border-[#0056b3] transition-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Initial Password</Label>
                                <Input 
                                    type="password" 
                                    value={form.password} 
                                    onChange={(e) => setForm({...form, password: e.target.value})}
                                    placeholder="Min 8 chars, 1 upper, 1 special" 
                                    required
                                    className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm focus-visible:ring-0 focus-visible:border-[#0056b3] transition-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Access Clearance</Label>
                                <Select value={form.role} onValueChange={(v) => setForm({...form, role: v})}>
                                    <SelectTrigger className="w-full h-10 rounded-sm border-2 border-border font-noto-bold text-xs uppercase tracking-wide">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-sm border-2 border-border">
                                        <SelectItem value="user" className="font-noto-medium text-xs uppercase tracking-wide">Standard User</SelectItem>
                                        <SelectItem value="staff" className="font-noto-medium text-xs uppercase tracking-wide">Staff Personnel</SelectItem>
                                        <SelectItem value="admin" className="font-noto-medium text-xs uppercase tracking-wide">Administrator</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter className="mt-6 gap-3">
                                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-sm border-2 border-border font-noto-bold uppercase text-xs tracking-wide">Cancel</Button>
                                <Button type="submit" disabled={saving} className="rounded-sm font-noto-bold uppercase text-xs tracking-wide bg-[#0056b3] hover:bg-[#004494] text-white">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Personnel'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Deletion Confirmation Dialog */}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent className="rounded-sm border-2 border-red-200 shadow-md max-w-sm">
                        <DialogHeader>
                            <div className="flex items-center gap-3 text-red-600 mb-2">
                                <AlertTriangle className="h-6 w-6" />
                                <DialogTitle className="font-noto-bold uppercase tracking-wide">Critical Directive</DialogTitle>
                            </div>
                            <DialogDescription className="text-xs font-noto-medium text-foreground">
                                You are about to <span className="text-red-600 font-noto-bold">PERMANENTLY REMOVE</span> <span className="font-noto-bold uppercase">{selectedUser?.name}</span> from the central database. This action is irreversible. All associated guest history for this specific account ID will be disconnected.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-6 gap-3">
                            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-sm border-2 border-border font-noto-bold uppercase text-[10px] tracking-wide">Cancel</Button>
                            <Button onClick={handleDeleteUser} disabled={saving} className="rounded-sm font-noto-bold uppercase text-[10px] tracking-wide bg-red-600 hover:bg-red-700 text-white">
                                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                                Confirm Deletion
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </motion.div>
        </div>
    );
}
