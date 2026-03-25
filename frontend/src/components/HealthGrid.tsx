import React from 'react';
import { HealthCheck } from '../types/api.interface';

interface HealthGridProps {
  health: HealthCheck;
}

const getStatusClass = (status: string) =>
  status === 'healthy' ? 'healthy' : 'unhealthy';

const HealthGrid: React.FC<HealthGridProps> = ({ health }) => (
  <section className="health-section fade-in-up delay-3" aria-label="Live Deployment Status">
    <h2 className="section-title">
      Live Deployment Status
      <div className="live-indicator">
        <span className="pulse-dot"></span>
        LIVE
      </div>
    </h2>
    <div className="health-grid">
      <div className="health-card animate-card">
        <div className="card-accent frontend"></div>
        <div className="card-content">
          <div className="health-label">Frontend Tier</div>
          <div className={`health-status ${getStatusClass('healthy')}`}>
            <span className="status-dot"></span> ACTIVE
          </div>
          <div className="health-detail">React + TypeScript &middot; Port 3000 &middot; 3 replicas</div>
        </div>
      </div>

      <div className="health-card animate-card delay-1">
        <div className="card-accent backend"></div>
        <div className="card-content">
          <div className="health-label">Backend API</div>
          <div className={`health-status ${getStatusClass(health.status)}`}>
            <span className="status-dot"></span> {health.status.toUpperCase()}
          </div>
          <div className="health-detail">Express.js + Node.js &middot; Port 3001 &middot; 2 replicas</div>
        </div>
      </div>

      <div className="health-card animate-card delay-2">
        <div className="card-accent database"></div>
        <div className="card-content">
          <div className="health-label">Database</div>
          <div className={`health-status ${getStatusClass(health.database === 'connected' ? 'healthy' : 'unhealthy')}`}>
            <span className="status-dot"></span>{' '}
            {(health.database || 'disconnected').toUpperCase()}
          </div>
          <div className="health-detail">PostgreSQL &middot; Port 5432 &middot; RDS Multi-AZ</div>
        </div>
      </div>

      <div className="health-card animate-card delay-3">
        <div className="card-accent monitoring"></div>
        <div className="card-content">
          <div className="health-label">Monitoring Stack</div>
          <div className={`health-status ${getStatusClass('healthy')}`}>
            <span className="status-dot"></span> ACTIVE
          </div>
          <div className="health-detail">Prometheus + Grafana + Loki &middot; LGTM Stack</div>
        </div>
      </div>
    </div>
  </section>
);

export default HealthGrid;
