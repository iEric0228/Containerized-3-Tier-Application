variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where monitoring services will run"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "ecs_cluster_id" {
  description = "ECS cluster ID"
  type        = string
}

variable "ecs_task_security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "alb_security_group_id" {
  description = "ALB security group ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  type        = list(string)
}

variable "ecs_task_execution_role_arn" {
  description = "ECS task execution role ARN"
  type        = string
}

variable "ecs_task_role_arn" {
  description = "ECS task role ARN"
  type        = string
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}

variable "grafana_admin_password_secret_arn" {
  description = "ARN of the secret containing Grafana admin password"
  type        = string
}

variable "service_discovery_namespace_id" {
  description = "ID of the existing service discovery namespace"
  type        = string
}

variable "service_discovery_namespace_name" {
  description = "Name of the existing service discovery namespace"
  type        = string
}
