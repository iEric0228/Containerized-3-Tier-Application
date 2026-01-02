output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
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