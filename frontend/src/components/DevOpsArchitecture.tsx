import React from 'react';

const LAYERS = [
  {
    title: 'Development & Version Control',
    content: [
      { label: 'GitHub', desc: 'Source code management, branching strategy, PR reviews' },
      { label: 'Docker Compose', desc: 'Local development environment with all services' },
    ],
  },
  {
    title: 'CI/CD Pipeline (GitHub Actions)',
    highlight: true,
    pipeline: [
      { step: 1, name: 'Code Quality', desc: 'Linting, type checking, security scanning' },
      { step: 2, name: 'Build & Test', desc: 'Unit tests, integration tests, coverage reports' },
      { step: 3, name: 'Docker Build', desc: 'Multi-stage builds, tag, push to ECR' },
      { step: 4, name: 'Deploy', desc: 'Terraform apply, ECS task update' },
    ],
  },
  {
    title: 'AWS Cloud Infrastructure (Terraform IaC)',
    cloud: [
      { name: 'Application Load Balancer', desc: 'SSL/TLS termination, health checks, traffic routing' },
      { name: 'ECS Fargate', desc: 'Serverless containers, auto-scaling, task definitions' },
      { name: 'RDS PostgreSQL', desc: 'Multi-AZ deployment, automated backups, encryption' },
      { name: 'ECR', desc: 'Private Docker registry, vulnerability scanning' },
      { name: 'Secrets Manager', desc: 'Database credentials, API keys, rotation' },
      { name: 'VPC & Security', desc: 'Private subnets, NAT gateways, security groups' },
    ],
  },
  {
    title: 'Monitoring & Observability',
    content: [
      { label: 'Prometheus', desc: 'Metrics collection, time-series database, alerting rules' },
      { label: 'Grafana', desc: 'Real-time dashboards, visualization, custom alerts' },
      { label: 'CloudWatch', desc: 'AWS native monitoring, log aggregation, insights' },
    ],
  },
];

const ARROW_LABELS = ['Git Push Trigger', 'Automated Deployment', 'Metrics & Logs'];

const TOOLS = [
  { cls: 'docker', label: 'Docker' },
  { cls: 'terraform', label: 'Terraform' },
  { cls: 'github', label: 'GitHub Actions' },
  { cls: 'prometheus', label: 'Prometheus' },
  { cls: 'grafana', label: 'Grafana' },
  { cls: 'aws', label: 'AWS ECS' },
  { cls: 'ecr', label: 'AWS ECR' },
  { cls: 'rds', label: 'AWS RDS' },
  { cls: 'cloudwatch', label: 'CloudWatch' },
  { cls: 'nginx', label: 'Nginx' },
];

const DevOpsArchitecture: React.FC = () => (
  <section className="system-design-section fade-in-up delay-4" aria-label="DevOps System Design">
    <h2 className="section-title">
      Complete DevOps Architecture
      <span className="record-count">Production-Ready</span>
    </h2>

    <div className="devops-layers">
      {LAYERS.map((layer, i) => (
        <React.Fragment key={layer.title}>
          <div className={`layer-card${layer.highlight ? ' highlight' : ''}`}>
            <div className="layer-header">
              <h3>{layer.title}</h3>
            </div>
            <div className={`layer-content${layer.pipeline ? ' pipeline' : ''}${layer.cloud ? ' cloud-grid' : ''}`}>
              {layer.content?.map((c) => (
                <div className="component-box" key={c.label}>
                  <span className="component-label">{c.label}</span>
                  <p>{c.desc}</p>
                </div>
              ))}
              {layer.pipeline?.map((s, si) => (
                <React.Fragment key={s.step}>
                  {si > 0 && <div className="pipeline-arrow">&rarr;</div>}
                  <div className="pipeline-step">
                    <span className="step-number">{s.step}</span>
                    <div className="step-details">
                      <strong>{s.name}</strong>
                      <p>{s.desc}</p>
                    </div>
                  </div>
                </React.Fragment>
              ))}
              {layer.cloud?.map((c) => (
                <div className="cloud-component" key={c.name}>
                  <strong>{c.name}</strong>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
          {i < LAYERS.length - 1 && (
            <div className="layer-arrow">
              <div className="arrow-down"></div>
              <span className="arrow-label">{ARROW_LABELS[i]}</span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>

    <div className="tools-showcase">
      <h3>DevOps Toolchain</h3>
      <div className="tools-grid">
        {TOOLS.map((t) => (
          <div className={`tool-badge ${t.cls}`} key={t.cls}>{t.label}</div>
        ))}
      </div>
    </div>
  </section>
);

export default DevOpsArchitecture;
