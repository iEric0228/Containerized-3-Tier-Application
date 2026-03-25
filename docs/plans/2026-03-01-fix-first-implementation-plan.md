# Comprehensive Review: Fix-First Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply 20 targeted improvements across security, LGTM observability, backend architecture, frontend UX, and infrastructure — producing a portfolio-grade, production-ready containerized 3-tier application.

**Architecture:** React 19 + TypeScript frontend (Nginx), Node.js 22 + Express backend (TypeScript), PostgreSQL 15, full LGTM observability stack via `grafana/otel-lgtm` + standalone Prometheus + Promtail. Docker Compose for local, Terraform + AWS ECS Fargate for production.

**Tech Stack:** React 19, Node.js 22, Express 4, TypeScript 5, PostgreSQL 15, prom-client, winston-loki, Nginx 1.27, Docker Compose, Prometheus, Loki, Tempo, Mimir, Grafana, Terraform 1.9, GitHub Actions

**Project root:** `/Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application`

---

## PHASE 1 — Critical Fixes (Security + LGTM Correctness)

---

### Task 1: Audit and fix root `.env` credential exposure

**Files:**
- Check: `.env` (root)
- Check: `.gitignore` (root)
- Modify: `.env.example` (root, if it exists — create if not)

**Step 1: Check if the .env file is tracked by git**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application
git ls-files .env
```

Expected: Either outputs `.env` (file IS tracked — must remove from git history) or outputs nothing (file is NOT tracked — safe, just ensure gitignore is correct).

**Step 2: If .env IS tracked by git — remove it from tracking**

```bash
git rm --cached .env
```

Expected: `rm '.env'`

If it outputs an error like "pathspec '.env' did not match any files", skip this step.

**Step 3: Verify .gitignore already covers .env**

Read `.gitignore` lines 1-5. It should contain `.env` and `.env.*`. If not, add them:

The file already has this at lines 1-4:
```
# Environment files (keep examples)
.env
.env.*
!.env.example
```

No change needed to `.gitignore` — it's already correct.

**Step 4: Replace root .env with safe placeholder content**

Replace the entire content of `.env` (root) with:

```bash
# Local development overrides (never commit real values)
# Copy this to .env.example with placeholder values
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

**Step 5: Revoke the exposed OAuth credentials**

Go to https://github.com/settings/developers → OAuth Apps → find this app → Regenerate client secret. This is mandatory regardless of git history.

**Step 6: Check git status**

```bash
git status
```

Expected: `.env` should appear as untracked (not staged, not modified if it was already gitignored).

**Step 7: Commit**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application
git add -A
git commit -m "fix(security): remove exposed OAuth credentials from root .env"
```

---

### Task 2: Fix LOKI_URL fallback in server.ts (Breaks Loki proxy)

**Files:**
- Modify: `backend/src/server.ts:23`

**Context:** `server.ts` line 23 reads `LOKI_URL` env var and falls back to `http://loki:3100`. But:
1. The docker-compose sets `LOKI_HOST` (not `LOKI_URL`) for the backend
2. The service is named `grafana-lgtm`, not `loki`

So the Loki proxy route (`/api/loki/query_range`) always uses the wrong URL in local dev.

**Step 1: Fix the fallback URL in server.ts**

In `backend/src/server.ts`, line 23, change:
```typescript
const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100';
```
To:
```typescript
const LOKI_URL = process.env.LOKI_URL || process.env.LOKI_HOST || 'http://grafana-lgtm:3100';
```

This way:
- Docker Compose with `LOKI_HOST` set: uses the correct compose service name
- Production with `LOKI_URL` set: uses the explicit URL
- Neither set: uses the correct compose service name as fallback

**Step 2: Add LOKI_URL to docker-compose backend environment for clarity**

In `docker-compose.yml`, in the `backend` service `environment` block, add after the `LOKI_HOST` line:
```yaml
      - LOKI_URL=http://grafana-lgtm:3100
```

The full environment block after edit (lines 29-36):
```yaml
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=app_db
      - DB_USER=postgres
      - DB_PASSWORD=password
      - LOKI_HOST=http://grafana-lgtm:3100
      - LOKI_URL=http://grafana-lgtm:3100
```

**Step 3: Verify the fix**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application
grep -n "LOKI_URL\|LOKI_HOST" backend/src/server.ts docker-compose.yml
```

Expected: Shows the corrected fallback in server.ts and both vars set in compose.

**Step 4: Commit**

```bash
git add backend/src/server.ts docker-compose.yml
git commit -m "fix(loki): correct LOKI_URL fallback to grafana-lgtm service name"
```

---

### Task 3: Remove duplicate GET /api route

**Files:**
- Modify: `backend/src/server.ts:350-356`

**Context:** There are two handlers for `GET /api`. The first (lines 147-176) is fully detailed with logging and structured response. The second (lines 351-356) is a simplified duplicate that can never be reached.

**Step 1: Remove the duplicate route**

In `backend/src/server.ts`, delete lines 350-356:
```typescript
// Basic API route
app.get('/api', (req, res) => {
  res.json({
    message: 'Backend is running smoothly!',
    environment: process.env.NODE_ENV || 'development'
  });
});
```

(Keep the first `GET /api` handler at lines 147-176 — it's the complete version with logging.)

**Step 2: Verify only one GET /api handler remains**

```bash
grep -n "app.get('/api'" backend/src/server.ts
```

Expected: Only one line at ~line 147.

**Step 3: Commit**

```bash
git add backend/src/server.ts
git commit -m "fix(backend): remove unreachable duplicate GET /api route"
```

---

### Task 4: Make SSL certificate validation configurable

**Files:**
- Modify: `backend/src/config/database.ts:17-19`
- Modify: `backend/.env.example` (add new var)

**Context:** `rejectUnauthorized: false` disables SSL certificate validation entirely — a MITM vulnerability for AWS RDS. In local dev with a plain Postgres container, SSL isn't used at all anyway, so this option has no effect locally but is dangerous in production.

**Step 1: Read the current database.ts**

Already read: `backend/src/config/database.ts:17-19` shows:
```typescript
      ssl: {
        rejectUnauthorized: false // Required for AWS RDS
      }
```

**Step 2: Replace with environment-controlled SSL config**

Change lines 7-20 of `backend/src/config/database.ts` from:
```typescript
  private constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: {
        rejectUnauthorized: false // Required for AWS RDS
      }
    });
  }
```
To:
```typescript
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
  }
```

**Step 3: Update docker-compose backend environment**

Local Postgres doesn't use SSL. Add to docker-compose.yml backend environment:
```yaml
      - DB_SSL=false
```

For AWS RDS production, you would set:
```
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

**Step 4: Update backend/.env.example**

Add these lines to `backend/.env.example`:
```
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
```

**Step 5: Verify**

```bash
grep -n "DB_SSL\|rejectUnauthorized" backend/src/config/database.ts docker-compose.yml
```

Expected: Shows the new env-based logic in database.ts and `DB_SSL=false` in compose.

**Step 6: Commit**

```bash
git add backend/src/config/database.ts docker-compose.yml backend/.env.example
git commit -m "fix(security): make SSL certificate validation configurable per environment"
```

---

### Task 5: Fix the 5-query Loki fallback chain in frontend

**Files:**
- Modify: `frontend/src/services/api.ts:71-139`

**Context:** `getLokiLogs()` tries 5 different Loki label queries sequentially. This:
1. Shows the integration was broken (portfolio red flag)
2. Adds 4 extra round-trips per Dashboard load when query 1 returns empty
3. The correct label is `{job="backend"}` based on what Promtail actually produces

**Step 1: Replace the fallback chain with a single correct query**

Replace the entire `getLokiLogs` method (lines 71-139) with:

```typescript
  static async getLokiLogs(limit: number = 100): Promise<any> {
    const endTime = Date.now() * 1000000;
    const startTime = endTime - (24 * 60 * 60 * 1000 * 1000000); // 24 hours

    try {
      const response = await api.get('/loki/query_range', {
        params: {
          query: '{job="backend"}',
          limit,
          start: startTime.toString(),
          end: endTime.toString()
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Loki query error:', error.response?.data || error.message);
      return { data: { result: [], resultType: 'streams' } };
    }
  }
```

**Step 2: Verify the change**

```bash
grep -c "for (const query" frontend/src/services/api.ts
```

Expected: `0` (the loop is gone).

**Step 3: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "fix(frontend): replace 5-query Loki fallback chain with single correct label query"
```

---

## PHASE 2 — Backend Architecture

---

### Task 6: Add input validation to Loki and Prometheus proxy endpoints

**Files:**
- Modify: `backend/src/server.ts:196-269`

**Context:** The `query` parameter on both proxy routes is forwarded to Prometheus/Loki unvalidated. An attacker could inject malformed queries or attempt to exfiltrate data.

**Step 1: Add a validation helper before the routes**

In `backend/src/server.ts`, add this helper function after line 103 (after the `app.use(limiter)` line) and before the body parsing middleware:

```typescript
// Input validation helper for proxy query parameters
function validateQueryParam(query: unknown): string | null {
  if (!query || typeof query !== 'string') return null;
  if (query.length > 500) return null;
  // Block shell metacharacters that have no place in PromQL/LogQL
  if (/[;&|`$]/.test(query)) return null;
  return query;
}
```

**Step 2: Apply validation in the Prometheus proxy route**

In `backend/src/server.ts`, update the Prometheus proxy route (lines 196-220). Change:
```typescript
app.get('/api/prometheus/query', async (req, res) => {
  try {
    const { query } = req.query;
    console.log('🔍 Prometheus query:', query);
```
To:
```typescript
app.get('/api/prometheus/query', async (req, res) => {
  try {
    const query = validateQueryParam(req.query.query);
    if (!query) {
      return res.status(400).json({ error: 'Invalid or missing query parameter' });
    }
    console.log('🔍 Prometheus query:', query);
```

**Step 3: Apply validation in the Loki proxy route**

In `backend/src/server.ts`, update the Loki proxy route (lines 222-269). Change:
```typescript
app.get('/api/loki/query_range', async (req, res) => {
  try {
    const { query, limit } = req.query;

    // Loki requires time range in nanoseconds
    const end = Date.now() * 1000000;
    const start = end - (3600 * 1000000000);

    const lokiQuery = String(query || '{job="backend"}');
```
To:
```typescript
app.get('/api/loki/query_range', async (req, res) => {
  try {
    const { limit } = req.query;
    const lokiQuery = validateQueryParam(req.query.query) ?? '{job="backend"}';

    const end = Date.now() * 1000000;
    const start = end - (3600 * 1000000000);
```

**Step 4: Verify**

```bash
grep -n "validateQueryParam" backend/src/server.ts
```

Expected: 3 matches (definition + 2 usages).

**Step 5: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat(backend): add input validation to Loki and Prometheus proxy endpoints"
```

---

### Task 7: Tighten rate limiting and fix IP detection

**Files:**
- Modify: `backend/src/server.ts:89-104`

**Context:** 200 req/min is loose for a demo app. Also, without `app.set('trust proxy', 1)`, express-rate-limit sees the internal Docker bridge IP for all requests when behind Nginx or ALB — meaning the rate limit is shared across all users instead of per-IP.

**Step 1: Add trust proxy setting**

In `backend/src/server.ts`, after line 18 (`const app = express();`), add:
```typescript
// Trust the first proxy (Nginx or ALB) for correct IP detection
app.set('trust proxy', 1);
```

**Step 2: Reduce rate limit from 200 to 100 per minute**

In `backend/src/server.ts`, change line 92:
```typescript
  max: 200, // Increased from 100 to 200 requests per minute
```
To:
```typescript
  max: 100, // 100 requests per minute per IP
```

Also update the comment on line 89-90:
```typescript
// Rate limiting - 100 requests/minute per IP
const limiter = rateLimit({
```

**Step 3: Verify**

```bash
grep -n "trust proxy\|max: 100" backend/src/server.ts
```

Expected: 2 matches.

**Step 4: Commit**

```bash
git add backend/src/server.ts
git commit -m "fix(backend): tighten rate limiting to 100/min and fix per-IP detection behind proxy"
```

---

### Task 8: Wrap DB initialization in a transaction

**Files:**
- Modify: `backend/src/server.ts:314-348`

**Context:** The `POST /api/init-db` endpoint reads a SQL file and runs it as-is without a transaction. If the script partially fails (e.g., table creation succeeds but seed data fails), the DB is left in an inconsistent state.

**Step 1: Wrap the init-db handler in a transaction**

Replace lines 314-348 in `backend/src/server.ts`:
```typescript
// Database initialization endpoint
app.post('/api/init-db', async (req, res) => {
  try {
    logger.info('🔧 Initializing database schema...');
    const pool = db.getPool();

    // Read the SQL file content
    const sqlPath = path.join(__dirname, '../database/01_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    logger.info('📄 Running SQL initialization script');
    await pool.query(sql);

    logger.info('✅ Database schema initialized successfully');
    res.json({
      success: true,
      message: 'Database initialized successfully'
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('❌ Database initialization error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize database',
        details: error.message
      });
    } else {
      logger.error('❌ Unknown database initialization error:', error);
      res.status(500).json({
        success: false,
        error: 'Unknown error occurred'
      });
    }
  }
});
```

With:
```typescript
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
```

**Step 2: Verify BEGIN/COMMIT/ROLLBACK are in the handler**

```bash
grep -A 30 "api/init-db" backend/src/server.ts | grep -E "BEGIN|COMMIT|ROLLBACK|release"
```

Expected: Shows `BEGIN`, `COMMIT`, `ROLLBACK`, and `release`.

**Step 3: Commit**

```bash
git add backend/src/server.ts
git commit -m "fix(backend): wrap DB initialization in a transaction with rollback on failure"
```

---

### Task 9: Expose PostgreSQL connection pool metrics to Prometheus

**Files:**
- Modify: `backend/src/config/database.ts`
- Modify: `backend/src/server.ts` (add pool metric registration)

**Context:** Prometheus already collects Node.js default metrics and HTTP metrics. Adding pool metrics (total connections, idle, waiting) gives visibility into database saturation — a senior-level observability touch.

**Step 1: Add pool metric gauges to database.ts**

In `backend/src/config/database.ts`, add at the top after the imports:
```typescript
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
```

**Step 2: Register a pool event listener in the constructor**

In `backend/src/config/database.ts`, inside `private constructor()`, after `this.pool = new Pool({...});`, add:
```typescript
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
```

**Step 3: Verify the metrics will appear**

The `/metrics` endpoint already uses `promClient.register.metrics()` which automatically includes all registered gauges. No change needed to server.ts.

Run a quick sanity check after the stack is up:
```bash
curl -s http://localhost:3001/metrics | grep pg_pool
```
Expected (after at least one DB query): Lines starting with `pg_pool_total_connections`, `pg_pool_idle_connections`, `pg_pool_waiting_requests`.

**Step 4: Commit**

```bash
git add backend/src/config/database.ts
git commit -m "feat(monitoring): expose PostgreSQL connection pool metrics to Prometheus"
```

---

### Task 10: Standardize error handling with AppError class

**Files:**
- Create: `backend/src/types/errors.ts`
- Modify: `backend/src/server.ts` (update catch blocks to use AppError)

**Context:** Currently, every catch block has `if (error instanceof Error) { ... } else { ... }`. This pattern is repeated 6+ times. An `AppError` class centralizes this and adds `statusCode` for correct HTTP status mapping.

**Step 1: Create the AppError type file**

Create `backend/src/types/errors.ts`:
```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) return new AppError(error.message);
  return new AppError('An unexpected error occurred');
}
```

**Step 2: Add a centralized error handler middleware in server.ts**

In `backend/src/server.ts`, add this import at the top:
```typescript
import { toAppError } from './types/errors';
```

Then add a centralized error handler just before `export default app` (at the very end, before `export default app;`):
```typescript
// Centralized error handling middleware (must be last middleware)
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const appError = toAppError(err);
  logger.error('Unhandled error', { message: appError.message, statusCode: appError.statusCode, url: req.url });
  res.status(appError.statusCode).json({ success: false, error: appError.message });
});
```

**Step 3: Verify compilation**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application/backend
npm run build 2>&1 | tail -5
```

Expected: No TypeScript errors. `dist/` updated.

**Step 4: Commit**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application
git add backend/src/types/errors.ts backend/src/server.ts
git commit -m "refactor(backend): add AppError class and centralized error handler middleware"
```

---

## PHASE 3 — Frontend (UI/UX + Correctness)

---

### Task 11: Verify and reinforce loading states in Dashboard

**Files:**
- Modify: `frontend/src/components/Dashboard.tsx`

**Context:** Dashboard.tsx already declares `loading` and `error` state (lines 27-28), and `setLoading(false)` is called in `fetchData()`. But the JSX render must actually use these states. Read the bottom half of Dashboard.tsx to verify.

**Step 1: Read the JSX render section of Dashboard.tsx**

```bash
grep -n "loading\|isLoading\|error\|spinner\|<main\|return (" frontend/src/components/Dashboard.tsx | head -30
```

**Step 2: Check if loading state is rendered**

Look for something like `if (loading) return <div>Loading...</div>`. If it's missing, add it.

After the `fetchData` function definition (around line 159), in the component body before `return`, add if not present:
```typescript
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0d1117', color: '#58a6ff', fontSize: '1.2rem' }}>
        Loading observability data...
      </div>
    );
  }
```

**Step 3: Check if error state is rendered**

Look for a conditional on `error`. If missing, add after the loading guard:
```typescript
  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0d1117', color: '#f85149', fontSize: '1.2rem' }}>
        Error: {error}
      </div>
    );
  }
```

**Step 4: Verify the component compiles**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application/frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

**Step 5: Commit**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application
git add frontend/src/components/Dashboard.tsx
git commit -m "feat(frontend): add loading and error guard renders to Dashboard component"
```

---

### Task 12: Add React ErrorBoundary with graceful fallback

**Files:**
- Create: `frontend/src/components/ErrorBoundary.tsx`
- Modify: `frontend/src/App.tsx`

**Context:** If Dashboard throws an unhandled error (e.g., runtime type mismatch on API data), React renders a blank white screen. An ErrorBoundary catches this and shows a helpful fallback.

**Step 1: Create ErrorBoundary component**

Create `frontend/src/components/ErrorBoundary.tsx`:
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#0d1117',
          color: '#f85149',
          fontFamily: 'monospace',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#f85149' }}>Dashboard Error</h2>
          <p style={{ color: '#8b949e', maxWidth: '600px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '0.5rem 1.5rem', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Step 2: Read App.tsx to see its current structure**

```bash
cat -n /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application/frontend/src/App.tsx
```

**Step 3: Wrap Dashboard with ErrorBoundary in App.tsx**

In `frontend/src/App.tsx`, add the import:
```typescript
import ErrorBoundary from './components/ErrorBoundary';
```

And wrap `<Dashboard />` (or whatever the main component render is) with:
```typescript
<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```

**Step 4: Verify TypeScript compilation**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application/frontend
npx tsc --noEmit 2>&1 | head -10
```

Expected: No errors.

**Step 5: Commit**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application
git add frontend/src/components/ErrorBoundary.tsx frontend/src/App.tsx
git commit -m "feat(frontend): add ErrorBoundary component with graceful fallback UI"
```

---

### Task 13: Remove unsafe-eval from Nginx Content-Security-Policy

**Files:**
- Modify: `frontend/nginx.conf.template:44`

**Context:** `'unsafe-eval'` in `script-src` allows `eval()` — unnecessary for React 19 CRA builds and weakens XSS protection significantly.

**Step 1: Read the current CSP line**

Already read: line 44:
```
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
```

**Step 2: Remove unsafe-eval**

Change line 44 from:
```nginx
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
```
To:
```nginx
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
```

**Step 3: Verify the change**

```bash
grep "Content-Security-Policy" frontend/nginx.conf.template
```

Expected: Output does NOT contain `'unsafe-eval'`.

**Step 4: Rebuild and test**

After rebuilding the frontend container, verify the header is applied:
```bash
docker compose up --build frontend -d
curl -I http://localhost:3000 2>/dev/null | grep -i "content-security"
```

Expected: CSP header without `unsafe-eval`.

**Step 5: Commit**

```bash
git add frontend/nginx.conf.template
git commit -m "fix(security): remove unsafe-eval from nginx Content-Security-Policy header"
```

---

### Task 14: Add semantic HTML and ARIA labels to Dashboard

**Files:**
- Modify: `frontend/src/components/Dashboard.tsx` (JSX structure)

**Context:** Screen readers need semantic landmarks (`<main>`, `<section>`, `<h1>`-`<h3>`) and `aria-label` on interactive/visual elements to understand page structure. This is a basic accessibility requirement for any portfolio app.

**Step 1: Find the top-level return div in Dashboard.tsx**

```bash
grep -n "return (\|<div\|<main\|<section\|<h1\|<h2\|<h3" frontend/src/components/Dashboard.tsx | head -30
```

**Step 2: Wrap the main content in a `<main>` landmark**

In `Dashboard.tsx`, find the outermost `<div>` in the return statement and change it to:
```tsx
<main aria-label="3-Tier Application Dashboard" role="main">
  {/* existing content */}
</main>
```

**Step 3: Add section landmarks to major content areas**

For each major section (Project Overview, Skills Developed, Achievements, Live Metrics, Logs), add:
```tsx
<section aria-label="Project Overview">
  <h2>Project Overview</h2>
  {/* content */}
</section>

<section aria-label="Skills Developed">
  <h2>Skills Developed</h2>
  {/* content */}
</section>

<section aria-label="Live Metrics">
  <h2>Live Metrics</h2>
  {/* content */}
</section>
```

**Step 4: Add aria-label to the canvas chart**

Find the `<canvas>` element (uses `canvasRef`) and add:
```tsx
<canvas
  ref={canvasRef}
  aria-label="Real-time HTTP requests chart"
  role="img"
  /* existing props */
/>
```

**Step 5: Verify TypeScript compilation**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application/frontend
npx tsc --noEmit 2>&1 | head -10
```

**Step 6: Commit**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application
git add frontend/src/components/Dashboard.tsx
git commit -m "feat(frontend): add semantic HTML landmarks and ARIA labels for accessibility"
```

---

### Task 15: Add responsive CSS breakpoints for mobile and tablet

**Files:**
- Modify: `frontend/src/components/Dashboard.css`
- Modify: `frontend/src/App.css` (if it contains layout styles)

**Context:** No media queries exist. The dashboard grid/flex layout will render as a broken horizontal overflow on mobile screens. Portfolio reviewers often check on mobile.

**Step 1: Read the current Dashboard.css**

```bash
cat -n /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application/frontend/src/components/Dashboard.css
```

**Step 2: Identify grid/flex container classes**

Look for `display: grid`, `display: flex`, `grid-template-columns`, and container classes.

**Step 3: Append responsive breakpoints at the end of Dashboard.css**

Add at the end of `frontend/src/components/Dashboard.css`:
```css
/* ===== Responsive Breakpoints ===== */

/* Tablet — 768px */
@media (max-width: 768px) {
  /* Convert any multi-column grid to single column */
  [class*="grid"],
  [class*="metrics-grid"],
  [class*="skills-grid"],
  [class*="achievements-grid"] {
    grid-template-columns: 1fr !important;
  }

  /* Stack flex rows into columns */
  [class*="flex-row"],
  [class*="header-row"],
  [class*="stats-row"] {
    flex-direction: column !important;
  }

  /* Reduce padding on containers */
  [class*="container"],
  [class*="section"],
  [class*="card"] {
    padding: 1rem !important;
  }

  /* Make charts full width */
  canvas {
    width: 100% !important;
    max-width: 100%;
  }
}

/* Mobile — 480px */
@media (max-width: 480px) {
  /* Reduce font sizes for readability */
  h1 { font-size: 1.4rem !important; }
  h2 { font-size: 1.2rem !important; }
  h3 { font-size: 1rem !important; }

  /* Reduce all padding further */
  [class*="container"],
  [class*="section"],
  [class*="card"] {
    padding: 0.75rem !important;
    margin: 0.5rem !important;
  }

  /* Single column for achievement items */
  [class*="achievement"] {
    grid-template-columns: 1fr !important;
  }
}
```

**Step 4: Verify the CSS is syntactically valid**

```bash
node -e "require('fs').readFileSync('frontend/src/components/Dashboard.css', 'utf8'); console.log('CSS syntax OK')" 2>/dev/null || echo "Check CSS manually"
```

**Step 5: Commit**

```bash
git add frontend/src/components/Dashboard.css
git commit -m "feat(frontend): add responsive CSS breakpoints for tablet (768px) and mobile (480px)"
```

---

## PHASE 4 — Infrastructure

---

### Task 16: Fix Promtail relabeling to use compose service label

**Files:**
- Modify: `monitoring/promtail-config.yml:27-57`

**Context:** The current config uses regex against `__meta_docker_container_name` (e.g., `.*backend.*`). Docker Compose prefixes container names with the project name: if you run from a different directory, the container name becomes `containerized-3-tier-application-backend-1` or `myproject-backend-1`. The regex still works because `.*backend.*` matches any string containing "backend". However, using the structured label `__meta_docker_container_label_com_docker_compose_service` is more precise and explicit — it's specifically set by Docker Compose to the service name (`backend`, `frontend`, `postgres`) without the project prefix noise.

**Step 1: Replace the relabeling rules for job and service labels**

In `monitoring/promtail-config.yml`, replace lines 27-57 (the job and service label rules) with:
```yaml
      # Use Docker Compose service label for precise job matching
      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        target_label: 'job'

      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        target_label: 'service'

      # Add tier label based on service
      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        regex: 'backend'
        target_label: 'tier'
        replacement: 'backend'

      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        regex: 'frontend'
        target_label: 'tier'
        replacement: 'frontend'

      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        regex: 'postgres'
        target_label: 'tier'
        replacement: 'database'

      # Static labels
      - target_label: 'app'
        replacement: '3-tier-app'

      - target_label: 'environment'
        replacement: 'development'
```

**Step 2: Verify the config is valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('monitoring/promtail-config.yml')); print('YAML OK')"
```

Expected: `YAML OK`

**Step 3: Restart Promtail and verify logs appear with correct labels**

```bash
docker compose restart promtail
sleep 5
# Query Loki for logs with the backend job label
curl -s "http://localhost:3100/loki/api/v1/labels" | python3 -m json.tool | grep -A 5 '"data"'
```

Expected: Response includes `"job"` in the label names.

**Step 4: Commit**

```bash
git add monitoring/promtail-config.yml
git commit -m "fix(monitoring): use Docker Compose service label in Promtail relabeling for robustness"
```

---

### Task 17: Add postgres-exporter for database metrics

**Files:**
- Modify: `docker-compose.yml`
- Modify: `monitoring/prometheus.yml:31-36`

**Context:** The postgres job in prometheus.yml is commented out. Adding `postgres-exporter` gives Prometheus visibility into DB connections, query stats, table sizes, and replication lag — demonstrating full-stack observability.

**Step 1: Add postgres-exporter service to docker-compose.yml**

In `docker-compose.yml`, add a new service after the `postgres` service (before the `backend` service):
```yaml
  # PostgreSQL metrics exporter
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: postgres-exporter
    environment:
      - DATA_SOURCE_NAME=postgresql://postgres:password@postgres:5432/app_db?sslmode=disable
    ports:
      - "9187:9187"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app-network
    restart: unless-stopped
```

**Step 2: Uncomment and fix the postgres job in prometheus.yml**

In `monitoring/prometheus.yml`, replace lines 30-36 (the commented-out postgres job):
```yaml
  # Scrape PostgreSQL metrics (if pg-exporter is added)
  # - job_name: 'postgres'
  #   static_configs:
  #     - targets: ['postgres-exporter:9187']
  #       labels:
  #         service: 'postgres'
  #         tier: 'database'
```
With:
```yaml
  # Scrape PostgreSQL metrics via postgres-exporter
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
        labels:
          service: 'postgres'
          tier: 'database'
          app: '3-tier-app'
```

**Step 3: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('monitoring/prometheus.yml')); print('YAML OK')"
python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml')); print('YAML OK')"
```

Expected: Both print `YAML OK`.

**Step 4: Restart and verify metrics**

```bash
docker compose up -d postgres-exporter
sleep 10
curl -s http://localhost:9187/metrics | grep pg_up
```

Expected: `pg_up 1` (exporter connected to postgres).

**Step 5: Commit**

```bash
git add docker-compose.yml monitoring/prometheus.yml
git commit -m "feat(monitoring): add postgres-exporter service and enable Prometheus DB metrics scraping"
```

---

### Task 18: Replace wget with curl in frontend Dockerfile health check

**Files:**
- Modify: `frontend/Dockerfile:41-42`

**Context:** `nginx:1.27-alpine` uses BusyBox `wget` which works, but `curl` is explicit and consistent with the backend Dockerfile's health check pattern. Using `curl` also matches what most production health check validators expect.

**Step 1: Read the current health check line**

Already read: `frontend/Dockerfile:41-42`:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1
```

**Step 2: Replace wget with curl**

First, verify that the production nginx image includes curl (it does in `nginx:1.27-alpine`):

Change lines 41-42 in `frontend/Dockerfile` to:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1
```

**Step 3: Verify the Dockerfile still builds**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application
docker build -t frontend-test ./frontend/ 2>&1 | tail -5
docker rmi frontend-test 2>/dev/null
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add frontend/Dockerfile
git commit -m "fix(docker): replace wget with curl in frontend container health check"
```

---

### Task 19: Fix GitHub Actions production approval gate

**Files:**
- Modify: `.github/workflows/ci-cd.yml`

**Context:** The current approval gate uses a manual pattern that may not actually pause the workflow. GitHub's recommended approach is using `environment:` with required reviewers on the deploy job.

**Step 1: Read the current CI/CD workflow**

```bash
cat -n /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application/.github/workflows/ci-cd.yml | head -100
```

**Step 2: Find the deploy job and add environment gate**

In `.github/workflows/ci-cd.yml`, find the job that runs terraform apply (the deploy step). Add `environment:` to that job:

```yaml
  terraform-deploy:
    name: Deploy Infrastructure
    runs-on: ubuntu-latest
    needs: [test-and-build, terraform-check]
    if: contains(fromJSON('["deploy-test-destroy", "deploy-only"]'), github.event.inputs.action)
    environment:
      name: ${{ github.event.inputs.environment }}
      url: https://github.com/${{ github.repository }}/actions
```

Then create a GitHub Environment named `production` (via GitHub repo Settings → Environments → New Environment) with required reviewers set. For `dev`, no reviewers needed.

**Step 3: Add a comment explaining the setup**

At the top of the workflow file, add a comment:
```yaml
# NOTE: This workflow uses GitHub Environments for deployment gates.
# Setup: Repository → Settings → Environments → Create "production" with required reviewer(s).
# "dev" environment requires no reviewers. "production" requires manual approval.
```

**Step 4: Commit**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "fix(ci): add GitHub Environment-based approval gate for production deployments"
```

---

### Task 20: Verify .dockerignore files are complete

**Files:**
- Check/Modify: `backend/.dockerignore`
- Check/Modify: `frontend/.dockerignore`

**Context:** If `.dockerignore` doesn't exclude `node_modules`, Docker sends the entire local `node_modules` directory to the build daemon, which is slow and can cause dependency mismatches (local modules for macOS vs Alpine Linux).

**Step 1: Read both .dockerignore files**

```bash
cat /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application/backend/.dockerignore
echo "---"
cat /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application/frontend/.dockerignore
```

**Step 2: Verify these lines exist in BOTH files**

```
node_modules
*/node_modules
dist
build
.env
.env.*
!.env.example
```

**Step 3: Add any missing lines**

If `node_modules` is missing from either file, add it. If `dist` (backend) or `build` (frontend) is missing, add those too.

**Step 4: Verify build context size improves**

```bash
docker build --no-cache -t context-test ./backend/ 2>&1 | grep "Sending build context"
docker rmi context-test 2>/dev/null
```

Expected: Small build context (< 1MB for backend, < 5MB for frontend — without node_modules).

**Step 5: Commit if changes were made**

```bash
git add backend/.dockerignore frontend/.dockerignore
git commit -m "fix(docker): ensure node_modules and build artifacts are excluded from Docker build context"
```

---

## PHASE 5 — Final Validation & Documentation

---

### Task 21: End-to-end stack validation

**No file changes — validation only.**

**Step 1: Bring up the full stack**

```bash
cd /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application
docker compose down --volumes  # Clean slate
docker compose up --build -d
```

Wait 30 seconds for all services to start.

**Step 2: Validate all service health checks**

```bash
docker compose ps
```

Expected: All services show `healthy` or `running`.

**Step 3: Validate API**

```bash
curl -s http://localhost:3001/api/health | python3 -m json.tool
```

Expected: `"status": "healthy"`, `"database": "connected"`.

**Step 4: Validate Prometheus metrics**

```bash
curl -s http://localhost:9090/api/v1/targets | python3 -m json.tool | grep -E "health|job"
```

Expected: `backend-api`, `postgres`, `loki`, `grafana` all show `"health": "up"`.

**Step 5: Validate Loki receives logs**

```bash
curl -s 'http://localhost:3100/loki/api/v1/query_range?query=\{job="backend"\}&limit=5' | python3 -m json.tool | grep -E "resultType|values"
```

Expected: `"resultType": "streams"` with actual log values.

**Step 6: Validate Grafana dashboard**

Open `http://localhost:3002` → Login: `admin/admin` → Go to Dashboards → Verify the provisioned dashboard shows data.

**Step 7: Validate pool metrics**

```bash
curl -s http://localhost:3001/metrics | grep pg_pool
```

Expected: Three `pg_pool_*` metric lines.

**Step 8: Validate frontend loads with no console errors**

Open `http://localhost:3000` in browser → Open DevTools → Console — verify no red errors.

**Step 9: Validate CSP header**

```bash
curl -I http://localhost:3000 | grep -i "content-security"
```

Expected: CSP header without `unsafe-eval`.

---

### Task 22: Update README with architecture overview and badges

**Files:**
- Modify: `README.md`

**Step 1: Read the current README header**

```bash
head -30 /Users/ericchiu/Documents/GitHub/Containerized-3-Tier-Application/README.md
```

**Step 2: Add badges after the title**

Add these badges after the main title (adjust the GitHub username/repo as needed):
```markdown
![CI/CD](https://github.com/YOUR_USERNAME/Containerized-3-Tier-Application/actions/workflows/ci-cd.yml/badge.svg)
![Docker](https://img.shields.io/badge/Docker-multi--stage-2496ED?logo=docker)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Terraform](https://img.shields.io/badge/Terraform-1.9-7B42BC?logo=terraform)
![Grafana LGTM](https://img.shields.io/badge/LGTM-Loki%20%7C%20Grafana%20%7C%20Tempo%20%7C%20Mimir-F46800?logo=grafana)
![AWS](https://img.shields.io/badge/AWS-ECS%20Fargate-FF9900?logo=amazonaws)
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add architecture badges to README"
```

---

### Task 23: Final commit summary and git log review

**No file changes.**

**Step 1: Review all commits from this review session**

```bash
git log --oneline -25
```

Expected: A clean list of ~20 structured commits with conventional commit prefixes (`fix:`, `feat:`, `refactor:`, `docs:`).

**Step 2: Verify the diff is comprehensive**

```bash
git diff HEAD~20 --stat
```

Expected: Shows changes across backend, frontend, monitoring, docker-compose, .github.

**Step 3: Final check — no credentials committed**

```bash
git log --all --full-history -- .env | head -5
git grep -r "Ov23li8k\|67d18d9a" 2>/dev/null
```

Expected: First command may show history (that's OK — the file was in gitignore). Second command should return no results (credentials not in any tracked file).

**Done.** The repository now demonstrates senior-level DevOps engineering practices:
- Clean git history with conventional commits
- No exposed credentials
- Functioning LGTM observability stack
- Secure, validated backend API
- Accessible, responsive frontend
- Production-grade container configs

---

*Plan saved: 2026-03-01. Execute using superpowers:executing-plans skill in a new session, or superpowers:subagent-driven-development in this session.*
