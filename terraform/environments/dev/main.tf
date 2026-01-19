terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
# Configure the AWS Provider
provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source             = "../../modules/VPC"
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  name_prefix        = var.name_prefix
  common_tags        = var.common_tags
}

module "security" {
  source        = "../../modules/security"
  vpc_id        = module.vpc.vpc_id
  name_prefix   = var.name_prefix
  common_tags   = var.common_tags
  frontend_port = var.frontend_port
  backend_port  = var.backend_port
}

module "ecr" {
  source      = "../../modules/ECR"
  name_prefix = var.name_prefix
  common_tags = var.common_tags
}

module "secrets" {
  source                 = "../../modules/secret"
  name_prefix            = var.name_prefix
  db_username            = var.db_username
  db_password            = var.db_password
  grafana_admin_password = var.grafana_admin_password
  rotation_lambda_arn    = var.rotation_lambda_arn
  rotation_days          = var.rotation_days
  common_tags            = var.common_tags
}

module "alb" {
  source            = "../../modules/ALB"
  name_prefix       = var.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  alb_sg_id         = module.security.alb_sg_id
  common_tags       = var.common_tags
}

module "rds" {
  source                 = "../../modules/RDS"
  name_prefix            = var.name_prefix
  db_name                = var.db_name
  db_username            = var.db_username
  db_password_secret_arn = module.secrets.db_password_secret_arn
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids # Always from correct VPC
  rds_sg_id              = module.security.rds_sg_id
  common_tags            = var.common_tags
  # All subnet group and RDS resources are created by Terraform
}

module "ecs" {
  source                            = "../../modules/ECS"
  name_prefix                       = var.name_prefix
  frontend_image                    = module.ecr.frontend_repository_url
  backend_image                     = module.ecr.backend_repository_url
  private_subnet_ids                = module.vpc.private_subnet_ids
  ecs_security_group_id             = module.security.ecs_tasks_sg_id
  frontend_target_group_arn         = module.alb.frontend_target_group_arn
  backend_target_group_arn          = module.alb.backend_target_group_arn
  alb_listener                      = module.alb.alb_listener_arn
  alb_dns_name                      = module.alb.alb_dns_name
  aws_region                        = var.aws_region
  db_host                           = module.rds.db_address
  db_name                           = var.db_name
  db_username_secret_arn            = module.secrets.db_username_secret_arn
  db_password_secret_arn            = module.secrets.db_password_secret_arn
  grafana_admin_password_secret_arn = module.secrets.grafana_admin_password_secret_arn
  loki_host                         = module.monitoring.loki_endpoint
  prometheus_url                    = module.monitoring.prometheus_url
  loki_url                          = module.monitoring.loki_endpoint
  common_tags                       = merge(var.common_tags, { "Environment" = var.name_prefix })
  vpc_id                            = module.vpc.vpc_id
}

# Monitoring Stack Module
module "monitoring" {
  source                            = "../../modules/monitoring"
  name_prefix                       = var.name_prefix
  vpc_id                            = module.vpc.vpc_id
  private_subnet_ids                = module.vpc.private_subnet_ids
  public_subnet_ids                 = module.vpc.public_subnet_ids
  ecs_cluster_id                    = module.ecs.cluster_id
  ecs_task_security_group_id        = module.security.ecs_tasks_sg_id
  alb_security_group_id             = module.security.alb_sg_id
  ecs_task_execution_role_arn       = module.ecs.task_execution_role_arn
  ecs_task_role_arn                 = module.ecs.task_role_arn
  grafana_admin_password_secret_arn = module.secrets.grafana_admin_password_secret_arn
  service_discovery_namespace_id    = module.ecs.service_discovery_namespace_id
  service_discovery_namespace_name  = module.ecs.service_discovery_namespace_name
  common_tags                       = var.common_tags
  # All log groups and monitoring resources are created by Terraform
}