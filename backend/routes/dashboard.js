import express from 'express';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import AuditLog from '../models/AuditLog.js';
import { authMiddleware, staffMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @desc    Get consolidated dashboard metrics
 * @route   GET /api/dashboard/stats
 * @access  Private (Staff/Admin)
 */
router.get('/stats', authMiddleware, staffMiddleware, asyncHandler(async (req, res) => {
    // Run Lazy Cleanup for room holds
    await Room.cleanupExpiredHolds();

    const [roomStats, totalRooms, availableRooms, allBookings, maintenanceLogs, supplyLogs] = await Promise.all([
        Room.getRoomStats(),
        Room.countDocuments({ isActive: true }),
        Room.countDocuments({ status: 'vacant', isActive: true }),
        Booking.find().sort({ createdAt: -1 }).limit(100).lean(),
        AuditLog.find({ action: 'MAINTENANCE_REPORT' }).sort({ createdAt: -1 }).limit(10).lean(),
        AuditLog.find({ action: 'SUPPLY_REQUEST' }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    const summary = {
        totalRooms,
        availableRooms,
        occupancyRate: totalRooms > 0 ? (((totalRooms - availableRooms) / totalRooms) * 100).toFixed(2) : 0
    };

    res.json({
        status: 'success',
        data: {
            roomStats: {
                stats: roomStats,
                summary
            },
            bookings: allBookings,
            maintenanceReports: maintenanceLogs,
            supplyRequests: supplyLogs
        }
    });
}));

export default router;
