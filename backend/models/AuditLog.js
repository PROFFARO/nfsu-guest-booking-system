import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: [
      'LOGIN',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'PROFILE_UPDATE',
      'BOOKING_CREATE',
      'BOOKING_UPDATE',
      'BOOKING_CANCEL',
      'PAYMENT_ATTEMPT',
      'ROOM_CREATE',
      'ROOM_UPDATE',
      'ROOM_DELETE',
      'USER_UPDATE',
      'USER_DELETE',
      'SYSTEM_MAINTENANCE'
    ],
    required: true,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Flexible payload for specific diffs or IDs
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED'],
    default: 'SUCCESS'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // Important for sorting/filtering by date
  }
});

// Compound index for efficient user-specific timeline queries
auditLogSchema.index({ user: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
