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

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user, login } = useAuth();
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.replace(user.role === 'admin' || user.role === 'staff' ? '/admin' : '/dashboard');
        }
    }, [user, router]);

    if (user) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = await login(email, password);
            toast.success(`Welcome back, ${user.name}!`);
            router.push(user.role === 'admin' || user.role === 'staff' ? '/admin' : '/dashboard');
        } catch (err) {
            toast.error(err.message || 'Login failed');
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
                        <CardTitle className="text-2xl font-noto-bold text-foreground tracking-tight">Official Login</CardTitle>
                        <CardDescription className="text-sm font-noto-medium text-muted-foreground mt-2">Sign in to the NFSU Guest Management Portal</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="officer.name@example.gov.in"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="rounded-sm border-border bg-background h-10 font-noto-medium"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Password</Label>
                                    <Link href="/forgot-password" className="text-xs font-noto-medium text-[#0056b3] hover:underline dark:text-cyan-400">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="Enter assigned password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        className="rounded-sm border-border bg-background h-10 font-noto-medium pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold h-10 uppercase tracking-wider mt-2 shadow-sm"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Secure Sign In
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm font-noto-medium text-muted-foreground">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="font-noto-bold text-[#0056b3] dark:text-cyan-400 hover:underline">
                                Request Access Here
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
