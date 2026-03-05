import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function Footer() {
    return (
        <footer className="border-t border-border/40 bg-background/50">
            <div className="container mx-auto px-4 py-12">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                                <Building2 className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-lg font-bold">
                                Campus<span className="text-cyan-500">Stay</span>
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            NFSU Guest House Booking System. Premium accommodation for guests and visitors.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Quick Links</h4>
                        <div className="flex flex-col gap-2">
                            <Link href="/rooms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Browse Rooms</Link>
                            <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Sign In</Link>
                            <Link href="/register" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Register</Link>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Contact</h4>
                        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                            <p>National Forensic Sciences University</p>
                            <p>Gandhinagar, Gujarat</p>
                            <p>guesthouse@nfsu.ac.in</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Information</h4>
                        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                            <p>78 rooms across 6 floors</p>
                            <p>Single & Double occupancy</p>
                            <p>24/7 Support</p>
                        </div>
                    </div>
                </div>

                <Separator className="my-8 opacity-50" />

                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} CampusStay Suite. All rights reserved.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Built for NFSU
                    </p>
                </div>
            </div>
        </footer>
    );
}
