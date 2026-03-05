'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user, register } = useAuth();
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.replace(user.role === 'admin' || user.role === 'staff' ? '/admin' : '/dashboard');
        }
    }, [user, router]);

    if (user) return null;

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (!/^[0-9]{10}$/.test(form.phone)) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        try {
            const user = await register(form);
            toast.success(`Welcome, ${user.name}! Account created successfully.`);
            router.push('/dashboard');
        } catch (err) {
            toast.error(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
            {/* Removed AI-ish background blur blobs */}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="rounded-sm border-border bg-card shadow-sm">
                    <CardHeader className="text-center border-b border-border bg-muted/10 pb-6 rounded-t-sm">
                        <div className="mx-auto mb-4 flex justify-center">
                            <img
                                src="/logo.png"
                                alt="NFSU Logo"
                                className="h-14 w-auto object-contain"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                }}
                            />
                            <div className="hidden h-14 w-14 items-center justify-center rounded-sm bg-[#0056b3] dark:bg-cyan-700 shadow-sm border border-[#004494] dark:border-cyan-600">
                                <Building2 className="h-7 w-7 text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-noto-bold text-foreground tracking-tight">Create Official Account</CardTitle>
                        <CardDescription className="text-sm font-noto-medium text-muted-foreground mt-2">Register with CampusStay to book guest house rooms</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Full Name</Label>
                                <Input id="name" placeholder="e.g. Ramesh Kumar" value={form.name} onChange={update('name')} required className="rounded-sm border-border bg-background h-10 font-noto-medium" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Email Address</Label>
                                <Input id="email" type="email" placeholder="ramesh.kumar@example.gov.in" value={form.email} onChange={update('email')} required autoComplete="email" className="rounded-sm border-border bg-background h-10 font-noto-medium" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="phone" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Mobile Number</Label>
                                <Input id="phone" placeholder="Enter 10-digit mobile number" value={form.phone} onChange={update('phone')} required maxLength={10} className="rounded-sm border-border bg-background h-10 font-noto-medium" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="Minimum 6 characters"
                                        value={form.password}
                                        onChange={update('password')}
                                        required
                                        autoComplete="new-password"
                                        className="rounded-sm border-border bg-background h-10 font-noto-medium pr-10"
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <Button type="submit" className="w-full rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold h-10 uppercase tracking-wider mt-2 shadow-sm" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Register Account
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm font-noto-medium text-muted-foreground">
                            Already registered?{' '}
                            <Link href="/login" className="font-noto-bold text-[#0056b3] dark:text-cyan-400 hover:underline">
                                Sign In Here
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
