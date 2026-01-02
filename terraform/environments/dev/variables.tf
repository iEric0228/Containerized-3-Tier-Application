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
}
variable "db_password" {
  description = "Database password"
  type        = string
}
variable "availability_zones" {
  description = "List of AZs"
  type        = list(string)
}