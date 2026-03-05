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
    admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    staff: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    user: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
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
        <div className="p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-muted-foreground">Manage users, roles, and access</p>
                </div>

                <div className="mb-6 flex flex-wrap gap-3">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
                        <Button type="submit" size="sm" variant="secondary">
                            <Search className="h-4 w-4" />
                        </Button>
                    </form>
                    <Select value={roleFilter || 'all'} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Card className="border-border/40 bg-card/50">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                            </div>
                        ) : users.length === 0 ? (
                            <div className="py-16 text-center">
                                <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                                <p className="text-muted-foreground">No users found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((u) => (
                                            <TableRow key={u._id}>
                                                <TableCell className="font-medium">{u.name}</TableCell>
                                                <TableCell className="text-sm">{u.email}</TableCell>
                                                <TableCell className="text-sm">{u.phone}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={roleColors[u.role]}>{u.role}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={u.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}>
                                                        {u.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(u.createdAt), 'MMM dd, yyyy')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Select value={u.role} onValueChange={(v) => handleRoleChange(u._id, v)}>
                                                            <SelectTrigger className="w-[90px] h-7 text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="user">User</SelectItem>
                                                                <SelectItem value="staff">Staff</SelectItem>
                                                                <SelectItem value="admin">Admin</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className={`h-7 text-xs ${u.isActive ? 'text-red-500' : 'text-emerald-500'}`}
                                                            onClick={() => handleToggleActive(u._id, u.isActive)}
                                                            disabled={u._id === currentUser?._id || u._id === currentUser?.id}
                                                        >
                                                            {u.isActive ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                                                        </Button>
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button size="sm" variant="ghost" className="h-7 text-xs">
                                                                    <KeyRound className="h-3 w-3" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>Reset Password</DialogTitle>
                                                                    <DialogDescription>Set a new password for {u.name}</DialogDescription>
                                                                </DialogHeader>
                                                                <div className="space-y-2">
                                                                    <Label>New Password</Label>
                                                                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
                                                                </div>
                                                                <DialogFooter>
                                                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                                    <DialogClose asChild>
                                                                        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white" onClick={() => handleResetPassword(u._id)}>
                                                                            Reset Password
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
                    </CardContent>
                </Card>

                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-4 text-sm text-muted-foreground">Page {pagination.currentPage} of {pagination.totalPages}</span>
                        <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
