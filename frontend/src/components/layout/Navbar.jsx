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
    Accessibility,
    Languages,
} from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';
import AccessibilityPanel from '@/components/layout/AccessibilityPanel';
import LanguageSelector from '@/components/layout/LanguageSelector';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function Navbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [a11yOpen, setA11yOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    // Role-based nav links — each role sees ONLY their relevant links
    const getNavLinks = () => {
        if (!user) {
            return [];
        }

        if (user.role === 'admin') {
            // Admin: manage everything from admin panel
            return [
                { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/admin/rooms', label: 'Rooms List', icon: BedDouble },
                { href: '/admin/bookings', label: 'Bookings', icon: BookOpen },
                { href: '/admin/users', label: 'Users', icon: Shield },
            ];
        }

        if (user.role === 'staff') {
            // Staff: manage rooms and bookings only
            return [
                { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/admin/rooms', label: 'Rooms', icon: BedDouble },
                { href: '/admin/bookings', label: 'Bookings', icon: BookOpen },
            ];
        }

        // Regular user: browse and manage their own bookings
        return [
            { href: '/rooms', label: 'Browse Rooms', icon: BedDouble },
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/dashboard/bookings', label: 'My Bookings', icon: BookOpen },
        ];
    };

    const navLinks = getNavLinks();

    const isActive = (href) => {
        if (href === '/') return pathname === '/';
        if (href === '/dashboard') return pathname === '/dashboard';
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    // Logo destination: dashboard for logged-in users, login for guests
    const logoHref = user
        ? (user.role === 'admin' || user.role === 'staff' ? '/admin' : '/dashboard')
        : '/login';

    const initials = user?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background shadow-sm notranslate">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    {/* Logo */}
                    <Link href={logoHref} className="flex items-center gap-3 transition-opacity hover:opacity-90">
                        <div className="flex items-center justify-center p-1">
                            {/* Using standard img to avoid Next.js Image config issues, assuming the user will place logo.png in public dir */}
                            <img
                                src="/logo.png"
                                alt="NFSU Logo"
                                className="h-12 w-auto object-contain"
                                onError={(e) => {
                                    // Fallback to Building icon if image isn't loaded yet
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

                    {/* Desktop Nav */}
                    <nav className="hidden h-full items-center gap-6 md:flex">
                        {navLinks.map((link) => {
                            const active = isActive(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex h-full items-center border-b-2 px-1 text-sm font-noto-semibold transition-colors ${active
                                        ? 'border-[#0056b3] text-[#0056b3] dark:border-cyan-500 dark:text-cyan-500'
                                        : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Side — Toolbar */}
                    <div className="flex items-center gap-1.5">
                        {/* Language Selector */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => { setLangOpen(!langOpen); setA11yOpen(false); }}
                                    className={`relative rounded-sm border-2 transition-colors ${langOpen
                                        ? 'border-[#0056b3] dark:border-cyan-500 bg-muted/20'
                                        : 'border-border hover:border-[#0056b3] dark:hover:border-cyan-500 hover:bg-muted/10'
                                        }`}
                                    aria-label="Select Language"
                                >
                                    <Languages className="h-4 w-4 text-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p className="text-xs">Select Language</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* Accessibility */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => { setA11yOpen(!a11yOpen); setLangOpen(false); }}
                                    className={`relative rounded-sm border-2 transition-colors ${a11yOpen
                                        ? 'border-[#0056b3] dark:border-cyan-500 bg-muted/20'
                                        : 'border-border hover:border-[#0056b3] dark:hover:border-cyan-500 hover:bg-muted/10'
                                        }`}
                                    aria-label="Accessibility Tools"
                                >
                                    <Accessibility className="h-4 w-4 text-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p className="text-xs">Accessibility Tools</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* Theme Toggle */}
                        <ThemeToggle />

                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0056b3] focus-visible:ring-offset-2 transition-transform hover:scale-105 active:scale-95 ml-1.5">
                                    <Avatar className="h-9 w-9 border border-border/50 hover:border-[#0056b3]/50 shadow-sm transition-colors">
                                        <AvatarFallback className="bg-[#0056b3] text-white text-xs font-noto-bold">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-sm border-border bg-card shadow-md p-0 overflow-hidden">
                                    <div className="flex flex-col gap-1 px-4 py-3 border-b border-border bg-muted/10">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-noto-bold text-foreground leading-none">{user.name}</p>
                                            <Badge variant="outline" className="text-[10px] font-noto-bold uppercase tracking-widest border-border bg-background px-1.5 py-0">
                                                {user.role}
                                            </Badge>
                                        </div>
                                        <p className="text-xs font-noto-medium text-muted-foreground">{user.email}</p>
                                    </div>
                                    <div className="p-1">
                                        <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="font-noto-medium text-sm cursor-pointer rounded-sm focus:bg-muted/50 h-9">
                                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                            Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleLogout} className="font-noto-medium text-sm text-red-600 dark:text-red-500 cursor-pointer rounded-sm focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-red-700 dark:focus:text-red-400 h-9">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Logout
                                        </DropdownMenuItem>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="hidden items-center gap-2 md:flex ml-1.5">
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/login">Sign In</Link>
                                </Button>
                                <Button size="sm" variant="cta" asChild>
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
                                            <Button variant="cta" asChild onClick={() => setOpen(false)}>
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

            {/* Panels rendered outside header for proper z-index stacking */}
            <AccessibilityPanel open={a11yOpen} onClose={() => setA11yOpen(false)} />
            <LanguageSelector open={langOpen} onClose={() => setLangOpen(false)} />
        </>
    );
}
