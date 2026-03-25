import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { HealthCheck } from '../types/api.interface';
import MetricsBar from './MetricsBar';
import HealthGrid from './HealthGrid';
import LiveMonitoring from './LiveMonitoring';
import ArchitectureFlow from './ArchitectureFlow';
import DevOpsArchitecture from './DevOpsArchitecture';
import ToolchainShowcase from './ToolchainShowcase';
import ProjectOverview from './ProjectOverview';
import DashboardFooter from './DashboardFooter';
import './Dashboard.css';

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

const PROJECT_OVERVIEW = {
  summary: "Production-grade containerized 3-tier application showcasing enterprise DevOps practices: Docker multi-stage builds, Terraform IaC, CI/CD automation, Prometheus monitoring, and AWS cloud-native architecture ready for high-availability deployment.",
  goals: [
    "Docker & Container Orchestration",
    "Terraform Infrastructure as Code",
    "CI/CD Pipeline Automation",
    "Live Metrics & Observability"
  ],
  outcomes: [
    { result: 'Multi-stage Docker builds reducing image size by 60%' },
    { result: 'Terraform IaC automating complete AWS infrastructure' },
    { result: 'GitHub Actions CI/CD with automated testing & deployment' },
    { result: 'Live Grafana dashboards with real-time LGTM stack' }
  ],
  benefits: [
    { benefit: 'DevOps Mastery', description: 'Hands-on experience with industry-standard DevOps tools and practices' },
    { benefit: 'Cloud Native', description: 'AWS ECS, RDS, CloudWatch integration with Infrastructure as Code' },
    { benefit: 'Security First', description: 'Container security scanning, secrets management, and compliance' },
    { benefit: 'Production Ready', description: 'Zero-downtime deployments with monitoring and alerting' }
  ]
};

const ACHIEVEMENTS = [
  { title: 'Container Optimization', value: '120MB', desc: 'Multi-stage Docker builds, 60% size reduction' },
  { title: 'IaC Automation', value: '100%', desc: 'Full AWS stack provisioned via Terraform' },
  { title: 'CI/CD Pipeline', value: '< 5min', desc: 'Automated test, build, and deploy cycle' },
  { title: 'Live Metrics', value: '50+', desc: 'Real-time LGTM stack monitoring' },
  { title: 'AWS Services', value: '12+', desc: 'ECS, RDS, ALB, CloudWatch, ECR, VPC...' },
  { title: 'Enhanced Security', value: 'Docker Scout', desc: 'Integrated vulnerability scanning, SBOM generation, and provenance verification' }
];

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

const Dashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics[]>([]);
  const [realtimeLogs, setRealtimeLogs] = useState<LogEntry[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState({
    requests: 0,
    responseTime: 0,
    errorRate: 0,
    uptime: 0,
  });

  const fetchData = async () => {
    try {
      setError(null);
      const healthData = await ApiService.getHealth();
      setHealth(healthData);
    } catch (err) {
      setHealth({
        status: 'unknown',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: 0,
        environment: 'development'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setTimeout(() => setIsVisible(true), 100);

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

    const healthInterval = setInterval(fetchData, 30000);

    const metricsInterval = setInterval(async () => {
      try {
        const prometheusMetrics = await ApiService.getPrometheusMetrics();
        const results = prometheusMetrics.data?.result ?? [];

        const httpRequests = results.find((r) =>
          r.metric?.__name__ === 'http_requests_total'
        );
        const requestDuration = results.find((r) =>
          r.metric?.__name__ === 'http_request_duration_seconds_sum'
        );

        const requestsValue = httpRequests?.value?.[1]
          ? parseFloat(httpRequests.value[1])
          : 0;
        const responseTimeValue = requestDuration?.value?.[1]
          ? parseFloat(requestDuration.value[1]) * 1000
          : 0;

        setCurrentMetrics(prev => ({
          ...prev,
          requests: requestsValue || prev.requests,
          responseTime: responseTimeValue || prev.responseTime,
          uptime: prev.uptime + 10,
        }));

        setLiveMetrics(prev => [...prev, {
          timestamp: Date.now(),
          requests: requestsValue,
          responseTime: responseTimeValue,
          cpuUsage: 0,
          memoryUsage: 0,
          activeConnections: 0,
          errorRate: 0
        }].slice(-50));

        try {
          const lokiLogs = await ApiService.getLokiLogs(10);
          if (lokiLogs?.data?.result && Array.isArray(lokiLogs.data.result)) {
            const newLogs = lokiLogs.data.result.flatMap((stream: { values?: [string, string][] }) => {
              if (!stream.values || !Array.isArray(stream.values)) return [];
              return stream.values.map(([timestamp, message]) => ({
                timestamp: new Date(parseInt(timestamp) / 1000000).toISOString(),
                level: extractLogLevel(message),
                message: message || 'No message content',
                service: extractService(message)
              }));
            });

            if (newLogs.length > 0) {
              setRealtimeLogs(prev => [...newLogs.reverse(), ...prev].slice(0, 100));
            }
          }
        } catch {
          // Keep showing existing logs on Loki fetch failure
        }
      } catch {
        // Keep showing last known good values on metrics fetch failure
      }
    }, 10000);

    return () => {
      clearInterval(healthInterval);
      clearInterval(metricsInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDemoClick = (demoType: string) => {
    switch (demoType) {
      case 'grafana':
        window.open('http://localhost:3002', '_blank');
        break;
      case 'prometheus':
        window.open('http://localhost:9090', '_blank');
        break;
      case 'metrics':
        document.getElementById('live-metrics-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      case 'monitoring':
        document.getElementById('live-monitoring-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      case 'code':
        window.open('https://github.com/ieric0228/Containerized-3-Tier-Application', '_blank');
        break;
      default:
        break;
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
            <div className="step active">Loading Frontend Architecture</div>
            <div className="step active">Connecting Backend Services</div>
            <div className="step active">Establishing Database Connection</div>
            <div className="step active">Starting Live Metrics Collection</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard error">
        <div className="error-container">
          <div className="error-icon">Warning</div>
          <h2>System Connection Error</h2>
          <p>{error}</p>
          <div className="error-details">
            <p>DevOps Troubleshooting checklist:</p>
            <ul>
              <li>Backend service health check</li>
              <li>Database connectivity status</li>
              <li>LGTM stack monitoring services</li>
              <li>Network configuration validation</li>
              <li>Security group permissions</li>
            </ul>
          </div>
          <button onClick={fetchData} className="retry-button">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className={`dashboard ${isVisible ? 'visible' : ''}`} aria-label="3-Tier Application Dashboard" role="main">
      <div className="bg-animation">
        <div className="floating-element floating-1"></div>
        <div className="floating-element floating-2"></div>
        <div className="floating-element floating-3"></div>
      </div>

      <header className="dashboard-header fade-in-up">
        <div className="header-content">
          <h1 className="main-title">
            <span className="gradient-text">3-Tier Application</span>
            <div className="title-underline"></div>
          </h1>
          <p className="subtitle">DevOps Engineer | Cloud Architect</p>
          <div className="tech-badges">
            {PROJECT_OVERVIEW.goals.map((goal, index) => (
              <span key={goal} className="badge" style={{ '--i': index + 1 } as React.CSSProperties}>
                {goal}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="pipeline-flow fade-in-up delay-1">
        <div className="progress-flow"></div>
        {['Code', 'Build', 'Test', 'Deploy', 'Monitor'].map((stage, i) => (
          <React.Fragment key={stage}>
            {i > 0 && <div className="pipeline-arrow"></div>}
            <div className="pipeline-stage">
              <div className={`stage-icon ${stage.toLowerCase()}`}>
                <span className="stage-icon-letter">{stage.charAt(0)}</span>
              </div>
              <div className="stage-label">{stage}</div>
            </div>
          </React.Fragment>
        ))}
      </div>

      <MetricsBar
        requests={currentMetrics.requests}
        responseTime={currentMetrics.responseTime}
        uptime={currentMetrics.uptime}
        errorRate={currentMetrics.errorRate}
      />

      {health && <HealthGrid health={health} />}

      <LiveMonitoring
        liveMetrics={liveMetrics}
        realtimeLogs={realtimeLogs}
        totalRequests={currentMetrics.requests}
        onOpenGrafana={() => handleDemoClick('grafana')}
      />

      <ArchitectureFlow />

      <DevOpsArchitecture />

      <ProjectOverview
        summary={PROJECT_OVERVIEW.summary}
        goals={PROJECT_OVERVIEW.goals}
        outcomes={PROJECT_OVERVIEW.outcomes}
        benefits={PROJECT_OVERVIEW.benefits}
      />

      <section className="users-section fade-in-up delay-7" aria-label="Technical Achievements">
        <h2 className="section-title">
          Technical Achievements
          <span className="record-count">Live Demo Ready</span>
        </h2>
        <div className="users-grid">
          {ACHIEVEMENTS.map((achievement, index) => (
            <div
              key={achievement.title}
              className="user-card animate-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="user-avatar">
                <div className="avatar-circle">
                  <span className="avatar-letter">{achievement.title.charAt(0)}</span>
                </div>
              </div>
              <div className="user-info">
                <h3>{achievement.title}</h3>
                <div className="achievement-value">{achievement.value}</div>
                <p>{achievement.desc}</p>
              </div>
              <div className="user-actions">
                <button className="action-btn" onClick={() => handleDemoClick('code')}>
                  View Code
                </button>
                <button
                  className="action-btn demo-btn"
                  onClick={() => {
                    if (achievement.title.includes('Container') || achievement.title.includes('CI/CD')) {
                      handleDemoClick('code');
                    } else if (achievement.title.includes('Metrics') || achievement.title.includes('Live')) {
                      handleDemoClick('grafana');
                    } else {
                      handleDemoClick('monitoring');
                    }
                  }}
                >
                  Live Demo
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ToolchainShowcase />

      <DashboardFooter />
    </main>
  );
};

export default Dashboard;
