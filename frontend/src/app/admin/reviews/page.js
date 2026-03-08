'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [ratingFilter, setRatingFilter] = useState('all');

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 10 };
            if (ratingFilter !== 'all') params.rating = ratingFilter;
            const res = await api.reviews.getAll(params);
            setReviews(res.data.reviews);
            setPagination(res.data.pagination);
        } catch {
            toast.error('Failed to load guest feedback');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [page, ratingFilter]);

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-full mx-auto space-y-4 sm:space-y-6 overflow-hidden box-border">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between border-b-2 border-border pb-4 gap-4">
                    <div>
                        <h1 className="text-2xl font-noto-bold text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight">Guest Feedback Log</h1>
                        <p className="mt-1 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                            Official Registry of Ratings & Comments
                        </p>
                    </div>

                    <div className="flex gap-4 items-center">
                        <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-[180px] rounded-sm border-2 border-border h-10 font-noto-bold text-xs uppercase tracking-wide">
                                <SelectValue placeholder="Filter By Rating" />
                            </SelectTrigger>
                            <SelectContent className="rounded-sm border-2 border-border">
                                <SelectItem value="all" className="font-noto-medium text-xs uppercase tracking-wide">All Ratings</SelectItem>
                                <SelectItem value="5" className="font-noto-medium text-xs uppercase tracking-wide">5 Stars</SelectItem>
                                <SelectItem value="4" className="font-noto-medium text-xs uppercase tracking-wide">4 Stars</SelectItem>
                                <SelectItem value="3" className="font-noto-medium text-xs uppercase tracking-wide">3 Stars</SelectItem>
                                <SelectItem value="2" className="font-noto-medium text-xs uppercase tracking-wide">2 Stars</SelectItem>
                                <SelectItem value="1" className="font-noto-medium text-xs uppercase tracking-wide">1 Star</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Card className="rounded-sm border-2 border-border bg-card shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-6 space-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-20 w-full rounded-sm border-2 border-border" />
                                ))}
                            </div>
                        ) : reviews.length === 0 ? (
                            <div className="py-24 text-center">
                                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                                <h3 className="text-sm font-noto-bold uppercase tracking-wide">No Feedback Found</h3>
                                <p className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest mt-1">There are no reviews matching these parameters</p>
                            </div>
                        ) : (
                            <div className="w-full overflow-x-auto">
                                <table className="w-full min-w-[800px] text-left text-sm">
                                    <thead className="bg-[#0056b3] dark:bg-cyan-900/50 text-white dark:text-cyan-400 font-noto-bold text-xs uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4 border-b-2 border-[#004494] dark:border-cyan-800">Guest</th>
                                            <th className="px-6 py-4 border-b-2 border-[#004494] dark:border-cyan-800">Room</th>
                                            <th className="px-6 py-4 border-b-2 border-[#004494] dark:border-cyan-800">Date Filed</th>
                                            <th className="px-6 py-4 border-b-2 border-[#004494] dark:border-cyan-800">Rating</th>
                                            <th className="px-6 py-4 border-b-2 border-[#004494] dark:border-cyan-800">Official Comment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {reviews.map((review) => (
                                            <tr key={review._id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="font-noto-bold text-foreground">{review.user?.name || 'Unknown'}</p>
                                                    <p className="text-[10px] font-noto-medium text-muted-foreground tracking-widest uppercase">{review.user?.email || 'N/A'}</p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge variant="outline" className="rounded-sm border- border-border font-noto-bold text-[10px] uppercase tracking-widest">
                                                        {review.room?.roomNumber || 'N/A'} - {review.room?.type || 'N/A'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="flex items-center gap-1.5 text-xs font-noto-medium text-muted-foreground">
                                                        <CalendarIcon className="h-3.5 w-3.5" />
                                                        {format(new Date(review.createdAt), 'dd MMM yyyy')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                className={`h-4 w-4 ${review.rating >= star ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-noto-medium text-muted-foreground min-w-[300px]">
                                                    {review.comment ? `"${review.comment}"` : <span className="italic opacity-50">No comment provided</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <Button variant="outline" size="sm" className="rounded-sm border-2 border-border h-8 w-8 p-0" disabled={!pagination.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 text-[10px] font-noto-bold text-foreground uppercase tracking-widest bg-muted/30 border border-border rounded-sm py-1.5">
                            Page {pagination.currentPage} / {pagination.totalPages}
                        </span>
                        <Button variant="outline" size="sm" className="rounded-sm border-2 border-border h-8 w-8 p-0" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
