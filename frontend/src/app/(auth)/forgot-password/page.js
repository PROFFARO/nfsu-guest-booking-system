'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2, ArrowLeft, CheckCircle2, Building2 } from 'lucide-react';
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

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [email, setEmail] = useState('');
    const router = useRouter();

    async function handleSubmit(e) {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            setErrorMsg('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        setErrorMsg('');
        try {
            await api.auth.forgotPassword({ email });
            setIsSuccess(true);
        } catch (error) {
            if (error.data?.message) {
                setErrorMsg(error.data.message);
            } else {
                setErrorMsg('Something went wrong. Please try again later.');
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

                        {isSuccess ? (
                            <>
                                <CardTitle className="text-2xl font-noto-bold text-foreground tracking-tight flex items-center justify-center gap-2">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                    Check Your Email
                                </CardTitle>
                                <CardDescription className="text-sm font-noto-medium text-muted-foreground mt-2">
                                    Recovery instructions sent to <br /><span className="text-foreground font-bold">{email}</span>
                                </CardDescription>
                            </>
                        ) : (
                            <>
                                <CardTitle className="text-2xl font-noto-bold text-foreground tracking-tight">Recover Password</CardTitle>
                                <CardDescription className="text-sm font-noto-medium text-muted-foreground mt-2">Enter your registered email address</CardDescription>
                            </>
                        )}
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isSuccess ? (
                            <div className="space-y-6">
                                <p className="text-sm text-center text-muted-foreground leading-relaxed px-4">
                                    If an account exists with this email address, you will receive an official password reset link shortly.
                                </p>
                                <Button
                                    onClick={() => router.push('/login')}
                                    className="w-full rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold h-10 uppercase tracking-wider shadow-sm"
                                >
                                    Return to Official Login
                                </Button>
                                <p className="text-xs text-center text-muted-foreground mt-4">
                                    Didn't receive it? <button onClick={() => setIsSuccess(false)} className="text-[#0056b3] dark:text-cyan-400 font-noto-bold hover:underline">Try again</button>
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {errorMsg && (
                                    <div className="p-3 text-sm font-noto-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-sm flex items-start gap-2">
                                        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p>{errorMsg}</p>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="officer.name@example.gov.in"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="rounded-sm border-border bg-background h-10 font-noto-medium"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold h-10 uppercase tracking-wider mt-2 shadow-sm"
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Send Recovery Link
                                </Button>
                            </form>
                        )}

                        {!isSuccess && (
                            <div className="mt-6 text-center text-sm font-noto-medium text-muted-foreground">
                                <Link href="/login" className="flex items-center justify-center font-noto-bold text-[#0056b3] dark:text-cyan-400 hover:underline">
                                    <ArrowLeft className="h-4 w-4 mr-1" /> Return to Login
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
