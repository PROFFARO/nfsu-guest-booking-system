'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import AuditLogsViewer from '@/components/profile/AuditLogsViewer';
import {
    User, Lock, Loader2, Monitor, Smartphone, Tablet,
    Shield, History, LogOut, AlertTriangle, CheckCircle2,
    XCircle, Globe, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Device icon helper
const DeviceIcon = ({ device, className }) => {
    if (device === 'mobile') return <Smartphone className={className} />;
    if (device === 'tablet') return <Tablet className={className} />;
    return <Monitor className={className} />;
};

// Time formatter
const formatTime = (date) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

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

    // Login history & sessions state
    const [sessions, setSessions] = useState([]);
    const [loginHistory, setLoginHistory] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [revokingId, setRevokingId] = useState(null);
    const [revokingAll, setRevokingAll] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const currentSessionToken = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null;

    const fetchSessions = useCallback(async () => {
        setLoadingSessions(true);
        try {
            const res = await api.auth.sessions();
            setSessions(res.data.sessions || []);
        } catch (err) {
            console.error('Failed to load sessions');
        } finally {
            setLoadingSessions(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const res = await api.auth.loginHistory(20);
            setLoginHistory(res.data.history || []);
        } catch (err) {
            console.error('Failed to load login history');
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
        fetchHistory();
    }, [fetchSessions, fetchHistory]);

    const handleRevokeSession = async (sessionId) => {
        setRevokingId(sessionId);
        try {
            await api.auth.revokeSession(sessionId);
            toast.success('Session revoked');
            fetchSessions();
        } catch (err) {
            toast.error(err.message || 'Failed to revoke session');
        } finally {
            setRevokingId(null);
        }
    };

    const handleRevokeAll = async () => {
        setRevokingAll(true);
        try {
            const res = await api.auth.revokeAllSessions();
            toast.success(res.message || 'All other sessions revoked');
            fetchSessions();
        } catch (err) {
            toast.error(err.message || 'Failed to revoke sessions');
        } finally {
            setRevokingAll(false);
        }
    };

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

                {/* ============================================ */}
                {/* Active Sessions */}
                {/* ============================================ */}
                <div className="mt-6">
                    <Card className="rounded-sm border-border bg-card shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-muted/10 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 font-noto-bold text-lg text-foreground">
                                <Shield className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" /> Active Sessions
                            </h2>
                            {sessions.length > 1 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRevokeAll}
                                    disabled={revokingAll}
                                    className="rounded-sm border-red-500 text-red-600 hover:bg-red-600 hover:text-white font-noto-medium text-xs h-8 px-3"
                                >
                                    {revokingAll ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <LogOut className="mr-1.5 h-3 w-3" />}
                                    Revoke All Others
                                </Button>
                            )}
                        </div>
                        <CardContent className="p-0">
                            {loadingSessions ? (
                                <div className="p-6 space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-16 bg-muted/30 animate-pulse rounded-sm" />
                                    ))}
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                                    <p className="text-sm font-noto-bold text-muted-foreground">No active sessions found</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {sessions.map((session) => {
                                        const isCurrent = session.sessionToken === currentSessionToken;
                                        return (
                                            <motion.div
                                                key={session._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`flex items-center gap-4 px-6 py-4 transition-colors ${isCurrent ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'hover:bg-muted/30'}`}
                                            >
                                                {/* Device Icon */}
                                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border ${isCurrent ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' : 'border-border bg-muted/20'}`}>
                                                    <DeviceIcon device={session.device} className={`h-5 w-5 ${isCurrent ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                                                </div>

                                                {/* Session Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-noto-bold text-foreground truncate">
                                                            {session.browser} · {session.os}
                                                        </p>
                                                        {isCurrent && (
                                                            <Badge className="rounded-sm bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[9px] font-noto-bold uppercase tracking-widest px-1.5 py-0 h-4">
                                                                Current
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs font-noto-medium text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Globe className="h-3 w-3" /> {session.ipAddress}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" /> {formatTime(session.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Revoke Button */}
                                                {!isCurrent && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRevokeSession(session._id)}
                                                        disabled={revokingId === session._id}
                                                        className="rounded-sm border-red-500/50 text-red-600 hover:bg-red-600 hover:text-white font-noto-medium text-[10px] uppercase tracking-widest h-7 px-3 shrink-0"
                                                    >
                                                        {revokingId === session._id ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <LogOut className="mr-1 h-3 w-3" /> Revoke
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                                {isCurrent && (
                                                    <span className="text-[10px] font-noto-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest shrink-0">
                                                        This Device
                                                    </span>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ============================================ */}
                {/* Recent Login History */}
                {/* ============================================ */}
                <div className="mt-6">
                    <Card className="rounded-sm border-border bg-card shadow-sm overflow-hidden">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="w-full px-6 py-4 border-b border-border bg-muted/10 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
                        >
                            <h2 className="flex items-center gap-2 font-noto-bold text-lg text-foreground">
                                <History className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" /> Recent Login Activity
                                <Badge variant="outline" className="rounded-sm border-border text-[10px] font-noto-bold px-1.5 py-0 ml-1">
                                    {loginHistory.length}
                                </Badge>
                            </h2>
                            {showHistory ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                        </button>

                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <CardContent className="p-0">
                                        {loadingHistory ? (
                                            <div className="p-6 space-y-3">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div key={i} className="h-12 bg-muted/30 animate-pulse rounded-sm" />
                                                ))}
                                            </div>
                                        ) : loginHistory.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                                                <p className="text-sm font-noto-bold text-muted-foreground">No login history found</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border">
                                                {loginHistory.map((entry) => (
                                                    <div
                                                        key={entry._id}
                                                        className={`flex items-center gap-4 px-6 py-3 ${entry.status === 'failed' ? 'bg-red-50/30 dark:bg-red-950/5' : ''}`}
                                                    >
                                                        {/* Status Icon */}
                                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border ${
                                                            entry.status === 'success'
                                                                ? 'border-emerald-500/30 bg-emerald-100 dark:bg-emerald-900/20'
                                                                : 'border-red-500/30 bg-red-100 dark:bg-red-900/20'
                                                        }`}>
                                                            {entry.status === 'success' ? (
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                            )}
                                                        </div>

                                                        {/* Entry Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <Badge variant="outline" className={`rounded-sm text-[9px] font-noto-bold uppercase tracking-widest px-1.5 py-0 h-4 border ${
                                                                    entry.status === 'success'
                                                                        ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                                                                        : 'border-red-500/30 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                                                                }`}>
                                                                    {entry.status}
                                                                </Badge>
                                                                <span className="text-xs font-noto-medium text-foreground truncate">
                                                                    {entry.browser} · {entry.os}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-0.5 text-[11px] font-noto-medium text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <Globe className="h-3 w-3" /> {entry.ipAddress}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <DeviceIcon device={entry.device} className="h-3 w-3" />
                                                                    <span className="capitalize">{entry.device}</span>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Timestamp */}
                                                        <span className="text-[11px] font-noto-medium text-muted-foreground shrink-0">
                                                            {formatTime(entry.createdAt)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </div>

                {/* ============================================ */}
                {/* Audit Logs */}
                {/* ============================================ */}
                <div className="mt-6">
                    <AuditLogsViewer />
                </div>
            </motion.div>
        </div>
    );
}
