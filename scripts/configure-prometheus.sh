#!/bin/bash
# Script to configure Prometheus to scrape backend metrics

# Get Prometheus service task ARN
PROMETHEUS_TASK=$(aws ecs list-tasks --cluster dev --service-name dev-prometheus --region us-east-1 --query 'taskArns[0]' --output text)

if [ -z "$PROMETHEUS_TASK" ] || [ "$PROMETHEUS_TASK" == "None" ]; then
  echo "❌ Prometheus task not found"
  exit 1
fi

echo "✅ Found Prometheus task: $PROMETHEUS_TASK"

# Create Prometheus configuration
cat > /tmp/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Scrape Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
        labels:
          service: 'prometheus'

  # Scrape Backend API metrics via Service Discovery
  - job_name: 'backend-api'
    dns_sd_configs:
      - names:
          - 'backend.dev.local'
        type: 'A'
        port: 3001
    metrics_path: '/metrics'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
      - source_labels: [__address__]
        target_label: service
        replacement: 'backend'

  # Scrape Loki metrics
  - job_name: 'loki'
    dns_sd_configs:
      - names:
          - 'loki.dev.local'
        type: 'A'
        port: 3100
    metrics_path: '/metrics'
    relabel_configs:
      - source_labels: [__address__]
        target_label: service
        replacement: 'loki'

  # Scrape Grafana metrics
  - job_name: 'grafana'
    dns_sd_configs:
      - names:
          - 'grafana.dev.local'
        type: 'A'
        port: 3000
    metrics_path: '/metrics'
    relabel_configs:
      - source_labels: [__address__]
        target_label: service
        replacement: 'grafana'
EOF

echo "✅ Created Prometheus configuration"
echo ""
echo "📋 To apply this configuration, you need to:"
echo "1. Upload this config to the Prometheus container or"
echo "2. Store it in SSM Parameter Store and update the task definition"
echo ""
echo "For now, let's verify backend metrics endpoint is accessible:"
echo ""

# Test backend metrics endpoint
echo "Testing backend metrics endpoint..."
curl -s http://dev-alb-1530865636.us-east-1.elb.amazonaws.com/metrics | head -20

echo ""
echo "✅ If you see Prometheus metrics above, your backend is ready to be scraped!"
