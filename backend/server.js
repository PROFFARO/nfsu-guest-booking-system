import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xssClean from 'xss-clean';
import hpp from 'hpp';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
// Stripe removed for now

import { initSocket, getIO } from './realtime/socket.js';
// Payments routes removed for now
import Room from './models/Room.js';

// Import routes
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';
import userRoutes from './routes/users.js';
import reviewRoutes from './routes/reviews.js';
import auditLogRoutes from './routes/auditLogs.js';
import chatRoutes from './routes/chats.js';
import faqRoutes from './routes/faq.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { authLimiter, apiLimiter, bookingCreateLimiter } from './middleware/rateLimiter.js';

// Load environment variables
dotenv.config({ path: './.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = process.env.PORT || 5000;
// Stripe init removed

// CORS configuration (must be before any other middleware)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
];

// Add custom origins from environment variable
if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  allowedOrigins.push(...customOrigins);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in the allowed list
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Check if it's a Vercel deployment
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    // If we reach here, the origin is not allowed
    console.warn(`⚠️ Blocked CORS request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Manual CORS middleware as fallback
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Stripe webhook removed

// Body parsing middleware (after Stripe webhook registration)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize data — prevent NoSQL injection
// Strips out $ and . from req.body, req.query, req.params
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️  Mongo injection attempt blocked on ${key} from IP: ${req.ip}`);
  }
}));

// XSS Protection — Layer 1: xss-clean (strips HTML from input)
app.use(xssClean());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    if (process.env.NODE_ENV !== 'production') process.exit(1);
  });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'NFSU Guest House API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
// Rate limit: strict on auth (10 req/15min), general on all API (100 req/15min)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rooms', apiLimiter, roomRoutes);
app.use('/api/bookings', apiLimiter, authMiddleware, bookingRoutes);
// Payments routes removed
app.use('/api/users', apiLimiter, authMiddleware, userRoutes);
app.use('/api/reviews', apiLimiter, reviewRoutes);
app.use('/api/audit-logs', apiLimiter, authMiddleware, auditLogRoutes);
app.use('/api/chats', apiLimiter, authMiddleware, chatRoutes);
app.use('/api/faq', apiLimiter, faqRoutes);

// Serve static upload files (Legacy fallback)
const uploadsPath = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsPath)) {
  app.use('/uploads', express.static(uploadsPath));
}

// Serve static files in production only if dist folder exists
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const distPath = path.join(__dirname, '../dist');

  // Check if dist folder exists (for monorepo deployments)
  try {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));

      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      console.log('📁 Serving static files from:', distPath);
    }
  } catch (error) {
    console.log('📁 Static file serving disabled');
  }
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Create HTTP server and initialize Socket.IO
const server = http.createServer(app);
initSocket(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Start server locally (Skip on Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  mongoose.connection.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  mongoose.connection.close(() => {
    process.exit(0);
  });
});

export default app;

