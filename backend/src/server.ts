import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { register, collectDefaultMetrics, Counter } from 'prom-client';
import dotenv from 'dotenv';
import axios from 'axios';
import { DatabaseConnection } from './config/database';
import promClient from 'prom-client';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
    const route = (req as any).route?.path || req.path;
    // Remove the duplicate increment
    // httpRequestCounter.labels(req.method, route, String(res.statusCode)).inc();
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
    httpRequestCounter  // Changed from httpRequestsTotal to httpRequestCounter
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Backend API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    const metrics = await promClient.register.metrics();
    res.end(metrics);
  } catch (error) {
    console.error('Error serving metrics:', error);
    res.status(500).end('Error generating metrics');
  }
});

// Proxy routes for Prometheus
app.get('/api/prometheus/query', async (req, res) => {
  try {
    const { query } = req.query;
    console.log('🔍 Prometheus query:', query);
    
    const response = await axios.get('http://prometheus:9090/api/v1/query', {
      params: { query }
    });
    
    console.log('✅ Prometheus response:', JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Prometheus proxy error:', error.message);
    console.error('Error details:', error.response?.data);
    res.status(500).json({ error: 'Failed to query Prometheus' });
  }
});

// Proxy routes for Loki
app.get('/api/loki/query_range', async (req, res) => {
  try {
    const { query, limit } = req.query;
    
    // Loki requires time range in nanoseconds
    const end = Date.now() * 1000000; // Current time in nanoseconds
    const start = end - (3600 * 1000000000); // 1 hour ago
    
    const lokiQuery = query || '{job="backend"}';
    
    const response = await axios.get('http://grafana-lgtm:3100/loki/api/v1/query_range', {
      params: {
        query: lokiQuery,
        limit: limit || 100,
        start: start,
        end: end
      },
      paramsSerializer: params => {
        // Properly encode the query parameter
        return Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
          .join('&');
      }
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Loki proxy error:', error.message);
    console.error('Loki error details:', error.response?.data);
    res.status(500).json({ 
      error: 'Failed to query Loki',
      details: error.response?.data || error.message 
    });
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
    const users = await db.getUsers();
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Basic API route
app.get('/api', (req, res) => {
  res.json({
    message: 'Backend is running smoothly!',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Only start server if this file is run directly (not imported)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
    console.log(` Metrics available at http://localhost:${PORT}/metrics`);
    console.log(` Health check at http://localhost:${PORT}/health`);
    console.log(`Users API at http://localhost:${PORT}/api/users`);
  });
}

export default app;