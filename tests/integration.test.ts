import request from 'supertest';
import app from '../src/server';
import { DatabaseConnection } from '../src/config/database';

describe('API Integration Tests', () => {
  // Close database connections after all tests
  afterAll(async () => {
    const db = DatabaseConnection.getInstance();
    await db.getPool().end();
  });

  test('GET /health should return healthy status with database', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.database).toBe('connected');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.uptime).toBeGreaterThan(0);
  });

  test('GET /api should return backend message', async () => {
    const response = await request(app).get('/api');
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Backend is running smoothly!');
    expect(response.body.environment).toBeDefined();
  });

  test('GET /api/users should return user list from database', async () => {
    const response = await request(app).get('/api/users');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toBeGreaterThanOrEqual(0);
    expect(response.body.data.length).toBe(response.body.count);
  });

  test('GET /metrics should return Prometheus metrics', async () => {
    const response = await request(app).get('/metrics');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('process_cpu_user_seconds_total');
  });
});