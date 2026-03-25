import React, { useEffect, useRef } from 'react';

interface LiveMetrics {
  timestamp: number;
  requests: number;
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  errorRate: number;
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  service: string;
}

interface LiveMonitoringProps {
  liveMetrics: LiveMetrics[];
  realtimeLogs: LogEntry[];
  totalRequests: number;
  onOpenGrafana: () => void;
}

const getLogLevelColor = (level: string) => {
  switch (level) {
    case 'ERROR': return '#ff3b5c';
    case 'WARN': return '#f0b429';
    case 'INFO': return '#00d4aa';
    case 'DEBUG': return '#64748b';
    default: return '#e2e8f0';
  }
};

const LiveMonitoring: React.FC<LiveMonitoringProps> = ({
  liveMetrics,
  realtimeLogs,
  totalRequests,
  onOpenGrafana,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width - 40;
        canvas.width = Math.max(300, width);
        canvas.height = 300;
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || liveMetrics.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const padding = 50;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = padding + (chartHeight / 10) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
      ctx.fillStyle = '#00d4aa';
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(300 - i * 30)}ms`, padding - 5, y + 3);
      ctx.fillStyle = '#f0b429';
      ctx.textAlign = 'left';
      ctx.fillText(`${100 - i * 10}%`, padding + chartWidth + 5, y + 3);
    }

    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`-${(10 - i) * 10}s`, x, padding + chartHeight + 15);
    }

    const maxResponseTime = Math.max(...liveMetrics.map((m) => m.responseTime), 100);

    const drawLine = (color: string, getValue: (m: LiveMetrics) => number, maxVal: number) => {
      if (liveMetrics.length <= 1) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      liveMetrics.forEach((metric, index) => {
        const x = padding + (chartWidth / (liveMetrics.length - 1)) * index;
        const normalized = Math.min(getValue(metric) / maxVal, 1);
        const y = padding + chartHeight - normalized * chartHeight;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        ctx.fillStyle = color;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      });
      ctx.stroke();
    };

    drawLine('#00d4aa', (m) => m.responseTime, maxResponseTime);
    drawLine('#f0b429', (m) => m.cpuUsage, 100);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Real-time Performance Metrics', padding, padding - 25);

    const latest = liveMetrics[liveMetrics.length - 1];
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillStyle = '#00d4aa';
    ctx.fillText(`Response: ${latest.responseTime.toFixed(1)}ms`, padding, padding - 10);
    ctx.fillStyle = '#f0b429';
    ctx.fillText(`CPU: ${latest.cpuUsage.toFixed(1)}%`, padding + 200, padding - 10);
  }, [liveMetrics]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [realtimeLogs]);

  return (
    <section className="live-monitoring-section fade-in-up delay-2" id="live-monitoring-section" aria-label="Live Monitoring Dashboard">
      <h2 className="section-title">
        Live Monitoring Dashboard
        <div className="live-indicator">
          <span className="pulse-dot"></span>
          STREAMING
        </div>
        <button className="demo-button" onClick={onOpenGrafana}>
          Open Grafana
        </button>
      </h2>

      <div className="monitoring-grid">
        <div className="chart-container" ref={containerRef}>
          <h3>Performance Metrics</h3>
          <canvas ref={canvasRef} width={600} height={300} className="live-chart" aria-label="Real-time HTTP requests chart" role="img" />
          <div className="chart-legend">
            <span className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#00d4aa' }}></div>
              Response Time (ms)
            </span>
            <span className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f0b429' }}></div>
              CPU Usage (%)
            </span>
          </div>
        </div>

        <div className="logs-container">
          <h3>Application Logs</h3>
          <div className="log-stream" ref={logContainerRef}>
            {realtimeLogs.length > 0 ? (
              realtimeLogs.map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className={`log-entry ${log.level}`}>
                  <div className="meta">
                    <div className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    <div className="log-service">[{log.service}]</div>
                    <div className="log-level" style={{ color: getLogLevelColor(log.level) }}>
                      {log.level}
                    </div>
                  </div>
                  <div className="message">{log.message}</div>
                </div>
              ))
            ) : (
              <div className="no-logs">Waiting for log data from Loki...</div>
            )}
          </div>
        </div>
      </div>

      <div className="status-cards-grid">
        {[
          { name: 'Prometheus', detail: 'Metrics Collection' },
          { name: 'Loki', detail: 'Log Aggregation' },
          { name: 'Grafana', detail: 'Visualization' },
          { name: 'Backend', detail: 'Total Requests', value: totalRequests },
        ].map((item) => (
          <div className="status-card" key={item.name}>
            <div className="status-info">
              <h4>{item.name}</h4>
              <div className="status-value healthy">{item.value ?? 'Active'}</div>
              <div className="status-detail">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LiveMonitoring;
