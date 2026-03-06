/**
 * Custom XSS sanitizer middleware.
 * Recursively sanitizes all string values in req.body, req.query, and req.params
 * by stripping dangerous HTML tags and event handlers.
 *
 * This runs in addition to xss-clean for defense-in-depth.
 */

// Patterns to strip from user input
const DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,  // <script> tags
    /on\w+\s*=\s*["'][^"']*["']/gi,                         // Event handlers (onclick, onerror, etc.)
    /javascript\s*:/gi,                                      // javascript: URIs
    /data\s*:\s*text\/html/gi,                               // data:text/html URIs
    /vbscript\s*:/gi,                                        // vbscript: URIs
    /<iframe\b[^>]*>/gi,                                     // <iframe> tags
    /<object\b[^>]*>/gi,                                     // <object> tags
    /<embed\b[^>]*>/gi,                                      // <embed> tags
    /<link\b[^>]*>/gi,                                       // <link> tags
];

function sanitizeValue(value) {
    if (typeof value === 'string') {
        let clean = value;
        for (const pattern of DANGEROUS_PATTERNS) {
            clean = clean.replace(pattern, '');
        }
        return clean.trim();
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
        return sanitizeObject(value);
    }
    return value;
}

function sanitizeObject(obj) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeValue(value);
    }
    return sanitized;
}

export const xssSanitizer = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
    }
    next();
};
