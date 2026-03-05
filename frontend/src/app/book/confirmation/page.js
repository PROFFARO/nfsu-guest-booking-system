'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BookingConfirmationPage() {
    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="border-border/40 bg-card/50 text-center">
                    <CardContent className="p-8">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
                            <CheckCircle className="h-10 w-10 text-emerald-500" />
                        </div>
                        <h1 className="mb-2 text-2xl font-bold">Booking Confirmed!</h1>
                        <p className="mb-6 text-muted-foreground">
                            Your reservation has been successfully created. Please pay at the reception during check-in.
                        </p>
                        <div className="flex flex-col gap-3">
                            <Button asChild variant="cta">
                                <Link href="/dashboard/bookings">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    View My Bookings
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/rooms">
                                    Browse More Rooms <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
