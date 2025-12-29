# Project Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "containerized-3tier-app"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# AWS Configuration
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# ECS Configuration
variable "app_port" {
  description = "Application port"
  type        = number
  default     = 3000
}

variable "backend_port" {
  description = "Backend API port"
  type        = number
  default     = 3001
}

# RDS Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "app_db"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

# Container Configuration
variable "frontend_image" {
  description = "Frontend container image"
  type        = string
  default     = "your-account.dkr.ecr.us-east-1.amazonaws.com/3tier-frontend:latest"
}

variable "backend_image" {
  description = "Backend container image"
  type        = string
  default     = "your-account.dkr.ecr.us-east-1.amazonaws.com/3tier-backend:latest"
}
