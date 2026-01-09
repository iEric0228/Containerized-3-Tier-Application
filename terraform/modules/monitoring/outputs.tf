output "monitoring_alb_dns" {
  description = "DNS name of the monitoring ALB"
  value       = aws_lb.monitoring.dns_name
}

output "grafana_url" {
  description = "Grafana URL"
  value       = "http://${aws_lb.monitoring.dns_name}/grafana"
}

output "prometheus_url" {
  description = "Prometheus URL"
  value       = "http://${aws_lb.monitoring.dns_name}/prometheus"
}

output "loki_endpoint" {
  description = "Loki internal endpoint for backend integration"
  value       = "http://loki.${var.service_discovery_namespace_name}:3100"
}

output "prometheus_endpoint" {
  description = "Prometheus internal endpoint"
  value       = "http://prometheus.${var.service_discovery_namespace_name}:9090"
}

output "service_discovery_namespace" {
  description = "Service discovery namespace"
  value       = var.service_discovery_namespace_name
}

output "efs_id" {
  description = "EFS file system ID for monitoring data"
  value       = aws_efs_file_system.monitoring.id
}
