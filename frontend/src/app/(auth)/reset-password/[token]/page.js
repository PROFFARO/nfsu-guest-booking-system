'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShieldAlert, Loader2, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';

export default function ResetPasswordPage({ params }) {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const router = useRouter();
    const { token } = use(params);

    async function handleSubmit(e) {
        e.preventDefault();
        setErrorMsg('');

        if (password.length < 8) {
            setErrorMsg('Password must be at least 8 characters long');
            return;
        }

        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}|;':",./<>?]).{8,}$/.test(password)) {
            setErrorMsg('Password must contain an uppercase letter, lowercase letter, number, and special character');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            await api.auth.resetPassword(token, { password });
            router.push('/login?reset=success');
        } catch (error) {
            if (error.data?.message) {
                setErrorMsg(error.data.message);
            } else {
                setErrorMsg('The reset link is invalid or has expired.');
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
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

                        <CardTitle className="text-2xl font-noto-bold text-foreground tracking-tight">Create New Password</CardTitle>
                        <CardDescription className="text-sm font-noto-medium text-muted-foreground mt-2">
                            Enter a strong password compliant with security policy
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {errorMsg && (
                                <div className="p-3 text-sm font-noto-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-sm flex items-start gap-2">
                                    <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                                    <p>{errorMsg}</p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">New Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="rounded-sm border-border bg-background h-10 font-noto-medium"
                                />
                            </div>

                            <div className="space-y-1.5 pt-2">
                                <Label htmlFor="confirmPassword" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="rounded-sm border-border bg-background h-10 font-noto-medium"
                                />
                            </div>

                            <div className="bg-muted/50 border border-border rounded-sm p-4 mt-4 space-y-2">
                                <p className="text-xs font-noto-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <ShieldCheck className="h-3.5 w-3.5" /> Security Requirements
                                </p>
                                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 ml-1">
                                    <li>Minimum 8 characters</li>
                                    <li>At least one uppercase and lowercase letter</li>
                                    <li>At least one number</li>
                                    <li>At least one special symbol (@, #, $, etc.)</li>
                                </ul>
                            </div>

                            <Button
                                type="submit"
                                className="w-full rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold h-10 uppercase tracking-wider mt-4 shadow-sm"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirm New Password
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
