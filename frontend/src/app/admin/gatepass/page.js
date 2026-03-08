'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CircleCheckBig, CircleX, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GatepassScannerPage() {
    const [scanResult, setScanResult] = useState(null);
    const [manualToken, setManualToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false); // Ref to strictly block overlapping async calls
    const lastProcessedTokenRef = useRef({ token: '', time: 0 }); // Block same token rapid scans

    const isScannerInitRef = useRef(false);

    useEffect(() => {
        // Prevent double initialization in React 18 StrictMode
        if (isScannerInitRef.current) return;
        isScannerInitRef.current = true;

        const html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        // We must define these functions inside or wrap them in useCallback if they depend on state,
        // but since we rely on refs for state checking (isProcessingRef), it's safe to define them here to avoid stale closures.
        
        function onScanSuccess(decodedText) {
            if (isProcessingRef.current) return; // STRICTLY Prevent double-scans synchronously
            isProcessingRef.current = true; // Lock immediately BEFORE async call
            
            // Pause scanner immediately to prevent further scans while processing
            if (scannerRef.current) {
                try {
                    // Only pause if actually scanning to avoid "Cannot pause, scanner is not scanning" error
                    if (scannerRef.current.getState() === 2) {
                        scannerRef.current.pause(true);
                    }
                } catch (e) {
                    // Silently ignore if already paused/not scanning
                    if (!e?.message?.includes("not scanning")) {
                        console.error("Scanner pause error:", e);
                    }
                }
            }

            handleCheckIn(decodedText);
        }

        function onScanFailure(error) {
            // handle scan failure, usually better to ignore and keep scanning
        }

        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = html5QrcodeScanner;

        return () => {
             if (scannerRef.current) {
                 scannerRef.current.clear().catch(error => {
                     console.error("Failed to clear html5QrcodeScanner. ", error);
                 });
             }
             isScannerInitRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



    const handleManualSubmit = (e) => {
        e.preventDefault();
        const token = manualToken.trim().toUpperCase();
        if (!token || isProcessingRef.current) return;
        isProcessingRef.current = true;
        handleCheckIn(token);
    };

    const handleCheckIn = async (token) => {
        // Prevent processing exactly the same token twice within 10 seconds
        const now = Date.now();
        const isDuplicate = lastProcessedTokenRef.current.token === token && (now - lastProcessedTokenRef.current.time) < 10000;
        
        if (isDuplicate) {
            isProcessingRef.current = false;
            return;
        }

        setLoading(true);
        setError(null);
        
        // Only clear scanResult if scanning a DIFFERENT token to prevent UI flickering
        if (lastProcessedTokenRef.current.token !== token) {
            setScanResult(null);
        }

        try {
            const res = await api.bookings.scanGatepass(token);
            
            // Success State
            setScanResult(res.data.booking);
            lastProcessedTokenRef.current = { token, time: now };
            toast.success(res.message || 'Check-in successful!');
            
            // Pause scanner
            if (scannerRef.current) {
                try { scannerRef.current.pause(true); } catch (e) {}
            }

            // Display result for 10 seconds then reset (Consistency for both cases)
            setTimeout(() => {
                if (scannerRef.current) {
                    try { scannerRef.current.resume(); } catch (e) {}
                }
                setScanResult(null); 
                setManualToken('');
                isProcessingRef.current = false;
            }, 10000);

        } catch (err) {
            // Check if backend returned data for an already checked-in guest
            const bookingData = err.data?.data?.booking;
            const isAlreadyCheckedIn = err.message?.toLowerCase().includes('already');

            if (bookingData && isAlreadyCheckedIn) {
                setScanResult(bookingData);
                setError(null);
                lastProcessedTokenRef.current = { token, time: now };
                toast.info('Guest already checked in. Showing info.');
                
                if (scannerRef.current) {
                    try { scannerRef.current.pause(true); } catch (e) {}
                }

                setTimeout(() => {
                    if (scannerRef.current) {
                        try { scannerRef.current.resume(); } catch (e) {}
                    }
                    setScanResult(null); 
                    setManualToken('');
                    isProcessingRef.current = false;
                }, 10000);
            } else {
                // Hard Error
                setScanResult(null);
                setError(err.message || 'Invalid or Expired QR Code');
                toast.error(err.message || 'Failed to check in guest');
                
                if (scannerRef.current) {
                    try { scannerRef.current.resume(); } catch (e) {}
                }
            }
            
            isProcessingRef.current = false;
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-8 border-b-2 border-border pb-5">
                    <h1 className="text-2xl font-noto-bold text-[#0056b3] dark:text-cyan-500 uppercase tracking-tight flex items-center gap-2">
                        <QrCode className="h-6 w-6" /> Smart Gatepass Scanner
                    </h1>
                    <p className="mt-1 text-xs font-noto-bold text-muted-foreground uppercase tracking-widest">
                        Scan Guest QR Codes for Instant Touchless Check-in
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Scanner Section */}
                    <Card className="border-2 border-border shadow-sm">
                        <CardHeader className="bg-muted/10 border-b border-border pb-4">
                            <CardTitle className="text-lg font-noto-bold uppercase tracking-wide">Camera Scanner</CardTitle>
                            <CardDescription className="text-xs uppercase tracking-widest">Point camera at the guest's mobile screen</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="rounded-md overflow-hidden border-2 border-border bg-black/5 relative min-h-[300px] flex items-center justify-center">
                                <div id="reader" className="w-full"></div>
                                {loading && (
                                     <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                         <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                                         <p className="text-xs font-noto-bold uppercase tracking-widest text-primary animate-pulse">Verifying Security Token...</p>
                                     </div>
                                )}
                            </div>

                            <div className="mt-6 pt-6 border-t border-border">
                                <Label className="text-xs font-noto-bold text-muted-foreground uppercase tracking-widest mb-2 block">Manual Token Entry</Label>
                                <form onSubmit={handleManualSubmit} className="flex gap-2">
                                    <Input 
                                        type="text" 
                                        placeholder="Enter token manually if scanner fails" 
                                        value={manualToken}
                                        onChange={(e) => setManualToken(e.target.value)}
                                        className="font-mono text-sm border-2 border-border focus-visible:ring-primary"
                                    />
                                    <Button type="submit" disabled={loading || !manualToken.trim()} className="shrink-0 bg-primary text-primary-foreground">
                                        <Search className="h-4 w-4 mr-1" /> Look Up
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Result Section */}
                    <Card className="border-2 border-border shadow-sm bg-muted/5">
                         <CardHeader className="bg-muted/10 border-b border-border pb-4">
                            <CardTitle className="text-lg font-noto-bold uppercase tracking-wide">Verification Result</CardTitle>
                            <CardDescription className="text-xs uppercase tracking-widest">Awaiting scan data...</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[400px]">
                            <AnimatePresence mode="wait">
                                {error ? (
                                    <motion.div 
                                        key="error"
                                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                        className="text-center p-6 border-2 border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg w-full"
                                    >
                                        <CircleX className="mx-auto h-16 w-16 text-red-500 mb-4" />
                                        <h3 className="text-lg font-noto-bold text-red-700 dark:text-red-400 uppercase tracking-wide">Access Denied</h3>
                                        <p className="text-sm font-noto-medium text-red-600/80 mt-2">{error}</p>
                                        <Button variant="outline" className="mt-6 border-red-200 text-red-600 hover:bg-red-100" onClick={() => setError(null)}>Clear Error</Button>
                                    </motion.div>
                                ) : scanResult ? (
                                    <motion.div 
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                        className="w-full text-left"
                                    >
                                        <div className="text-center mb-6">
                                            <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-3">
                                                <CircleCheckBig className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <h3 className="text-xl font-noto-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Check-in Verified</h3>
                                        </div>

                                        <div className="bg-background border-2 border-border rounded-lg p-5 space-y-4">
                                            <div>
                                                <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">Guest Identity</p>
                                                <p className="text-lg font-noto-bold text-foreground leading-tight">{scanResult.guestName}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/50">
                                                <div>
                                                    <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">Assigned Facility</p>
                                                    <p className="text-sm font-noto-bold text-primary mt-0.5">Room {scanResult.room?.roomNumber}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-noto-bold text-muted-foreground uppercase tracking-widest">Status</p>
                                                    <p className="text-sm font-noto-bold text-emerald-600 dark:text-emerald-400 mt-0.5 uppercase tracking-wide">Checked In</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="idle"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="text-center text-muted-foreground opacity-50"
                                    >
                                        <QrCode className="mx-auto h-20 w-20 mb-4" />
                                        <p className="text-sm font-noto-bold uppercase tracking-widest">Ready to Scan</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                </div>
            </motion.div>
        </div>
    );
}
