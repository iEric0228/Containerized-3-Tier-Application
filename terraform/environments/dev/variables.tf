variable "aws_region" {
  description = "AWS region"
  type        = string
}
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}
variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
}
variable "common_tags" {
  description = "Tags for all resources"
  type        = map(string)
  default     = {}
}
variable "frontend_port" {
  description = "Frontend port"
  type        = number
}
variable "backend_port" {
  description = "Backend port"
  type        = number
}
variable "db_name" {
  description = "Database name"
  type        = string
}
variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}
variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}
variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
}
variable "availability_zones" {
  description = "List of AZs"
  type        = list(string)
}
variable "rotation_lambda_arn" {
  description = "ARN of the Lambda function for secret rotation (optional)"
  type        = string
  default     = null
}

variable "rotation_days" {
  description = "Number of days between automatic secret rotations"
  type        = number
  default     = 30
}

variable "environment" {
  description = "The environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "skip_monitoring" {
  description = "Whether to skip provisioning the monitoring stack"
  type        = bool
  default     = false
}
