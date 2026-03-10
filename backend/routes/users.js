import express from 'express';
import { param, query, body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   POST /api/users
// @desc    Create new user (Admin only)
// @access  Private (Admin)
router.post('/', [
  authMiddleware,
  adminMiddleware,
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('role').optional().isIn(['user', 'admin', 'staff']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', message: 'Validation failed', errors: errors.array() });
  }

  const { name, email, password, phone, role, isActive } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ status: 'error', message: 'User with this email already exists' });
  }

  const user = new User({ name, email, password, phone, role: role || 'user', isActive: isActive !== undefined ? isActive : true });
  await user.save();

  res.status(201).json({
    status: 'success',
    message: 'Personnel created successfully',
    data: { user: user.toJSON() }
  });
}));

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/', [
  authMiddleware,
  adminMiddleware,
  query('role').optional().isIn(['user', 'admin', 'staff']),
  query('isActive').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString()
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const {
    role,
    isActive,
    page = 1,
    limit = 20,
    search
  } = req.query;

  // Build filter object
  const filters = {};
  
  if (role) filters.role = role;
  if (isActive !== undefined) filters.isActive = isActive === 'true';
  
  if (search) {
    filters.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  
  // Get users with pagination
  const users = await User.find(filters)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  // Get total count for pagination
  const total = await User.countDocuments(filters);

  res.json({
    status: 'success',
    data: {
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    }
  });
}));

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
// @access  Private (Admin)
router.get('/:id', [
  authMiddleware,
  adminMiddleware,
  param('id').isMongoId().withMessage('Invalid user ID')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  res.json({
    status: 'success',
    data: {
      user
    }
  });
}));

// @route   PUT /api/users/:id
// @desc    Update user (Admin only)
// @access  Private (Admin)
router.put('/:id', [
  authMiddleware,
  adminMiddleware,
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('role').optional().isIn(['user', 'admin', 'staff']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // --- Strict Administrative Role Policy ---
  // 1. Prevent changing own role (already protected by database logic usually, but let's be explicit)
  // 2. Prevent changing ANY existing admin's role
  // 3. Prevent changing ANY existing staff's role
  // We only allow promoting standard 'user' roles to higher clearances.
  if (req.body.role && req.body.role !== user.role) {
      if (user.role === 'admin') {
          return res.status(403).json({
              status: 'error',
              message: 'Modification of Administrator roles is strictly prohibited for security integrity.'
          });
      }
      if (user.role === 'staff') {
          return res.status(403).json({
              status: 'error',
              message: 'Modification of Staff roles is strictly prohibited to prevent operational discrepancies.'
          });
      }
  }

  // Prevent admin from deactivating themselves via PUT (DELETE already handles this)
  if (req.params.id === req.user._id.toString() && req.body.isActive === false) {
    return res.status(400).json({
      status: 'error',
      message: 'You cannot deactivate your own account'
    });
  }

  // --- Privacy & Security Policy ---
  // Admins are restricted from modifying personal identification (Name, Email, Phone) 
  // to preserve user privacy. Only clearance level and status are manageable.
  const updateData = {};
  if (req.body.role !== undefined) updateData.role = req.body.role;
  if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

  // Use updateData instead of req.body to prevent mass assignment of restricted fields
  Object.assign(user, updateData);
  await user.save();

  res.json({
    status: 'success',
    message: 'Operational status/clearance updated successfully',
    data: {
      user: user.toJSON()
    }
  });
}));

// @route   DELETE /api/users/:id
// @desc    Deactivate user (Admin only)
// @access  Private (Admin)
router.delete('/:id', [
  authMiddleware,
  adminMiddleware,
  param('id').isMongoId().withMessage('Invalid user ID')
], asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Prevent admin from deleting themselves
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({
      status: 'error',
      message: 'Self-termination of accounts is prohibited.'
    });
  }

  // --- Strict Deletion Policy ---
  // Only standard 'user' roles can be permanently removed from the database.
  // Personnel with 'staff' or 'admin' clearance must remain for audit/logical integrity.
  if (user.role !== 'user') {
    return res.status(403).json({
      status: 'error',
      message: 'Permanent deletion is restricted to standard user accounts only.'
    });
  }

  // Hard delete for standard users
  await User.findByIdAndDelete(req.params.id);

  res.json({
    status: 'success',
    message: 'User account has been permanently removed from the database.'
  });
}));

// @route   PUT /api/users/:id/activate
// @desc    Activate user (Admin only)
// @access  Private (Admin)
router.put('/:id/activate', [
  authMiddleware,
  adminMiddleware,
  param('id').isMongoId().withMessage('Invalid user ID')
], asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  if (user.isActive) {
    return res.status(400).json({
      status: 'error',
      message: 'User is already active'
    });
  }

  // Activate user
  user.isActive = true;
  await user.save();

  res.json({
    status: 'success',
    message: 'User activated successfully'
  });
}));

// @route   PUT /api/users/:id/reset-password
// @desc    Reset user password (Admin only)
// @access  Private (Admin)
router.put('/:id/reset-password', [
  authMiddleware,
  adminMiddleware,
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { newPassword } = req.body;
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Reset password
  user.password = newPassword;
  await user.save();

  res.json({
    status: 'success',
    message: 'Password reset successfully'
  });
}));

// @route   GET /api/users/stats
// @desc    Get user statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', [
  authMiddleware,
  adminMiddleware
], asyncHandler(async (req, res) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        activeCount: {
          $sum: { $cond: ['$isActive', 1, 0] }
        }
      }
    }
  ]);

  // Get total counts
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const inactiveUsers = totalUsers - activeUsers;

  res.json({
    status: 'success',
    data: {
      stats,
      summary: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        activationRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0
      }
    }
  });
}));

export default router;
