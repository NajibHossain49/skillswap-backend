import express, { Application } from 'express';
import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import { config } from './config';
import { prisma } from './prisma/client';
import { logger } from './utils/logger';
import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import skillRoutes from './modules/skills/skill.routes';
import sessionRoutes from './modules/sessions/session.routes';
import availabilityRoutes from './modules/availability/availability.routes';
import bookingRoutes from './modules/bookings/booking.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import adminRoutes from './modules/admin/admin.routes';
import creditRoutes from './modules/credits/credit.routes';
import mentorRoutes from './modules/mentors/mentor.routes';

const app: Application = express();

// Deployed behind a proxy (Vercel) — trust the first hop for correct client IPs.
app.set('trust proxy', 1);

// Build the CORS allowlist from a comma-separated CORS_ORIGIN value.
const allowedOrigins = config.cors.origin
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0 && origin !== '*');

const isDevelopment = config.env === 'development';
const localhostRegex = /^https?:\/\/localhost(:\d+)?$/;

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (no Origin header) such as curl or server-to-server.
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (isDevelopment && localhostRegex.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
};

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'no-referrer' },
  }),
);
app.use(cors(corsOptions));
app.use(compression());
app.use(hpp());

// Body parsing
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// Request context + logging
app.use(requestId);
app.use(requestLogger);

// Health check — verifies the database is reachable.
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.env,
      version: '1.0.0',
    });
  } catch (err) {
    logger.error({ msg: 'Health check failed', error: err });
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: config.env,
      version: '1.0.0',
    });
  }
});

// API routes
const API_PREFIX = '/api';
app.use(API_PREFIX, globalLimiter);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/skills`, skillRoutes);
app.use(`${API_PREFIX}/sessions`, sessionRoutes);
app.use(`${API_PREFIX}/availability`, availabilityRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/mentors`, mentorRoutes);
app.use(`${API_PREFIX}/credits`, creditRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
