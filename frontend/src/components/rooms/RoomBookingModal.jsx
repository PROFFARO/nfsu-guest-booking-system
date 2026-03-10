import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageSlider } from '@/components/ui/ImageSlider';
import { ReviewCarousel } from '@/components/ui/ReviewCarousel';
import {
    BedDouble, MapPin, Wifi, Dumbbell, Wind, Tv, Car,
    IndianRupee, Info, Star, MessageSquare, AlertCircle, Clock, Loader2, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const facilityIcons = { WiFi: Wifi, Gym: Dumbbell, AC: Wind, TV: Tv, Parking: Car };

export function RoomBookingModal({ isOpen, onClose, roomId }) {
    const [room, setRoom] = useState(null);
    const [reviews, setReviews] = useState([]);
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
        if (user) {
            setForm((prev) => ({
                ...prev,
                guestName: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
            }));
        }
    }, [user]);

    useEffect(() => {
        if (!isOpen || !roomId) return;
        let isMounted = true;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await api.rooms.getById(roomId);
                if (!isMounted) return;
                setRoom(res.data.room);
                try {
                    const reviewsRes = await api.reviews.getByRoom(roomId);
                    if (isMounted) setReviews(reviewsRes.data.reviews || []);
                } catch (e) {
                    console.error("Failed to load reviews");
                }
            } catch {
                toast.error('Room not found');
                onClose();
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchData();

        return () => { isMounted = false; };
    }, [isOpen, roomId, onClose]);

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const nights = form.checkIn && form.checkOut
        ? Math.max(0, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / (1000 * 60 * 60 * 24)))
        : 0;
    const totalAmount = nights * (room?.pricePerNight || 0);

    const minDate = new Date().toISOString().split('T')[0];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error('Authentication required.');
            router.push('/login');
            return;
        }
        if (user.role === 'admin' || user.role === 'staff') {
            toast.error('Privileged accounts cannot initiate guest requisition.');
            return;
        }
        if (nights <= 0) {
            toast.error('Stay duration must be at least one night.');
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
            toast.success('Official Requisition Submitted Successfully');
            onClose();
            router.push('/book/confirmation');
        } catch (err) {
            toast.error(err.message || 'Submission Failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[100vw] sm:max-w-[98vw] lg:max-w-7xl w-full h-[100dvh] sm:h-[95vh] lg:h-[90vh] p-0 overflow-hidden flex flex-col gap-0 border-0 sm:border-2 border-[#004A99] dark:border-cyan-800 rounded-none sm:rounded-xl bg-background shadow-2xl">
                <DialogTitle className="sr-only">Room {room?.roomNumber} Requisition</DialogTitle>
                <DialogDescription className="sr-only">Official Room Requisition Portal</DialogDescription>

                {/* Header Area */}
                {loading ? (
                    <div className="p-6 sm:p-8 border-b border-border bg-muted/5 shrink-0">
                        <Skeleton className="h-10 w-48 sm:w-64" />
                    </div>
                ) : room ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-8 border-b-2 border-[#004A99]/20 bg-muted/5 shrink-0 relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-8 w-full sm:w-auto">
                            <div className="w-full sm:w-auto">
                                <h2 className="text-xl sm:text-3xl font-noto-bold tracking-tighter text-[#004A99] dark:text-cyan-500 uppercase">Unit {room.roomNumber}</h2>
                            </div>
                            <div className="hidden sm:block h-10 w-[2px] bg-border/40" />
                            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-6 text-[10px] sm:text-[11px] font-noto-bold text-muted-foreground uppercase tracking-widest">
                                <span className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 sm:h-4 w-4 text-[#004A99] dark:text-cyan-500" />
                                    Floor {room.floor} • Block {room.block}
                                </span>
                                {room.numReviews > 0 && (
                                    <span className="flex items-center gap-2 text-amber-600 sm:border-l sm:border-border/40 sm:pl-6">
                                        <Star className="h-3.5 w-3.5 sm:h-4 w-4 fill-amber-500 text-amber-500" />
                                        {room.rating.toFixed(1)} / 5.0
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className={`mt-4 sm:mt-0 border-2 px-4 sm:px-6 py-1 rounded-md text-[9px] sm:text-[10px] font-noto-bold tracking-[0.2em] uppercase ${room.status === 'vacant' ? 'status-vacant-text status-vacant-border' :
                            room.status === 'booked' ? 'status-booked-text status-booked-border' :
                                room.status === 'held' ? 'status-held-text status-held-border' :
                                    'status-maintenance-text status-maintenance-border'
                            }`}>
                            STATUS: {room.status}
                        </div>
                    </div>
                ) : null}

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-10 custom-scrollbar bg-background">
                    {loading ? (
                        <div className="grid gap-10 lg:grid-cols-2">
                            <Skeleton className="h-[500px] w-full rounded-md" />
                            <Skeleton className="h-[500px] w-full rounded-md" />
                        </div>
                    ) : room ? (
                        <div className="grid gap-12 lg:grid-cols-12">
                            {/* Left Column: Room Details (Column Span 5) */}
                            <div className="lg:col-span-5 space-y-10">
                                {/* Room Images Slider */}
                                {room?.images?.length > 0 && (
                                    <div className="rounded-md overflow-hidden border-2 border-border/60 shadow-lg h-56 sm:h-80 w-full relative group">
                                        <ImageSlider images={room.images} autoPlay className="w-full h-full" />
                                        <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-[#004A99]/90 text-white text-[10px] font-noto-bold uppercase tracking-widest">
                                            Official Documentation Photo
                                        </div>
                                    </div>
                                )}

                                {/* Official Specification Grid */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-noto-bold text-[#004A99] dark:text-cyan-600 uppercase tracking-[0.3em] border-b border-border pb-2">Unit Specification</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            { label: 'Occupancy Type', value: `${room.type} Room`, icon: BedDouble },
                                            { label: 'Authorized Tariff', value: `₹${room.pricePerNight} / Night`, icon: IndianRupee },
                                            { label: 'Inventory Code', value: `F${room.floor}-B${room.block}`, icon: Info },
                                            { label: 'Verification Status', value: 'Certified', icon: Clock },
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex flex-col p-4 border border-border/60 bg-muted/5 relative overflow-hidden">
                                                <item.icon className="h-4 w-4 absolute top-4 right-4 text-[#004A99]/40 dark:text-cyan-600/40" />
                                                <span className="text-[10px] font-noto-bold text-muted-foreground uppercase mb-1">{item.label}</span>
                                                <span className="text-sm font-noto-bold text-foreground break-words pr-6">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {room.description && (
                                        <div className="p-4 bg-[#004A99]/5 border-l-4 border-[#004A99]">
                                            <p className="text-sm font-noto-medium text-foreground leading-relaxed italic">"{room.description}"</p>
                                        </div>
                                    )}

                                    {room.facilities?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {room.facilities.map((f) => {
                                                const Icon = facilityIcons[f];
                                                return (
                                                    <div key={f} className="flex items-center gap-2 px-3 py-1.5 border border-border/80 bg-background text-[10px] font-noto-bold uppercase tracking-wider">
                                                        {Icon && <Icon className="h-3.5 w-3.5 text-[#004A99] dark:text-cyan-600" />}
                                                        {f}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Guest Feedback Summary */}
                                <div className="space-y-6 pt-4">
                                    <div className="flex items-center justify-between border-b border-border pb-2">
                                        <h3 className="text-xs font-noto-bold text-[#004A99] dark:text-cyan-600 uppercase tracking-[0.3em]">GUESTS FEEDBACK</h3>
                                        <span className="text-[9px] font-noto-bold text-muted-foreground uppercase">{reviews.length} Files</span>
                                    </div>
                                    {reviews.length === 0 ? (
                                        <div className="p-6 text-center border-2 border-dashed border-border/40 bg-muted/5">
                                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase italic tracking-widest">No records found</p>
                                        </div>
                                    ) : (
                                        <div className="relative group">
                                            <ReviewCarousel reviews={reviews} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Requisition Form (Column Span 7) */}
                            <div className="lg:col-span-7 w-full">
                                <div className="border border-border/60 rounded-xl bg-card p-4 sm:p-10 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 sm:w-2 h-full bg-[#004A99]" />

                                    <h3 className="text-xl sm:text-2xl font-noto-bold text-[#004A99] dark:text-cyan-500 uppercase tracking-tighter mb-6 sm:mb-8 flex items-center gap-3">
                                        Formal Room Requisition
                                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/30" />
                                    </h3>

                                    {room.status === 'vacant' ? (
                                        user ? (
                                            <form onSubmit={handleSubmit} className="space-y-8">
                                                {/* Applicant Information Section */}
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-4 border-b border-border pb-2 mb-4">
                                                        <span className="h-6 w-6 rounded-full bg-[#004A99] text-white flex items-center justify-center text-[10px] font-noto-bold">01</span>
                                                        <h4 className="text-[11px] font-noto-bold text-muted-foreground uppercase tracking-widest">Registrant Information</h4>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[10px] font-noto-bold text-foreground uppercase pl-1">Full Identity Name (As per Aadhar/ID)</Label>
                                                            <Input className="rounded-md border-2 border-border focus:border-[#004A99] focus:ring-0 h-11 font-noto-medium text-sm transition-all" value={form.guestName} onChange={update('guestName')} required />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[10px] font-noto-bold text-foreground uppercase pl-1">Official Email Address</Label>
                                                                <Input type="email" className="rounded-md border-2 border-border focus:border-[#004A99] focus:ring-0 h-11 font-noto-medium text-sm transition-all" value={form.email} onChange={update('email')} required />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[10px] font-noto-bold text-foreground uppercase pl-1">Contact Terminal Number</Label>
                                                                <Input className="rounded-md border-2 border-border focus:border-[#004A99] focus:ring-0 h-11 font-noto-medium text-sm transition-all" value={form.phone} onChange={update('phone')} required maxLength={10} minLength={10} pattern="[0-9]*" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Stay Logistics Section */}
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-4 border-b border-border pb-2 mb-4">
                                                        <span className="h-6 w-6 rounded-full bg-[#004A99] text-white flex items-center justify-center text-[10px] font-noto-bold">02</span>
                                                        <h4 className="text-[11px] font-noto-bold text-muted-foreground uppercase tracking-widest">Occupancy Logistics</h4>
                                                    </div>
                                                    <div className="space-y-6">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[10px] font-noto-bold text-foreground uppercase pl-1">Scheduled Arrival</Label>
                                                                <Input type="date" min={minDate} className="rounded-md border-2 border-border h-11 font-noto-medium text-sm transition-all" value={form.checkIn} onChange={update('checkIn')} required />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[10px] font-noto-bold text-foreground uppercase pl-1">Scheduled Departure</Label>
                                                                <Input type="date" min={form.checkIn || minDate} className="rounded-md border-2 border-border h-11 font-noto-medium text-sm transition-all" value={form.checkOut} onChange={update('checkOut')} required />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[10px] font-noto-bold text-foreground uppercase pl-1">Nature of Visit</Label>
                                                                <Select value={form.purpose} onValueChange={(v) => setForm({ ...form, purpose: v })}>
                                                                    <SelectTrigger className="rounded-md border-2 border-border focus:ring-0 h-11 font-noto-medium text-sm">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-md">
                                                                        <SelectItem value="academic" className="font-noto-medium text-sm">Academic / Research</SelectItem>
                                                                        <SelectItem value="business" className="font-noto-medium text-sm">Official / Govt Business</SelectItem>
                                                                        <SelectItem value="personal" className="font-noto-medium text-sm">Personal Visit</SelectItem>
                                                                        <SelectItem value="other" className="font-noto-medium text-sm">Other Allocation</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[10px] font-noto-bold text-foreground uppercase pl-1">Total Authorized Occupants</Label>
                                                                <Select value={String(form.numberOfGuests)} onValueChange={(v) => setForm({ ...form, numberOfGuests: v })}>
                                                                    <SelectTrigger className="rounded-md border-2 border-border focus:ring-0 h-11 font-noto-medium text-sm">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-md">
                                                                        {[1, 2, 3, 4].map((n) => (
                                                                            <SelectItem key={n} value={String(n)} className="font-noto-medium text-sm">{n} Person{n > 1 ? 's' : ''}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[10px] font-noto-bold text-foreground uppercase pl-1">Procedural Requirements (Optional)</Label>
                                                            <Textarea className="rounded-md border-2 border-border focus:border-[#004A99] focus:ring-0 font-noto-medium text-sm resize-none h-24 transition-all" value={form.specialRequests} onChange={update('specialRequests')} placeholder="Indicate any specific protocol requirements or assistance needed..." />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Requisition Summary Table */}
                                                <div className="pt-6 sm:pt-8 border-t-2 border-border">
                                                    <div className="bg-muted/10 border-2 border-[#004A99]/10 p-4 sm:p-6 space-y-4">
                                                        <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-noto-bold text-muted-foreground uppercase tracking-[0.2em]">
                                                            <span>Requisition Duration</span>
                                                            <span className="text-foreground text-xs sm:text-sm uppercase">{nights || '—'} Night(s)</span>
                                                        </div>
                                                        <div className="h-[1px] bg-border/40" />
                                                        <div className="flex justify-between items-end">
                                                            <div>
                                                                <p className="text-[10px] font-noto-bold text-[#004A99] dark:text-cyan-600 uppercase tracking-widest pl-0.5">Estimated Cumulative Tariff</p>
                                                                <p className="text-sm font-noto-medium text-muted-foreground mt-1">Inclusive of all official amenities</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-3xl font-noto-bold text-[#004A99] dark:text-cyan-500">₹{totalAmount.toLocaleString('en-IN') || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        type="submit"
                                                        className="w-full mt-6 rounded-md bg-[#004A99] text-white hover:bg-[#003875] font-noto-bold h-14 uppercase tracking-[0.2em] text-sm transition-all shadow-xl hover:shadow-2xl disabled:opacity-50"
                                                        disabled={submitting || nights <= 0}
                                                    >
                                                        {submitting ? (
                                                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                                        ) : null}
                                                        Execute Requisition Entry
                                                    </Button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="py-20 text-center border-2 border-dashed border-border/60 bg-muted/5 flex flex-col items-center justify-center">
                                                <div className="h-14 w-14 rounded-full bg-[#004A99]/10 flex items-center justify-center mb-6">
                                                    <Info className="h-7 w-7 text-[#004A99]" />
                                                </div>
                                                <p className="text-lg font-noto-bold text-foreground uppercase tracking-tight mb-2">Unauthorized Access</p>
                                                <p className="text-sm font-noto-medium text-muted-foreground max-w-sm mb-10">Authentication via the official identity portal is required to initiate a room requisition.</p>
                                                <Button className="rounded-md bg-[#004A99] hover:bg-[#003875] text-white font-noto-bold uppercase tracking-[0.2em] text-xs h-12 px-12 transition-all shadow-lg" asChild>
                                                    <a href="/login">Portal Login</a>
                                                </Button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="py-20 text-center border-2 border-dashed border-red-200 bg-red-50/10 flex flex-col items-center justify-center">
                                            <AlertCircle className="h-12 w-12 text-red-500 mb-6 opacity-60" />
                                            <p className="text-lg font-noto-bold text-red-700 uppercase tracking-tight mb-2">Resource Unavailable</p>
                                            <p className="text-sm font-noto-medium text-muted-foreground max-w-sm">This unit is currently registered as <span className="font-bold text-foreground uppercase">"{room.status}"</span> and is ineligible for new requisition entries at this time.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

