#!/bin/bash
# Terraform Resource Import Script
# Discovers and imports existing AWS resources into Terraform state.
# All ARNs and IDs are resolved at runtime - no hardcoded values.

set +e

echo "Starting resource import..."
echo "============================================"

export AWS_REGION=${AWS_REGION:-us-east-1}
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
if [ -z "$ACCOUNT_ID" ]; then
    echo "Error: Could not get AWS Account ID. Check your credentials."
    exit 1
fi

echo "Configuration:"
echo "  Region: $AWS_REGION"
echo "  Account: $ACCOUNT_ID"
echo "  Environment: dev"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

IMPORT_SUCCESS=0
IMPORT_SKIPPED=0
IMPORT_FAILED=0

import_resource() {
    local resource_address=$1
    local resource_id=$2
    local resource_name=$3
    
    if [ -z "$resource_id" ] || [ "$resource_id" = "None" ] || [ "$resource_id" = "null" ]; then
        echo -e "${YELLOW}  Skipped: ${resource_name} (not found)${NC}"
        ((IMPORT_SKIPPED++)) || true
        return 0
    fi
    
    echo "Importing ${resource_name}..."
    
    if terraform state show "$resource_address" &>/dev/null; then
        echo -e "${GREEN}  Already imported: ${resource_name}${NC}"
        ((IMPORT_SUCCESS++)) || true
        return 0
    fi
    
    if terraform import -var-file=terraform.tfvars "$resource_address" "$resource_id" 2>/dev/null; then
        echo -e "${GREEN}  Success: ${resource_name}${NC}"
        ((IMPORT_SUCCESS++)) || true
    else
        echo -e "${RED}  Failed: ${resource_name}${NC}"
        ((IMPORT_FAILED++)) || true
    fi
    return 0
}

aws_query() {
    local result
    result=$("$@" 2>/dev/null) || echo ""
    echo "$result"
}

# 1. Secrets Manager
echo ""
echo "[1/11] Secrets Manager..."
echo "--------------------------------------------"

DB_PASSWORD_ARN=$(aws_query aws secretsmanager describe-secret --secret-id dev-db-password --query ARN --output text --region "$AWS_REGION")
import_resource "module.secrets.aws_secretsmanager_secret.db_password" "$DB_PASSWORD_ARN" "DB Password Secret"

DB_USERNAME_ARN=$(aws_query aws secretsmanager describe-secret --secret-id dev-db-username --query ARN --output text --region "$AWS_REGION")
import_resource "module.secrets.aws_secretsmanager_secret.db_username" "$DB_USERNAME_ARN" "DB Username Secret"

GRAFANA_PASSWORD_ARN=$(aws_query aws secretsmanager describe-secret --secret-id dev-grafana-admin-password --query ARN --output text --region "$AWS_REGION")
import_resource "aws_secretsmanager_secret.grafana_admin_password" "$GRAFANA_PASSWORD_ARN" "Grafana Admin Password"

# 2. RDS
echo ""
echo "[2/11] RDS..."
echo "--------------------------------------------"

RDS_INSTANCE=$(aws_query aws rds describe-db-instances --db-instance-identifier dev-db --query 'DBInstances[0].DBInstanceIdentifier' --output text --region "$AWS_REGION")
import_resource "module.rds.aws_db_instance.main" "$RDS_INSTANCE" "RDS Instance"

RDS_SUBNET_GROUP=$(aws_query aws rds describe-db-subnet-groups --db-subnet-group-name dev-db-subnet-group --query 'DBSubnetGroups[0].DBSubnetGroupName' --output text --region "$AWS_REGION")
import_resource "module.rds.aws_db_subnet_group.main" "$RDS_SUBNET_GROUP" "RDS Subnet Group"

RDS_PARAM_GROUP=$(aws_query aws rds describe-db-parameter-groups --db-parameter-group-name dev-db-params --query 'DBParameterGroups[0].DBParameterGroupName' --output text --region "$AWS_REGION")
import_resource "module.rds.aws_db_parameter_group.main" "$RDS_PARAM_GROUP" "RDS Parameter Group"

# 3. VPC
echo ""
echo "[3/11] VPC..."
echo "--------------------------------------------"

VPC_ID=$(aws_query aws ec2 describe-vpcs --filters "Name=tag:Name,Values=dev-vpc" --query "Vpcs[0].VpcId" --output text --region "$AWS_REGION")
import_resource "module.vpc.aws_vpc.main" "$VPC_ID" "VPC"

IGW_ID=$(aws_query aws ec2 describe-internet-gateways --filters "Name=tag:Name,Values=dev-igw" --query "InternetGateways[0].InternetGatewayId" --output text --region "$AWS_REGION")
import_resource "module.vpc.aws_internet_gateway.main" "$IGW_ID" "Internet Gateway"

for i in 0 1; do
    PUBLIC_SUBNET=$(aws_query aws ec2 describe-subnets --filters "Name=tag:Name,Values=dev-public-subnet-$i" --query "Subnets[0].SubnetId" --output text --region "$AWS_REGION")
    import_resource "module.vpc.aws_subnet.public[$i]" "$PUBLIC_SUBNET" "Public Subnet $i"
    
    PRIVATE_SUBNET=$(aws_query aws ec2 describe-subnets --filters "Name=tag:Name,Values=dev-private-subnet-$i" --query "Subnets[0].SubnetId" --output text --region "$AWS_REGION")
    import_resource "module.vpc.aws_subnet.private[$i]" "$PRIVATE_SUBNET" "Private Subnet $i"
done

for i in 0 1; do
    EIP_ALLOC=$(aws_query aws ec2 describe-addresses --filters "Name=tag:Name,Values=dev-nat-eip-$i" --query "Addresses[0].AllocationId" --output text --region "$AWS_REGION")
    import_resource "module.vpc.aws_eip.nat[$i]" "$EIP_ALLOC" "NAT EIP $i"
    
    if [ -n "$EIP_ALLOC" ] && [ "$EIP_ALLOC" != "None" ] && [ "$EIP_ALLOC" != "null" ]; then
        NAT_GW=$(aws_query aws ec2 describe-nat-gateways --filter "Name=allocation-id,Values=$EIP_ALLOC" "Name=state,Values=available,pending" --query "NatGateways[0].NatGatewayId" --output text --region "$AWS_REGION")
        import_resource "module.vpc.aws_nat_gateway.main[$i]" "$NAT_GW" "NAT Gateway $i"
    fi
done

PUBLIC_RT=$(aws_query aws ec2 describe-route-tables --filters "Name=tag:Name,Values=dev-public-rt" --query "RouteTables[0].RouteTableId" --output text --region "$AWS_REGION")
import_resource "module.vpc.aws_route_table.public" "$PUBLIC_RT" "Public Route Table"

for i in 0 1; do
    PRIVATE_RT=$(aws_query aws ec2 describe-route-tables --filters "Name=tag:Name,Values=dev-private-rt-$i" --query "RouteTables[0].RouteTableId" --output text --region "$AWS_REGION")
    import_resource "module.vpc.aws_route_table.private[$i]" "$PRIVATE_RT" "Private Route Table $i"
done

# 4. Security Groups
echo ""
echo "[4/11] Security Groups..."
echo "--------------------------------------------"

ALB_SG=$(aws_query aws ec2 describe-security-groups --filters "Name=tag:Name,Values=dev-alb-sg" --query "SecurityGroups[0].GroupId" --output text --region "$AWS_REGION")
import_resource "module.security.aws_security_group.alb" "$ALB_SG" "ALB Security Group"

ECS_SG=$(aws_query aws ec2 describe-security-groups --filters "Name=tag:Name,Values=dev-ecs-tasks-sg" --query "SecurityGroups[0].GroupId" --output text --region "$AWS_REGION")
import_resource "module.security.aws_security_group.ecs_tasks" "$ECS_SG" "ECS Tasks Security Group"

RDS_SG=$(aws_query aws ec2 describe-security-groups --filters "Name=tag:Name,Values=dev-rds-sg" --query "SecurityGroups[0].GroupId" --output text --region "$AWS_REGION")
import_resource "module.security.aws_security_group.rds" "$RDS_SG" "RDS Security Group"

# 5. ECR
echo ""
echo "[5/11] ECR Repositories..."
echo "--------------------------------------------"

FRONTEND_ECR=$(aws_query aws ecr describe-repositories --repository-names dev-frontend --query 'repositories[0].repositoryName' --output text --region "$AWS_REGION")
import_resource "module.ecr.aws_ecr_repository.frontend" "$FRONTEND_ECR" "Frontend ECR"

BACKEND_ECR=$(aws_query aws ecr describe-repositories --repository-names dev-backend --query 'repositories[0].repositoryName' --output text --region "$AWS_REGION")
import_resource "module.ecr.aws_ecr_repository.backend" "$BACKEND_ECR" "Backend ECR"

# 6. Application ALB
echo ""
echo "[6/11] Application ALB..."
echo "--------------------------------------------"

ALB_ARN=$(aws_query aws elbv2 describe-load-balancers --names dev-alb --query "LoadBalancers[0].LoadBalancerArn" --output text --region "$AWS_REGION")
import_resource "module.alb.aws_lb.main" "$ALB_ARN" "Application Load Balancer"

FRONTEND_TG_ARN=$(aws_query aws elbv2 describe-target-groups --names dev-frontend-tg --query "TargetGroups[0].TargetGroupArn" --output text --region "$AWS_REGION")
import_resource "module.alb.aws_lb_target_group.frontend" "$FRONTEND_TG_ARN" "Frontend Target Group"

BACKEND_TG_ARN=$(aws_query aws elbv2 describe-target-groups --names dev-backend-tg --query "TargetGroups[0].TargetGroupArn" --output text --region "$AWS_REGION")
import_resource "module.alb.aws_lb_target_group.backend" "$BACKEND_TG_ARN" "Backend Target Group"

if [ -n "$ALB_ARN" ] && [ "$ALB_ARN" != "None" ] && [ "$ALB_ARN" != "null" ]; then
    LISTENER_ARN=$(aws_query aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --query "Listeners[0].ListenerArn" --output text --region "$AWS_REGION")
    import_resource "module.alb.aws_lb_listener.http" "$LISTENER_ARN" "HTTP Listener"
fi

# 7. ECS Application Services
echo ""
echo "[7/11] ECS Application Services..."
echo "--------------------------------------------"

ECS_CLUSTER_NAME=$(aws_query aws ecs describe-clusters --clusters dev --query 'clusters[0].clusterName' --output text --region "$AWS_REGION")
import_resource "module.ecs.aws_ecs_cluster.main" "$ECS_CLUSTER_NAME" "ECS Cluster"

if [ -n "$ECS_CLUSTER_NAME" ] && [ "$ECS_CLUSTER_NAME" != "None" ] && [ "$ECS_CLUSTER_NAME" != "null" ]; then
    FRONTEND_SERVICE=$(aws_query aws ecs describe-services --cluster dev --services dev-frontend --query 'services[0].serviceName' --output text --region "$AWS_REGION")
    if [ -n "$FRONTEND_SERVICE" ] && [ "$FRONTEND_SERVICE" != "None" ] && [ "$FRONTEND_SERVICE" != "null" ]; then
        import_resource "module.ecs.aws_ecs_service.frontend" "dev/$FRONTEND_SERVICE" "Frontend ECS Service"
    fi
    
    BACKEND_SERVICE=$(aws_query aws ecs describe-services --cluster dev --services dev-backend --query 'services[0].serviceName' --output text --region "$AWS_REGION")
    if [ -n "$BACKEND_SERVICE" ] && [ "$BACKEND_SERVICE" != "None" ] && [ "$BACKEND_SERVICE" != "null" ]; then
        import_resource "module.ecs.aws_ecs_service.backend" "dev/$BACKEND_SERVICE" "Backend ECS Service"
    fi
fi

# 8. CloudWatch Log Groups
echo ""
echo "[8/11] CloudWatch Log Groups..."
echo "--------------------------------------------"

FRONTEND_LOGS=$(aws_query aws logs describe-log-groups --log-group-name-prefix "/ecs/dev-frontend" --query 'logGroups[0].logGroupName' --output text --region "$AWS_REGION")
import_resource "module.ecs.aws_cloudwatch_log_group.frontend" "$FRONTEND_LOGS" "Frontend Logs"

BACKEND_LOGS=$(aws_query aws logs describe-log-groups --log-group-name-prefix "/ecs/dev-backend" --query 'logGroups[0].logGroupName' --output text --region "$AWS_REGION")
import_resource "module.ecs.aws_cloudwatch_log_group.backend" "$BACKEND_LOGS" "Backend Logs"

PROMETHEUS_LOGS=$(aws_query aws logs describe-log-groups --log-group-name-prefix "/ecs/dev-prometheus" --query 'logGroups[0].logGroupName' --output text --region "$AWS_REGION")
import_resource "module.monitoring.aws_cloudwatch_log_group.prometheus" "$PROMETHEUS_LOGS" "Prometheus Logs"

GRAFANA_LOGS=$(aws_query aws logs describe-log-groups --log-group-name-prefix "/ecs/dev-grafana" --query 'logGroups[0].logGroupName' --output text --region "$AWS_REGION")
import_resource "module.monitoring.aws_cloudwatch_log_group.grafana" "$GRAFANA_LOGS" "Grafana Logs"

LOKI_LOGS=$(aws_query aws logs describe-log-groups --log-group-name-prefix "/ecs/dev-loki" --query 'logGroups[0].logGroupName' --output text --region "$AWS_REGION")
import_resource "module.monitoring.aws_cloudwatch_log_group.loki" "$LOKI_LOGS" "Loki Logs"

# 9. Service Discovery
echo ""
echo "[9/11] Service Discovery..."
echo "--------------------------------------------"

NAMESPACE_ID=$(aws_query aws servicediscovery list-namespaces --query "Namespaces[?Name=='dev.local'].Id | [0]" --output text --region "$AWS_REGION")
import_resource "module.ecs.aws_service_discovery_private_dns_namespace.main" "$NAMESPACE_ID" "Service Discovery Namespace"

# 10. IAM Roles
echo ""
echo "[10/11] IAM Roles..."
echo "--------------------------------------------"

ECS_TASK_EXEC_ROLE=$(aws_query aws iam get-role --role-name dev-ecs-task-execution-role --query 'Role.RoleName' --output text)
import_resource "module.ecs.aws_iam_role.ecs_task_execution" "$ECS_TASK_EXEC_ROLE" "ECS Task Execution Role"

ECS_TASK_ROLE=$(aws_query aws iam get-role --role-name dev-ecs-task-role --query 'Role.RoleName' --output text)
import_resource "module.ecs.aws_iam_role.ecs_task" "$ECS_TASK_ROLE" "ECS Task Role"

# 11. Monitoring Stack
echo ""
echo "[11/11] Monitoring Stack..."
echo "--------------------------------------------"

MONITORING_ALB_ARN=$(aws_query aws elbv2 describe-load-balancers --names dev-monitoring-alb --query "LoadBalancers[0].LoadBalancerArn" --output text --region "$AWS_REGION")
import_resource "module.monitoring.aws_lb.monitoring" "$MONITORING_ALB_ARN" "Monitoring ALB"

PROMETHEUS_TG_ARN=$(aws_query aws elbv2 describe-target-groups --names dev-prometheus-tg --query "TargetGroups[0].TargetGroupArn" --output text --region "$AWS_REGION")
import_resource "module.monitoring.aws_lb_target_group.prometheus" "$PROMETHEUS_TG_ARN" "Prometheus Target Group"

GRAFANA_TG_ARN=$(aws_query aws elbv2 describe-target-groups --names dev-grafana-tg --query "TargetGroups[0].TargetGroupArn" --output text --region "$AWS_REGION")
import_resource "module.monitoring.aws_lb_target_group.grafana" "$GRAFANA_TG_ARN" "Grafana Target Group"

LOKI_TG_ARN=$(aws_query aws elbv2 describe-target-groups --names dev-loki-tg --query "TargetGroups[0].TargetGroupArn" --output text --region "$AWS_REGION")
import_resource "module.monitoring.aws_lb_target_group.loki" "$LOKI_TG_ARN" "Loki Target Group"

if [ -n "$MONITORING_ALB_ARN" ] && [ "$MONITORING_ALB_ARN" != "None" ] && [ "$MONITORING_ALB_ARN" != "null" ]; then
    MONITORING_LISTENER_ARN=$(aws_query aws elbv2 describe-listeners --load-balancer-arn "$MONITORING_ALB_ARN" --query "Listeners[0].ListenerArn" --output text --region "$AWS_REGION")
    import_resource "module.monitoring.aws_lb_listener.monitoring" "$MONITORING_LISTENER_ARN" "Monitoring HTTP Listener"
fi

MONITORING_SG=$(aws_query aws ec2 describe-security-groups --filters "Name=group-name,Values=dev-monitoring-*" --query "SecurityGroups[0].GroupId" --output text --region "$AWS_REGION")
import_resource "module.monitoring.aws_security_group.monitoring" "$MONITORING_SG" "Monitoring Security Group"

EFS_SG=$(aws_query aws ec2 describe-security-groups --filters "Name=group-name,Values=dev-efs-*" --query "SecurityGroups[0].GroupId" --output text --region "$AWS_REGION")
import_resource "module.monitoring.aws_security_group.efs" "$EFS_SG" "EFS Security Group"

EFS_ID=$(aws_query aws efs describe-file-systems --query "FileSystems[?Name=='dev-monitoring-efs'].FileSystemId | [0]" --output text --region "$AWS_REGION")
import_resource "module.monitoring.aws_efs_file_system.monitoring" "$EFS_ID" "Monitoring EFS"

if [ -n "$EFS_ID" ] && [ "$EFS_ID" != "None" ] && [ "$EFS_ID" != "null" ]; then
    MOUNT_TARGETS=$(aws_query aws efs describe-mount-targets --file-system-id "$EFS_ID" --query "MountTargets[*].MountTargetId" --output text --region "$AWS_REGION")
    i=0
    for MT_ID in $MOUNT_TARGETS; do
        import_resource "module.monitoring.aws_efs_mount_target.monitoring[$i]" "$MT_ID" "EFS Mount Target $i"
        ((i++)) || true
    done
fi

if [ -n "$ECS_CLUSTER_NAME" ] && [ "$ECS_CLUSTER_NAME" != "None" ] && [ "$ECS_CLUSTER_NAME" != "null" ]; then
    PROMETHEUS_SERVICE=$(aws_query aws ecs describe-services --cluster dev --services dev-prometheus --query 'services[0].serviceName' --output text --region "$AWS_REGION")
    if [ -n "$PROMETHEUS_SERVICE" ] && [ "$PROMETHEUS_SERVICE" != "None" ] && [ "$PROMETHEUS_SERVICE" != "null" ]; then
        import_resource "module.monitoring.aws_ecs_service.prometheus" "dev/$PROMETHEUS_SERVICE" "Prometheus ECS Service"
    fi
    
    GRAFANA_SERVICE=$(aws_query aws ecs describe-services --cluster dev --services dev-grafana --query 'services[0].serviceName' --output text --region "$AWS_REGION")
    if [ -n "$GRAFANA_SERVICE" ] && [ "$GRAFANA_SERVICE" != "None" ] && [ "$GRAFANA_SERVICE" != "null" ]; then
        import_resource "module.monitoring.aws_ecs_service.grafana" "dev/$GRAFANA_SERVICE" "Grafana ECS Service"
    fi
    
    LOKI_SERVICE=$(aws_query aws ecs describe-services --cluster dev --services dev-loki --query 'services[0].serviceName' --output text --region "$AWS_REGION")
    if [ -n "$LOKI_SERVICE" ] && [ "$LOKI_SERVICE" != "None" ] && [ "$LOKI_SERVICE" != "null" ]; then
        import_resource "module.monitoring.aws_ecs_service.loki" "dev/$LOKI_SERVICE" "Loki ECS Service"
    fi
fi

if [ -n "$NAMESPACE_ID" ] && [ "$NAMESPACE_ID" != "None" ] && [ "$NAMESPACE_ID" != "null" ]; then
    PROMETHEUS_SD=$(aws_query aws servicediscovery list-services --filters "Name=NAMESPACE_ID,Values=$NAMESPACE_ID" --query "Services[?Name=='prometheus'].Id | [0]" --output text --region "$AWS_REGION")
    import_resource "module.monitoring.aws_service_discovery_service.prometheus" "$PROMETHEUS_SD" "Prometheus Service Discovery"
    
    GRAFANA_SD=$(aws_query aws servicediscovery list-services --filters "Name=NAMESPACE_ID,Values=$NAMESPACE_ID" --query "Services[?Name=='grafana'].Id | [0]" --output text --region "$AWS_REGION")
    import_resource "module.monitoring.aws_service_discovery_service.grafana" "$GRAFANA_SD" "Grafana Service Discovery"
    
    LOKI_SD=$(aws_query aws servicediscovery list-services --filters "Name=NAMESPACE_ID,Values=$NAMESPACE_ID" --query "Services[?Name=='loki'].Id | [0]" --output text --region "$AWS_REGION")
    import_resource "module.monitoring.aws_service_discovery_service.loki" "$LOKI_SD" "Loki Service Discovery"
fi

# Summary
echo ""
echo "============================================"
echo -e "${GREEN}Import Complete${NC}"
echo "============================================"
echo ""
echo "Summary:"
echo "  Successful: $IMPORT_SUCCESS"
echo "  Skipped:    $IMPORT_SKIPPED"
echo "  Failed:     $IMPORT_FAILED"
echo ""
echo "Next steps:"
echo "  1. terraform plan"
echo "  2. Review the plan"
echo "  3. terraform apply"

exit 0
