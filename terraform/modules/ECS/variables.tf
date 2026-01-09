variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "common_tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "vpc_id" {
    description = "The VPC ID where ECS will be deployed"
    type        = string
}

variable "frontend_image" {
  description = "Frontend container image"
  type        = string
}

variable "backend_image" {
  description = "Backend container image"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "frontend_target_group_arn" {
  description = "Target group ARN for frontend"
  type        = string
}

variable "backend_target_group_arn" {
  description = "Target group ARN for backend"
  type        = string
}

variable "alb_listener" {
  description = "ALB listener dependency"
}

variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "db_host" {
  description = "Database host"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_password_secret_arn" {
  description = "ARN of the Secrets Manager secret for DB password"
  type        = string
}

variable "db_username_secret_arn" {
  description = "ARN of the Secrets Manager secret for DB username"
  type        = string
}

variable "loki_host" {
  description = "Loki endpoint URL for logging (optional)"
  type        = string
  default     = ""
}

variable "prometheus_url" {
  description = "Prometheus URL for metrics queries"
  type        = string
  default     = "http://prometheus:9090"
}

variable "loki_url" {
  description = "Loki URL for log queries"
  type        = string
  default     = "http://loki:3100"
}

variable "grafana_admin_password_secret_arn" {
  description = "ARN of the Secrets Manager secret for Grafana admin password"
  type        = string
  default     = ""
}