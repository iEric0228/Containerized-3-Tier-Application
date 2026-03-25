# Comprehensive Review & Improvement Design
**Date:** 2026-03-01
**Project:** Containerized 3-Tier Application
**Approach:** Fix-First (Approach A)
**Goal:** Portfolio showcase — production-grade code demonstrating senior DevOps/Cloud Engineering skills

---

## Executive Summary

Full codebase audit of a 3-tier containerized application (React + Node.js/Express + PostgreSQL) with a complete LGTM observability stack (Loki, Grafana, Tempo, Mimir) and AWS infrastructure via Terraform.

**20 issues found** across 4 domains:
- **2 Critical** (security) — must fix before any portfolio sharing
- **7 High** (correctness, LGTM integration) — break the demo
- **7 Medium** (security depth, UX gaps)
- **4 Low** (polish, maintainability)

---

## Tech Stack Confirmed

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript | 19.2.3 / 4.9.5 |
| Frontend Server | Nginx | 1.27-alpine |
| Backend | Node.js + Express + TypeScript | 22 / 4.22.1 / 5.9.3 |
| Database | PostgreSQL | 15-alpine |
| Metrics | Prometheus | Latest |
| Logs | Loki (via grafana/otel-lgtm) | Latest |
| Traces | Tempo (via grafana/otel-lgtm) | Latest |
| Metrics Store | Mimir (via grafana/otel-lgtm) | Latest |
| Log Collector | Promtail | Latest |
| Visualization | Grafana | (via otel-lgtm) |
| Containers | Docker + Docker Compose | - |
| IaC | Terraform | 1.9.0 |
| CI/CD | GitHub Actions | - |
| Target Cloud | AWS ECS Fargate + RDS + ALB | - |

---

## Phase 1 — Critical Fixes (Security + LGTM Correctness)

### 1.1 Exposed GitHub OAuth Credentials
- **File:** `.env` (root)
- **Issue:** `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` committed to repo
- **Fix:** Remove values, add root `.env` to `.gitignore`, update `.env.example` with placeholders
- **Commit:** `fix(security): remove exposed OAuth credentials from .env`

### 1.2 Wrong Loki Host Fallback
- **File:** `backend/src/config/logger.ts`
- **Issue:** Fallback URL points to `http://loki:3100` but compose service is named `grafana-lgtm`
- **Fix:** Change fallback to `http://grafana-lgtm:3100`
- **Commit:** `fix(loki): correct Loki host fallback to grafana-lgtm service name`

### 1.3 Duplicate GET /api Route
- **File:** `backend/src/server.ts` (lines ~147 and ~351)
- **Issue:** Two handlers for `GET /api` — second one unreachable
- **Fix:** Remove duplicate, keep the more complete handler
- **Commit:** `fix(backend): remove duplicate GET /api route`

### 1.4 SSL rejectUnauthorized: false
- **File:** `backend/src/config/database.ts`
- **Issue:** Disables SSL certificate validation — MITM vulnerability on RDS
- **Fix:** Read from env var `DB_SSL_REJECT_UNAUTHORIZED` (default true in prod, false in local dev)
- **Commit:** `fix(security): make SSL certificate validation configurable per environment`

### 1.5 Loki Query Fallback Chain (5 queries)
- **File:** `frontend/src/services/api.ts`
- **Issue:** 5 sequential Loki query attempts on every Dashboard load — shows integration is broken
- **Fix:** Single correct label query `{job="backend"}` matching Promtail output
- **Commit:** `fix(frontend): use single correct Loki label query instead of 5-query fallback`

---

## Phase 2 — Backend Architecture

### 2.1 No Input Validation on Proxy Endpoints
- **File:** `backend/src/server.ts` (Loki + Prometheus proxy routes)
- **Issue:** User-supplied `query` param forwarded unvalidated
- **Fix:** Add `express-validator` rules: non-empty string, max 500 chars, no shell metacharacters
- **Commit:** `feat(backend): add input validation to Loki and Prometheus proxy endpoints`

### 2.2 Rate Limiter Insufficient
- **File:** `backend/src/server.ts`
- **Issue:** 200 req/min with no per-IP granularity (no trust proxy setting)
- **Fix:** Reduce to 100/min, add `app.set('trust proxy', 1)` for correct IP detection behind Nginx/ALB
- **Commit:** `fix(backend): tighten rate limiting and fix IP detection behind reverse proxy`

### 2.3 DB Init Not Transactional
- **File:** `backend/src/server.ts` (POST /api/init-db)
- **Issue:** No transaction wrapping — partial failure leaves DB in inconsistent state
- **Fix:** Wrap in `BEGIN / COMMIT / ROLLBACK`, add migration version table
- **Commit:** `fix(backend): wrap DB initialization in a transaction with version tracking`

### 2.4 Missing Connection Pool Metrics
- **File:** `backend/src/config/database.ts` + `backend/src/server.ts`
- **Issue:** Prometheus has no visibility into PostgreSQL connection pool state
- **Fix:** Expose `pg_pool_total_connections`, `pg_pool_idle_connections`, `pg_pool_waiting_requests` gauges
- **Commit:** `feat(monitoring): expose PostgreSQL connection pool metrics to Prometheus`

### 2.5 Loose TypeScript Error Handling
- **File:** Multiple files
- **Issue:** `catch (error: unknown)` handled inconsistently
- **Fix:** Define `AppError` class extending `Error` with `statusCode` and `isOperational` fields
- **Commit:** `refactor(backend): standardize error handling with typed AppError class`

---

## Phase 3 — Frontend (UI/UX + Correctness)

### 3.1 No Loading States
- **File:** `frontend/src/components/Dashboard.tsx`
- **Issue:** API calls show nothing while loading — blank screen on slow connections
- **Fix:** Add `isLoading` state, render `LoadingSpinner` component during fetch
- **Commit:** `feat(frontend): add loading states to all API calls in Dashboard`

### 3.2 No Error Boundary
- **File:** `frontend/src/App.tsx`
- **Issue:** Any unhandled error in Dashboard crashes the entire app with a blank white screen
- **Fix:** Wrap `<Dashboard>` in a React `ErrorBoundary` class component with fallback UI
- **Commit:** `feat(frontend): add ErrorBoundary with graceful fallback UI`

### 3.3 Unsafe CSP Header
- **File:** `frontend/nginx.conf.template`
- **Issue:** `'unsafe-eval'` in `script-src` — React 19 CRA builds do not require this
- **Fix:** Remove `'unsafe-eval'`, keep `'unsafe-inline'` (required for CRA inline styles)
- **Commit:** `fix(security): remove unsafe-eval from nginx Content-Security-Policy`

### 3.4 Missing Accessibility
- **File:** `frontend/src/components/Dashboard.tsx`
- **Issue:** No ARIA labels, no semantic HTML landmarks
- **Fix:** Add `<main>`, `<section aria-label>`, `<h1>-<h3>` hierarchy, `aria-label` on icon buttons
- **Commit:** `feat(frontend): add semantic HTML and ARIA labels for accessibility`

### 3.5 No Mobile Responsiveness
- **File:** `frontend/src/components/Dashboard.css`, `frontend/src/App.css`
- **Issue:** No responsive breakpoints — dashboard breaks on mobile screens
- **Fix:** Add `@media (max-width: 768px)` and `@media (max-width: 480px)` breakpoints, switch grid to column
- **Commit:** `feat(frontend): add responsive CSS breakpoints for mobile and tablet`

---

## Phase 4 — Infrastructure

### 4.1 Brittle Promtail Relabeling
- **File:** `monitoring/promtail-config.yml`
- **Issue:** Regex matches on container name which includes compose project name — breaks if project name changes
- **Fix:** Use Docker SD `__meta_docker_container_label_com_docker_compose_service` meta-label instead
- **Commit:** `fix(monitoring): use compose service label for Promtail relabeling instead of container name regex`

### 4.2 Commented-Out PostgreSQL Metrics
- **File:** `monitoring/prometheus.yml`, `docker-compose.yml`
- **Issue:** PostgreSQL job commented out — no DB metrics in Grafana
- **Fix:** Add `postgres-exporter` service to docker-compose, uncomment prometheus job
- **Commit:** `feat(monitoring): add postgres-exporter for database metrics in Prometheus`

### 4.3 Frontend Dockerfile Health Check
- **File:** `frontend/Dockerfile`
- **Issue:** Health check uses `wget` — may not be installed in `nginx:1.27-alpine`
- **Fix:** Replace with `curl -f http://localhost/health || exit 1`
- **Commit:** `fix(docker): replace wget with curl in frontend health check`

### 4.4 GitHub Actions Approval Gate
- **File:** `.github/workflows/ci-cd.yml`
- **Issue:** Approval gate logic doesn't actually block execution for prod
- **Fix:** Add `environment: production` with required reviewer to the deploy job
- **Commit:** `fix(ci): add proper GitHub environment-based approval gate for production`

### 4.5 node_modules in Docker Build Context
- **File:** `backend/.dockerignore`, `frontend/.dockerignore`
- **Issue:** Verify `node_modules` is excluded to prevent stale local deps from entering image
- **Fix:** Confirm/add `node_modules` and `dist` to both `.dockerignore` files
- **Commit:** `fix(docker): ensure node_modules and dist are excluded from build context`

---

## Phase 5 — Design Doc + README

- Write `docs/plans/2026-03-01-comprehensive-review-design.md` (this file)
- Commit with all phase changes attributed to structured commits
- Add badges to README: build status, Terraform version, Docker, LGTM stack

---

## Production Readiness Checklist

| Category | Status | Risk | Priority |
|----------|--------|------|----------|
| Security — credentials mgmt | ⚠️ After Phase 1 fix | HIGH | P0 |
| Security — SSL/TLS | ⚠️ After Phase 1 fix | HIGH | P0 |
| Security — input validation | ⚠️ After Phase 2 fix | MEDIUM | P1 |
| Security — CSP headers | ⚠️ After Phase 3 fix | MEDIUM | P1 |
| Observability — Loki | ⚠️ After Phase 1+4 fix | HIGH | P0 |
| Observability — Prometheus metrics | ✅ Functional | LOW | P2 |
| Observability — Tempo traces | ✅ Functional | LOW | P2 |
| Observability — DB metrics | ⚠️ After Phase 4 fix | MEDIUM | P1 |
| Resilience — Error boundaries | ⚠️ After Phase 3 fix | MEDIUM | P1 |
| Resilience — Rate limiting | ⚠️ After Phase 2 fix | MEDIUM | P1 |
| Resilience — DB transactions | ⚠️ After Phase 2 fix | MEDIUM | P1 |
| UX — Loading states | ⚠️ After Phase 3 fix | MEDIUM | P1 |
| UX — Mobile responsiveness | ⚠️ After Phase 3 fix | LOW | P2 |
| Accessibility | ⚠️ After Phase 3 fix | LOW | P2 |
| CI/CD — Approval gates | ⚠️ After Phase 4 fix | MEDIUM | P1 |
| IaC — Terraform state | ✅ S3 + DynamoDB | LOW | P3 |
| Scalability — ECS Fargate | ✅ Designed | LOW | P3 |
| Scalability — Connection pooling | ✅ max 20 | LOW | P3 |

---

## Final Architecture (Post-Fix)

```
┌─────────────────────────────────────────────────┐
│              End Users (Browser)                 │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS
             ┌─────────▼─────────┐
             │  ALB / Nginx Proxy │
             │  Port 80/443       │
             └────┬──────────┬───┘
                  │          │
       ┌──────────▼──┐  ┌────▼───────────┐
       │  Frontend    │  │   Backend API   │
       │  React 19    │  │   Express/TS    │
       │  Nginx 1.27  │  │   Node 22       │
       │  Port 80     │  │   Port 3001     │
       └─────────────┘  └───────┬─────────┘
                                │ pg Pool (max 20)
                         ┌──────▼──────┐
                         │ PostgreSQL  │
                         │ Port 5432   │
                         └─────────────┘

Observability (all on app-network):
┌──────────────────────────────────────────────┐
│                                              │
│  Backend ──/metrics──► Prometheus:9090       │
│     │                        │              │
│     │ winston-loki       ┌───▼──────────┐   │
│     └──────────────────► │ grafana/     │   │
│                          │ otel-lgtm    │   │
│  Promtail ──docker-SD──► │  Loki:3100   │   │
│                          │  Tempo:4317  │   │
│                          │  Mimir:9009  │   │
│                          │  Grafana:3000│   │
│                          └─────────────┘   │
│                                              │
│  postgres-exporter ──► Prometheus:9090       │
└──────────────────────────────────────────────┘

CI/CD:
GitHub → Actions → Test → Build → ECR → ECS Deploy
                              ↑
                    prod: requires manual approval
                    (GitHub Environment + reviewer)
```

---

## Testing & Validation Plan

### Unit Tests
- Backend: jest + supertest for each route, including validation error cases
- Frontend: React Testing Library — test loading states, error boundary render, successful data fetch

### Integration Tests
- `tests/integration.test.ts` — validate end-to-end: frontend → backend → database
- Add Prometheus metrics assertions post-request

### Observability Validation
- Confirm `{job="backend"}` Loki query returns logs after backend startup
- Confirm `http_requests_total` metric increments after API call
- Confirm Tempo receives spans (if OTLP instrumentation added)
- Confirm Grafana dashboard shows live data after `docker-compose up`

### Load Testing
- `autocannon` or `k6` against backend `/api/users` endpoint
- Observe rate limiter activates at 100 req/min
- Confirm pool metrics spike under load in Prometheus

### Chaos Scenarios
- Kill postgres container → confirm backend returns 503 (not 500 crash)
- Kill grafana-lgtm → confirm backend logs to console only (graceful degradation)
- Invalid Loki query → confirm validation returns 400 before forwarding

---

*Design approved: 2026-03-01. Proceeding to implementation plan via writing-plans skill.*
