import { Pool } from 'pg';
import { Gauge } from 'prom-client';

const pgPoolTotal = new Gauge({
  name: 'pg_pool_total_connections',
  help: 'Total number of connections in the PostgreSQL pool',
});

const pgPoolIdle = new Gauge({
  name: 'pg_pool_idle_connections',
  help: 'Number of idle connections in the PostgreSQL pool',
});

const pgPoolWaiting = new Gauge({
  name: 'pg_pool_waiting_requests',
  help: 'Number of pending requests waiting for a pool connection',
});

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;

  private constructor() {
    const useSSL = process.env.DB_SSL === 'true';
    const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: useSSL ? { rejectUnauthorized } : false,
    });

    // Update pool metrics on every acquire/release
    this.pool.on('connect', () => {
      pgPoolTotal.set(this.pool.totalCount);
      pgPoolIdle.set(this.pool.idleCount);
      pgPoolWaiting.set(this.pool.waitingCount);
    });
    this.pool.on('acquire', () => {
      pgPoolTotal.set(this.pool.totalCount);
      pgPoolIdle.set(this.pool.idleCount);
      pgPoolWaiting.set(this.pool.waitingCount);
    });
    this.pool.on('remove', () => {
      pgPoolTotal.set(this.pool.totalCount);
      pgPoolIdle.set(this.pool.idleCount);
      pgPoolWaiting.set(this.pool.waitingCount);
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  // Method to get users
  public async getUsers() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows;
    } finally {
      client.release();
    }
  }
}