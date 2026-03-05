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
} from 'lucide-react';
import { toast } from 'sonner';

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
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.rooms.getById(id);
                setRoom(res.data.room);
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
                                <p className="mt-1 flex items-center gap-2 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                                    <MapPin className="h-4 w-4 text-[#0056b3] dark:text-cyan-500" />
                                    Floor {room.floor} · Block {room.block}
                                </p>
                            </div>
                            <Badge variant="outline" className={`rounded-sm border uppercase text-[10px] font-noto-bold tracking-widest px-3 py-1 ${statusColors[room.status]}`}>
                                {room.status}
                            </Badge>
                        </div>

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
                                            <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest mb-0.5">Approved Tariff</p>
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
