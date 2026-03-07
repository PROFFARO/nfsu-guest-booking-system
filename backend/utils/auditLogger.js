import AuditLog from '../models/AuditLog.js';

/**
 * Utility to record an entry in the Audit Log.
 * 
 * @param {Object} params Object containing log details
 * @param {String|ObjectId} params.userId The ID of the user performing the action
 * @param {String} params.action The predefined action string (e.g., 'LOGIN', 'BOOKING_CREATE')
 * @param {Object} params.details Any additional contextual JSON data (diff, target IDs, messages)
 * @param {Object} params.req The Express request object to extract IP and User-Agent
 * @param {String} [params.status='SUCCESS'] Status of the action ('SUCCESS' or 'FAILED')
 */
export const logEvent = async ({ userId, action, details = {}, req, status = 'SUCCESS' }) => {
    try {
        if (!userId || !action) {
            console.error('Audit Logger Error: Missing userId or action');
            return;
        }

        // Extract IP and UA safely
        let ipAddress = 'unknown';
        let userAgent = 'unknown';

        if (req) {
            ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
            userAgent = req.get('User-Agent') || 'unknown';
        }

        const logEntry = new AuditLog({
            user: userId,
            action,
            details,
            ipAddress,
            userAgent,
            status
        });

        await logEntry.save();
    } catch (error) {
        // We log the error but don't throw it. Audit logging failure shouldn't break the main business logic flow.
        console.error('Failed to write Audit Log:', error);
    }
};
