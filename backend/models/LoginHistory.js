import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  ipAddress: {
    type: String,
    default: 'Unknown'
  },
  userAgent: {
    type: String,
    default: ''
  },
  browser: {
    type: String,
    default: 'Unknown'
  },
  os: {
    type: String,
    default: 'Unknown'
  },
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  location: {
    type: String,
    default: 'Unknown'
  },
  // Hashed fingerprint of the JWT token issued for this login
  sessionToken: {
    type: String,
    default: null,
    index: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  revokedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
loginHistorySchema.index({ user: 1, createdAt: -1 });
loginHistorySchema.index({ user: 1, status: 1, isRevoked: 1, expiresAt: 1 });

// Static: get active sessions for a user
loginHistorySchema.statics.getActiveSessions = function (userId) {
  return this.find({
    user: userId,
    status: 'success',
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

// Static: get login history for a user
loginHistorySchema.statics.getHistory = function (userId, limit = 20) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static: check if a session token is revoked
loginHistorySchema.statics.isSessionRevoked = async function (sessionToken) {
  if (!sessionToken) return false;
  const record = await this.findOne({
    sessionToken,
    status: 'success',
    isRevoked: true
  });
  return !!record;
};

// Helper: parse user-agent string into browser, OS, device
loginHistorySchema.statics.parseUserAgent = function (ua) {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'unknown' };

  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'desktop';

  // Parse browser
  if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    browser = `Firefox ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/([\d.]+)/);
    browser = `Edge ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (ua.includes('Chrome/')) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    browser = `Chrome ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/([\d.]+)/);
    browser = `Safari ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
    browser = 'Internet Explorer';
  }

  // Parse OS
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X ([\d_]+)/);
    os = `macOS ${match ? match[1].replace(/_/g, '.') : ''}`.trim();
  }
  else if (ua.includes('Android')) {
    const match = ua.match(/Android ([\d.]+)/);
    os = `Android ${match ? match[1] : ''}`.trim();
  }
  else if (ua.includes('iPhone') || ua.includes('iPad')) {
    const match = ua.match(/OS ([\d_]+)/);
    os = `iOS ${match ? match[1].replace(/_/g, '.') : ''}`.trim();
  }
  else if (ua.includes('Linux')) os = 'Linux';

  // Parse device type
  if (ua.includes('Mobile') || ua.includes('Android') && !ua.includes('Tablet')) device = 'mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'tablet';
  else device = 'desktop';

  return { browser, os, device };
};

const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);

export default LoginHistory;
