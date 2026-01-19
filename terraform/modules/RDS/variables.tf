variable "name_prefix" {
  description = "The name prefix for all resources"
  type        = string
}

variable "db_name" {
  description = "The name of the database"
  type        = string
}

variable "db_username" {
  description = "The database username"
  type        = string
}

variable "db_password_secret_arn" {
  description = "The ARN of the Secrets Manager secret containing the database password"
  type        = string
}

variable "vpc_id" {
  description = "The VPC ID where the RDS instance will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "The private subnet IDs for the RDS instance"
  type        = list(string)
}

variable "rds_sg_id" {
  description = "The security group ID for the RDS instance"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
}