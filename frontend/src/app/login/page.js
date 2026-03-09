'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Eye, EyeOff, Loader2, Phone, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
    const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [requires2fa, setRequires2fa] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const { user, login, requestPhoneOtp, verifyFirebaseOtp } = useAuth();
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.replace(user.role === 'admin' || user.role === 'staff' ? '/admin' : '/dashboard');
        }
    }, [user, router]);

    if (user) return null;

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await login(email, password, twoFactorCode);
            if (result && result.twoFactorRequired) {
                setRequires2fa(true);
                toast.info('Enter your authentication code');
            } else {
                toast.success(`Welcome back, ${result.name}!`);
                router.push(result.role === 'admin' || result.role === 'staff' ? '/admin' : '/dashboard');
            }
        } catch (err) {
            toast.error(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!/^[0-9]{10}$/.test(phone)) {
            return toast.error('Please enter a valid 10-digit phone number');
        }
        setLoading(true);
        try {
            // Firebase needs the container ID for reCaptcha
            await requestPhoneOtp(phone, 'login-recaptcha');
            setOtpSent(true);
            toast.success('Verification code sent to your phone');
        } catch (err) {
            console.error('OTP Error:', err);
            toast.error(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneLogin = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            return toast.error('Please enter the 6-digit verification code');
        }
        setLoading(true);
        try {
            const result = await verifyFirebaseOtp(otp);

            if (result.isNewUser) {
                // This shouldn't happen on login page normally unless we allow "Login to Register"
                // But if it does, redirect to register with the phone
                toast.info('Account not found. Redirecting to registration...');
                router.push(`/register?phone=${result.phone}`);
                return;
            }

            toast.success(`Welcome back, ${result.name}!`);
            router.push(result.role === 'admin' || result.role === 'staff' ? '/admin' : '/dashboard');
        } catch (err) {
            toast.error(err.message || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="rounded-sm border-border bg-card shadow-sm overflow-hidden">
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

                    <div className="flex border-b border-border">
                        <button
                            onClick={() => { setLoginMethod('email'); setOtpSent(false); }}
                            className={`flex-1 py-3 text-xs font-noto-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${loginMethod === 'email' ? 'bg-background text-[#0056b3] border-b-2 border-[#0056b3]' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
                        >
                            <Mail className="h-3.5 w-3.5" />
                            Email Login
                        </button>
                        <button
                            onClick={() => setLoginMethod('phone')}
                            className={`flex-1 py-3 text-xs font-noto-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${loginMethod === 'phone' ? 'bg-background text-[#0056b3] border-b-2 border-[#0056b3]' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
                        >
                            <Phone className="h-3.5 w-3.5" />
                            Phone OTP
                        </button>
                    </div>

                    <CardContent className="pt-8">
                        <AnimatePresence mode="wait">
                            {loginMethod === 'email' ? (
                                <motion.form
                                    key="email-form"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    onSubmit={handleEmailSubmit}
                                    className="space-y-4"
                                >
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
                                                required={!requires2fa}
                                                disabled={requires2fa}
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
                                        {requires2fa && (
                                            <div className="space-y-1.5 mt-4 border-t border-border pt-4">
                                                <Label htmlFor="twoFactorCode" className="text-xs font-noto-bold text-[#0056b3] uppercase tracking-widest">Two-Factor Authentication Code</Label>
                                                <Input
                                                    id="twoFactorCode"
                                                    type="text"
                                                    placeholder="Enter 6-digit code"
                                                    value={twoFactorCode}
                                                    onChange={(e) => setTwoFactorCode(e.target.value)}
                                                    required
                                                    className="rounded-sm border-border bg-background h-10 font-noto-medium text-center tracking-[0.5em] text-lg"
                                                    maxLength={6}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold h-10 uppercase tracking-wider mt-2 shadow-sm"
                                        disabled={loading}
                                    >
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Secure Sign In
                                    </Button>
                                </motion.form>
                            ) : (
                                <motion.div
                                    key="phone-form"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4"
                                >
                                    {!otpSent ? (
                                        <form onSubmit={handleRequestOtp} className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="phone" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Mobile Number</Label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Input
                                                            id="phone"
                                                            placeholder="10-digit mobile number"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                            disabled={otpSent}
                                                            required
                                                            className="rounded-sm border-border bg-background h-11 font-noto-medium pl-10"
                                                        />
                                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    {!otpSent && (
                                                        <Button
                                                            type="submit"
                                                            disabled={loading || phone.length !== 10}
                                                            className="h-11 bg-[#0056b3] text-white hover:bg-[#004494] px-6 font-noto-bold uppercase text-xs"
                                                        >
                                                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get OTP'}
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground leading-tight italic mt-1">
                                                    A 6-digit verification code will be sent to this number.
                                                </p>
                                            </div>
                                            <div id="login-recaptcha"></div>
                                        </form>
                                    ) : (
                                        <form onSubmit={handlePhoneLogin} className="space-y-4">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="otp" className="text-xs font-noto-bold text-[#0056b3] uppercase tracking-widest">Enter Verification Code</Label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOtpSent(false)}
                                                        className="text-xs font-noto-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                                                    >
                                                        <ArrowLeft className="h-3 w-3" /> Edit Number
                                                    </button>
                                                </div>
                                                <Input
                                                    id="otp"
                                                    type="text"
                                                    placeholder="------"
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    required
                                                    autoFocus
                                                    className="rounded-sm border-border bg-background h-12 font-noto-bold text-center text-2xl tracking-[0.75em]"
                                                    maxLength={6}
                                                />
                                                <div className="flex justify-between items-center mt-2">
                                                    <p className="text-xs text-muted-foreground font-noto-medium">
                                                        Sent to +91 {phone}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={handleRequestOtp}
                                                        className="text-xs font-noto-bold text-[#0056b3] hover:underline"
                                                        disabled={loading}
                                                    >
                                                        Resend code
                                                    </button>
                                                </div>
                                            </div>
                                            <Button
                                                type="submit"
                                                className="w-full rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold h-10 uppercase tracking-wider shadow-sm"
                                                disabled={loading}
                                            >
                                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                Verify & Sign In
                                            </Button>
                                        </form>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="mt-8 pt-6 border-t border-border text-center text-sm font-noto-medium text-muted-foreground">
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
