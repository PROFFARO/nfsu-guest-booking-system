'use client';

import * as React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ConfirmationModal({
    open,
    onOpenChange,
    title = 'Confirm Action',
    description,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary', // primary, destructive, warning
    loading = false
}) {
    const getIcon = () => {
        switch (variant) {
            case 'destructive':
                return <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-500" />;
            case 'warning':
                return <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />;
            default:
                return <Info className="h-6 w-6 text-[#0056b3] dark:text-cyan-500" />;
        }
    };

    const getConfirmButtonVariant = () => {
        if (variant === 'destructive') return 'destructive';
        if (variant === 'primary') return 'cta'; // Using NFSU custom cta variant
        return 'outline';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-2 border-border rounded-sm shadow-xl">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-sm",
                            variant === 'destructive' ? "bg-red-50 dark:bg-red-950/30" :
                                variant === 'warning' ? "bg-amber-50 dark:bg-amber-950/30" :
                                    "bg-[#0056b3]/5 dark:bg-cyan-500/10"
                        )}>
                            {getIcon()}
                        </div>
                        <div className="flex flex-col gap-1">
                            <DialogTitle className="text-lg font-noto-bold text-foreground tracking-tight">
                                {title}
                            </DialogTitle>
                            {description && (
                                <DialogDescription className="text-sm font-noto-medium text-muted-foreground leading-relaxed">
                                    {description}
                                </DialogDescription>
                            )}
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter className="bg-muted/10 p-4 sm:p-6 border-t border-border mt-4 flex gap-3 sm:flex-row flex-col">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-sm font-noto-semibold h-11 sm:h-auto"
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={getConfirmButtonVariant()}
                        onClick={onConfirm}
                        className={cn(
                            "rounded-sm font-noto-bold h-11 sm:h-auto min-w-[100px] uppercase tracking-wider text-xs shadow-sm",
                            variant === 'primary' && "bg-[#0056b3] hover:bg-[#004494] text-white"
                        )}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
