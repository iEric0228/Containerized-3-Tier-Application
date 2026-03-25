import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { collectDefaultMetrics, Counter } from 'prom-client';
import dotenv from 'dotenv';
import axios from 'axios';
import { DatabaseConnection } from './config/database';
import promClient from 'prom-client';
import logger from './config/logger';
import fs from 'fs';
import path from 'path';
import { toAppError } from './types/errors';

// Load environment variables
dotenv.config();

const app = express();
// Trust the first proxy (Nginx or ALB) for correct IP detection
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Monitoring service URLs - use environment variables for AWS, fallback to Docker Compose names
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
const LOKI_URL = process.env.LOKI_URL || process.env.LOKI_HOST || 'http://grafana-lgtm:3100';

logger.info('Monitoring URLs configured', { prometheus: PROMETHEUS_URL, loki: LOKI_URL });

// Start collecting default metrics (CPU, memory, etc.)
collectDefaultMetrics();

// Custom Prometheus metrics
const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'], // Changed 'status' to 'status_code'
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware to record HTTP requests
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    logger.info('Request completed', {
      method: req.method,
      route,
      statusCode: res.statusCode,
      duration: `${duration}s`,
    });
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    httpRequestCounter
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
});

// Initialize database connection
const db = DatabaseConnection.getInstance();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(compression());

// Rate limiting - 100 requests/minute per IP
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100, // 100 requests per minute per IP
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for metrics endpoints
  skip: (req) => {
    return req.path === '/metrics' || 
           req.path === '/api/health' || 
           req.path.startsWith('/api/prometheus') || 
           req.path.startsWith('/api/loki');
  }
});
app.use(limiter);

// Input validation helper for proxy query parameters
function validateQueryParam(query: unknown): string | null {
  if (!query || typeof query !== 'string') return null;
  if (query.length > 500) return null;
  // Block shell metacharacters that have no place in PromQL/LogQL
  if (/[;&|`$]/.test(query)) return null;
  return query;
}

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  logger.info('Health check requested', {
    endpoint: '/api/health',
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method
  });

  const dbHealthy = await db.testConnection();
  const responseTime = Date.now() - startTime;

  if (dbHealthy) {
    logger.info('Health check completed successfully', {
      database: 'connected',
      responseTime: `${responseTime}ms`,
      status: 'healthy'
    });
  } else {
    logger.error('Health check failed - database disconnected', {
      database: 'disconnected',
      responseTime: `${responseTime}ms`,
      status: 'unhealthy'
    });
  }

  const statusCode = dbHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root API endpoint
app.get('/api', (_req, res) => {
  res.json({
    message: 'Backend API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    status: 'operational'
  });
});

// Metrics endpoint for Prometheus scraping.
// In production, port 3001 must NOT be publicly accessible (private subnet only).
// Prometheus scrapes this endpoint from within the VPC.
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    const metrics = await promClient.register.metrics();
    res.end(metrics);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error serving metrics', { error: message });
    res.status(500).end('Error generating metrics');
  }
});

// Internal-only middleware: block monitoring proxy routes from external requests.
// Primary defense is network-level: in production, port 3001 is in a private subnet
// behind the ALB/nginx. This Referer check is a secondary defense-in-depth layer.
const internalOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    const referer = req.get('referer') || '';
    const origin = req.get('origin') || '';
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000'];
    const isAllowed = allowedOrigins.some(o => referer.startsWith(o) || origin === o);
    if (!isAllowed) {
      logger.warn('Blocked external proxy request', { path: req.path, referer, origin });
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  next();
};

// Proxy routes for Prometheus (internal only)
app.get('/api/prometheus/query', internalOnly, async (req, res) => {
  try {
    const query = validateQueryParam(req.query.query);
    if (!query) {
      return res.status(400).json({ error: 'Invalid or missing query parameter' });
    }
    logger.debug('Prometheus query', { query });

    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
      params: { query },
      timeout: 5000
    });

    res.json(response.data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Prometheus proxy error', { error: message });
    res.status(500).json({ error: 'Failed to query Prometheus' });
  }
});

// Proxy routes for Loki (internal only)
app.get('/api/loki/query_range', internalOnly, async (req, res) => {
  try {
    const { limit } = req.query;
    const lokiQuery = validateQueryParam(req.query.query) ?? '{job="backend"}';

    // Loki requires time range in nanoseconds
    const end = Date.now() * 1000000;
    const start = end - (3600 * 1000000000); // 1 hour ago

    const params = new URLSearchParams();
    params.append('query', lokiQuery);
    params.append('limit', String(limit || 100));
    params.append('start', String(start));
    params.append('end', String(end));

    const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range?${params.toString()}`, {
      timeout: 5000
    });

    res.json(response.data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Loki proxy error', { error: message });
    res.status(500).json({ error: 'Failed to query Loki' });
  }
});

// Container health check (lightweight, used by Docker/ECS healthcheck)
app.get('/health', async (_req, res) => {
  const dbHealthy = await db.testConnection();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});


// API route with database (paginated)
app.get('/api/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    logger.info('Fetching users from database', { page, limit });
    const { rows, total, page: currentPage, limit: currentLimit } = await db.getUsers(page, limit);
    logger.info(`Retrieved ${rows.length} of ${total} users`);
    res.json({
      success: true,
      data: rows,
      count: rows.length,
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages: Math.ceil(total / currentLimit)
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database error fetching users', { error: message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Database initialization endpoint - disabled in production
app.post('/api/init-db', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Database init endpoint blocked in production', { ip: req.ip });
    return res.status(403).json({ success: false, error: 'Not available in production' });
  }

  const pool = db.getPool();
  const client = await pool.connect();
  try {
    logger.info('Initializing database schema...');

    const sqlPath = path.join(__dirname, '../database/01_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');
    logger.info('Running SQL initialization script');
    await client.query(sql);
    await client.query('COMMIT');

    logger.info('Database schema initialized successfully');
    res.json({ success: true, message: 'Database initialized successfully' });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database initialization failed, rolled back:', message);
    res.status(500).json({ success: false, error: 'Failed to initialize database' });
  } finally {
    client.release();
  }
});

// Only start server if this file is run directly (not imported)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    logger.info('Server startup successful', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    });
  });

  // Graceful shutdown handler
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await db.getPool().end();
        logger.info('Database pool closed');
      } catch (err) {
        logger.error('Error closing database pool', { error: String(err) });
      }
      process.exit(0);
    });

    // Force exit after 10s if graceful shutdown stalls
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Centralized error handling middleware (must be last middleware)
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const appError = toAppError(err);
  logger.error('Unhandled error', { message: appError.message, statusCode: appError.statusCode, url: req.url });
  res.status(appError.statusCode).json({ success: false, error: appError.message });
});

export default app;