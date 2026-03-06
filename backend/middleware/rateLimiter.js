import rateLimit from 'express-rate-limit';

// Strict limiter for authentication endpoints (login, register)
// 10 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,   // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,     // Disable `X-RateLimit-*` headers
    message: {
        status: 'error',
        message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    }
});

// General API limiter — 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many requests from this IP. Please try again later.'
    }
});

// Strict limiter for booking creation — 5 bookings per 15 minutes per IP
export const bookingCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many booking requests. Please try again after 15 minutes.'
    }
});
