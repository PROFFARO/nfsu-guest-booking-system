import rateLimit from 'express-rate-limit';

// Strict limiter for authentication endpoints (login, register)
// Relaxed for local development testing
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased from 10 to 100 for testing
    standardHeaders: true,   // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,     // Disable `X-RateLimit-*` headers
    message: {
        status: 'error',
        message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    }
});

// General API limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // Increased from 100 to 500 for testing
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many requests from this IP. Please try again later.'
    }
});

// Strict limiter for booking creation
export const bookingCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // Increased from 5 to 50 for testing
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many booking requests. Please try again after 15 minutes.'
    }
});
