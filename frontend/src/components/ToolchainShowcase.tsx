import React from 'react';

const TOOLS = [
  { icon: 'docker', name: 'Docker', desc: 'Multi-stage builds (60% size reduction), container optimization, security scanning with Docker Scout, image vulnerability assessment, SBOM generation' },
  { icon: 'terraform', name: 'Terraform', desc: 'Infrastructure as Code, AWS resource provisioning (ECS, RDS, VPC), state management with S3 backends, modular architecture, multi-environment deployments' },
  { icon: 'github', name: 'GitHub Actions', desc: 'CI/CD pipeline automation, automated testing workflows, containerized deployments, secrets management, build optimization (<5min cycles)' },
  { icon: 'aws', name: 'AWS ECS Fargate', desc: 'Serverless container orchestration, auto-scaling policies, task definitions, service discovery, load balancing integration, blue-green deployments' },
  { icon: 'prometheus', name: 'Prometheus', desc: 'Metrics collection, time-series database queries (PromQL), custom exporters, alerting rules, service health monitoring' },
  { icon: 'grafana', name: 'Grafana', desc: 'Real-time dashboards, data visualization, custom panels, alert configuration, multi-source data integration (LGTM Stack)' },
  { icon: 'rds', name: 'AWS RDS PostgreSQL', desc: 'Managed database service, Multi-AZ deployments, automated backups, encryption at rest, performance insights, connection pooling' },
  { icon: 'ecr', name: 'AWS ECR', desc: 'Private Docker registry, image lifecycle policies, vulnerability scanning, cross-region replication, IAM integration' },
  { icon: 'cloudwatch', name: 'CloudWatch', desc: 'AWS native monitoring, log aggregation, metric filters, custom alarms, log insights queries, container logs analysis' },
  { icon: 'secrets', name: 'AWS Secrets Manager', desc: 'Secrets rotation automation, database credential management, encryption, IAM role integration, application secret injection' },
  { icon: 'alb', name: 'AWS ALB', desc: 'SSL/TLS termination, health checks configuration, target group routing, path-based routing, security policies' },
  { icon: 'loki', name: 'Loki + Tempo', desc: 'Log aggregation (Loki), distributed tracing (Tempo), real-time log streaming, trace correlation, LGTM Stack integration' },
];

const ToolchainShowcase: React.FC = () => (
  <section className="toolchain-showcase fade-in-up delay-6" aria-label="Skills Developed">
    <h2 className="toolchain-title">
      DevOps Toolchain &amp; Skills Mastery
      <span className="project-badge">Hands-On Experience</span>
    </h2>
    <div className="toolchain-grid">
      {TOOLS.map((tool) => (
        <div className="tool-card" key={tool.name}>
          <div className={`tool-icon ${tool.icon}`}>
            <span className="tool-icon-letter">{tool.name.charAt(0)}</span>
          </div>
          <div className="tool-name">{tool.name}</div>
          <div className="tool-description">{tool.desc}</div>
        </div>
      ))}
    </div>
  </section>
);

export default ToolchainShowcase;
