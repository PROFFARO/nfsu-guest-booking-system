'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLayout({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'admin' && user.role !== 'staff') {
                router.push('/dashboard');
            }
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="mx-auto px-3 sm:px-4 py-4 sm:py-8 w-full max-w-7xl">
                <Skeleton className="mb-4 h-8 w-48" />
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
        );
    }

    if (!user || (user.role !== 'admin' && user.role !== 'staff')) return null;

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
            <Sidebar />
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 relative bg-muted/20 min-w-0 w-full">
                {children}
            </div>
        </div>
    );
}
