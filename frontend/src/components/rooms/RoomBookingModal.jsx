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
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} className="overflow-x-hidden">
            <DialogContent
                showCloseButton={true}
                className="!fixed !inset-auto !z-[70] !p-0 !m-0 !max-w-none !translate-x-[-50%] !translate-y-[-50%] !top-[50%] !left-[50%] flex flex-col gap-0 border-2 border-[#004A99] dark:border-cyan-800 rounded-xl bg-background shadow-2xl overflow-hidden w-[clamp(280px,90vw,500px)] max-h-[calc(100vh-120px)] contain-layout-style p-2"
            >
                <DialogTitle className="sr-only">Room {room?.roomNumber} Requisition</DialogTitle>
                <DialogDescription className="sr-only">Official Room Requisition Portal</DialogDescription>

                {/* Header Area */}
                {loading ? (
                    <div className="p-4 sm:p-6 border-b border-border bg-muted/5 shrink-0">
                        <Skeleton className="h-8 w-40 sm:w-56" />
                    </div>
                ) : room ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b-2 border-[#004A99]/20 bg-muted/5 shrink-0 relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 w-full sm:w-auto">
                            <div className="w-full sm:w-auto">
                                <h2 className="text-lg sm:text-2xl font-noto-bold tracking-tighter text-[#004A99] dark:text-cyan-500 uppercase">Unit {room.roomNumber}</h2>
                            </div>
                            <div className="hidden sm:block h-8 w-[2px] bg-border/40" />
                            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-4 text-[8px] sm:text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="h-3 w-3 sm:h-3.5 w-3.5 text-[#004A99] dark:text-cyan-500" />
                                    Floor {room.floor} • Block {room.block}
                                </span>
                                {room.numReviews > 0 && (
                                    <span className="flex items-center gap-1.5 text-amber-600 sm:border-l sm:border-border/40 sm:pl-4">
                                        <Star className="h-3 w-3 sm:h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                        {room.rating.toFixed(1)} / 5.0
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className={`border px-2 sm:px-4 py-0.5 rounded-md text-[7px] sm:text-[9px] font-noto-bold tracking-[0.15em] uppercase ${room.status === 'vacant' ? 'status-vacant-text status-vacant-border' :
                                room.status === 'booked' ? 'status-booked-text status-booked-border' :
                                    room.status === 'held' ? 'status-held-text status-held-border' :
                                        room.status === 'suspended' ? 'border-purple-200 text-purple-600 bg-purple-50' :
                                            'status-maintenance-text status-maintenance-border'
                                }`}>
                                STATUS: {room.status}
                            </div>
                            {room.status === 'suspended' && room.suspensionRecord?.startDate && (
                                <div className="text-[7px] font-noto-bold text-purple-600 uppercase tracking-widest bg-purple-50 px-1.5 py-0.5 rounded-sm border border-purple-100">
                                    Period: {new Date(room.suspensionRecord.startDate).toLocaleDateString()} - {room.suspensionRecord.endDate ? new Date(room.suspensionRecord.endDate).toLocaleDateString() : 'Indefinite'}
                                </div>
                            )}
                            {room.status === 'maintenance' && room.maintenanceSchedule?.startDate && (
                                <div className="text-[7px] font-noto-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded-sm border border-slate-200">
                                    Period: {new Date(room.maintenanceSchedule.startDate).toLocaleDateString()} - {room.maintenanceSchedule.endDate ? new Date(room.maintenanceSchedule.endDate).toLocaleDateString() : 'Indefinite'}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-background">
                    {loading ? (
                        <div className="grid gap-8 lg:grid-cols-2">
                            <Skeleton className="h-[400px] w-full rounded-md" />
                            <Skeleton className="h-[400px] w-full rounded-md" />
                        </div>
                    ) : room ? (
                        <div className="grid gap-10 lg:grid-cols-12">
                            {/* Left Column: Room Details (Column Span 5) */}
                            <div className="lg:col-span-5 space-y-8">
                                {/* Room Images Slider */}
                                {room?.images?.length > 0 && (
                                    <div className="rounded-md overflow-hidden border border-border/60 shadow-md h-48 sm:h-72 w-full relative group">
                                        <ImageSlider images={room.images} autoPlay className="w-full h-full" />
                                        <div className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-[#004A99]/80 text-white text-[9px] font-noto-bold uppercase tracking-wider">
                                            Official Documentation Photo
                                        </div>
                                    </div>
                                )}

                                {/* Official Specification Grid */}
                                <div className="space-y-5">
                                    <h3 className="text-[11px] font-noto-bold text-[#004A99] dark:text-cyan-600 uppercase tracking-[0.2em] border-b border-border pb-1.5">Unit Specification</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { label: 'Occupancy Type', value: `${room.type} Room`, icon: BedDouble },
                                            { label: 'Authorized Tariff', value: `₹${room.pricePerNight} / Night`, icon: IndianRupee },
                                            { label: 'Inventory Code', value: `F${room.floor}-B${room.block}`, icon: Info },
                                            { label: 'Verification Status', value: 'Certified', icon: Clock },
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex flex-col p-3 border border-border/60 bg-muted/5 relative overflow-hidden">
                                                <item.icon className="h-3.5 w-3.5 absolute top-3 right-3 text-[#004A99]/40 dark:text-cyan-600/40" />
                                                <span className="text-[9px] font-noto-bold text-muted-foreground uppercase mb-0.5">{item.label}</span>
                                                <span className="text-xs font-noto-bold text-foreground break-words pr-5">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {room.description && (
                                        <div className="p-3 bg-[#004A99]/5 border-l-4 border-[#004A99]">
                                            <p className="text-xs font-noto-medium text-foreground leading-relaxed italic break-words">"{room.description}"</p>
                                        </div>
                                    )}

                                    {room.facilities?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                                            {room.facilities.map((f) => {
                                                const Icon = facilityIcons[f];
                                                return (
                                                    <div key={f} className="flex items-center gap-1.5 px-2.5 py-1 border border-border/80 bg-background text-[9px] font-noto-bold uppercase tracking-wider">
                                                        {Icon && <Icon className="h-3 w-3 text-[#004A99] dark:text-cyan-600" />}
                                                        {f}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Guest Feedback Summary */}
                                <div className="space-y-5 pt-3">
                                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                                        <h3 className="text-[11px] font-noto-bold text-[#004A99] dark:text-cyan-600 uppercase tracking-[0.2em]">GUESTS FEEDBACK</h3>
                                        <span className="text-[8px] font-noto-bold text-muted-foreground uppercase">{reviews.length} Files</span>
                                    </div>
                                    {reviews.length === 0 ? (
                                        <div className="p-3 text-center border-2 border-dashed border-border/40 bg-muted/5">
                                            <p className="text-[9px] font-noto-bold text-muted-foreground uppercase italic tracking-widest">No records found</p>
                                        </div>
                                    ) : (
                                        <div className="relative group w-full overflow-hidden">
                                            <ReviewCarousel reviews={reviews} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Requisition Form (Column Span 7) */}
                            <div className="lg:col-span-7 w-full">
                                <div className="border-0 sm:border border-border/60 rounded-none sm:rounded-xl bg-card p-4 sm:p-8 shadow-none sm:shadow-lg relative overflow-hidden">
                                    <div className="hidden sm:block absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-[#004A99]" />

                                    <h3 className="text-lg sm:text-xl font-noto-bold text-[#004A99] dark:text-cyan-500 uppercase tracking-tighter mb-5 sm:mb-6 flex items-center gap-2.5">
                                        Formal Room Requisition
                                        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/30" />
                                    </h3>

                                    {room.status === 'vacant' ? (
                                        user ? (
                                            <form onSubmit={handleSubmit} className="space-y-6">
                                                {/* Applicant Information Section */}
                                                <div className="space-y-5">
                                                    <div className="flex items-center gap-3 border-b border-border pb-1.5 mb-3">
                                                        <span className="h-5 w-5 rounded-full bg-[#004A99] text-white flex items-center justify-center text-[9px] font-noto-bold">01</span>
                                                        <h4 className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">Registrant Information</h4>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <Label className="text-[9px] font-noto-bold text-foreground uppercase pl-1">Full Identity Name (As per Aadhar/ID)</Label>
                                                            <Input className="rounded-md border-2 border-border focus:border-[#004A99] focus:ring-0 h-10 font-noto-medium text-xs transition-all" value={form.guestName} onChange={update('guestName')} required />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] font-noto-bold text-foreground uppercase pl-1">Official Email Address</Label>
                                                                <Input type="email" className="rounded-md border-2 border-border focus:border-[#004A99] focus:ring-0 h-10 font-noto-medium text-xs transition-all" value={form.email} onChange={update('email')} required />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] font-noto-bold text-foreground uppercase pl-1">Contact Terminal Number</Label>
                                                                <Input className="rounded-md border-2 border-border focus:border-[#004A99] focus:ring-0 h-10 font-noto-medium text-xs transition-all" value={form.phone} onChange={update('phone')} required maxLength={10} minLength={10} pattern="[0-9]*" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Stay Logistics Section */}
                                                <div className="space-y-5">
                                                    <div className="flex items-center gap-3 border-b border-border pb-1.5 mb-3">
                                                        <span className="h-5 w-5 rounded-full bg-[#004A99] text-white flex items-center justify-center text-[9px] font-noto-bold">02</span>
                                                        <h4 className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">Occupancy Logistics</h4>
                                                    </div>
                                                    <div className="space-y-5">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] font-noto-bold text-foreground uppercase pl-1">Scheduled Arrival</Label>
                                                                <Input type="date" min={minDate} className="rounded-md border-2 border-border h-10 font-noto-medium text-xs transition-all" value={form.checkIn} onChange={update('checkIn')} required />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] font-noto-bold text-foreground uppercase pl-1">Scheduled Departure</Label>
                                                                <Input type="date" min={form.checkIn || minDate} className="rounded-md border-2 border-border h-10 font-noto-medium text-xs transition-all" value={form.checkOut} onChange={update('checkOut')} required />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] font-noto-bold text-foreground uppercase pl-1">Nature of Visit</Label>
                                                                <Select value={form.purpose} onValueChange={(v) => setForm({ ...form, purpose: v })}>
                                                                    <SelectTrigger className="rounded-md border-2 border-border focus:ring-0 h-10 font-noto-medium text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-md">
                                                                        <SelectItem value="academic" className="font-noto-medium text-xs">Academic / Research</SelectItem>
                                                                        <SelectItem value="business" className="font-noto-medium text-xs">Official / Govt Business</SelectItem>
                                                                        <SelectItem value="personal" className="font-noto-medium text-xs">Personal Visit</SelectItem>
                                                                        <SelectItem value="other" className="font-noto-medium text-xs">Other Allocation</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] font-noto-bold text-foreground uppercase pl-1">Total Authorized Occupants</Label>
                                                                <Select value={String(form.numberOfGuests)} onValueChange={(v) => setForm({ ...form, numberOfGuests: v })}>
                                                                    <SelectTrigger className="rounded-md border-2 border-border focus:ring-0 h-10 font-noto-medium text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-md">
                                                                        {[1, 2, 3, 4].map((n) => (
                                                                            <SelectItem key={n} value={String(n)} className="font-noto-medium text-xs">{n} Person{n > 1 ? 's' : ''}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[9px] font-noto-bold text-foreground uppercase pl-1">Procedural Requirements (Optional)</Label>
                                                            <Textarea className="rounded-md border-2 border-border focus:border-[#004A99] focus:ring-0 font-noto-medium text-xs resize-none h-20 transition-all" value={form.specialRequests} onChange={update('specialRequests')} placeholder="Indicate any specific protocol requirements or assistance needed..." />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Requisition Summary Table */}
                                                <div className="pt-6 sm:pt-8 border-t-2 border-border scroll-pb-20">
                                                    <div className="bg-muted/10 border-2 border-[#004A99]/10 p-3 sm:p-5 space-y-3 rounded-lg">
                                                        <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-noto-bold text-muted-foreground uppercase tracking-[0.15em]">
                                                            <span>Duration</span>
                                                            <span className="text-foreground text-[11px] uppercase">{nights || '—'} Night(s)</span>
                                                        </div>
                                                        <div className="h-[1px] bg-border/40" />
                                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
                                                            <div className="w-full sm:w-auto">
                                                                <p className="text-[9px] font-noto-bold text-[#004A99] dark:text-cyan-600 uppercase tracking-widest pl-0.5">Estimated Tariff</p>
                                                                <p className="text-[10px] sm:text-xs font-noto-medium text-muted-foreground mt-0.5">Inclusive of official amenities</p>
                                                            </div>
                                                            <div className="w-full sm:w-auto text-left sm:text-right">
                                                                <span className="text-xl sm:text-2xl font-noto-bold text-[#004A99] dark:text-cyan-500">₹{totalAmount.toLocaleString('en-IN') || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="sticky bottom-0 bg-background py-4">
                                                        <Button
                                                            type="submit"
                                                            className="w-full rounded-md bg-[#004A99] text-white hover:bg-[#003875] font-noto-bold h-12 uppercase tracking-[0.15em] text-xs transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                                                            disabled={submitting || nights <= 0}
                                                        >
                                                            {submitting ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : null}
                                                            Execute Requisition Entry
                                                        </Button>
                                                    </div>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="py-10 sm:py-16 text-center border-2 border-dashed border-border/60 bg-muted/5 flex flex-col items-center justify-center p-4">
                                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#004A99]/10 flex items-center justify-center mb-4 sm:mb-5">
                                                    <Info className="h-5 w-5 sm:h-6 sm:w-6 text-[#004A99]" />
                                                </div>
                                                <p className="text-sm sm:text-base font-noto-bold text-foreground uppercase tracking-tight mb-1.5">Unauthorized Access</p>
                                                <p className="text-[11px] sm:text-xs font-noto-medium text-muted-foreground max-w-xs mb-6 sm:mb-8">Authentication via the official identity portal is required to initiate a room requisition.</p>
                                                <Button className="w-full sm:w-auto rounded-md bg-[#004A99] hover:bg-[#003875] text-white font-noto-bold uppercase tracking-[0.15em] text-[9px] sm:text-[10px] h-10 px-10 transition-all shadow-md" asChild>
                                                    <a href="/login">Portal Login</a>
                                                </Button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="py-10 sm:py-16 text-center border-2 border-dashed border-red-200 bg-red-50/10 flex flex-col items-center justify-center p-4">
                                            <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-500 mb-4 sm:mb-5 opacity-60" />
                                            <p className="text-sm sm:text-base font-noto-bold text-red-700 uppercase tracking-tight mb-1.5">Resource Unavailable</p>
                                            <p className="text-[11px] sm:text-xs font-noto-medium text-muted-foreground max-w-xs">This unit is currently registered as <span className="font-bold text-foreground uppercase">"{room.status}"</span> and is ineligible for new requisition entries at this time.</p>
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

