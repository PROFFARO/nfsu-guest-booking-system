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
                <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>

                <h1 className="mb-2 text-3xl font-bold">Complete Your Booking</h1>
                <p className="mb-8 text-muted-foreground">Fill in the details to reserve Room {room?.roomNumber}</p>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-8 lg:grid-cols-3">
                        {/* Form Fields */}
                        <div className="space-y-6 lg:col-span-2">
                            <Card className="border-border/40 bg-card/50">
                                <CardHeader>
                                    <CardTitle>Guest Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="guestName">Full Name</Label>
                                            <Input id="guestName" value={form.guestName} onChange={update('guestName')} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input id="email" type="email" value={form.email} onChange={update('email')} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone</Label>
                                            <Input id="phone" value={form.phone} onChange={update('phone')} required maxLength={10} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="numberOfGuests">Guests</Label>
                                            <Select value={String(form.numberOfGuests)} onValueChange={(v) => setForm({ ...form, numberOfGuests: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {[1, 2, 3, 4].map((n) => (
                                                        <SelectItem key={n} value={String(n)}>{n} Guest{n > 1 ? 's' : ''}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border/40 bg-card/50">
                                <CardHeader>
                                    <CardTitle>Stay Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="checkIn">Check-in Date</Label>
                                            <Input id="checkIn" type="date" min={minDate} value={form.checkIn} onChange={update('checkIn')} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="checkOut">Check-out Date</Label>
                                            <Input id="checkOut" type="date" min={form.checkIn || minDate} value={form.checkOut} onChange={update('checkOut')} required />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="purpose">Purpose of Stay</Label>
                                        <Select value={form.purpose} onValueChange={(v) => setForm({ ...form, purpose: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="academic">Academic</SelectItem>
                                                <SelectItem value="business">Business</SelectItem>
                                                <SelectItem value="personal">Personal</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="purposeDetails">Purpose Details (optional)</Label>
                                        <Input id="purposeDetails" value={form.purposeDetails} onChange={update('purposeDetails')} placeholder="Brief description..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="specialRequests">Special Requests (optional)</Label>
                                        <Textarea id="specialRequests" value={form.specialRequests} onChange={update('specialRequests')} placeholder="Any specific requirements..." rows={3} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Summary Sidebar */}
                        <div>
                            <Card className="sticky top-24 border-border/40 bg-card/50">
                                <CardHeader>
                                    <CardTitle>Booking Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <BedDouble className="h-5 w-5 text-cyan-500" />
                                            <span className="font-semibold">Room {room?.roomNumber}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground capitalize">{room?.type} · Floor {room?.floor} · Block {room?.block}</p>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Rate per night</span>
                                            <span>₹{room?.pricePerNight}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Nights</span>
                                            <span>{nights || '—'}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between text-base font-semibold">
                                            <span>Total</span>
                                            <span className="text-cyan-500">₹{totalAmount || '—'}</span>
                                        </div>
                                    </div>

                                    <Badge variant="secondary" className="w-full justify-center py-1.5">
                                        Pay at Reception (Cash)
                                    </Badge>

                                    <Button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                                        disabled={submitting || nights <= 0}
                                    >
                                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Confirm Booking
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
