import React from 'react';

interface MetricsBarProps {
  requests: number;
  responseTime: number;
  uptime: number;
  errorRate: number;
}

const MetricsBar: React.FC<MetricsBarProps> = ({ requests, responseTime, uptime, errorRate }) => (
  <div className="metrics-bar fade-in-up delay-2" id="live-metrics-section" aria-label="Live Metrics">
    <div className="metric live-metric">
      <span className="metric-value">{requests.toLocaleString()}</span>
      <span className="metric-label">Total Requests</span>
      <div className="metric-trend positive">Prometheus</div>
    </div>
    <div className="metric live-metric">
      <span className="metric-value">{responseTime.toFixed(0)}ms</span>
      <span className="metric-label">Response Time</span>
      <div className="metric-trend neutral">Live</div>
    </div>
    <div className="metric live-metric">
      <span className="metric-value">{Math.floor(uptime / 60)}m</span>
      <span className="metric-label">Uptime</span>
      <div className="metric-trend positive">Active</div>
    </div>
    <div className="metric live-metric">
      <span className="metric-value">{errorRate.toFixed(2)}%</span>
      <span className="metric-label">Error Rate</span>
      <div className="metric-trend positive">Grafana</div>
    </div>
  </div>
);

export default MetricsBar;
