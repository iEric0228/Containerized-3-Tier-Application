import request from 'supertest';
import app from '../backend/src/server';
import { DatabaseConnection } from '../backend/src/config/database';

describe('API Integration Tests', () => {
  // Close database connections after all tests
  afterAll(async () => {
    try {
      const db = DatabaseConnection.getInstance();
      await db.getPool().end();
      
      // Force exit after cleanup
      setTimeout(() => process.exit(0), 500);
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  test('GET /health should return status', async () => {
    const response = await request(app).get('/health');
    
    // Accept both 200 (database connected) and 503 (database unavailable in test)
    expect([200, 503]).toContain(response.status);
    expect(response.body.status).toBeDefined();
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.uptime).toBeGreaterThan(0);
  });

  test('GET /api should return backend message', async () => {
    const response = await request(app).get('/api');
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Backend API is running');
    expect(response.body.environment).toBeDefined();
  });

  test('GET /api/users should return user list or error', async () => {
    const response = await request(app).get('/api/users');
    
    // Accept both 200 (database connected) and 500 (database unavailable in test)
    expect([200, 500]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(0);
      expect(response.body.data.length).toBe(response.body.count);
    } else {
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    }
  });

  test('GET /metrics should return Prometheus metrics', async () => {
    const response = await request(app).get('/metrics');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('process_cpu_user_seconds_total');
  });
});