import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import {register, collectDefaultMetrics} from 'prom-client'; 
import dotenv from 'dotenv';
import { DatabaseConnection } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Start collecting default metrics (CPU, memory, etc.)
collectDefaultMetrics();

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

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
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