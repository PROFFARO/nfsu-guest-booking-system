'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="mb-4 h-8 w-48" />
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
        );
    }

    if (!user) return null;

    return <>{children}</>;
}
