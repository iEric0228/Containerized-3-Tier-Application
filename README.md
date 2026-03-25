# Enterprise 3-Tier Containerized Application on AWS

> A production-ready portfolio project demonstrating end-to-end DevOps engineering: containerization, full observability, infrastructure as code, security hardening, and automated CI/CD — all running locally with one command and deployable to AWS ECS Fargate with one workflow dispatch.

[![CI/CD Pipeline](https://github.com/iEric0228/Containerized-3-Tier-Application/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/iEric0228/Containerized-3-Tier-Application/actions)
[![AWS](https://img.shields.io/badge/AWS-ECS%20Fargate-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com/)
[![Terraform](https://img.shields.io/badge/Terraform-1.9-623CE4?style=flat-square&logo=terraform&logoColor=white)](https://terraform.io/)
[![Docker](https://img.shields.io/badge/Docker-multi--stage-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Grafana LGTM](https://img.shields.io/badge/LGTM-Loki%20%7C%20Grafana%20%7C%20Tempo%20%7C%20Mimir-F46800?style=flat-square&logo=grafana&logoColor=white)

---

## What This Demonstrates

| Area | Skills |
|------|--------|
| **Container Engineering** | Multi-stage Docker builds, non-root runtime users, `curl` healthchecks, tuned `.dockerignore` (excludes `node_modules`, build artifacts, secrets) |
| **Full Observability (LGTM)** | `grafana/otel-lgtm` all-in-one stack (Loki, Grafana, Tempo, Mimir), standalone Prometheus, Promtail with Docker Compose service label relabeling, `postgres-exporter`, custom `pg_pool_*` Gauge metrics exposed via `prom-client` |
| **Frontend Architecture** | Modular React 19 + TypeScript component architecture (9 focused components), real-time canvas-based performance charts, responsive industrial design system with WCAG AA+ contrast compliance |
| **Backend Architecture** | Express + TypeScript, singleton DB pool with event-driven metrics, transactional DB initialization (BEGIN/COMMIT/ROLLBACK), centralized `AppError` error handler, input validation on all proxy routes |
| **Security Hardening** | Nginx CSP without `unsafe-eval`, env-based SSL config (`DB_SSL` / `DB_SSL_REJECT_UNAUTHORIZED`), `trust proxy` for correct per-IP rate limiting, validated PromQL/LogQL query parameters blocking shell metacharacters |
| **Infrastructure as Code** | Terraform 1.9 with modular structure (VPC, ECS, RDS, ALB, ECR, security, secrets, monitoring), remote S3 backend, environment-based workspaces |
| **CI/CD** | GitHub Actions with `workflow_dispatch` inputs for `deploy-only`, `deploy-test-destroy`, `destroy-only`; GitHub Environments approval gate for production; Docker Scout security scanning |

---

## Architecture

```
┌─────────────────────┐
│     End Users        │
│   (Web Browsers)     │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌──────────────────────────────────┐
│  Application Load Balancer (ALB) │
│  • SSL/TLS Termination           │
│  • Health Checks                 │
│  • Path-based Routing            │
└──────────┬───────────────┬───────┘
           │               │
┌──────────┘               └──────────┐
│                                     │
▼                                     ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│   PRESENTATION TIER     │  │   APPLICATION TIER       │
│   ─────────────────     │  │   ─────────────────      │
│   React 19 + TypeScript │  │   Node.js 22 + Express   │
│   Nginx 1.27-alpine     │  │   TypeScript             │
│   9 modular components  │  │   prom-client metrics    │
│   Canvas live charts    │  │   winston + Loki logs    │
│   Responsive design     │  │   pg connection pool     │
│                         │  │                          │
│   ECS Fargate           │  │   ECS Fargate            │
│   Port: 80              │  │   Port: 3001             │
└─────────────────────────┘  └──────────┬───────────────┘
                                        │ SQL (private)
                                        ▼
                             ┌──────────────────────────┐
                             │     DATA TIER            │
                             │     ─────────────        │
                             │     PostgreSQL 15        │
                             │     AWS RDS Multi-AZ     │
                             │     Automated backups    │
                             │     Private subnet       │
                             │     Port: 5432 (private) │
                             └──────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                         │
│                                                                │
│  Prometheus :9090  ←─── backend :3001/metrics                 │
│  Promtail   :9080  ←─── Docker socket (container logs)        │
│  grafana/otel-lgtm :3002 / :3100                              │
│    ├── Grafana  (dashboards + provisioned datasources)        │
│    ├── Loki     (log aggregation, {job="backend"})            │
│    ├── Tempo    (distributed tracing)                         │
│    └── Mimir    (long-term metrics storage)                   │
│  postgres-exporter :9187  ←─── PostgreSQL pool stats          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                   AWS VPC                                      │
│   Public subnets:  Frontend ECS tasks, ALB                    │
│   Private subnets: Backend ECS tasks, RDS                     │
│   Multi-AZ · Security groups · NAT gateway                    │
└────────────────────────────────────────────────────────────────┘
```

---

## Quick Start (Local)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 20.10+
- Node.js 22+ (only needed if running outside Docker)

### Run the full stack

```bash
git clone https://github.com/iEric0228/Containerized-3-Tier-Application.git
cd Containerized-3-Tier-Application

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Start all services (first run builds images — ~2 min)
docker compose up --build -d

# Initialize the database schema
curl -X POST http://localhost:3001/api/init-db
```

### Service endpoints

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | React dashboard |
| Backend API | http://localhost:3001/api | REST + health check |
| Backend metrics | http://localhost:3001/metrics | Prometheus scrape target |
| Grafana | http://localhost:3002 | Login: `admin` / value from `.env` |
| Prometheus | http://localhost:9090 | Targets + query UI |
| Loki | http://localhost:3100 | Log aggregation |
| Promtail | http://localhost:9080 | Log shipper status |
| postgres-exporter | http://localhost:9187/metrics | DB pool stats |

### Useful commands

```bash
# Tail all logs
docker compose logs -f

# Tail a specific service
docker compose logs -f backend

# Verify all targets are healthy in Prometheus
curl -s http://localhost:9090/api/v1/targets | python3 -m json.tool | grep '"health"'

# Check pg_pool metrics
curl -s http://localhost:3001/metrics | grep pg_pool

# Tear down (removes volumes too)
docker compose down --volumes
```

---

## Key Engineering Decisions

**1. `grafana/otel-lgtm` as a single container for the full LGTM stack**
Rather than running Loki, Tempo, Mimir, and Grafana as four separate services, `grafana/otel-lgtm` bundles all of them into one image with pre-wired datasources. This keeps local `docker-compose.yml` readable and reproducible without sacrificing any observability capability.

**2. Promtail uses Docker Compose service labels, not container name regex**
Matching on `__meta_docker_container_label_com_docker_compose_service` instead of a `.*backend.*` regex means labels are always exact (`job="backend"`) regardless of which directory you run `docker compose` from. A regex on container names breaks when the project folder is renamed.

**3. PostgreSQL pool metrics via pool event listeners, not polling**
`pg_pool_total_connections`, `pg_pool_idle_connections`, and `pg_pool_waiting_requests` Gauges are updated inside `pool.on('connect')`, `pool.on('acquire')`, and `pool.on('remove')` callbacks. This gives zero-latency metric accuracy with no timer overhead.

**4. DB initialization wrapped in a transaction**
`POST /api/init-db` runs the SQL script inside `BEGIN` / `COMMIT` / `ROLLBACK`. Without a transaction, a partially-run script (e.g., tables created but seed data failed) leaves the database in an inconsistent state that requires manual cleanup.

**5. `trust proxy 1` for accurate per-IP rate limiting**
Without this setting, `express-rate-limit` sees the internal Docker bridge IP for every request when the app sits behind Nginx or an AWS ALB. All users share a single rate-limit bucket instead of getting individual limits. One line fixes it.

**6. `AppError` class with a centralized error handler as the last middleware**
Rather than repeating `if (error instanceof Error) { ... } else { ... }` in six catch blocks, a single `toAppError(err)` utility normalizes any thrown value and a single Express error-handler middleware logs it and sends the response. New routes get correct error behavior for free.

**7. Modular frontend component architecture**
The dashboard was decomposed from a single 1200+ line monolith into 9 focused components (Dashboard orchestrator, MetricsBar, HealthGrid, LiveMonitoring, ArchitectureFlow, DevOpsArchitecture, ProjectOverview, ToolchainShowcase, DashboardFooter). Each component owns its own data rendering with props driven from the parent. Canvas-based real-time charts use ResizeObserver for responsive sizing.

---

## Project Structure

```
Containerized-3-Tier-Application/
│
├── frontend/                        # React 19 + TypeScript SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx        # Orchestrator: state, data fetching, layout
│   │   │   ├── Dashboard.css        # Design system: tokens, all component styles
│   │   │   ├── MetricsBar.tsx       # Live Prometheus metrics display
│   │   │   ├── HealthGrid.tsx       # Service health status cards
│   │   │   ├── LiveMonitoring.tsx   # Real-time canvas charts + log stream
│   │   │   ├── ArchitectureFlow.tsx # 3-tier architecture diagram
│   │   │   ├── DevOpsArchitecture.tsx # CI/CD pipeline + cloud infra layers
│   │   │   ├── ProjectOverview.tsx  # Summary, goals, outcomes, benefits
│   │   │   ├── ToolchainShowcase.tsx # DevOps toolchain grid
│   │   │   ├── DashboardFooter.tsx  # Footer section
│   │   │   └── ErrorBoundary.tsx    # React error boundary with retry
│   │   ├── services/api.ts          # Axios client for backend + Loki/Prometheus
│   │   ├── types/api.interface.ts   # TypeScript interface definitions
│   │   ├── App.tsx                  # Root app component
│   │   ├── App.css                  # Global base styles
│   │   └── index.css                # Minimal reset
│   ├── Dockerfile                   # Multi-stage: node builder → nginx:1.27-alpine
│   ├── nginx.conf.template          # Nginx config with CSP, proxy, health endpoint
│   └── .dockerignore
│
├── backend/                         # Node.js 22 + Express + TypeScript API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # Singleton pg.Pool + pg_pool_* Prometheus metrics
│   │   │   └── logger.ts            # Winston logger with Loki transport
│   │   ├── services/
│   │   │   └── api.ts               # API route handlers
│   │   ├── types/
│   │   │   └── errors.ts            # AppError class + toAppError() helper
│   │   └── server.ts                # Express app: routes, middleware, proxy endpoints
│   ├── database/
│   │   └── 01_init.sql              # Schema + seed data
│   ├── Dockerfile                   # Multi-stage: node builder → node:22-alpine
│   └── .env.example
│
├── monitoring/                      # Observability configuration
│   ├── prometheus.yml               # Scrape configs: backend, postgres, loki, grafana
│   ├── promtail-config.yml          # Docker SD + service label relabeling
│   ├── grafana-datasources.yml      # Provisioned Prometheus + Loki datasources
│   ├── grafana-dashboards.yml       # Dashboard provisioning config
│   └── grafana-dashboard.json       # Pre-built Grafana dashboard
│
├── terraform/                       # Infrastructure as Code
│   ├── modules/
│   │   ├── VPC/                     # VPC, subnets, NAT gateway, routing
│   │   ├── ECS/                     # Fargate task definitions + services
│   │   ├── RDS/                     # PostgreSQL 15, Multi-AZ, encrypted
│   │   ├── ALB/                     # Application Load Balancer + target groups
│   │   ├── ECR/                     # Container registry with scanning
│   │   ├── security/                # Security groups, IAM roles
│   │   ├── secret/                  # AWS Secrets Manager
│   │   └── monitoring/              # CloudWatch log groups
│   └── environments/
│       └── dev/                     # Dev workspace (remote S3 backend)
│
├── .github/
│   └── workflows/
│       ├── ci-cd.yml                # Main pipeline (build, test, deploy, destroy)
│       └── docker-security.yml      # Docker Scout CVE scanning
│
├── scripts/                         # Build and utility scripts
│   ├── build-and-push.sh            # ECR image build + push
│   ├── cleanup-repo.sh              # Repository cleanup utility
│   └── configure-prometheus.sh      # Prometheus configuration helper
│
├── tests/                           # Integration tests
│   └── integration.test.ts          # API endpoint integration tests
│
├── docker-compose.yml               # Full local stack (8 services)
├── .env.example                     # Root env template
└── README.md
```

---

## AWS Deployment

Infrastructure and deployment are fully automated via GitHub Actions. No manual `terraform apply` or `aws ecs update-service` commands are needed.

### Setup (one-time)

1. Add AWS credentials and Terraform state bucket to GitHub repository secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `TF_STATE_BUCKET` (S3 bucket for Terraform state)
   - `POSTGRES_PASSWORD` (database credential)
   - `GRAFANA_ADMIN_PASSWORD` (Grafana login)

2. Create a `production` GitHub Environment with required reviewer(s):
   **Repository → Settings → Environments → New environment → `production`**

### Deploy

Trigger the pipeline from the **Actions** tab → **CI/CD Pipeline** → **Run workflow**:

| Input | Options | Notes |
|-------|---------|-------|
| `action` | `deploy-only`, `deploy-test-destroy`, `destroy-only` | Controls what the pipeline does |
| `environment` | `dev`, `prod` | `prod` requires Environment approval |
| `skip_tests` | `true` / `false` | Speeds up iteration during development |
| `keep_alive_minutes` | `0–120` | How long to keep infra up before auto-destroy |

The pipeline runs: lint → test → Docker build → Terraform plan → **approval gate (prod only)** → Terraform apply → ECS deploy → smoke test → optional destroy.

### Terraform modules

| Module | Resources |
|--------|-----------|
| **VPC** | VPC, public/private subnets (Multi-AZ), NAT gateway, route tables, internet gateway |
| **ECS** | Fargate cluster, task definitions (frontend + backend), services, auto-scaling |
| **RDS** | PostgreSQL 15 instance, subnet group, parameter group, automated backups |
| **ALB** | Application Load Balancer, target groups, listeners, health checks |
| **ECR** | Private container registries (frontend + backend), lifecycle policies |
| **security** | Security groups (ALB, ECS, RDS), IAM roles + policies |
| **secret** | AWS Secrets Manager for database credentials |
| **monitoring** | CloudWatch log groups for ECS tasks |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript | 19.x / 5.x |
| Backend | Node.js + Express + TypeScript | 22.x / 4.x / 5.x |
| Database | PostgreSQL | 15 |
| Containerization | Docker (multi-stage builds) | 20.10+ |
| Orchestration | Docker Compose (local) / AWS ECS Fargate (prod) | 2.x / - |
| IaC | Terraform | 1.9 |
| CI/CD | GitHub Actions | - |
| Metrics | Prometheus + postgres-exporter | 2.53 |
| Logs | Loki + Promtail | 3.1 |
| Dashboards | Grafana (via otel-lgtm) | 11.x |
| Tracing | Tempo (via otel-lgtm) | - |
| Web Server | Nginx | 1.27-alpine |

---

## Author

**Eric Chiu** — DevOps / Cloud Engineer

- GitHub: [@iEric0228](https://github.com/iEric0228)
- LinkedIn: [Eric Chiu](https://www.linkedin.com/in/eric-chiu-a610553a3/)
- Email: ericchiu0228@gmail.com
