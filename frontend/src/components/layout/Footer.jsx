'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function Footer() {
    return (
        <footer className="border-t-2 border-border bg-card">
            <div className="container mx-auto px-4 py-12">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
                            <div className="flex items-center justify-center p-1">
                                <img
                                    src="/logo.png"
                                    alt="NFSU Logo"
                                    className="h-12 w-auto object-contain"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                    }}
                                />
                                <div className="hidden h-10 w-10 items-center justify-center rounded-sm bg-[#0056b3] shadow-inner">
                                    <Building2 className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div className="flex flex-col flex-1 pl-1 border-l-2 border-border ml-1">
                                <span className="text-[17px] font-noto-bold tracking-tight text-foreground leading-tight">
                                    NFSU Guest Management
                                </span>
                                <span className="text-[10px] font-noto-medium text-muted-foreground uppercase tracking-widest leading-none">
                                    Official Booking Portal
                                </span>
                            </div>
                        </Link>
                        <p className="text-sm font-noto-medium text-muted-foreground leading-relaxed mt-2">
                            NFSU Guest House Booking System <br /> Provides accommodation facilities for official guests and visitors.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-noto-bold uppercase tracking-widest text-foreground border-b border-border pb-2 inline-block">Quick Links</h4>
                        <div className="flex flex-col gap-2.5 mt-2">
                            <Link href="/rooms" className="text-sm font-noto-medium text-muted-foreground hover:text-[#0056b3] dark:hover:text-cyan-400 transition-colors">Browse Rooms</Link>
                            <Link href="/login" className="text-sm font-noto-medium text-muted-foreground hover:text-[#0056b3] dark:hover:text-cyan-400 transition-colors">Sign In</Link>
                            <Link href="/register" className="text-sm font-noto-medium text-muted-foreground hover:text-[#0056b3] dark:hover:text-cyan-400 transition-colors">Register Account</Link>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-noto-bold uppercase tracking-widest text-foreground border-b border-border pb-2 inline-block">Contact</h4>
                        <div className="flex flex-col gap-2.5 text-sm font-noto-medium text-muted-foreground mt-2">
                            <p>National Forensic Sciences University, Delhi</p>
                            <p>Office Timings: <span className="font-noto-bold font-bold">09:00 AM - 06:00 PM</span></p>

                            <p>LNJN-NICFS Campus, Near Jaipur Golden Hospital, Outer Ring Rd,
                                Institutional Area, Sector 3, Rohini,
                                Delhi-110085</p>
                            <p>Call Us: <span className="font-noto-bold font-bold">911127521091, 911127514161, 911127512371</span></p>
                            <p><button onClick={() => window.location.href = "mailto:[EMAIL_ADDRESS]"} className="text-[#0056b3] dark:text-cyan-400 cursor-pointer">directoroffice_dc@nfsu.ac.in</button></p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-noto-bold uppercase tracking-widest text-foreground border-b border-border pb-2 inline-block">Information</h4>
                        <div className="flex flex-col gap-2.5 text-sm font-noto-medium text-muted-foreground mt-2">
                            <p>78 rooms across 6 floors</p>
                            <p>Single & Double occupancy</p>
                            <p>24/7 Support Desk</p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-border text-center">
                    <p className="text-xs font-noto-regular text-muted-foreground leading-relaxed max-w-5xl mx-auto">
                        <strong className="font-noto-bold text-foreground">Translation Disclaimer:</strong> This portal provides information in multiple languages for user convenience. However, for all official, legal, and administrative purposes, the English version of this portal and its related documents shall be the authoritative version. Translations on this portal are for informational purposes only and may not fully capture the meaning or intent of the original English text. In case of discrepancies between the English version and any translation, the English version shall prevail.
                    </p>
                </div>

                <div className="mt-6 pt-6 border-t border-border flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="text-xs font-noto-medium text-muted-foreground uppercase tracking-wide">
                        &copy; {new Date().getFullYear()} NFSU Delhi. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
