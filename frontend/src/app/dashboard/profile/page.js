'use client';

import { useState, useEffect } from 'react';
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
    const { user, updateProfile, loadUser } = useAuth();

    // keep local toggle state synced with context user
    useEffect(() => {
        setTwoFactorEnabled(user?.twoFactorEnabled || false);
    }, [user]);
    const [form, setForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
    });
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
    const [saving, setSaving] = useState(false);
    const [changingPw, setChangingPw] = useState(false);
    
    // two-factor authentication state
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
    const [settingUp2fa, setSettingUp2fa] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [disableCode, setDisableCode] = useState('');

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

    const start2faSetup = async () => {
        setSettingUp2fa(true);
        try {
            const res = await api.auth.setup2fa();
            setQrCodeUrl(res.data.qrDataUrl);
        } catch (err) {
            toast.error(err.message || 'Failed to start 2FA setup');
            setSettingUp2fa(false);
        }
    };

    const confirm2fa = async () => {
        try {
            await api.auth.verify2fa({ code: twoFactorCode, action: 'enable' });
            toast.success('Two-factor authentication enabled');
            setTwoFactorEnabled(true);
            setSettingUp2fa(false);
            setTwoFactorCode('');
            await loadUser();
        } catch (err) {
            toast.error(err.message || 'Verification failed');
        }
    };

    const [disabling2fa, setDisabling2fa] = useState(false);

    const disableTwoFactor = async () => {
        if (!disableCode) {
            toast.error('Please enter the authentication code');
            return;
        }
        setDisabling2fa(true);
        try {
            const res = await api.auth.verify2fa({ code: disableCode, action: 'disable' });
            toast.success(res.message || 'Two-factor authentication disabled');
            setTwoFactorEnabled(false);
            setDisableCode('');
            // refresh user from server to update context
            await loadUser();
        } catch (err) {
            toast.error(err.message || 'Verification failed');
        } finally {
            setDisabling2fa(false);
        }
    };

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                    <h1 className="text-3xl font-noto-bold text-foreground tracking-tight">Profile</h1>
                    <p className="text-sm font-noto-medium text-muted-foreground mt-1">Manage your account settings</p>
                </div>

                {/* Info */}
                <Card className="rounded-sm border-border bg-card shadow-sm">
                    <CardContent className="flex items-start gap-5 p-6">
                        <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-sm bg-[#0056b3] dark:bg-cyan-600 text-3xl font-noto-bold text-white shadow-sm mt-0.5">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-xl font-noto-bold text-foreground leading-tight">{user?.name}</h2>
                            <p className="text-sm font-noto-medium text-muted-foreground mt-0.5">{user?.email}</p>
                            <div className="mt-3">
                                <Badge variant="outline" className="rounded-sm text-[11px] font-noto-bold uppercase tracking-widest border-border bg-muted/20 px-2.5 py-0.5 text-foreground">
                                    {user?.role}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Forms Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Edit Profile */}
                    <Card className="rounded-sm border-border bg-card shadow-sm">
                        <div className="px-6 py-4 border-b border-border bg-muted/10">
                            <h2 className="flex items-center gap-2 font-noto-bold text-lg text-foreground">
                                <User className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" /> Edit Profile
                            </h2>
                        </div>
                        <CardContent className="p-6">
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Full Name</Label>
                                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-sm border-border bg-background h-10" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Phone</Label>
                                    <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required maxLength={10} className="rounded-sm border-border bg-background h-10" />
                                </div>
                                <Button type="submit" disabled={saving} className="rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-medium h-10 px-6 shadow-sm mt-2 w-full md:w-auto">
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Changes
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Change Password */}
                    <Card className="rounded-sm border-border bg-card shadow-sm">
                        <div className="px-6 py-4 border-b border-border bg-muted/10">
                            <h2 className="flex items-center gap-2 font-noto-bold text-lg text-foreground">
                                <Lock className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" /> Change Password
                            </h2>
                        </div>
                        <CardContent className="p-6">
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="currentPassword" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Current Password</Label>
                                    <Input id="currentPassword" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required className="rounded-sm border-border bg-background h-10" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="newPassword" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">New Password</Label>
                                    <Input id="newPassword" type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required placeholder="Min 6 characters" className="rounded-sm border-border bg-background h-10" />
                                </div>
                                <Button type="submit" variant="outline" disabled={changingPw} className="rounded-sm border-border bg-background hover:bg-muted font-noto-medium h-10 px-6 mt-2 w-full md:w-auto">
                                    {changingPw ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Change Password
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Two-factor authentication */}
                <div className="mt-6">
                    <Card className="rounded-sm border-border bg-card shadow-sm">
                        <div className="px-6 py-4 border-b border-border bg-muted/10">
                            <h2 className="flex items-center gap-2 font-noto-bold text-lg text-foreground">
                                <Lock className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" /> Two-Factor Authentication
                            </h2>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            {twoFactorEnabled ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-foreground">Two-factor authentication is currently <strong>enabled</strong> on your account.</p>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="disableCode" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Enter code to disable</Label>
                                        <Input id="disableCode" value={disableCode} onChange={(e) => setDisableCode(e.target.value)} placeholder="123456" className="rounded-sm border-border bg-background h-10" />
                                    </div>
                                    <Button onClick={disableTwoFactor} disabled={disabling2fa} className="rounded-sm bg-red-600 text-white hover:bg-red-700 font-noto-medium h-10 px-6 shadow-sm w-full md:w-auto">
                                        {disabling2fa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Disable 2FA
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {settingUp2fa ? (
                                        <>
                                            {qrCodeUrl && <img src={qrCodeUrl} alt="Scan QR code" className="mx-auto" />}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="twoFactorCode" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Enter code from app</Label>
                                                <Input id="twoFactorCode" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} placeholder="123456" className="rounded-sm border-border bg-background h-10" />
                                            </div>
                                            <Button onClick={confirm2fa} className="rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-medium h-10 px-6 shadow-sm w-full md:w-auto">
                                                Confirm & Enable
                                            </Button>
                                        </>
                                    ) : (
                                        <Button onClick={start2faSetup} className="rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-medium h-10 px-6 shadow-sm w-full md:w-auto">
                                            Enable Two-Factor Authentication
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </motion.div>
        </div>
    );
}
