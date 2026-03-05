'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Building2,
  Calendar,
  Shield,
  Clock,
  ArrowRight,
  BedDouble,
  MapPin,
  Info,
  AlertCircle,
  FileText,
  ListTodo
} from 'lucide-react';

const facilities = [
  {
    icon: BedDouble,
    title: 'Accommodation Categories',
    description: 'Single and multiple occupancy rooms available subject to official entitlement and approval.',
  },
  {
    icon: Calendar,
    title: 'Booking Procedures',
    description: 'Real-time room availability verification and official reservation requests through the portal.',
  },
  {
    icon: Shield,
    title: 'Secure Access',
    description: 'Restricted system requiring authorized credentials for active NFSU personnel and verified guests.',
  },
  {
    icon: MapPin,
    title: 'Campus Location',
    description: 'Situated within the high-security zone of National Forensic Sciences University, Delhi.',
  },
];

const notices = [
  { date: '15 Mar 2026', title: 'Revised tariffs effective from next financial year' },
  { date: '02 Mar 2026', title: 'Mandatory ID Verification policy update' },
  { date: '28 Feb 2026', title: 'Scheduled maintenance for South Wing AC units' },
  { date: '10 Jan 2026', title: 'Guest House Booking System v2.0 Live' },
];

const guidelines = [
  "Check-in time is 12:00 PM and Check-out time is 11:00 AM.",
  "Valid Government photo ID (Aadhar, PAN, Official University ID) is mandatory for all occupants at the time of check-in.",
  "Allocation of rooms is strictly subjected to availability and priority set by the competent authority.",
  "Consumption of alcohol, smoking, and possession of illegal substances is strictly prohibited on the premises.",
  "Payment must be cleared before or at the time of check-out; official receipts will be issued."
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin' || user.role === 'staff') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <div className="bg-background min-h-screen">
      {/* Hero & Notice Section Container */}
      <section className="border-b-2 border-border bg-white dark:bg-[#0f172a]">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="grid lg:grid-cols-3 gap-8 items-start">

            {/* Main Welcome Copy */}
            <div className="lg:col-span-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-muted/50 border border-border text-sm font-noto-bold text-[#0056b3] dark:text-cyan-400 tracking-wide uppercase">
                <Building2 className="w-4 h-4" />
                NFSU Delhi Campus
              </div>

              <h1 className="text-3xl lg:text-4xl font-noto-bold text-foreground leading-tight tracking-tight uppercase">
                Official Guest House <br />
                <span className="text-[#0056b3] dark:text-cyan-500">Booking Management System</span>
              </h1>

              <p className="text-base font-noto-medium text-muted-foreground leading-relaxed max-w-2xl text-justify">
                Welcome to the central portal for accommodation management at the National Forensic Sciences University.
                This platform facilitates authorized personnel, visiting faculty, and official guests in reserving rooms
                within the university premises. Please ensure all booking requests comply with the official university guidelines.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button className="rounded-sm bg-[#0056b3] text-white hover:bg-[#004494] font-noto-bold px-8 py-6 uppercase tracking-wider shadow-sm" asChild>
                  <Link href="/login">
                    Access Portal <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" className="rounded-sm border-2 border-border font-noto-bold px-8 py-6 uppercase tracking-wider shadow-sm" asChild>
                  <Link href="/register">Register New Account</Link>
                </Button>
              </div>
            </div>

            {/* Notice Board Side Panel */}
            <div className="lg:col-span-1 border-2 border-[#0056b3] dark:border-cyan-700 bg-white dark:bg-card shadow-sm rounded-sm overflow-hidden flex flex-col h-[320px]">
              <div className="bg-[#0056b3] dark:bg-cyan-800 px-4 py-3 flex items-center justify-between">
                <span className="text-white font-noto-bold text-sm tracking-widest uppercase flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Important Notices
                </span>
              </div>
              <div className="divide-y divide-border overflow-y-auto flex-1">
                {notices.map((notice, idx) => (
                  <div key={idx} className="p-4 hover:bg-muted/10 transition-colors cursor-default">
                    <span className="text-xs font-noto-bold text-[#0056b3] dark:text-cyan-400 block mb-1">{notice.date}</span>
                    <p className="text-sm font-noto-medium text-foreground leading-snug">{notice.title}</p>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-border bg-muted/10 text-center">
                <Link href="#" className="text-xs font-noto-bold text-[#0056b3] dark:text-cyan-500 hover:underline uppercase tracking-wide">View All Notices Archive</Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Statistics Bar */}
      <section className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-around gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-card border border-border shadow-sm rounded-sm"><BedDouble className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" /></div>
              <div>
                <div className="text-xl font-noto-bold text-foreground">78</div>
                <div className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Total Accommodations</div>
              </div>
            </div>
            <div className="w-px h-10 bg-border hidden md:block"></div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-card border border-border shadow-sm rounded-sm"><Building2 className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" /></div>
              <div>
                <div className="text-xl font-noto-bold text-foreground">6</div>
                <div className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Operational Floors</div>
              </div>
            </div>
            <div className="w-px h-10 bg-border hidden md:block"></div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-card border border-border shadow-sm rounded-sm"><Clock className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" /></div>
              <div>
                <div className="text-xl font-noto-bold text-foreground">24/7</div>
                <div className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">Helpdesk Services</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12">

          {/* Facilities Grid */}
          <section className="space-y-6">
            <div className="border-b-2 border-[#0056b3] dark:border-cyan-600 pb-2 inline-block">
              <h2 className="text-2xl font-noto-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <ListTodo className="h-6 w-6 text-[#0056b3] dark:text-cyan-500" />
                Services & Information
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {facilities.map((fac, i) => {
                const Icon = fac.icon;
                return (
                  <Card key={i} className="rounded-sm border-border bg-card shadow-sm hover:border-[#0056b3] dark:hover:border-cyan-600 transition-colors">
                    <CardHeader className="p-4 pb-2 border-b border-border bg-muted/10">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white dark:bg-background border border-border rounded-sm">
                          <Icon className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" />
                        </div>
                        <CardTitle className="text-sm font-noto-bold">{fac.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-3">
                      <p className="text-sm font-noto-medium text-muted-foreground leading-relaxed">
                        {fac.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Guidelines List */}
          <section className="space-y-6">
            <div className="border-b-2 border-[#0056b3] dark:border-cyan-600 pb-2 inline-block">
              <h2 className="text-2xl font-noto-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <FileText className="h-6 w-6 text-[#0056b3] dark:text-cyan-500" />
                Guidelines for Stay
              </h2>
            </div>
            <Card className="rounded-sm border-border bg-card shadow-sm">
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {guidelines.map((rule, idx) => (
                    <li key={idx} className="flex gap-4 p-4 hover:bg-muted/10 transition-colors">
                      <div className="shrink-0 mt-0.5">
                        <Info className="h-5 w-5 text-[#0056b3] dark:text-cyan-500" />
                      </div>
                      <p className="text-sm font-noto-medium text-muted-foreground leading-relaxed text-justify">
                        {rule}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

    </div>
  );
}
