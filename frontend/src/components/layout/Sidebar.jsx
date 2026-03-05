'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    BedDouble,
    BookOpen,
    Users,
    BarChart3,
    Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/rooms', label: 'Rooms', icon: BedDouble },
    { href: '/admin/bookings', label: 'Bookings', icon: BookOpen },
    { href: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const links = adminLinks.filter(
        (link) => !link.adminOnly || user?.role === 'admin'
    );

    const isActive = (href) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    return (
        <aside className="hidden w-64 shrink-0 border-r border-border/40 bg-card/50 lg:block">
            <div className="flex h-full flex-col gap-1 p-4 pt-6">
                <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Management
                </p>
                {links.map((link) => {
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                isActive(link.href)
                                    ? 'bg-gradient-to-r from-cyan-500/10 to-blue-600/10 text-cyan-500 shadow-sm'
                                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {link.label}
                        </Link>
                    );
                })}
            </div>
        </aside>
    );
}
