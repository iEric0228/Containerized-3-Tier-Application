output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = module.ecr.frontend_repository_url
}

output "backend_repository_url" {
  description = "URL of the backend ECR repository"
  value       = module.ecr.backend_repository_url
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "frontend_service_arn" {
  description = "ARN of the frontend ECS service"
  value       = module.ecs.frontend_service_arn
}

output "backend_service_arn" {
  description = "ARN of the backend ECS service"
  value       = module.ecs.backend_service_arn
}

output "db_endpoint" {
  description = "Endpoint of the RDS PostgreSQL instance"
  value       = module.rds.db_endpoint
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "monitoring_alb_dns" {
  description = "DNS name of the monitoring ALB"
  value       = module.monitoring.monitoring_alb_dns
}

output "grafana_url" {
  description = "Grafana URL"
  value       = module.monitoring.grafana_url
}

output "prometheus_url" {
  description = "Prometheus URL"
  value       = module.monitoring.prometheus_url
}

output "loki_endpoint" {
  description = "Loki internal endpoint for backend"
  value       = module.monitoring.loki_endpoint
}