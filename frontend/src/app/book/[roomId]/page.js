'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, BedDouble, MapPin, Loader2, ArrowLeft, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function BookingFormPage({ params }) {
    const { roomId } = use(params);
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    const [form, setForm] = useState({
        guestName: '',
        email: '',
        phone: '',
        checkIn: '',
        checkOut: '',
        purpose: 'personal',
        purposeDetails: '',
        numberOfGuests: 1,
        specialRequests: '',
    });

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }
        setForm((prev) => ({
            ...prev,
            guestName: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
        }));
    }, [user, router]);

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const res = await api.rooms.getById(roomId);
                setRoom(res.data.room);
            } catch {
                toast.error('Room not found');
                router.push('/rooms');
            } finally {
                setLoading(false);
            }
        };
        fetchRoom();
    }, [roomId, router]);

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const nights = form.checkIn && form.checkOut
        ? Math.max(0, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / (1000 * 60 * 60 * 24)))
        : 0;
    const totalAmount = nights * (room?.pricePerNight || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (nights <= 0) {
            toast.error('Check-out must be after check-in');
            return;
        }
        setSubmitting(true);
        try {
            await api.bookings.create({
                roomId,
                checkIn: new Date(form.checkIn).toISOString(),
                checkOut: new Date(form.checkOut).toISOString(),
                guestName: form.guestName,
                email: form.email,
                phone: form.phone,
                purpose: form.purpose,
                purposeDetails: form.purposeDetails,
                numberOfGuests: parseInt(form.numberOfGuests),
                specialRequests: form.specialRequests,
                paymentOption: 'pay_later',
            });
            toast.success('Booking confirmed!');
            router.push('/book/confirmation');
        } catch (err) {
            toast.error(err.message || 'Booking failed');
        } finally {
            setSubmitting(false);
        }
    };

    // Minimum date is tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const minDate = tomorrow.toISOString().split('T')[0];

    if (loading) {
        return (
            <div className="container mx-auto max-w-4xl px-4 py-8">
                <Skeleton className="mb-4 h-8 w-48" />
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-6 border-b-2 border-border pb-4">
                    <Button variant="outline" size="sm" className="mb-6 rounded-sm border-2 border-border font-noto-bold text-xs uppercase tracking-widest h-8" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Return
                    </Button>
                    <h1 className="text-2xl font-noto-bold text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">Official Room Requisition</h1>
                    <p className="mt-1 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                        Submit Application for Room {room?.roomNumber}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Form Fields */}
                        <div className="space-y-6 lg:col-span-2">
                            <Card className="rounded-sm border-2 border-border bg-card shadow-sm overflow-hidden">
                                <CardHeader className="p-4 border-b border-border bg-muted/10">
                                    <CardTitle className="text-sm font-noto-bold text-foreground uppercase tracking-wide">Applicant Details</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="guestName" className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Full Legal Name</Label>
                                            <Input id="guestName" className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm" value={form.guestName} onChange={update('guestName')} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Registered Email</Label>
                                            <Input id="email" type="email" className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm" value={form.email} onChange={update('email')} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone" className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Contact Number</Label>
                                            <Input id="phone" className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm" value={form.phone} onChange={update('phone')} required readOnly={false} maxLength={10} minLength={10} pattern="[0-9]*" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="numberOfGuests" className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Occupants</Label>
                                            <Select value={String(form.numberOfGuests)} onValueChange={(v) => setForm({ ...form, numberOfGuests: v })}>
                                                <SelectTrigger className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-sm border-2 border-border">
                                                    {[1, 2, 3, 4].map((n) => (
                                                        <SelectItem key={n} value={String(n)} className="font-noto-medium text-sm">{n} Person{n > 1 ? 's' : ''}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-sm border-2 border-border bg-card shadow-sm overflow-hidden">
                                <CardHeader className="p-4 border-b border-border bg-muted/10">
                                    <CardTitle className="text-sm font-noto-bold text-foreground uppercase tracking-wide">Stay Requirements</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-5">
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="checkIn" className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Arrival Date</Label>
                                            <Input id="checkIn" type="date" min={minDate} className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm" value={form.checkIn} onChange={update('checkIn')} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="checkOut" className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Departure Date</Label>
                                            <Input id="checkOut" type="date" min={form.checkIn || minDate} className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm" value={form.checkOut} onChange={update('checkOut')} required />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="purpose" className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Primary Purpose of Visit</Label>
                                        <Select value={form.purpose} onValueChange={(v) => setForm({ ...form, purpose: v })}>
                                            <SelectTrigger className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-sm border-2 border-border">
                                                <SelectItem value="academic" className="font-noto-medium text-sm">Academic / Educational</SelectItem>
                                                <SelectItem value="business" className="font-noto-medium text-sm">Official / Business</SelectItem>
                                                <SelectItem value="personal" className="font-noto-medium text-sm">Personal Visit</SelectItem>
                                                <SelectItem value="other" className="font-noto-medium text-sm">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="purposeDetails" className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Detailed Justification (Optional)</Label>
                                        <Input id="purposeDetails" className="rounded-sm border-2 border-border h-10 font-noto-medium text-sm" value={form.purposeDetails} onChange={update('purposeDetails')} placeholder="Provide brief context..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="specialRequests" className="text-[10px] font-noto-bold text-foreground uppercase tracking-widest">Special Accommodations (Optional)</Label>
                                        <Textarea id="specialRequests" className="rounded-sm border-2 border-border font-noto-medium text-sm" value={form.specialRequests} onChange={update('specialRequests')} placeholder="Enter specific requirements..." rows={3} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Summary Sidebar */}
                        <div>
                            <Card className="sticky top-24 rounded-sm border-2 border-[#0056b3] dark:border-cyan-700 bg-card shadow-sm overflow-hidden">
                                <CardHeader className="bg-[#0056b3] dark:bg-cyan-800 p-3">
                                    <CardTitle className="text-sm font-noto-bold text-white uppercase tracking-wide text-center">Estimation Ledger</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="p-5 border-b border-border bg-background">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted/30 border border-border">
                                                <BedDouble className="h-4 w-4 text-[#0056b3] dark:text-cyan-500" />
                                            </div>
                                            <span className="text-sm font-noto-bold uppercase tracking-tight text-foreground">Room {room?.roomNumber}</span>
                                        </div>
                                        <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest pl-11">
                                            {room?.type} · Floor {room?.floor} · Block {room?.block}
                                        </p>
                                    </div>

                                    <div className="p-5 space-y-4 text-sm bg-muted/5 font-noto-medium">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">Base Price (Per Night)</span>
                                            <span className="font-noto-bold">₹{room?.pricePerNight}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">Calculated Nights</span>
                                            <span className="font-noto-bold">{nights || '—'}</span>
                                        </div>

                                        <Separator className="bg-border" />

                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-noto-bold text-foreground uppercase tracking-widest">Total Projection</span>
                                            <span className="text-lg font-noto-bold text-[#0056b3] dark:text-cyan-500">₹{totalAmount || '—'}</span>
                                        </div>
                                    </div>

                                    <div className="p-5 border-t border-border bg-background space-y-4">
                                        <Badge variant="outline" className="w-full justify-center py-2 rounded-sm border-border text-[10px] font-noto-bold uppercase tracking-widest">
                                            Payment: Processing At Reception
                                        </Badge>

                                        <Button
                                            type="submit"
                                            className="w-full rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold h-10 uppercase tracking-wider text-xs"
                                            disabled={submitting || nights <= 0}
                                        >
                                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Submit Requisition
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
