# 1. ALB Security Group - Controls traffic to Load Balancer
resource "aws_security_group" "alb" {
  name_prefix = "${var.name_prefix}-alb-"
  vpc_id      = var.vpc_id # References VPC from vpc module

  # Inbound Rules
  ingress {
    description = "HTTP from Internet"
    from_port   = 80 # Allow port 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # From anywhere on internet
  }

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443 # Allow port 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # From anywhere on internet
  }

  # Outbound Rules
  egress {
    from_port   = 0 # Allow all outbound traffic
    to_port     = 0
    protocol    = "-1" # All protocols
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. ECS Tasks Security Group - Controls traffic to containers
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.name_prefix}-ecs-tasks-"
  vpc_id      = var.vpc_id

  # Frontend container access from ALB
  ingress {
    description     = "Frontend from ALB"
    from_port       = var.frontend_port # React app port
    to_port         = var.frontend_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id] # Only from ALB security group
  }

  # Backend container access from ALB  
  ingress {
    description     = "Backend from ALB"
    from_port       = var.backend_port # Express API port
    to_port         = var.backend_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id] # Only from ALB security group
  }

  # Container-to-container communication
  ingress {
    description = "Inter-container communication"
    from_port   = var.backend_port
    to_port     = var.backend_port
    protocol    = "tcp"
    self        = true # Allow traffic within same security group
  }

  # Allow all outbound (for database, internet access)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 3. RDS Security Group - Controls database access
resource "aws_security_group" "rds" {
  name_prefix = "${var.name_prefix}-rds-"
  vpc_id      = var.vpc_id

  # Only allow database access from ECS containers
  ingress {
    description     = "PostgreSQL from ECS"
    from_port       = 5432 # PostgreSQL port
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id] # Only from ECS security group
  }

  # No outbound rules needed for RDS
}