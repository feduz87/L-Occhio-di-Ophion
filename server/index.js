import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import pkg from 'pg';
import pino from 'pino';
import rateLimit from 'express-rate-limit';
import authRoutes from './api/auth.js';
import characterRoutes from './api/characters.js';
import mapRoutes from './api/map.js';
import travelRoutes from './api/travel.js';
import npcRoutes from './api/npcs.js';
import questRoutes from './api/quests.js';
import combatRoutes from './api/combat.js';
import { errorHandler } from './middleware/errorHandler.js';

const { Pool } = pkg;
dotenv.config();

// Logger setup
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test database connection
pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
});

const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('✅ Database connected:', result.rows[0]);
  } catch (err) {
    logger.error('❌ Database connection failed:', err);
    process.exit(1);
  }
};

// Express app setup
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// ============================================================================
// Rate Limiting Middleware
// ============================================================================

// Global rate limiter: 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test', // Disable in test mode
});

// Auth rate limiter: 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login/register attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
  skipSuccessfulRequests: false, // Count all requests, even successful
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting
app.use('/api/', globalLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Attach database pool to request
app.use((req, res, next) => {
  req.db = pool;
  req.logger = logger;
  next();
});

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: result.rows[0].now,
    });
  } catch (err) {
    logger.error('Health check failed:', err);
    res.status(500).json({ status: 'error', message: 'Database unavailable' });
  }
});

// Game config
app.get('/api/game/config', (req, res) => {
  res.json({
    game: 'L\'Occhio di Ophion',
    version: '0.0.1',
    dual_mode_ia: process.env.DUAL_MODE_IA_ENABLED === 'true',
    game_difficulty: process.env.GAME_DIFFICULTY,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/npcs', npcRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/combat', combatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Route not found',
  });
});

// Centralized Error Handler (must be LAST)
app.use(errorHandler);

// ============================================================================
// Server startup
// ============================================================================

const start = async () => {
  try {
    await testConnection();
    app.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running at http://${HOST}:${PORT}`);
      logger.info('📖 API documentation: https://github.com/occhio-di-ophion/docs');
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

export { app, pool, logger };
