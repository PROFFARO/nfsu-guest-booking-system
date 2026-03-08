import express from 'express';
import FAQ from '../models/FAQ.js';
import { authMiddleware, staffMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// @route   GET /api/faq
// @desc    Get all FAQs
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
    const faqs = await FAQ.find().sort({ category: 1, createdAt: -1 });
    res.json({ status: 'success', data: { faqs } });
}));

// @route   POST /api/faq
// @desc    Create a new FAQ
// @access  Private (Staff/Admin)
router.post('/', [
    authMiddleware,
    staffMiddleware,
    body('question').notEmpty().withMessage('Question is required'),
    body('answer').notEmpty().withMessage('Answer is required'),
    body('category').optional().isIn(['general', 'booking', 'check-in', 'amenities', 'other'])
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', message: 'Validation failed', errors: errors.array() });
    }

    const faq = await FAQ.create({
        ...req.body,
        createdBy: req.user._id
    });

    res.status(201).json({ status: 'success', data: { faq } });
}));

// @route   PUT /api/faq/:id
// @desc    Update an FAQ
// @access  Private (Staff/Admin)
router.put('/:id', [
    authMiddleware,
    staffMiddleware,
    body('question').optional().notEmpty().withMessage('Question cannot be empty'),
    body('answer').optional().notEmpty().withMessage('Answer cannot be empty'),
    body('category').optional().isIn(['general', 'booking', 'check-in', 'amenities', 'other'])
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', message: 'Validation failed', errors: errors.array() });
    }

    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!faq) {
        return res.status(404).json({ status: 'error', message: 'FAQ not found' });
    }

    res.json({ status: 'success', data: { faq } });
}));

// @route   DELETE /api/faq/:id
// @desc    Delete an FAQ
// @access  Private (Staff/Admin)
router.delete('/:id', authMiddleware, staffMiddleware, asyncHandler(async (req, res) => {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) {
        return res.status(404).json({ status: 'error', message: 'FAQ not found' });
    }
    res.json({ status: 'success', message: 'FAQ deleted successfully' });
}));

export default router;
