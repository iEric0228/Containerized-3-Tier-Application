variable "name_prefix" { 
    description = "The name prefix for all resources"
    type        = string 
}
variable "vpc_id" { 
    description = "The VPC ID where the ALB will be deployed"
    type        = string 
}
variable "public_subnet_ids" { 
    description = "The public subnet IDs for the ALB"
    type        = list(string) 
}
variable "alb_sg_id" { 
    description = "The security group ID for the ALB"
    type        = string 
}
variable "common_tags" { 
    description = "Common tags to apply to all resources"
    type        = map(string) 
}