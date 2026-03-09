import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import LoginHistory from '../models/LoginHistory.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logEvent } from '../utils/auditLogger.js';

// Generate a short fingerprint from a JWT token for session tracking
function generateTokenFingerprint(token) {
  return crypto.createHash('sha256').update(token).digest('hex').substring(0, 32);
}

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-={}|;':",./<>?]/)
    .withMessage('Password must contain at least one special character'),
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number')
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

  const { name, email, password, phone, address } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      status: 'error',
      message: 'User with this email already exists'
    });
  }

  // Create new user
  const user = new User({
    name,
    email,
    password,
    phone,
    address
  });

  await user.save();

  // Generate JWT token
  const token = user.generateAuthToken();

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod
      },
      token
    }
  });
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

  const { email, password, twoFactorCode } = req.body;
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_DURATION = 30 * 60 * 1000; // 30 minutes

  // Find user by email and include password + lockout fields
  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil +twoFactorEnabled +twoFactorSecret');

  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials'
    });
  }

  // Check if account is locked
  if (user.isLocked) {
    const remainingMs = user.lockUntil - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    return res.status(423).json({
      status: 'error',
      message: `Account is temporarily locked due to too many failed login attempts. Try again in ${remainingMin} minute(s).`
    });
  }

  if (!user.isActive) {
    return res.status(401).json({
      status: 'error',
      message: 'Account is deactivated. Please contact support.'
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    // Increment failed login attempts
    const updates = { $inc: { loginAttempts: 1 } };
    // Lock account after MAX_LOGIN_ATTEMPTS
    if (user.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
      updates.$set = { lockUntil: new Date(Date.now() + LOCK_DURATION) };
    }
    await User.updateOne({ _id: user._id }, updates);

    // Record failed login attempt
    const ua = req.headers['user-agent'] || '';
    const parsed = LoginHistory.parseUserAgent(ua);
    LoginHistory.create({
      user: user._id,
      status: 'failed',
      ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown',
      userAgent: ua,
      ...parsed
    }).catch(() => { }); // fire-and-forget

    const attemptsLeft = MAX_LOGIN_ATTEMPTS - (user.loginAttempts + 1);
    return res.status(401).json({
      status: 'error',
      message: attemptsLeft > 0
        ? `Invalid credentials. ${attemptsLeft} attempt(s) remaining before account lockout.`
        : 'Account locked due to too many failed attempts. Try again in 30 minutes.'
    });
  }

  // If 2FA is enabled, check code
  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      // instruct client to ask for code
      return res.status(200).json({
        status: 'success',
        twoFactorRequired: true,
        message: 'Two-factor authentication code required'
      });
    }
    const speakeasy = await import('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorCode,
      window: 1
    });
    if (!verified) {
      return res.status(401).json({ status: 'error', message: 'Invalid two-factor authentication code' });
    }
  }

  // Successful login — reset lockout counters
  if (user.loginAttempts > 0 || user.lockUntil) {
    await User.updateOne({ _id: user._id }, {
      $set: { loginAttempts: 0, lockUntil: null }
    });
  }

  // Generate JWT token
  const token = user.generateAuthToken();
  const sessionToken = generateTokenFingerprint(token);

  // Record successful login with session tracking
  const ua = req.headers['user-agent'] || '';
  const parsed = LoginHistory.parseUserAgent(ua);
  const decoded = jwt.decode(token);
  LoginHistory.create({
    user: user._id,
    status: 'success',
    ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown',
    userAgent: ua,
    ...parsed,
    sessionToken,
    expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }).catch(() => { }); // fire-and-forget

  // Write to personal Audit Log
  await logEvent({
    userId: user._id,
    action: 'LOGIN',
    details: { message: 'User logged in successfully' },
    req
  });

  // Include two-factor settings so client can remember the state
  res.json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod
      },
      token,
      sessionToken
    }
  });
}));

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    status: 'success',
    data: {
      user: req.user
    }
  });
}));

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authMiddleware, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number')
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

  const { name, phone, address, preferences } = req.body;
  const updateFields = {};

  if (name) updateFields.name = name;
  if (phone) updateFields.phone = phone;
  if (address) updateFields.address = address;
  if (preferences) updateFields.preferences = preferences;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    updateFields,
    { new: true, runValidators: true }
  );

  await logEvent({
    userId: req.user._id,
    action: 'PROFILE_UPDATE',
    details: { updatedFields: Object.keys(updateFields) },
    req
  });

  res.json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user: updatedUser
    }
  });
}));

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authMiddleware, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-={}|;':",./<>?]/)
    .withMessage('Password must contain at least one special character'),
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

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      status: 'error',
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  await logEvent({
    userId: req.user._id,
    action: 'PASSWORD_CHANGE',
    details: { message: 'User changed their password' },
    req
  });

  res.json({
    status: 'success',
    message: 'Password changed successfully'
  });
}));

// ========================
// Two-Factor Authentication
// ========================

// @route   POST /api/auth/2fa/setup
// @desc    Begin 2FA setup (generate temp secret and QR code)
// @access  Private
router.post('/2fa/setup', authMiddleware, asyncHandler(async (req, res) => {
  const speakeasy = await import('speakeasy');
  const QRCode = await import('qrcode');

  const user = await User.findById(req.user._id).select('+twoFactorSecret +twoFactorTempSecret');

  // generate temp secret
  const secret = speakeasy.generateSecret({ length: 20, name: `NFSU:${user.email}` });
  user.twoFactorTempSecret = secret.base32;
  await user.save();

  // produce qr code data url
  const otpauth = secret.otpauth_url;
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  res.json({ status: 'success', data: { qrDataUrl, secret: secret.base32 } });
}));

// @route   POST /api/auth/2fa/verify
// @desc    Verify 2FA code during setup or to disable
// @access  Private
router.post('/2fa/verify', authMiddleware, asyncHandler(async (req, res) => {
  const { code, action } = req.body; // action: 'enable' or 'disable'
  const speakeasy = await import('speakeasy');

  const user = await User.findById(req.user._id).select('+twoFactorTempSecret +twoFactorSecret');

  if (action === 'enable') {
    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ status: 'error', message: 'No setup in progress' });
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    if (!verified) {
      return res.status(400).json({ status: 'error', message: 'Invalid code' });
    }
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = undefined;
    user.twoFactorEnabled = true;
    await user.save();
    return res.json({ status: 'success', message: 'Two-factor authentication enabled' });
  } else if (action === 'disable') {
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ status: 'error', message: '2FA not enabled' });
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    if (!verified) {
      return res.status(400).json({ status: 'error', message: 'Invalid code' });
    }
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();
    return res.json({ status: 'success', message: 'Two-factor authentication disabled' });
  } else {
    return res.status(400).json({ status: 'error', message: 'Invalid action' });
  }
}));

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authMiddleware, asyncHandler(async (req, res) => {
  // Generate new token
  const token = req.user.generateAuthToken();

  res.json({
    status: 'success',
    message: 'Token refreshed successfully',
    data: {
      token
    }
  });
}));

// ========================
// Login History & Sessions
// ========================

// @route   GET /api/auth/login-history
// @desc    Get recent login history for the authenticated user
// @access  Private
router.get('/login-history', authMiddleware, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const history = await LoginHistory.getHistory(req.user._id, limit);

  res.json({
    status: 'success',
    data: {
      history,
      total: history.length
    }
  });
}));

// @route   GET /api/auth/sessions
// @desc    Get active sessions for the authenticated user
// @access  Private
router.get('/sessions', authMiddleware, asyncHandler(async (req, res) => {
  const sessions = await LoginHistory.getActiveSessions(req.user._id);

  res.json({
    status: 'success',
    data: {
      sessions
    }
  });
}));

// @route   DELETE /api/auth/sessions/:id
// @desc    Revoke a specific session
// @access  Private
router.delete('/sessions/:id', authMiddleware, asyncHandler(async (req, res) => {
  const session = await LoginHistory.findOne({
    _id: req.params.id,
    user: req.user._id,
    status: 'success'
  });

  if (!session) {
    return res.status(404).json({
      status: 'error',
      message: 'Session not found'
    });
  }

  if (session.isRevoked) {
    return res.status(400).json({
      status: 'error',
      message: 'Session is already revoked'
    });
  }

  session.isRevoked = true;
  session.revokedAt = new Date();
  await session.save();

  res.json({
    status: 'success',
    message: 'Session revoked successfully'
  });
}));

// @route   DELETE /api/auth/sessions
// @desc    Revoke all sessions except the current one
// @access  Private
router.delete('/sessions', authMiddleware, asyncHandler(async (req, res) => {
  // Get current session token from the auth header
  const token = req.headers.authorization?.split(' ')[1];
  const currentFingerprint = token ? generateTokenFingerprint(token) : null;

  const result = await LoginHistory.updateMany(
    {
      user: req.user._id,
      status: 'success',
      isRevoked: false,
      expiresAt: { $gt: new Date() },
      ...(currentFingerprint ? { sessionToken: { $ne: currentFingerprint } } : {})
    },
    {
      $set: { isRevoked: true, revokedAt: new Date() }
    }
  );

  res.json({
    status: 'success',
    message: `${result.modifiedCount} session(s) revoked successfully`
  });
}));

// @route   POST /api/auth/logout
// @desc    Logout user — revoke current session
// @access  Private
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  // Revoke the current session
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const fingerprint = generateTokenFingerprint(token);
    await LoginHistory.updateOne(
      { sessionToken: fingerprint, user: req.user._id, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );
  }

  // Write to personal Audit Log
  await logEvent({
    userId: req.user._id,
    action: 'LOGOUT',
    details: { message: 'User logged out successfully' },
    req
  });

  res.json({
    status: 'success',
    message: 'Logout successful'
  });
}));

import { sendPasswordResetEmail, sendEmail } from '../services/emailService.js';

// @route   POST /api/auth/forgot-password
// @desc    Forgot password -> send reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }

  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // Return success to prevent email enumeration attacks
    return res.status(200).json({ status: 'success', message: 'If an account exists, a reset link will be sent.' });
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Create reset url
  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

  // Send reset email
  const { subject, html } = sendPasswordResetEmail(user, resetUrl);
  try {
    await sendEmail(user.email, { subject, html });
  } catch (err) {
    console.error("Forgot Password Email failed:", err);
    // Continue despite email error to avoid leaking email existence
  }

  res.status(200).json({ status: 'success', message: 'If an account exists, a reset link will be sent.' });
}));

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset password using token
// @access  Public
router.put('/reset-password/:token', [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}|;':",./<>?]).{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }

  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ status: 'error', message: 'Invalid or expired token' });
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  // Reset login attempt trackers just in case they were locked out
  user.loginAttempts = 0;
  user.lockUntil = null;

  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Password successfully reset'
  });
}));

export default router;
