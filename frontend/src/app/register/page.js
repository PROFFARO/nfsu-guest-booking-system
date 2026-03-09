'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Eye, EyeOff, Loader2, CheckCircle2, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegisterPage() {
    const [regMethod, setRegMethod] = useState('email'); // 'email' or 'phone'
    const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user, register, registerWithPhone, requestPhoneOtp, verifyFirebaseOtp } = useAuth();
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.replace(user.role === 'admin' || user.role === 'staff' ? '/admin' : '/dashboard');
        }
    }, [user, router]);

    if (user) return null;

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleSendOtp = async () => {
        if (!/^[0-9]{10}$/.test(form.phone)) {
            return toast.error('Please enter a valid 10-digit phone number');
        }
        setLoading(true);
        try {
            await requestPhoneOtp(form.phone, 'register-recaptcha');
            setOtpSent(true);
            toast.success('Verification code sent to your phone');
        } catch (err) {
            console.error('Registration OTP Error:', err);
            toast.error(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            return toast.error('Please enter the 6-digit code');
        }
        setLoading(true);
        try {
            const result = await verifyFirebaseOtp(otp);
            setIsPhoneVerified(true);
            setOtpSent(false);

            // If the user already exists (was returned from verifyFirebaseOtp)
            // But they were on register page, we should probably tell them to login
            // However, verifyFirebaseOtp handles existing users by logging them in.
            if (!result.isNewUser) {
                toast.success('Successfully logged in with verified number!');
                router.push('/dashboard');
                return;
            }

            toast.success('Phone number verified! Please complete your profile.');
        } catch (err) {
            toast.error(err.message || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        if (form.password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return false;
        }
        if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password) || !/[!@#$%^&*()_+\-={}|;':",./<>?]/.test(form.password)) {
            toast.error('Password must contain uppercase, lowercase, number, and special character');
            return false;
        }
        if (regMethod === 'email' && !/^[0-9]{10}$/.test(form.phone)) {
            toast.error('Please enter a valid 10-digit phone number');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (regMethod === 'phone' && !isPhoneVerified) {
            toast.error('Please verify your phone number first');
            return;
        }

        if (!validateForm()) return;

        setLoading(true);
        try {
            let newUser;
            if (regMethod === 'phone') {
                newUser = await registerWithPhone(form);
            } else {
                newUser = await register(form);
            }
            toast.success(`Welcome, ${newUser.name}! Account created successfully.`);
            router.push('/dashboard');
        } catch (err) {
            toast.error(err.message || 'Registration failed');
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
                        {/* Tabs */}
                        <div className="flex p-1 bg-muted rounded-sm mb-6">
                            <button
                                onClick={() => { setRegMethod('email'); setIsPhoneVerified(false); setOtpSent(false); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-noto-bold uppercase tracking-wider rounded-sm transition-all ${regMethod === 'email' ? 'bg-background text-[#0056b3] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <Mail className="h-3.5 w-3.5" />
                                Email Register
                            </button>
                            <button
                                onClick={() => { setRegMethod('phone'); setIsPhoneVerified(false); setOtpSent(false); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-noto-bold uppercase tracking-wider rounded-sm transition-all ${regMethod === 'phone' ? 'bg-background text-[#0056b3] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <Phone className="h-3.5 w-3.5" />
                                Phone Register
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Phone Input Row */}
                            <div className="space-y-1.5">
                                <Label htmlFor="phone" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Mobile Number</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            id="phone"
                                            placeholder="10-digit number"
                                            value={form.phone}
                                            onChange={update('phone')}
                                            disabled={regMethod === 'phone' && isPhoneVerified}
                                            required
                                            maxLength={10}
                                            className={`rounded-sm border-border bg-background h-10 font-noto-medium ${regMethod === 'phone' && isPhoneVerified ? 'pr-10 border-green-500 bg-green-50/10' : ''}`}
                                        />
                                        {regMethod === 'phone' && isPhoneVerified && (
                                            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                        )}
                                    </div>
                                    {regMethod === 'phone' && !isPhoneVerified && !otpSent && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleSendOtp}
                                            disabled={loading || form.phone.length !== 10}
                                            className="h-10 text-xs font-noto-bold uppercase border-[#0056b3] text-[#0056b3] hover:bg-[#0056b3] hover:text-white transition-colors"
                                        >
                                            Verify
                                        </Button>
                                    )}
                                </div>
                                <div id="register-recaptcha" className="mt-2"></div>
                            </div>

                            <AnimatePresence>
                                {regMethod === 'phone' && otpSent && !isPhoneVerified && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="space-y-1.5 overflow-hidden"
                                    >
                                        <Label htmlFor="otp" className="text-xs font-noto-bold text-[#0056b3] uppercase tracking-widest">Enter Verification Code</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="otp"
                                                placeholder="6-digit code"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                className="rounded-sm border-border bg-background h-10 font-noto-bold text-center tracking-widest focus:ring-[#0056b3] focus:border-[#0056b3]"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleVerifyOtp}
                                                disabled={loading || otp.length !== 6}
                                                className="h-10 bg-[#0056b3] text-white hover:bg-[#004494]"
                                            >
                                                Check
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className={`space-y-4 transition-all duration-300 ${regMethod === 'phone' && !isPhoneVerified ? 'opacity-50 pointer-events-none scale-95 blur-[1px]' : 'opacity-100 scale-100 blur-0'}`}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Full Name</Label>
                                    <Input id="name" placeholder="e.g. Ramesh Kumar" value={form.name} onChange={update('name')} required={regMethod === 'email' || isPhoneVerified} className="rounded-sm border-border bg-background h-10 font-noto-medium" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Email Address</Label>
                                    <Input id="email" type="email" placeholder="ramesh.kumar@example.gov.in" value={form.email} onChange={update('email')} required={regMethod === 'email' || isPhoneVerified} autoComplete="email" className="rounded-sm border-border bg-background h-10 font-noto-medium" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPass ? 'text' : 'password'}
                                            placeholder="Min. 8 characters"
                                            value={form.password}
                                            onChange={update('password')}
                                            required={regMethod === 'email' || isPhoneVerified}
                                            minLength={8}
                                            autoComplete="new-password"
                                            className="rounded-sm border-border bg-background h-10 font-noto-medium pr-10"
                                        />
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-1 mt-1">
                                        <p className="text-[10px] font-noto-medium text-muted-foreground uppercase tracking-tighter">Must include: Uppercase, Lowercase, Number & Special Character</p>
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold h-10 uppercase tracking-wider mt-4 shadow-sm" disabled={loading || (regMethod === 'phone' && !isPhoneVerified)}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {regMethod === 'email' ? 'Register with Email' : 'Register with Phone'}
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
