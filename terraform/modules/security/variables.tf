variable "vpc_id" {
  description = "The VPC ID to associate with security groups"
  type        = string
}

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "common_tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "frontend_port" {
  description = "Port for frontend service"
  type        = number
  default     = 3000
}

variable "backend_port" {
  description = "Port for backend service"
  type        = number
  default     = 3001
}