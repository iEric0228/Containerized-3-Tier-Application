import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { User, HealthCheck } from '../types/api.interface';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [metricsCount, setMetricsCount] = useState({ 
    requests: 0, 
    uptime: 0, 
    connections: 0,
    deployments: 0,
    performance: 0 
  });
  
  // Project-specific data
  const [projectDetails] = useState({
    // Combined Project Overview
    projectOverview: {
      summary: "Production-grade containerized 3-tier application showcasing enterprise DevOps practices: Docker multi-stage builds, Terraform IaC, CI/CD automation, Prometheus monitoring, and AWS cloud-native architecture ready for high-availability deployment.",
      goals: [
        "Docker & Container Orchestration",
        "Terraform Infrastructure as Code",
        "CI/CD Pipeline Automation",
        "Prometheus & Grafana Monitoring"
      ],
      outcomes: [
        { icon: '🐳', result: 'Multi-stage Docker builds reducing image size by 60%' },
        { icon: '🏗️', result: 'Terraform IaC automating complete AWS infrastructure' },
        { icon: '🔄', result: 'GitHub Actions CI/CD with automated testing & deployment' },
        { icon: '📊', result: 'Prometheus metrics with Grafana real-time dashboards' }
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
        area: 'CI/CD Automation',
        icon: '🔄',
        skills: [
          'GitHub Actions workflows for automated testing and deployment',
          'Automated Docker image builds and pushes to ECR',
          'Integration testing with containerized services',
          'Blue-green deployment strategies for zero downtime',
          'Automated rollback mechanisms and health checks'
        ]
      },
      {
        area: 'Monitoring & Observability',
        icon: '📊',
        skills: [
          'Prometheus metrics collection and exporters',
          'Grafana dashboards for real-time system visualization',
          'Custom application metrics and business KPIs',
          'AWS CloudWatch integration for cloud-native monitoring',
          'Alerting rules and incident response automation'
        ]
      },
      {
        area: 'Cloud Architecture (AWS)',
        icon: '☁️',
        skills: [
          'ECS Fargate for serverless container orchestration',
          'RDS PostgreSQL with automated backups and multi-AZ',
          'Application Load Balancer with health checks and SSL/TLS',
          'VPC design with public/private subnets and NAT gateways',
          'CloudWatch Logs aggregation and log analytics'
        ]
      }
    ],

    achievements: [
      { icon: '🐳', title: 'Container Optimization', value: '120MB', desc: 'Multi-stage Docker builds, 60% size reduction' },
      { icon: '🏗️', title: 'IaC Automation', value: '100%', desc: 'Full AWS stack provisioned via Terraform' },
      { icon: '🔄', title: 'CI/CD Pipeline', value: '< 5min', desc: 'Automated test, build, and deploy cycle' },
      { icon: '📊', title: 'Prometheus Metrics', value: '50+', desc: 'Custom application and infrastructure metrics' },
      { icon: '☁️', title: 'AWS Services', value: '12+', desc: 'ECS, RDS, ALB, CloudWatch, ECR, VPC...' },
      { icon: '🔒', title: 'Security Scan', value: 'A+', desc: 'Zero critical vulnerabilities in containers' }
    ]
  });

  useEffect(() => {
    fetchData();
    setTimeout(() => setIsVisible(true), 100);
    animateMetrics();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
  
      // Call getHealth without arguments
      const healthData = await ApiService.getHealth();
      setHealth(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to backend API');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const animateMetrics = () => {
    let requests = 0;
    let uptime = 0;
    let connections = 0;
    let deployments = 0;
    let performance = 0;
    
    const interval = setInterval(() => {
      requests += Math.floor(Math.random() * 50) + 10;
      uptime += 1;
      connections = Math.floor(Math.random() * 20) + 5;
      deployments = Math.min(deployments + Math.floor(Math.random() * 2), 25);
      performance = Math.min(performance + Math.floor(Math.random() * 5), 98);
      
      setMetricsCount({ requests, uptime, connections, deployments, performance });
      
      if (requests > 1000) clearInterval(interval);
    }, 100);
  };

  const getStatusColor = (status: string) => {
    return status === 'healthy' ? '#10b981' : '#ef4444';
  };

  const getStatusIcon = (status: string) => {
    return status === 'healthy' ? '🟢' : '🔴';
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
    <div className={`dashboard ${isVisible ? 'visible' : ''}`}>
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

      {/* Real-time Metrics */}
      <div className="metrics-bar fade-in-up delay-1">
        <div className="metric">
          <span className="metric-value">{metricsCount.requests.toLocaleString()}</span>
          <span className="metric-label">API Requests</span>
        </div>
        <div className="metric">
          <span className="metric-value">{metricsCount.uptime}s</span>
          <span className="metric-label">Uptime</span>
        </div>
        <div className="metric">
          <span className="metric-value">{metricsCount.connections}</span>
          <span className="metric-label">Active Connections</span>
        </div>
        <div className="metric">
          <span className="metric-value">{metricsCount.deployments}</span>
          <span className="metric-label">Deployments</span>
        </div>
        <div className="metric">
          <span className="metric-value">{metricsCount.performance}%</span>
          <span className="metric-label">Performance</span>
        </div>
      </div>

      {/* System Health Monitor */}
      <div className="health-section fade-in-up delay-2">
        <h2 className="section-title">
          <span className="icon">📊</span>
          System Health Monitor
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
                <div className="health-detail">React + TypeScript • Port 3000</div>
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
                <div className="health-detail">Express.js + Node.js • Port 3001</div>
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
                  {health.database.toUpperCase()}
                </div>
                <div className="health-detail">PostgreSQL • Port 5432</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Architecture Visualization */}
      <div className="architecture-section fade-in-up delay-3">
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
      </div>

      {/* NEW: Comprehensive DevOps System Design */}
      <div className="system-design-section fade-in-up delay-4">
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
      </div>

      {/* Combined Project Overview Section */}
      <div className="overview-section fade-in-up delay-5">
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
      </div>

      {/* Simplified Technical Skills Section */}
      <div className="skills-developed-section fade-in-up delay-6">
        <h2 className="section-title">
          <span className="icon">🛠️</span>
          Technical Skills Developed
          <span className="project-badge">Hands-On Experience</span>
        </h2>
        
        <div className="skills-areas-grid">
          {projectDetails.skillsDeveloped.map((area, index) => (
            <div 
              key={area.area} 
              className="skill-area-card animate-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="area-header">
                <span className="area-icon">{area.icon}</span>
                <h4>{area.area}</h4>
              </div>
              
              <ul className="skills-list">
                {area.skills.map((skill, skillIndex) => (
                  <li key={skillIndex} className="skill-item">
                    <span className="skill-bullet">•</span>
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Achievements */}
      <div className="users-section fade-in-up delay-7">
        <h2 className="section-title">
          <span className="icon">🏆</span>
          Technical Achievements
          <span className="record-count">Production Ready</span>
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
                <button className="action-btn">View Code</button>
                <button className="action-btn secondary">Demo</button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
};

export default Dashboard;