'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
        // Block admin/staff from accessing user dashboard content, EXCEPT the profile settings page
        if (!loading && user && (user.role === 'admin' || user.role === 'staff') && pathname !== '/dashboard/profile') {
            router.push('/admin');
        }
    }, [user, loading, router, pathname]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="mb-4 h-8 w-48" />
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
        );
    }

    if (!user) return null;
    // Prevent rendering for admin/staff while redirect is in progress, except on profile page
    if ((user.role === 'admin' || user.role === 'staff') && pathname !== '/dashboard/profile') return null;

    return <>{children}</>;
}
