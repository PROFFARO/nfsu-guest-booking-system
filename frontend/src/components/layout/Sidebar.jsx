'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard,
    BedDouble,
    BookOpen,
    Users,
    ChevronLeft,
    ChevronRight,
    Star,
    QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/rooms', label: 'Rooms List', icon: BedDouble },
    { href: '/admin/bookings', label: 'Bookings', icon: BookOpen },
    { href: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
    { href: '/admin/reviews', label: 'Guest Feedback', icon: Star },
    { href: '/admin/gatepass', label: 'Smart Gatepass', icon: QrCode },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const sidebarRef = useRef(null);

    const links = adminLinks.filter(
        (link) => !link.adminOnly || user?.role === 'admin'
    );

    const isActive = (href) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const currentWidth = isCollapsed ? 64 : 200;

    return (
        <aside
            ref={sidebarRef}
            style={{ width: `${currentWidth}px` }}
            className={cn(
                "relative hidden shrink-0 border-r border-border bg-background lg:block shadow-sm z-10 transition-[width] duration-300 ease-in-out"
            )}
        >
            <div className="flex h-full flex-col p-4 pt-6 overflow-hidden">
                {!isCollapsed && (
                    <p className="mb-4 px-3 text-[11px] font-noto-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 whitespace-nowrap">
                        System Management
                    </p>
                )}
                <div className={cn("flex flex-col gap-1 mt-1", isCollapsed && "items-center")}>
                    {links.map((link) => {
                        const Icon = link.icon;
                        const active = isActive(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                title={isCollapsed ? link.label : undefined}
                                className={cn(
                                    'flex items-center gap-3 py-2.5 text-sm font-noto-medium transition-colors border-l-4 whitespace-nowrap',
                                    isCollapsed ? 'justify-center px-0 w-10 border-transparent rounded-sm' : 'px-3',
                                    active
                                        ? 'border-[#0056b3] bg-[#0056b3]/5 text-[#0056b3] dark:border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-500'
                                        : 'border-transparent text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                                    isCollapsed && active && 'bg-[#0056b3]/10 dark:bg-cyan-500/20 shadow-sm'
                                )}
                            >
                                <Icon className="h-5 w-5 shrink-0" />
                                {!isCollapsed && <span>{link.label}</span>}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Collapse Toggle Button */}
            <button
                onClick={toggleCollapse}
                className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-accent text-muted-foreground z-20"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
        </aside>
    );
}
