'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Building2,
    Menu,
    LogOut,
    User,
    LayoutDashboard,
    BookOpen,
    BedDouble,
    Shield,
} from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    // Different nav links depending on auth state
    const navLinks = user
        ? [
            { href: '/rooms', label: 'Browse Rooms', icon: BedDouble },
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/dashboard/bookings', label: 'My Bookings', icon: BookOpen },
            ...((user.role === 'admin' || user.role === 'staff')
                ? [{ href: '/admin', label: 'Admin Panel', icon: Shield }]
                : []),
        ]
        : [
            { href: '/', label: 'Home' },
            { href: '/rooms', label: 'Browse Rooms' },
        ];

    const isActive = (href) => {
        if (href === '/') return pathname === '/';
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(href);
    };

    // Logo destination: dashboard for logged-in users, home for guests
    const logoHref = user
        ? (user.role === 'admin' || user.role === 'staff' ? '/admin' : '/dashboard')
        : '/';

    const initials = user?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo */}
                <Link href={logoHref} className="flex items-center gap-2 transition-opacity hover:opacity-80">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                        <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <span className="hidden text-lg font-bold tracking-tight sm:block">
                        Campus<span className="text-cyan-500">Stay</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden items-center gap-1 md:flex">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive(link.href)
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Right Side */}
                <div className="flex items-center gap-2">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                    <Avatar className="h-9 w-9 border-2 border-cyan-500/50">
                                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-semibold text-white">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <div className="flex flex-col space-y-0.5">
                                        <p className="text-sm font-medium">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                    <Badge variant="secondary" className="ml-auto text-[10px] capitalize">
                                        {user.role}
                                    </Badge>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                                    <User className="mr-2 h-4 w-4" />
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="hidden items-center gap-2 md:flex">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/login">Sign In</Link>
                            </Button>
                            <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40" asChild>
                                <Link href="/register">Get Started</Link>
                            </Button>
                        </div>
                    )}

                    {/* Mobile Menu */}
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild className="md:hidden">
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72">
                            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                            <div className="flex flex-col gap-4 pt-8">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setOpen(false)}
                                        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive(link.href)
                                            ? 'bg-accent text-accent-foreground'
                                            : 'text-muted-foreground hover:bg-accent/50'
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                                {!user && (
                                    <div className="mt-4 flex flex-col gap-2">
                                        <Button variant="outline" asChild onClick={() => setOpen(false)}>
                                            <Link href="/login">Sign In</Link>
                                        </Button>
                                        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white" asChild onClick={() => setOpen(false)}>
                                            <Link href="/register">Get Started</Link>
                                        </Button>
                                    </div>
                                )}
                                {user && (
                                    <div className="mt-4">
                                        <Button variant="destructive" size="sm" className="w-full" onClick={() => { handleLogout(); setOpen(false); }}>
                                            Logout
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
