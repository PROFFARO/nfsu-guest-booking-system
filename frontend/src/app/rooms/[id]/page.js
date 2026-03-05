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
    vacant: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    booked: 'bg-red-500/10 text-red-500 border-red-500/20',
    held: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    maintenance: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
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
                <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Rooms
                </Button>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Info */}
                    <div className="space-y-6 lg:col-span-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold">Room {room.roomNumber}</h1>
                                <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    Floor {room.floor} · Block {room.block}
                                </p>
                            </div>
                            <Badge variant="outline" className={`text-sm ${statusColors[room.status]}`}>
                                {room.status}
                            </Badge>
                        </div>

                        <Card className="border-border/40 bg-card/50">
                            <CardContent className="p-6">
                                <h3 className="mb-4 text-lg font-semibold">Room Details</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                                            <BedDouble className="h-5 w-5 text-cyan-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Type</p>
                                            <p className="font-medium capitalize">{room.type} Room</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                                            <IndianRupee className="h-5 w-5 text-cyan-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Price</p>
                                            <p className="font-medium">₹{room.pricePerNight} / night</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                                            <MapPin className="h-5 w-5 text-cyan-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Location</p>
                                            <p className="font-medium">Floor {room.floor}, Block {room.block}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                                            <Info className="h-5 w-5 text-cyan-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Status</p>
                                            <p className="font-medium capitalize">{room.status}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {room.description && (
                            <Card className="border-border/40 bg-card/50">
                                <CardContent className="p-6">
                                    <h3 className="mb-2 text-lg font-semibold">Description</h3>
                                    <p className="text-muted-foreground">{room.description}</p>
                                </CardContent>
                            </Card>
                        )}

                        {room.facilities?.length > 0 && (
                            <Card className="border-border/40 bg-card/50">
                                <CardContent className="p-6">
                                    <h3 className="mb-4 text-lg font-semibold">Facilities</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {room.facilities.map((f) => {
                                            const Icon = facilityIcons[f];
                                            return (
                                                <Badge key={f} variant="secondary" className="gap-2 px-3 py-1.5 text-sm">
                                                    {Icon && <Icon className="h-4 w-4" />}
                                                    {f}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Booking Card */}
                    <div>
                        <Card className="sticky top-24 border-border/40 bg-card/50">
                            <CardHeader>
                                <CardTitle className="text-xl">Book This Room</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-4 text-center">
                                    <p className="text-3xl font-bold text-cyan-500">₹{room.pricePerNight}</p>
                                    <p className="text-sm text-muted-foreground">per night</p>
                                </div>

                                <Separator />

                                {room.status === 'vacant' ? (
                                    user ? (
                                        <Button
                                            className="w-full"
                                            variant="cta"
                                            asChild
                                        >
                                            <Link href={`/book/${room._id}`}>
                                                <Calendar className="mr-2 h-4 w-4" />
                                                Book Now
                                            </Link>
                                        </Button>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-center text-sm text-muted-foreground">
                                                Sign in to book this room
                                            </p>
                                            <Button className="w-full" variant="outline" asChild>
                                                <Link href="/login">Sign In to Book</Link>
                                            </Button>
                                        </div>
                                    )
                                ) : (
                                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            This room is currently {room.status}
                                        </p>
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
