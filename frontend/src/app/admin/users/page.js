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
import { Users, ChevronLeft, ChevronRight, Search, UserX, UserCheck, KeyRound } from 'lucide-react';
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

    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center p-20">
                <p className="text-muted-foreground">Admin access required</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-full mx-auto space-y-6 overflow-x-hidden">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-6 border-b-2 border-border pb-4">
                    <h1 className="text-2xl font-noto-bold text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">Registered Personnel</h1>
                    <p className="mt-1 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                        Official System Access Directory
                    </p>
                </div>

                <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
                    <form onSubmit={handleSearch} className="flex gap-3 flex-1 min-w-[300px]">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search identification..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 rounded-sm border-2 border-border h-10 font-noto-medium text-sm focus-visible:ring-0 focus-visible:border-[#0056b3] transition-none placeholder:uppercase placeholder:font-noto-bold placeholder:text-[10px] placeholder:tracking-widest"
                            />
                        </div>
                        <Button type="submit" className="rounded-sm bg-[#0056b3] hover:bg-[#004494] text-white font-noto-bold uppercase text-xs tracking-wider h-10 px-6">
                            Execute Query
                        </Button>
                    </form>
                    <Select value={roleFilter || 'all'} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="w-[180px] rounded-sm border-2 border-border h-10 font-noto-bold text-xs uppercase tracking-wide">
                            <SelectValue placeholder="Filter By Clearance" />
                        </SelectTrigger>
                        <SelectContent className="rounded-sm border-2 border-border">
                            <SelectItem value="all" className="font-noto-medium text-xs uppercase tracking-wide">All Clearances</SelectItem>
                            <SelectItem value="admin" className="font-noto-medium text-xs uppercase tracking-wide">Administrator</SelectItem>
                            <SelectItem value="staff" className="font-noto-medium text-xs uppercase tracking-wide">Staff</SelectItem>
                            <SelectItem value="user" className="font-noto-medium text-xs uppercase tracking-wide">Standard User</SelectItem>
                        </SelectContent>
                    </Select>
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
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Select value={u.role} onValueChange={(v) => handleRoleChange(u._id, v)}>
                                                            <SelectTrigger className="w-[110px] h-8 rounded-sm border-2 border-border font-noto-bold text-[10px] uppercase tracking-wider">
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
                                                            className={`h-8 w-8 rounded-sm border-2 ${u.isActive ? 'border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground' : 'border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                                                            onClick={() => handleToggleActive(u._id, u.isActive)}
                                                            disabled={u._id === currentUser?._id || u._id === currentUser?.id}
                                                            title={u.isActive ? "Revoke Access" : "Reinstate Access"}
                                                        >
                                                            {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                        </Button>

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
            </motion.div>
        </div>
    );
}
