'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { ImageSlider } from '@/components/ui/ImageSlider';
import { ReviewCarousel } from '@/components/ui/ReviewCarousel';
import {
    BedDouble,
    MapPin,
    Wifi,
    Dumbbell,
    Wind,
    Tv,
    Car,
    ArrowLeft,
    Calendar,
    IndianRupee,
    Info,
    Star,
    MessageSquare,
    AlertCircle,
    Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const facilityIcons = { WiFi: Wifi, Gym: Dumbbell, AC: Wind, TV: Tv, Parking: Car };
const statusColors = {
    vacant: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-600',
    booked: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-600',
    held: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-600',
    maintenance: 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-600',
};

export default function RoomDetailPage({ params }) {
    const { id } = use(params);
    const [room, setRoom] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.rooms.getById(id);
                setRoom(res.data.room);

                try {
                    const reviewsRes = await api.reviews.getByRoom(id);
                    setReviews(reviewsRes.data.reviews || []);
                } catch (e) {
                    console.error("Failed to load reviews");
                }
            } catch {
                toast.error('Room not found');
                router.push('/rooms');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id, router]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="mb-4 h-8 w-48" />
                <Skeleton className="mb-8 h-4 w-72" />
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (!room) return null;

    return (
        <div className="container mx-auto px-4 py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Button variant="ghost" size="sm" className="mb-6 rounded-sm font-noto-bold text-muted-foreground hover:text-foreground" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Rooms List
                </Button>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Info */}
                    <div className="space-y-6 lg:col-span-2">
                        <div className="flex items-start justify-between border-b-2 border-border pb-4">
                            <div>
                                <h1 className="text-3xl font-noto-bold tracking-tight text-foreground uppercase">Room {room.roomNumber}</h1>
                                <div className="mt-2 flex items-center gap-4 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4 text-[#0056b3] dark:text-cyan-500" />
                                        Floor {room.floor} · Block {room.block}
                                    </span>
                                    {room.numReviews > 0 && (
                                        <span className="flex items-center gap-1 text-amber-500 border-l-2 border-border pl-4">
                                            <Star className="h-3.5 w-3.5 fill-amber-500" />
                                            {room.rating.toFixed(1)} ({room.numReviews} Reviews)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Badge variant="outline" className={`rounded-sm border uppercase text-[10px] font-noto-bold tracking-widest px-3 py-1 ${statusColors[room.status]}`}>
                                {room.status}
                            </Badge>
                        </div>

                        {/* Room Images Slider */}
                        {room?.images?.length > 0 && (
                            <div className="rounded-sm overflow-hidden border-2 border-border shadow-sm h-75 sm:h-100">
                                <ImageSlider images={room.images} autoPlay className="w-full h-full" />
                            </div>
                        )}

                        <Card className="rounded-sm border-2 border-border bg-card shadow-sm overflow-hidden">
                            <CardHeader className="p-4 border-b border-border bg-muted/10">
                                <CardTitle className="text-base font-noto-bold text-foreground tracking-wide uppercase">Official Accommodation Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="grid gap-6 sm:grid-cols-2 p-5">
                                    <div className="flex items-start gap-3 p-3 border border-border/50 rounded-sm bg-background">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted/30 border border-border">
                                            <BedDouble className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-0.5">Occupancy Type</p>
                                            <p className="text-sm font-noto-bold text-foreground capitalize">{room.type} Room</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 border border-border/50 rounded-sm bg-background">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted/30 border border-border">
                                            <IndianRupee className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-0.5">Approved Price</p>
                                            <p className="text-sm font-noto-bold text-foreground">₹{room.pricePerNight} <span className="text-[10px] font-noto-medium text-muted-foreground uppercase tracking-wider">/ night</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 border border-border/50 rounded-sm bg-background">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted/30 border border-border">
                                            <MapPin className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-0.5">Location Code</p>
                                            <p className="text-sm font-noto-bold text-foreground uppercase">F{room.floor}-B{room.block}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 border border-border/50 rounded-sm bg-background">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted/30 border border-border">
                                            <Info className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-0.5">Current Status</p>
                                            <p className="text-sm font-noto-bold text-foreground capitalize">{room.status}</p>
                                        </div>
                                    </div>
                                </div>

                                {(room.description || room.facilities?.length > 0) && (
                                    <div className="border-t border-border bg-muted/5 p-5 space-y-5">
                                        {room.description && (
                                            <div>
                                                <h4 className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-1.5">Room Description</h4>
                                                <p className="text-sm font-noto-medium text-foreground leading-relaxed text-justify">{room.description}</p>
                                            </div>
                                        )}
                                        {room.facilities?.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-2">Available Amenities</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {room.facilities.map((f) => {
                                                        const Icon = facilityIcons[f];
                                                        return (
                                                            <Badge key={f} variant="outline" className="rounded-sm bg-background border-border text-[10px] uppercase font-noto-bold tracking-widest gap-1.5 pr-2 py-0.5">
                                                                {Icon && <Icon className="h-3 w-3 text-[#0056b3] dark:text-cyan-600" />}
                                                                {f}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Maintenance Schedule Section */}
                        {room.status === 'maintenance' && room.maintenanceSchedule?.startDate && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="rounded-sm border-2 border-amber-600/30 bg-amber-50 dark:bg-amber-950/20 shadow-sm overflow-hidden">
                                    <CardHeader className="p-4 border-b border-amber-600/30 bg-amber-100/30 dark:bg-amber-950/40">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0" />
                                            <CardTitle className="text-base font-noto-bold text-amber-900 dark:text-amber-300 tracking-wide uppercase">Maintenance Schedule</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="flex items-start gap-3 p-3 border border-amber-600/20 rounded-sm bg-background/50">
                                                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-1 shrink-0" />
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-1">Start Date</p>
                                                    <p className="text-sm font-noto-bold text-foreground">
                                                        {new Date(room.maintenanceSchedule.startDate).toLocaleDateString('en-IN', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 p-3 border border-amber-600/20 rounded-sm bg-background/50">
                                                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-1 shrink-0" />
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-1">End Date</p>
                                                    <p className="text-sm font-noto-bold text-foreground">
                                                        {new Date(room.maintenanceSchedule.endDate).toLocaleDateString('en-IN', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {room.maintenanceSchedule.reason && (
                                            <div className="p-3 border border-amber-600/20 rounded-sm bg-background/50">
                                                <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-1.5">Maintenance Reason</p>
                                                <p className="text-sm font-noto-medium text-foreground">{room.maintenanceSchedule.reason}</p>
                                            </div>
                                        )}
                                        <div className="rounded-sm bg-amber-100/30 dark:bg-amber-950/40 border border-amber-600/20 p-3">
                                            <p className="text-xs font-noto-medium text-amber-900 dark:text-amber-300 text-center">
                                                This room is currently under maintenance and is not available for booking during the scheduled period.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Reviews Section */}
                        <div className="mt-10 overflow-hidden">
                            <div className="flex items-center justify-between border-b-2 border-border pb-2 mb-2">
                                <h3 className="text-sm font-noto-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-[#0056b3] dark:text-cyan-500" />
                                    Guest Feedback Ledger
                                </h3>
                                {reviews.length > 0 && (
                                    <span className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest bg-muted/30 px-2 py-0.5 rounded-sm border border-border">
                                        {reviews.length} Verified Records
                                    </span>
                                )}
                            </div>

                            {reviews.length === 0 ? (
                                <div className="p-6 text-center border-2 border-border border-dashed rounded-sm bg-muted/10">
                                    <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest italic">No official feedback has been recorded for this room yet.</p>
                                </div>
                            ) : (
                                <ReviewCarousel reviews={reviews} />
                            )}
                        </div>
                    </div>

                    {/* Booking Action Card */}
                    <div>
                        <Card className="sticky top-24 rounded-sm border-2 border-[#0056b3] dark:border-cyan-700 bg-card shadow-sm overflow-hidden">
                            <CardHeader className="bg-[#0056b3] dark:bg-cyan-800 text-white p-3">
                                <CardTitle className="text-sm font-noto-bold text-center tracking-wide uppercase">Initiate Booking</CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-5">
                                <div className="text-center">
                                    <p className="text-3xl font-noto-bold text-[#0056b3] dark:text-cyan-500 tracking-tighter">₹{room.pricePerNight}</p>
                                    <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mt-0.5">Per Night Subject to Approval</p>
                                </div>

                                <Separator className="bg-border" />

                                {room.status === 'vacant' ? (
                                    user ? (
                                        <Button
                                            className="w-full rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold h-10 uppercase tracking-wider text-xs"
                                            asChild
                                        >
                                            <Link href={`/book/${room._id}`}>
                                                <Calendar className="mr-2 h-3.5 w-3.5" />
                                                Proceed to Application
                                            </Link>
                                        </Button>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-center text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">
                                                Authentication required to apply
                                            </p>
                                            <Button className="w-full rounded-sm border-2 border-[#0056b3] dark:border-cyan-600 font-noto-bold h-10 uppercase tracking-wider text-xs" variant="outline" asChild>
                                                <Link href="/login">Secure Sign In</Link>
                                            </Button>
                                        </div>
                                    )
                                ) : (
                                    <div className="rounded-sm border border-border bg-muted/30 p-4 text-center">
                                        <p className="text-sm font-noto-bold text-muted-foreground uppercase tracking-widest">
                                            Room is Currently {room.status}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">Cannot accept new applications.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
