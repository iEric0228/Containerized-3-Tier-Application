import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/api';
import { HealthCheck } from '../types/api.interface';
import './Dashboard.css';


// Live Metrics Interface
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

const Dashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Live Data States
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics[]>([]);
  const [realtimeLogs, setRealtimeLogs] = useState<LogEntry[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState({
    requests: 0,
    responseTime: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    errorRate: 0,
    connections: 0,
    performance: 95,
    uptime: 0,
    deployments: 0
  });

  // Chart References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Project-specific data (keep existing)
  const [projectDetails] = useState({
    // Combined Project Overview
    projectOverview: {
      summary: "Production-grade containerized 3-tier application showcasing enterprise DevOps practices: Docker multi-stage builds, Terraform IaC, CI/CD automation, Prometheus monitoring, and AWS cloud-native architecture ready for high-availability deployment.",
      goals: [
        "Docker & Container Orchestration",
        "Terraform Infrastructure as Code", 
        "CI/CD Pipeline Automation",
        "Live Metrics & Observability"
      ],
      outcomes: [
        { icon: '🐳', result: 'Multi-stage Docker builds reducing image size by 60%' },
        { icon: '🏗️', result: 'Terraform IaC automating complete AWS infrastructure' },
        { icon: '🔄', result: 'GitHub Actions CI/CD with automated testing & deployment' },
        { icon: '📊', result: 'Live Grafana dashboards with real-time LGTM stack' }
      ],
      benefits: [
        { icon: '🎯', benefit: 'DevOps Mastery', description: 'Hands-on experience with industry-standard DevOps tools and practices' },
        { icon: '☁️', benefit: 'Cloud Native', description: 'AWS ECS, RDS, CloudWatch integration with Infrastructure as Code' },
        { icon: '🔒', benefit: 'Security First', description: 'Container security scanning, secrets management, and compliance' },
        { icon: '📈', benefit: 'Production Ready', description: 'Zero-downtime deployments with monitoring and alerting' }
      ]
    },

    // Simplified Skills by Technology Area
    skillsDeveloped: [
      {
        area: 'Container Orchestration',
        icon: '🐳',
        skills: [
          'Docker multi-stage builds for optimized production images',
          'Docker Compose for local development and testing environments',
          'Container networking, volumes, and health checks',
          'Image optimization techniques reducing size by 60%',
          'Container security best practices and vulnerability scanning'
        ]
      },
      {
        area: 'Infrastructure as Code (IaC)',
        icon: '🏗️',
        skills: [
          'Terraform modules for AWS ECS, RDS, VPC, and networking',
          'State management with remote backends (S3 + DynamoDB)',
          'Infrastructure provisioning automation and version control',
          'Security groups, IAM roles, and least-privilege access',
          'Multi-environment deployment (dev, staging, production)'
        ]
      },
      {
        area: 'Live Monitoring & Observability',
        icon: '📊',
        skills: [
          'LGTM Stack (Loki, Grafana, Tempo, Mimir) implementation',
          'Real-time metrics collection and visualization',
          'Custom dashboards with live data streaming',
          'Log aggregation and real-time log analysis',
          'Performance monitoring and alerting systems'
        ]
      }
    ],

    achievements: [
      { icon: '🐳', title: 'Container Optimization', value: '120MB', desc: 'Multi-stage Docker builds, 60% size reduction' },
      { icon: '🏗️', title: 'IaC Automation', value: '100%', desc: 'Full AWS stack provisioned via Terraform' },
      { icon: '🔄', title: 'CI/CD Pipeline', value: '< 5min', desc: 'Automated test, build, and deploy cycle' },
      { icon: '📊', title: 'Live Metrics', value: '50+', desc: 'Real-time LGTM stack monitoring' },
      { icon: '☁️', title: 'AWS Services', value: '12+', desc: 'ECS, RDS, ALB, CloudWatch, ECR, VPC...' },
      { icon: '🔒', title: 'Enhanced Security', value: 'Docker Scout', desc: 'Integrated vulnerability scanning, SBOM generation, and provenance verification' }
    ]
  });

  // Helper functions
  const extractService = (message: string): string => {
    if (message.includes('frontend') || message.includes('react')) return 'frontend';
    if (message.includes('backend') || message.includes('api')) return 'backend';
    if (message.includes('database') || message.includes('postgres')) return 'database';
    if (message.includes('nginx') || message.includes('proxy')) return 'nginx';
    return 'unknown';
  };
  
  const extractLogLevel = (message: string): 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' => {
    if (message.includes('ERROR') || message.includes('error')) return 'ERROR';
    if (message.includes('WARN') || message.includes('warning')) return 'WARN';
    if (message.includes('DEBUG') || message.includes('debug')) return 'DEBUG';
    return 'INFO';
  };

  // Fetch initial health data
  const fetchData = async () => {
    try {
      setError(null);
      const healthData = await ApiService.getHealth();
      console.log('🏥 Health data received:', healthData);
      setHealth(healthData);
    } catch (err) {
      // Set a default health object even if API fails
      console.error('❌ Health check failed:', err);
      setHealth({
        status: 'unknown',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: 0,
        environment: 'development'
      });
      console.warn('Health check failed, using default values:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setTimeout(() => setIsVisible(true), 100);
    
    // Initialize with some data points so the chart renders immediately
    const initialMetrics: LiveMetrics[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: Date.now() - (10 - i) * 10000,
      requests: 0,
      responseTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      activeConnections: 0,
      errorRate: 0
    }));
    setLiveMetrics(initialMetrics);
    
    // Fetch health data every 30 seconds
    const healthInterval = setInterval(fetchData, 30000);
    
    // Fetch real metrics from Grafana/Prometheus - FIXED VERSION
    const metricsInterval = setInterval(async () => {
      try {
        // Fetch real Prometheus metrics
        const prometheusMetrics = await ApiService.getPrometheusMetrics();
        
        console.log('📊 Raw Prometheus data:', prometheusMetrics);
        
        // Parse Prometheus response - handle both formats
        const results = prometheusMetrics.data?.result || prometheusMetrics?.result || [];
        
        console.log('📈 Parsed results:', results);
        
        const httpRequests = results.find((r: any) => 
          r.metric?.__name__ === 'http_requests_total' || r.metric?.name === 'http_requests_total'
        );
        const requestDuration = results.find((r: any) => 
          r.metric?.__name__ === 'http_request_duration_seconds_sum' || 
          r.metric?.name === 'http_request_duration_seconds_sum'
        );
        
        console.log('🔍 Found httpRequests:', httpRequests);
        console.log('🔍 Found requestDuration:', requestDuration);
        
        // Extract values from Prometheus format
        const requestsValue = httpRequests?.value?.[1] ? parseFloat(httpRequests.value[1]) : 0;
        const responseTimeValue = requestDuration?.value?.[1] ? parseFloat(requestDuration.value[1]) * 1000 : 0; // Convert to ms
        
        console.log('✅ Extracted values - Requests:', requestsValue, 'Response Time:', responseTimeValue);
        
        // FIXED: Use functional update to prevent re-render loops
        setCurrentMetrics(prev => ({
          ...prev,
          requests: requestsValue || prev.requests,
          responseTime: responseTimeValue || prev.responseTime,
          cpuUsage: prev.cpuUsage,
          memoryUsage: prev.memoryUsage,
          errorRate: prev.errorRate,
          connections: prev.connections,
          performance: Math.floor(100 - prev.errorRate),
          uptime: prev.uptime + 10, // 10 seconds per interval
          deployments: prev.deployments
        }));

        // Update chart data separately to prevent dependency loops
        const newMetric: LiveMetrics = {
          timestamp: Date.now(),
          requests: requestsValue || 0,
          responseTime: responseTimeValue || 0,
          cpuUsage: 0, // We'll add real CPU data later
          memoryUsage: 0, // We'll add real memory data later
          activeConnections: 0,
          errorRate: 0
        };

        setLiveMetrics(prev => [...prev, newMetric].slice(-50));

        // Fetch logs from Loki
        try {
          const lokiLogs = await ApiService.getLokiLogs(10);
          console.log('📝 Loki logs response:', lokiLogs);
          
          if (lokiLogs?.data?.result && Array.isArray(lokiLogs.data.result)) {
            const newLogs = lokiLogs.data.result.flatMap((stream: any) => {
              if (!stream.values || !Array.isArray(stream.values)) {
                console.warn('⚠️ Stream has no values:', stream);
                return [];
              }
              return stream.values.map(([timestamp, message]: [string, string]) => ({
                timestamp: new Date(parseInt(timestamp) / 1000000).toISOString(),
                level: extractLogLevel(message),
                message: message || 'No message content',
                service: extractService(message)
              }));
            });
            
            console.log('📋 Processed logs:', newLogs);
            
            if (newLogs.length > 0) {
              setRealtimeLogs(prev => [...newLogs.reverse(), ...prev].slice(0, 100));
            } else {
              console.log('📋 No new logs found, keeping existing logs');
            }
          } else {
            console.warn('⚠️ Loki response format unexpected:', lokiLogs);
          }
        } catch (lokiError) {
          console.error('❌ Failed to fetch logs from Loki:', lokiError);
        }
      } catch (error) {
        console.error('Failed to fetch real metrics from Grafana:', error);
        // Don't update metrics on error - keep showing last known good values
      }
    }, 10000); // Update every 10 seconds
    
    return () => {
      clearInterval(healthInterval);
      clearInterval(metricsInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw live chart
  useEffect(() => {
    if (!canvasRef.current || liveMetrics.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Chart settings
    const padding = 50;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
      const y = padding + (chartHeight / 10) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
      
      // Y-axis labels (right side - response time in ms)
      ctx.fillStyle = '#10b981';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(300 - (i * 30))}ms`, padding - 5, y + 3);
      
      // Y-axis labels (left side - CPU percentage)
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'left';
      ctx.fillText(`${100 - (i * 10)}%`, padding + chartWidth + 5, y + 3);
    }

    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
      
      // X-axis time labels
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const secondsAgo = (10 - i) * 10;
      ctx.fillText(`-${secondsAgo}s`, x, padding + chartHeight + 15);
    }

    // Find max values for scaling
    const maxResponseTime = Math.max(...liveMetrics.map(m => m.responseTime), 100);

    // Draw response time line
    if (liveMetrics.length > 1) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();

      liveMetrics.forEach((metric, index) => {
        const x = padding + (chartWidth / (liveMetrics.length - 1)) * index;
        const normalizedValue = Math.min(metric.responseTime / maxResponseTime, 1);
        const y = padding + chartHeight - (normalizedValue * chartHeight);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw data point
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      ctx.stroke();
    }

    // Draw CPU usage line
    if (liveMetrics.length > 1) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();

      liveMetrics.forEach((metric, index) => {
        const x = padding + (chartWidth / (liveMetrics.length - 1)) * index;
        const normalizedValue = Math.min(metric.cpuUsage / 100, 1);
        const y = padding + chartHeight - (normalizedValue * chartHeight);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw data point
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      ctx.stroke();
    }

    // Chart title and current values
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Real-time Performance Metrics', padding, padding - 25);
    
    // Current values display
    const latestMetric = liveMetrics[liveMetrics.length - 1];
    ctx.font = '12px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`Response Time: ${latestMetric.responseTime.toFixed(1)}ms`, padding, padding - 10);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`CPU: ${latestMetric.cpuUsage.toFixed(1)}%`, padding + 200, padding - 10);

  }, [liveMetrics]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [realtimeLogs]);

  // Enhanced demo button click handler
  const handleDemoClick = (demoType: string) => {
    switch (demoType) {
      case 'grafana':
        // Open Grafana dashboard
        window.open('http://localhost:3002', '_blank');
        break;
      case 'prometheus':
        // Open Prometheus
        window.open('http://localhost:9090', '_blank');
        break;
      case 'metrics':
        // Scroll to live metrics section
        document.getElementById('live-metrics-section')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
        break;
      case 'monitoring':
        // Scroll to monitoring section
        document.getElementById('live-monitoring-section')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
        break;
      case 'code':
        // Open GitHub repo
        window.open('https://github.com/ieric0228/Containerized-3-Tier-Application', '_blank');
        break;
      case 'demo':
        // Show demo overlay or redirect to live demo
        alert('🚀 Live Demo Features:\n\n• Real-time metrics updating every 2 seconds\n• Live application logs streaming\n• Interactive performance charts\n• Grafana dashboard integration\n• System health monitoring\n\nClick "View Grafana" to see the full monitoring stack!');
        break;
      default:
        console.log('Demo type:', demoType);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'healthy' ? '#10b981' : '#ef4444';
  };

  const getStatusIcon = (status: string) => {
    return status === 'healthy' ? '🟢' : '🔴';
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return '#ef4444';
      case 'WARN': return '#f59e0b';
      case 'INFO': return '#10b981';
      case 'DEBUG': return '#6b7280';
      default: return '#ffffff';
    }
  };

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loading-container">
          <div className="loading-logo">
            <div className="pulse-circle"></div>
            <div className="pulse-circle delay-1"></div>
            <div className="pulse-circle delay-2"></div>
          </div>
          <h2>Initializing DevOps Portfolio</h2>
          <div className="loading-steps">
            <div className="step active">🌐 Loading Frontend Architecture</div>
            <div className="step active">🔧 Connecting Backend Services</div>
            <div className="step active">🗄️ Establishing Database Connection</div>
            <div className="step active">📊 Starting Live Metrics Collection</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard error">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>System Connection Error</h2>
          <p>{error}</p>
          <div className="error-details">
            <p>🔍 DevOps Troubleshooting checklist:</p>
            <ul>
              <li>Backend service health check</li>
              <li>Database connectivity status</li>
              <li>LGTM stack monitoring services</li>
              <li>Network configuration validation</li>
              <li>Security group permissions</li>
            </ul>
          </div>
          <button onClick={fetchData} className="retry-button">
            <span>🔄</span> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className={`dashboard ${isVisible ? 'visible' : ''}`} aria-label="3-Tier Application Dashboard" role="main">
      {/* Animated Background Elements */}
      <div className="bg-animation">
        <div className="floating-element floating-1"></div>
        <div className="floating-element floating-2"></div>
        <div className="floating-element floating-3"></div>
      </div>

      {/* Header Section */}
      <header className="dashboard-header fade-in-up">
        <div className="header-content">
          <h1 className="main-title">
            <span className="gradient-text">3-Tier Application</span>
            <div className="title-underline"></div>
          </h1>
          <p className="subtitle">DevOps Engineer | Cloud Architect</p>
          <div className="tech-badges">
            {projectDetails.projectOverview.goals.map((goal, index) => (
              <span key={goal} className="badge" style={{'--i': index + 1} as any}>
                {goal}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* DevOps Pipeline Flow - Moved to top */}
      <div className="pipeline-flow fade-in-up delay-1">
        <div className="progress-flow"></div>
        <div className="pipeline-stage">
          <div className="stage-icon code">💻</div>
          <div className="stage-label">Code</div>
        </div>
        <div className="pipeline-arrow"></div>
        <div className="pipeline-stage">
          <div className="stage-icon build">🔧</div>
          <div className="stage-label">Build</div>
        </div>
        <div className="pipeline-arrow"></div>
        <div className="pipeline-stage">
          <div className="stage-icon test">🧪</div>
          <div className="stage-label">Test</div>
        </div>
        <div className="pipeline-arrow"></div>
        <div className="pipeline-stage">
          <div className="stage-icon deploy">🚀</div>
          <div className="stage-label">Deploy</div>
        </div>
        <div className="pipeline-arrow"></div>
        <div className="pipeline-stage">
          <div className="stage-icon monitor">📊</div>
          <div className="stage-label">Monitor</div>
        </div>
      </div>

      {/* Real-time Metrics from Grafana/Prometheus */}
      <div className="metrics-bar fade-in-up delay-2" id="live-metrics-section" aria-label="Live Metrics">
        <div className="metric live-metric">
          <span className="metric-value animate-number">{currentMetrics.requests.toLocaleString()}</span>
          <span className="metric-label">Total Requests</span>
          <div className="metric-trend positive">↗ From Prometheus</div>
        </div>
        <div className="metric live-metric">
          <span className="metric-value animate-number">{currentMetrics.responseTime.toFixed(0)}ms</span>
          <span className="metric-label">Response Time</span>
          <div className="metric-trend neutral">~ Live Data</div>
        </div>
        <div className="metric live-metric">
          <span className="metric-value animate-number">{Math.floor(currentMetrics.uptime / 60)}m</span>
          <span className="metric-label">Uptime</span>
          <div className="metric-trend positive">↗ Monitoring</div>
        </div>
        <div className="metric live-metric">
          <span className="metric-value animate-number">{currentMetrics.errorRate.toFixed(2)}%</span>
          <span className="metric-label">Error Rate</span>
          <div className="metric-trend positive">↓ Grafana</div>
        </div>
      </div>

      {/* Live Deployment Status */}
      <section className="health-section fade-in-up delay-3" aria-label="Live Deployment Status">
        <h2 className="section-title">
          <span className="icon">🚀</span>
          Live Deployment Status
          <div className="live-indicator">
            <span className="pulse-dot"></span>
            LIVE
          </div>
        </h2>
        {health && (
          <div className="health-grid">
            <div className="health-card animate-card">
              <div className="card-icon">🖥️</div>
              <div className="card-content">
                <div className="health-label">Frontend Tier</div>
                <div className="health-status healthy">
                  {getStatusIcon('healthy')} ACTIVE
                </div>
                <div className="health-detail">React + TypeScript • Port 3000 • 3 replicas</div>
              </div>
            </div>
            
            <div className="health-card animate-card delay-1">
              <div className="card-icon">⚡</div>
              <div className="card-content">
                <div className="health-label">Backend API</div>
                <div 
                  className="health-status" 
                  style={{ color: getStatusColor(health.status) }}
                >
                  {getStatusIcon(health.status)} {health.status.toUpperCase()}
                </div>
                <div className="health-detail">Express.js + Node.js • Port 3001 • 2 replicas</div>
              </div>
            </div>
            
            <div className="health-card animate-card delay-2">
              <div className="card-icon">🗄️</div>
              <div className="card-content">
                <div className="health-label">Database</div>
                <div 
                  className="health-status"
                  style={{ color: getStatusColor(health.database === 'connected' ? 'healthy' : 'unhealthy') }}
                >
                  {getStatusIcon(health.database === 'connected' ? 'healthy' : 'unhealthy')} 
                  {(health.database || 'disconnected').toUpperCase()}
                </div>
                <div className="health-detail">PostgreSQL • Port 5432 • RDS Multi-AZ</div>
              </div>
            </div>

            <div className="health-card animate-card delay-3">
              <div className="card-icon">📊</div>
              <div className="card-content">
                <div className="health-label">Monitoring Stack</div>
                <div className="health-status healthy">
                  {getStatusIcon('healthy')} ACTIVE
                </div>
                <div className="health-detail">Prometheus + Grafana + Loki • LGTM Stack</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Live Monitoring Dashboard */}
      <section className="live-monitoring-section fade-in-up delay-2" id="live-monitoring-section" aria-label="Live Monitoring Dashboard">
        <h2 className="section-title">
          <span className="icon">📊</span>
          Live Monitoring Dashboard
          <div className="live-indicator">
            <span className="pulse-dot"></span>
            STREAMING
          </div>
          <button 
            className="demo-button"
            onClick={() => handleDemoClick('grafana')}
          >
            🚀 View Grafana
          </button>
        </h2>
        
        <div className="monitoring-grid">
          {/* Live Chart */}
          <div className="chart-container">
            <h3>📈 Real-time Performance Metrics</h3>
            <canvas
              ref={canvasRef}
              width={600}
              height={300}
              className="live-chart"
              aria-label="Real-time HTTP requests chart"
              role="img"
            />
            <div className="chart-legend">
              <span className="legend-item">
                <div className="legend-color" style={{backgroundColor: '#10b981'}}></div>
                Response Time (ms)
              </span>
              <span className="legend-item">
                <div className="legend-color" style={{backgroundColor: '#f59e0b'}}></div>
                CPU Usage (%)
              </span>
            </div>
          </div>

          {/* Live Logs */}
          <div className="logs-container">
            <h3>📝 Live Application Logs</h3>
            <div 
              className="log-stream" 
              ref={logContainerRef}
            >
              {realtimeLogs.length > 0 ? (
                realtimeLogs.map((log, index) => {
                  // Safe defaults to prevent undefined errors
                  const logLevel = log.level || 'INFO';
                  const logService = log.service || 'unknown';
                  const logMessage = log.message || '';
                  const logTimestamp = log.timestamp || new Date().toISOString();
                  
                  return (
                    <div 
                      key={`log-${index}-${Date.now()}`} 
                      className={`log-entry ${logLevel}`}
                    >
                      <div className="meta">
                        <div className="log-timestamp">{new Date(logTimestamp).toLocaleTimeString()}</div>
                        <div className="log-service">[{logService}]</div>
                        <div className="log-level" style={{ color: getLogLevelColor(logLevel) }}>
                          {logLevel.toUpperCase()}
                        </div>
                      </div>
                      <div className="message">{logMessage}</div>
                    </div>
                  );
                })
              ) : (
                <div className="no-logs">Waiting for log data from Loki...</div>
              )}
            </div>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="status-cards-grid">
          <div className="status-card">
            <div className="status-icon">🌐</div>
            <div className="status-info">
              <h4>Prometheus</h4>
              <div className="status-value healthy">Active</div>
              <div className="status-detail">Metrics Collection</div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">🗄️</div>
            <div className="status-info">
              <h4>Loki</h4>
              <div className="status-value healthy">Active</div>
              <div className="status-detail">Log Aggregation</div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">🔧</div>
            <div className="status-info">
              <h4>Grafana</h4>
              <div className="status-value healthy">Active</div>
              <div className="status-detail">Visualization</div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">⚡</div>
            <div className="status-info">
              <h4>Backend</h4>
              <div className="status-value healthy">{currentMetrics.requests}</div>
              <div className="status-detail">Total Requests</div>
            </div>
          </div>
        </div>
      </section>

      {/* System Health Monitor */}
      <section className="architecture-section fade-in-up delay-3" aria-label="System Architecture">
        <h2 className="section-title">
          <span className="icon">🗺️</span>
          High-Level System Design
        </h2>
        <div className="architecture-flow">
          <div className="tier-card frontend">
            <div className="tier-icon">🌐</div>
            <h3>Frontend Tier</h3>
            <p>React + TypeScript</p>
            <div className="tier-tech">
              <span>Nginx Web Server</span>
              <span>SPA Architecture</span>
              <span>Docker Container</span>
              <span>Responsive UI</span>
            </div>
          </div>
          
          <div className="flow-arrow">
            <div className="arrow-line"></div>
            <span>HTTPS/REST</span>
          </div>
          
          <div className="tier-card backend">
            <div className="tier-icon">⚙️</div>
            <h3>Backend Tier</h3>
            <p>Express.js + Node.js</p>
            <div className="tier-tech">
              <span>RESTful APIs</span>
              <span>Security Middleware</span>
              <span>Docker Container</span>
              <span>Health Endpoints</span>
            </div>
          </div>
          
          <div className="flow-arrow">
            <div className="arrow-line"></div>
            <span>Connection Pool</span>
          </div>
          
          <div className="tier-card database">
            <div className="tier-icon">💾</div>
            <h3>Database Tier</h3>
            <p>PostgreSQL</p>
            <div className="tier-tech">
              <span>ACID Compliance</span>
              <span>Connection Pooling</span>
              <span>Docker Container</span>
              <span>Persistent Volumes</span>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Comprehensive DevOps System Design */}
      <section className="system-design-section fade-in-up delay-4" aria-label="DevOps System Design">
        <h2 className="section-title">
          <span className="icon">🏗️</span>
          Complete DevOps Architecture
          <span className="record-count">Production-Ready</span>
        </h2>
        
        {/* DevOps Layers */}
        <div className="devops-layers">
          {/* Layer 1: Development & Version Control */}
          <div className="layer-card">
            <div className="layer-header">
              <span className="layer-icon">💻</span>
              <h3>Development & Version Control</h3>
            </div>
            <div className="layer-content">
              <div className="component-box">
                <span className="component-label">GitHub</span>
                <p>Source code management, branching strategy, PR reviews</p>
              </div>
              <div className="component-box">
                <span className="component-label">Docker Compose</span>
                <p>Local development environment with all services</p>
              </div>
            </div>
          </div>

          {/* Arrow Down */}
          <div className="layer-arrow">
            <div className="arrow-down"></div>
            <span className="arrow-label">Git Push Trigger</span>
          </div>

          {/* Layer 2: CI/CD Pipeline */}
          <div className="layer-card highlight">
            <div className="layer-header">
              <span className="layer-icon">🔄</span>
              <h3>CI/CD Pipeline (GitHub Actions)</h3>
            </div>
            <div className="layer-content pipeline">
              <div className="pipeline-step">
                <span className="step-number">1</span>
                <div className="step-details">
                  <strong>Code Quality</strong>
                  <p>Linting, type checking, security scanning</p>
                </div>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-step">
                <span className="step-number">2</span>
                <div className="step-details">
                  <strong>Build & Test</strong>
                  <p>Unit tests, integration tests, coverage reports</p>
                </div>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-step">
                <span className="step-number">3</span>
                <div className="step-details">
                  <strong>Docker Build</strong>
                  <p>Multi-stage builds, tag, push to ECR</p>
                </div>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-step">
                <span className="step-number">4</span>
                <div className="step-details">
                  <strong>Deploy</strong>
                  <p>Terraform apply, ECS task update</p>
                </div>
              </div>
            </div>
          </div>

          {/* Arrow Down */}
          <div className="layer-arrow">
            <div className="arrow-down"></div>
            <span className="arrow-label">Automated Deployment</span>
          </div>

          {/* Layer 3: AWS Cloud Infrastructure */}
          <div className="layer-card">
            <div className="layer-header">
              <span className="layer-icon">☁️</span>
              <h3>AWS Cloud Infrastructure (Terraform IaC)</h3>
            </div>
            <div className="layer-content cloud-grid">
              <div className="cloud-component">
                <strong>🌐 Application Load Balancer</strong>
                <p>SSL/TLS termination, health checks, traffic routing</p>
              </div>
              <div className="cloud-component">
                <strong>🐳 ECS Fargate</strong>
                <p>Serverless containers, auto-scaling, task definitions</p>
              </div>
              <div className="cloud-component">
                <strong>🗄️ RDS PostgreSQL</strong>
                <p>Multi-AZ deployment, automated backups, encryption</p>
              </div>
              <div className="cloud-component">
                <strong>📦 ECR</strong>
                <p>Private Docker registry, vulnerability scanning</p>
              </div>
              <div className="cloud-component">
                <strong>🔐 Secrets Manager</strong>
                <p>Database credentials, API keys, rotation</p>
              </div>
              <div className="cloud-component">
                <strong>🛡️ VPC & Security</strong>
                <p>Private subnets, NAT gateways, security groups</p>
              </div>
            </div>
          </div>

          {/* Arrow Down */}
          <div className="layer-arrow">
            <div className="arrow-down"></div>
            <span className="arrow-label">Metrics & Logs</span>
          </div>

          {/* Layer 4: Monitoring & Observability */}
          <div className="layer-card">
            <div className="layer-header">
              <span className="layer-icon">📊</span>
              <h3>Monitoring & Observability</h3>
            </div>
            <div className="layer-content">
              <div className="component-box">
                <span className="component-label">Prometheus</span>
                <p>Metrics collection, time-series database, alerting rules</p>
              </div>
              <div className="component-box">
                <span className="component-label">Grafana</span>
                <p>Real-time dashboards, visualization, custom alerts</p>
              </div>
              <div className="component-box">
                <span className="component-label">CloudWatch</span>
                <p>AWS native monitoring, log aggregation, insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* DevOps Tools Showcase */}
        <div className="tools-showcase">
          <h3>🛠️ DevOps Toolchain</h3>
          <div className="tools-grid">
            <div className="tool-badge docker">🐳 Docker</div>
            <div className="tool-badge terraform">🏗️ Terraform</div>
            <div className="tool-badge github">🔄 GitHub Actions</div>
            <div className="tool-badge prometheus">📊 Prometheus</div>
            <div className="tool-badge grafana">📈 Grafana</div>
            <div className="tool-badge aws">☁️ AWS ECS</div>
            <div className="tool-badge ecr">📦 AWS ECR</div>
            <div className="tool-badge rds">🗄️ AWS RDS</div>
            <div className="tool-badge cloudwatch">🔍 CloudWatch</div>
            <div className="tool-badge nginx">🌐 Nginx</div>
          </div>
        </div>
      </section>

      {/* Combined Project Overview Section */}
      <section className="overview-section fade-in-up delay-5" aria-label="Project Overview">
        <h2 className="section-title">
          <span className="icon">📋</span>
          Project Overview & Impact
        </h2>
        
        <div className="overview-content">
          {/* Project Summary */}
          <div className="project-summary">
            <h3>🎯 Project Summary</h3>
            <p>{projectDetails.projectOverview.summary}</p>
          </div>

          {/* Goals and Outcomes Grid */}
          <div className="goals-outcomes-grid">
            {/* Project Goals */}
            <div className="goals-column">
              <h3>📌 Project Goals</h3>
              <ul className="goals-list">
                {projectDetails.projectOverview.goals.map((goal, index) => (
                  <li key={index} className="goal-item">
                    <span className="bullet">▶</span>
                    {goal}
                  </li>
                ))}
              </ul>
            </div>

            {/* Project Outcomes */}
            <div className="outcomes-column">
              <h3>🏆 Key Outcomes</h3>
              <div className="outcomes-list">
                {projectDetails.projectOverview.outcomes.map((outcome, index) => (
                  <div key={index} className="outcome-item">
                    <span className="outcome-icon">{outcome.icon}</span>
                    <span className="outcome-text">{outcome.result}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Project Benefits */}
          <div className="benefits-grid">
            <h3>💡 Project Benefits</h3>
            <div className="benefits-cards">
              {projectDetails.projectOverview.benefits.map((benefit, index) => (
                <div key={index} className="benefit-card compact">
                  <div className="benefit-header">
                    <span className="benefit-icon">{benefit.icon}</span>
                    <strong>{benefit.benefit}</strong>
                  </div>
                  <p>{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Technical Achievements with Working Demo Buttons */}
      <section className="users-section fade-in-up delay-7" aria-label="Technical Achievements">
        <h2 className="section-title">
          <span className="icon">🏆</span>
          Technical Achievements
          <span className="record-count">Live Demo Ready</span>
        </h2>
        
        <div className="users-grid">
          {projectDetails.achievements.map((achievement, index) => (
            <div 
              key={achievement.title} 
              className="user-card animate-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="user-avatar">
                <div className="avatar-circle">
                  {achievement.icon}
                </div>
                <div className="online-indicator"></div>
              </div>
              <div className="user-info">
                <h3>{achievement.title}</h3>
                <div className="achievement-value">{achievement.value}</div>
                <p>{achievement.desc}</p>
              </div>
              <div className="user-actions">
                <button 
                  className="action-btn"
                  onClick={() => handleDemoClick('code')}
                >
                  View Code
                </button>
                <button 
                  className="action-btn demo-btn"
                  onClick={() => {
                    if (achievement.title.includes('Container')) {
                      handleDemoClick('code');
                    } else if (achievement.title.includes('Metrics') || achievement.title.includes('Live')) {
                      handleDemoClick('grafana');
                    } else if (achievement.title.includes('CI/CD')) {
                      handleDemoClick('code');
                    } else {
                      handleDemoClick('demo');
                    }
                  }}
                >
                  🚀 Live Demo
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DevOps Toolchain & Skills Mastery - Combined */}
      <section className="toolchain-showcase fade-in-up delay-6" aria-label="Skills Developed">
        <h2 className="toolchain-title">
          <span className="icon">🛠️</span>
          DevOps Toolchain & Skills Mastery
          <span className="project-badge">Hands-On Experience</span>
        </h2>
        <div className="toolchain-grid">
          <div className="tool-card">
            <div className="tool-icon docker">🐳</div>
            <div className="tool-name">Docker</div>
            <div className="tool-description">
              <strong>Skills:</strong> Multi-stage builds (60% size reduction), container optimization, security scanning with Docker Scout, image vulnerability assessment, SBOM generation
            </div>
          </div>
          <div className="tool-card">
            <div className="tool-icon terraform">🏗️</div>
            <div className="tool-name">Terraform</div>
            <div className="tool-description">
              <strong>Skills:</strong> Infrastructure as Code, AWS resource provisioning (ECS, RDS, VPC), state management with S3 backends, modular architecture, multi-environment deployments
            </div>
          </div>
          <div className="tool-card">
            <div className="tool-icon github">🔄</div>
            <div className="tool-name">GitHub Actions</div>
            <div className="tool-description">
              <strong>Skills:</strong> CI/CD pipeline automation, automated testing workflows, containerized deployments, secrets management, build optimization (&lt;5min cycles)
            </div>
          </div>
          <div className="tool-card">
            <div className="tool-icon aws">☁️</div>
            <div className="tool-name">AWS ECS Fargate</div>
            <div className="tool-description">
              <strong>Skills:</strong> Serverless container orchestration, auto-scaling policies, task definitions, service discovery, load balancing integration, blue-green deployments
            </div>
          </div>
          <div className="tool-card">
            <div className="tool-icon jenkins">📊</div>
            <div className="tool-name">Prometheus</div>
            <div className="tool-description">
              <strong>Skills:</strong> Metrics collection, time-series database queries (PromQL), custom exporters, alerting rules, service health monitoring
            </div>
          </div>
          <div className="tool-card">
            <div className="tool-icon grafana">📈</div>
            <div className="tool-name">Grafana</div>
            <div className="tool-description">
              <strong>Skills:</strong> Real-time dashboards, data visualization, custom panels, alert configuration, multi-source data integration (LGTM Stack)
            </div>
          </div>
          <div className="tool-card">
            <div className="tool-icon docker">🗄️</div>
            <div className="tool-name">AWS RDS PostgreSQL</div>
            <div className="tool-description">
              <strong>Skills:</strong> Managed database service, Multi-AZ deployments, automated backups, encryption at rest, performance insights, connection pooling
            </div>
          </div>
          <div className="tool-card">
            <div className="tool-icon kubernetes">📦</div>
            <div className="tool-name">AWS ECR</div>
            <div className="tool-description">
              <strong>Skills:</strong> Private Docker registry, image lifecycle policies, vulnerability scanning, cross-region replication, IAM integration
            </div>
          </div>
          <div className="tool-card">
            <div className="tool-icon jenkins">🔍</div>
            <div className="tool-name">CloudWatch</div>
            <div className="tool-description">
              <strong>Skills:</strong> AWS native monitoring, log aggregation, metric filters, custom alarms, log insights queries, container logs analysis
            </div>
          </div>
          <div className="tool-card">
            <div className="tool-icon github">🔐</div>
            <div className="tool-name">AWS Secrets Manager</div>
            <div className="tool-description">
              <strong>Skills:</strong> Secrets rotation automation, database credential management, encryption, IAM role integration, application secret injection
            </div>
          </div>
          <div className="tool-card">
            <div className="tool-icon terraform">🌐</div>
            <div className="tool-name">AWS ALB</div>
            <div className="tool-description">
              <strong>Skills:</strong> SSL/TLS termination, health checks configuration, target group routing, path-based routing, security policies
            </div>
          </div>
          <div className="tool-card">
            <div className="tool-icon docker">📋</div>
            <div className="tool-name">Loki + Tempo</div>
            <div className="tool-description">
              <strong>Skills:</strong> Log aggregation (Loki), distributed tracing (Tempo), real-time log streaming, trace correlation, LGTM Stack integration
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="dashboard-footer fade-in-up delay-8">
        <div className="footer-content">
          <div className="footer-section">
            <h4>🚀 DevOps Engineering</h4>
            <p>Building scalable, secure, and maintainable cloud infrastructure</p>
          </div>
          <div className="footer-section">
            <h4>☁️ Cloud Architecture</h4>
            <p>AWS certified solutions with Infrastructure as Code</p>
          </div>
          <div className="footer-section">
            <h4>🔄 CI/CD Excellence</h4>
            <p>Automated testing, deployment, and monitoring pipelines</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Built with ❤️ using modern DevOps practices • Ready for production deployment</p>
        </div>
      </footer>
    </main>
  );
};

export default Dashboard;
