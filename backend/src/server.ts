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

// Load environment variables
dotenv.config();

const app = express();
// Trust the first proxy (Nginx or ALB) for correct IP detection
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Monitoring service URLs - use environment variables for AWS, fallback to Docker Compose names
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
const LOKI_URL = process.env.LOKI_URL || process.env.LOKI_HOST || 'http://grafana-lgtm:3100';

console.log(`📊 Prometheus URL: ${PROMETHEUS_URL}`);
console.log(`📋 Loki URL: ${LOKI_URL}`);

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
  
  // Log incoming requests
  logger.info('📨 Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    // Log request completion
    logger.info('📤 Request completed', {
      method: req.method,
      route: route,
      statusCode: res.statusCode,
      responseTime: `${duration}s`,
      timestamp: new Date().toISOString()
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
app.use(cors());
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
  
  res.json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root API endpoint
app.get('/api', (req, res) => {
  const requestStart = Date.now();
  
  logger.info('🔌 API root endpoint accessed', { 
    endpoint: '/api', 
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  const responseData = {
    message: 'Backend API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    status: 'operational'
  };
  
  const responseTime = Date.now() - requestStart;
  
  logger.info('✅ API root response sent', {
    endpoint: '/api',
    responseTime: `${responseTime}ms`,
    statusCode: 200
  });
  
  res.json(responseData);
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    const metrics = await promClient.register.metrics();
    res.end(metrics);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error serving metrics:', error.message);
      res.status(500).end('Error generating metrics');
    } else {
      console.error('Unknown error occurred while serving metrics:', error);
      res.status(500).end('Unknown error occurred');
    }
  }
});

// Proxy routes for Prometheus
app.get('/api/prometheus/query', async (req, res) => {
  try {
    const query = validateQueryParam(req.query.query);
    if (!query) {
      return res.status(400).json({ error: 'Invalid or missing query parameter' });
    }
    console.log('🔍 Prometheus query:', query);
    console.log('🔗 Prometheus URL:', PROMETHEUS_URL);
    
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
      params: { query },
      timeout: 5000
    });
    
    console.log('✅ Prometheus response:', JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Prometheus proxy error:', error.message);
      const axiosError = error as { response?: { data?: unknown } };
      console.error('Error details:', axiosError.response?.data);
      res.status(500).json({ error: 'Failed to query Prometheus', details: error.message });
    } else {
      console.error('❌ Prometheus proxy error:', error);
      res.status(500).json({ error: 'Unknown error occurred' });
    }
  }
});

// Proxy routes for Loki
app.get('/api/loki/query_range', async (req, res) => {
  try {
    const { limit } = req.query;
    const lokiQuery = validateQueryParam(req.query.query) ?? '{job="backend"}';

    // Loki requires time range in nanoseconds
    const end = Date.now() * 1000000; // Current time in nanoseconds
    const start = end - (3600 * 1000000000); // 1 hour ago
    
    console.log('🔍 Loki query request:', {
      query: lokiQuery,
      limit: limit || 100,
      start,
      end,
      lokiUrl: LOKI_URL
    });
    
    // Use URLSearchParams for proper encoding
    const params = new URLSearchParams();
    params.append('query', lokiQuery);
    params.append('limit', String(limit || 100));
    params.append('start', String(start));
    params.append('end', String(end));
    
    const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range?${params.toString()}`, {
      timeout: 5000
    });
    
    console.log('✅ Loki query successful, streams found:', response.data.data?.result?.length || 0);
    
    res.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Loki proxy error:', error.message);
      const axiosError = error as { response?: { data?: unknown } };
      console.error('Loki error details:', axiosError.response?.data);
      res.status(500).json({ 
        error: 'Failed to query Loki',
        details: axiosError.response?.data || error.message 
      });
    } else {
      console.error('❌ Loki proxy error:', error);
      res.status(500).json({ error: 'Unknown error occurred' });
    }
  }
});

// Health check endpoint (now includes DB check)
app.get('/health', async (req, res) => {
  const dbHealthy = await db.testConnection();
  
  res.status(dbHealthy ? 200 : 503).json({ 
    status: dbHealthy ? 'healthy' : 'unhealthy',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


// API route with database
app.get('/api/users', async (req, res) => {
  try {
    logger.info('Fetching users from database');
    const users = await db.getUsers();
    logger.info(`Retrieved ${users.length} users`);
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Database error:', error.message);
      console.error('Database error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    } else {
      logger.error('Unknown database error:', error);
      console.error('Unknown database error:', error);
      res.status(500).json({
        success: false,
        error: 'Unknown error occurred'
      });
    }
  }
});

// Database initialization endpoint
app.post('/api/init-db', async (req, res) => {
  const pool = db.getPool();
  const client = await pool.connect();
  try {
    logger.info('🔧 Initializing database schema...');

    const sqlPath = path.join(__dirname, '../database/01_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');
    logger.info('📄 Running SQL initialization script');
    await client.query(sql);
    await client.query('COMMIT');

    logger.info('✅ Database schema initialized successfully');
    res.json({ success: true, message: 'Database initialized successfully' });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ Database initialization failed, rolled back:', message);
    res.status(500).json({ success: false, error: 'Failed to initialize database', details: message });
  } finally {
    client.release();
  }
});

// Only start server if this file is run directly (not imported)
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('🚀 Server startup successful', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform
    });
    
    logger.info('📊 Available endpoints', {
      metrics: `http://localhost:${PORT}/metrics`,
      health: `http://localhost:${PORT}/api/health`,
      api: `http://localhost:${PORT}/api`,
      users: `http://localhost:${PORT}/api/users`,
      prometheus: `http://localhost:${PORT}/api/prometheus/query`,
      loki: `http://localhost:${PORT}/api/loki/query_range`
    });
    
    // Log initial system status
    setTimeout(() => {
      logger.info('💾 System resource status', {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      });
    }, 1000);
    
    console.log(` Server running on port ${PORT}`);
    console.log(` Metrics available at http://localhost:${PORT}/metrics`);
    console.log(` Health check at http://localhost:${PORT}/health`);
    console.log(`Users API at http://localhost:${PORT}/api/users`);
  });
}

export default app;