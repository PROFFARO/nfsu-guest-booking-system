'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ProfilePage() {
    const { user, updateProfile } = useAuth();
    const [form, setForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
    });
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
    const [saving, setSaving] = useState(false);
    const [changingPw, setChangingPw] = useState(false);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateProfile(form);
            toast.success('Profile updated');
        } catch (err) {
            toast.error(err.message || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.newPassword.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }
        setChangingPw(true);
        try {
            await api.auth.changePassword(passwords);
            toast.success('Password changed');
            setPasswords({ currentPassword: '', newPassword: '' });
        } catch (err) {
            toast.error(err.message || 'Failed to change password');
        } finally {
            setChangingPw(false);
        }
    };

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Profile</h1>
                    <p className="text-muted-foreground">Manage your account settings</p>
                </div>

                {/* Info */}
                <Card className="border-border/40 bg-card/50">
                    <CardContent className="flex items-center gap-4 p-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xl font-bold text-white">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                            <p className="text-lg font-semibold">{user?.name}</p>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                            <Badge variant="secondary" className="mt-1 capitalize">{user?.role}</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Edit Profile */}
                <Card className="border-border/40 bg-card/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" /> Edit Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required maxLength={10} />
                            </div>
                            <Button type="submit" disabled={saving} variant="cta">
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Changes
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Change Password */}
                <Card className="border-border/40 bg-card/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" /> Change Password
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input id="currentPassword" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input id="newPassword" type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required placeholder="Min 6 characters" />
                            </div>
                            <Button type="submit" variant="outline" disabled={changingPw}>
                                {changingPw ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Change Password
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
