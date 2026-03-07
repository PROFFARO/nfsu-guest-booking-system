import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * @desc    Get personal audit logs
 * @route   GET /api/audit-logs
 * @access  Private (Self)
 * @query   page (default: 1)
 * @query   limit (default: 20)
 * @query   startDate (YYYY-MM-DD string)
 * @query   endDate (YYYY-MM-DD string)
 * @query   action (Specific action string)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20, startDate, endDate, action } = req.query;

        // Build exact match query focused on the authenticated user
        const query = { user: req.user.id };

        // Apply filters
        if (action) {
            query.action = action;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // To include the whole end date, set the end of the day
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Pagination setup
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;
        const skipNum = (pageNum - 1) * limitNum;

        // Query database
        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 }) // Newest first
            .skip(skipNum)
            .limit(limitNum)
            .select('-__v') // Exclude mongoose version key
            .lean(); // Faster for read-only query

        const totalEntries = await AuditLog.countDocuments(query);

        res.json({
            success: true,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalEntries,
                totalPages: Math.ceil(totalEntries / limitNum)
            },
            data: logs
        });

    } catch (error) {
        console.error('Fetch Audit Logs Error:', error);
        res.status(500).json({ success: false, msg: 'Server Error fetching logs' });
    }
});

/**
 * @desc    Get all audit logs (Admin only)
 * @route   GET /api/audit-logs/all
 * @access  Private (Admin)
 * @query   userId (Filter by specific user ID)
 * @query   ...same pagination/filters as above
 */
router.get('/all', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { page = 1, limit = 20, startDate, endDate, action, userId } = req.query;

        const query = {};

        if (userId) query.user = userId;
        if (action) query.action = action;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;
        const skipNum = (pageNum - 1) * limitNum;

        const logs = await AuditLog.find(query)
            .populate('user', 'name email role') // Bring in user details for admin view
            .sort({ createdAt: -1 })
            .skip(skipNum)
            .limit(limitNum)
            .lean();

        const totalEntries = await AuditLog.countDocuments(query);

        res.json({
            success: true,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalEntries,
                totalPages: Math.ceil(totalEntries / limitNum)
            },
            data: logs
        });

    } catch (error) {
        console.error('Fetch Admin Audit Logs Error:', error);
        res.status(500).json({ success: false, msg: 'Server Error fetching admin logs' });
    }
});

export default router;
