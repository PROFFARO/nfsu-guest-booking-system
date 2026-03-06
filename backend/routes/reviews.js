import express from 'express';
import { body, validationResult } from 'express-validator';
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import { authMiddleware, staffMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   POST /api/reviews
// @desc    Add a guest review for a completed booking
// @access  Private
router.post('/', [
    authMiddleware,
    body('booking').isMongoId().withMessage('Invalid booking ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5 stars'),
    body('comment').optional().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', message: 'Validation failed', errors: errors.array() });
    }

    const { booking: bookingId, rating, comment } = req.body;

    // Verify booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    // Ensure user owns booking or is admin
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Not authorized to review this booking' });
    }

    // Ensure booking is completed
    if (booking.status !== 'completed') {
        return res.status(400).json({ status: 'error', message: 'Can only submit feedback after checkout' });
    }

    // Check for existing review
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
        return res.status(400).json({ status: 'error', message: 'You have already submitted feedback for this stay' });
    }

    // Create review
    const review = await Review.create({
        booking: bookingId,
        room: booking.room,
        user: req.user._id,
        rating,
        comment
    });

    res.status(201).json({
        status: 'success',
        message: 'Feedback submitted successfully',
        data: { review }
    });
}));

// @route   GET /api/reviews
// @desc    Get all reviews (Admin viewing)
// @access  Private (Admin/Staff)
router.get('/', authMiddleware, staffMiddleware, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;

    // Filter by rating if provided
    const filter = {};
    if (req.query.rating) {
        filter.rating = parseInt(req.query.rating);
    }

    const reviews = await Review.find(filter)
        .populate({ path: 'user', select: 'name email phone' })
        .populate({ path: 'room', select: 'roomNumber type' })
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limit);

    const total = await Review.countDocuments(filter);

    res.json({
        status: 'success',
        count: reviews.length,
        pagination: {
            total,
            pages: Math.ceil(total / limit),
            page,
            limit
        },
        data: { reviews }
    });
}));

// @route   GET /api/reviews/room/:roomId
// @desc    Get reviews for a specific room (Public)
// @access  Public
router.get('/room/:roomId', asyncHandler(async (req, res) => {
    const reviews = await Review.find({ room: req.params.roomId })
        .populate({ path: 'user', select: 'name' }) // only send name publicly
        .sort({ createdAt: -1 })
        .limit(10); // get 10 most recent

    res.json({
        status: 'success',
        count: reviews.length,
        data: { reviews }
    });
}));

// @route   GET /api/reviews/check/:bookingId
// @desc    Check if a booking already has a review (so frontend can hide the button)
// @access  Private
router.get('/check/:bookingId', authMiddleware, asyncHandler(async (req, res) => {
    const existing = await Review.findOne({ booking: req.params.bookingId });
    res.json({
        status: 'success',
        data: { hasReview: !!existing }
    });
}));

export default router;
