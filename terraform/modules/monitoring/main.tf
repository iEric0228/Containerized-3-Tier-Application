# EFS File System for persistent storage (Prometheus, Grafana, Loki data)
resource "aws_efs_file_system" "monitoring" {
  creation_token = "${var.name_prefix}-monitoring-efs"
  encrypted      = true

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.name_prefix}-monitoring-efs"
    }
  )
}

# EFS Mount Targets in each private subnet
resource "aws_efs_mount_target" "monitoring" {
  count           = length(var.private_subnet_ids)
  file_system_id  = aws_efs_file_system.monitoring.id
  subnet_id       = var.private_subnet_ids[count.index]
  security_groups = [aws_security_group.efs.id]
}

# Security Group for EFS
resource "aws_security_group" "efs" {
  name_prefix = "${var.name_prefix}-efs-"
  description = "Security group for EFS mount targets"
  vpc_id      = var.vpc_id

  # Allow NFS from application ECS tasks (backend/frontend)
  ingress {
    description     = "NFS from application ECS tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [var.ecs_task_security_group_id]
  }

  # Allow NFS from monitoring services (Prometheus, Grafana, Loki)
  ingress {
    description     = "NFS from monitoring services"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.monitoring.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.name_prefix}-efs-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for Monitoring Services
resource "aws_security_group" "monitoring" {
  name_prefix = "${var.name_prefix}-monitoring-"
  description = "Security group for monitoring services"
  vpc_id      = var.vpc_id

  # Prometheus from ALB
  ingress {
    description     = "Prometheus from ALB"
    from_port       = 9090
    to_port         = 9090
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  # Prometheus from ECS tasks (for backend proxy queries)
  ingress {
    description     = "Prometheus from ECS tasks"
    from_port       = 9090
    to_port         = 9090
    protocol        = "tcp"
    security_groups = [var.ecs_task_security_group_id]
  }

  # Grafana
  ingress {
    description     = "Grafana from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  # Loki
  ingress {
    description     = "Loki from ECS tasks"
    from_port       = 3100
    to_port         = 3100
    protocol        = "tcp"
    security_groups = [var.ecs_task_security_group_id]
  }

  # Allow monitoring services to talk to each other
  ingress {
    description = "Internal monitoring communication"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.name_prefix}-monitoring-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Security group rule to allow Prometheus to scrape backend metrics
resource "aws_security_group_rule" "prometheus_to_backend" {
  type                     = "ingress"
  from_port                = 3001
  to_port                  = 3001
  protocol                 = "tcp"
  security_group_id        = var.ecs_task_security_group_id
  source_security_group_id = aws_security_group.monitoring.id
  description              = "Prometheus metrics scraping from monitoring"
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "prometheus" {
  name              = "/ecs/${var.name_prefix}/prometheus"
  retention_in_days = 7

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "grafana" {
  name              = "/ecs/${var.name_prefix}/grafana"
  retention_in_days = 7

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "loki" {
  name              = "/ecs/${var.name_prefix}/loki"
  retention_in_days = 7

  tags = var.common_tags
}

# Service Discovery for Prometheus
resource "aws_service_discovery_service" "prometheus" {
  name = "prometheus"

  dns_config {
    namespace_id = var.service_discovery_namespace_id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    # Note: failure_threshold is deprecated and always set to 1 by AWS
  }

  tags = var.common_tags
}

# Service Discovery for Loki
resource "aws_service_discovery_service" "loki" {
  name = "loki"

  dns_config {
    namespace_id = var.service_discovery_namespace_id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    # Note: failure_threshold is deprecated and always set to 1 by AWS
  }

  tags = var.common_tags
}

# Service Discovery for Grafana
resource "aws_service_discovery_service" "grafana" {
  name = "grafana"

  dns_config {
    namespace_id = var.service_discovery_namespace_id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    # Note: failure_threshold is deprecated and always set to 1 by AWS
  }

  tags = var.common_tags
}

# ECS Task Definition for Loki
resource "aws_ecs_task_definition" "loki" {
  family                   = "${var.name_prefix}-loki"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  volume {
    name = "loki-data"

    efs_volume_configuration {
      file_system_id          = aws_efs_file_system.monitoring.id
      root_directory          = "/"
      transit_encryption      = "ENABLED"
      transit_encryption_port = 2049

      authorization_config {
        iam = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "loki"
      image     = "grafana/loki:2.9.3"
      essential = true
      user      = "0:0" # Run as root to have permissions on EFS

      portMappings = [
        {
          containerPort = 3100
          protocol      = "tcp"
        }
      ]

      command = ["-config.file=/etc/loki/local-config.yaml"]

      mountPoints = [
        {
          sourceVolume  = "loki-data"
          containerPath = "/loki"
          readOnly      = false
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.loki.name
          "awslogs-region"        = data.aws_region.current.id
          "awslogs-stream-prefix" = "loki"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3100/ready || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = var.common_tags
}

# Local variable for Prometheus config - uses service discovery DNS names
locals {
  prometheus_config = <<-EOT
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'aws-ecs'
    environment: '${var.name_prefix}'

scrape_configs:
  # Scrape Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
        labels:
          service: 'prometheus'
          tier: 'monitoring'
    metrics_path: '/prometheus/metrics'

  # Scrape Backend API metrics (via service discovery DNS)
  - job_name: 'backend-api'
    static_configs:
      - targets: ['backend.${var.service_discovery_namespace_name}:3001']
        labels:
          service: 'backend'
          tier: 'backend'
          app: '3-tier-app'
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  # Scrape Loki metrics
  - job_name: 'loki'
    static_configs:
      - targets: ['loki.${var.service_discovery_namespace_name}:3100']
        labels:
          service: 'loki'
          tier: 'monitoring'
    metrics_path: '/metrics'

  # Scrape Grafana metrics
  - job_name: 'grafana'
    static_configs:
      - targets: ['grafana.${var.service_discovery_namespace_name}:3000']
        labels:
          service: 'grafana'
          tier: 'monitoring'
    metrics_path: '/metrics'
EOT

  grafana_datasources = <<-EOT
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus.${var.service_discovery_namespace_name}:9090
    isDefault: true
    editable: false
    jsonData:
      httpMethod: POST
      manageAlerts: true
      prometheusType: Prometheus
      
  - name: Loki
    type: loki
    access: proxy
    url: http://loki.${var.service_discovery_namespace_name}:3100
    editable: false
    jsonData:
      maxLines: 1000
EOT
}

# ECS Task Definition for Prometheus
resource "aws_ecs_task_definition" "prometheus" {
  family                   = "${var.name_prefix}-prometheus"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  volume {
    name = "prometheus-data"

    efs_volume_configuration {
      file_system_id          = aws_efs_file_system.monitoring.id
      root_directory          = "/"
      transit_encryption      = "ENABLED"
      transit_encryption_port = 2049

      authorization_config {
        iam = "ENABLED"
      }
    }
  }

  volume {
    name = "prometheus-config"
  }

  container_definitions = jsonencode([
    # Init container to write Prometheus config
    {
      name      = "config-init"
      image     = "busybox:1.36"
      essential = false
      user      = "0:0"

      command = [
        "sh", "-c",
        "echo '${base64encode(local.prometheus_config)}' | base64 -d > /config/prometheus.yml && cat /config/prometheus.yml && echo 'Config written successfully'"
      ]

      mountPoints = [
        {
          sourceVolume  = "prometheus-config"
          containerPath = "/config"
          readOnly      = false
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.prometheus.name
          "awslogs-region"        = data.aws_region.current.id
          "awslogs-stream-prefix" = "prometheus-init"
        }
      }
    },
    # Main Prometheus container
    {
      name      = "prometheus"
      image     = "prom/prometheus:v2.48.1"
      essential = true
      user      = "0:0" # Run as root to have permissions on EFS

      dependsOn = [
        {
          containerName = "config-init"
          condition     = "SUCCESS"
        }
      ]

      portMappings = [
        {
          containerPort = 9090
          protocol      = "tcp"
        }
      ]

      command = [
        "--config.file=/config/prometheus.yml",
        "--storage.tsdb.path=/prometheus/data-v3",
        "--web.console.libraries=/usr/share/prometheus/console_libraries",
        "--web.console.templates=/usr/share/prometheus/consoles",
        "--web.enable-lifecycle",
        "--web.external-url=/prometheus",
        "--web.route-prefix=/prometheus"
      ]

      mountPoints = [
        {
          sourceVolume  = "prometheus-data"
          containerPath = "/prometheus"
          readOnly      = false
        },
        {
          sourceVolume  = "prometheus-config"
          containerPath = "/config"
          readOnly      = true
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.prometheus.name
          "awslogs-region"        = data.aws_region.current.id
          "awslogs-stream-prefix" = "prometheus"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:9090/prometheus/-/healthy || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = var.common_tags
}

# ECS Task Definition for Grafana
resource "aws_ecs_task_definition" "grafana" {
  family                   = "${var.name_prefix}-grafana"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  volume {
    name = "grafana-data"

    efs_volume_configuration {
      file_system_id          = aws_efs_file_system.monitoring.id
      root_directory          = "/"
      transit_encryption      = "ENABLED"
      transit_encryption_port = 2049

      authorization_config {
        iam = "ENABLED"
      }
    }
  }

  volume {
    name = "grafana-provisioning"
  }

  container_definitions = jsonencode([
    # Init container to write Grafana datasources config
    {
      name      = "datasources-init"
      image     = "busybox:1.36"
      essential = false
      user      = "0:0"

      command = [
        "sh", "-c",
        "mkdir -p /provisioning/datasources && echo '${base64encode(local.grafana_datasources)}' | base64 -d > /provisioning/datasources/datasources.yml && cat /provisioning/datasources/datasources.yml && echo 'Datasources config written successfully'"
      ]

      mountPoints = [
        {
          sourceVolume  = "grafana-provisioning"
          containerPath = "/provisioning"
          readOnly      = false
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.grafana.name
          "awslogs-region"        = data.aws_region.current.id
          "awslogs-stream-prefix" = "grafana-init"
        }
      }
    },
    # Main Grafana container
    {
      name      = "grafana"
      image     = "grafana/grafana:10.2.3"
      essential = true
      user      = "0:0" # Run as root to have permissions on EFS

      dependsOn = [
        {
          containerName = "datasources-init"
          condition     = "SUCCESS"
        }
      ]

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "GF_SERVER_ROOT_URL"
          value = "http://localhost:3000"
        },
        {
          name  = "GF_INSTALL_PLUGINS"
          value = "grafana-clock-panel"
        },
        {
          name  = "GF_PATHS_PROVISIONING"
          value = "/provisioning"
        }
      ]

      secrets = [
        {
          name      = "GF_SECURITY_ADMIN_PASSWORD"
          valueFrom = var.grafana_admin_password_secret_arn
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "grafana-data"
          containerPath = "/var/lib/grafana"
          readOnly      = false
        },
        {
          sourceVolume  = "grafana-provisioning"
          containerPath = "/provisioning"
          readOnly      = true
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.grafana.name
          "awslogs-region"        = data.aws_region.current.id
          "awslogs-stream-prefix" = "grafana"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = var.common_tags
}

# ECS Service for Loki
resource "aws_ecs_service" "loki" {
  name            = "${var.name_prefix}-loki"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.loki.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.monitoring.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.loki.arn
  }

  depends_on = [aws_efs_mount_target.monitoring]

  tags = var.common_tags
}

# ECS Service for Prometheus
resource "aws_ecs_service" "prometheus" {
  name            = "${var.name_prefix}-prometheus"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.prometheus.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.monitoring.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.prometheus.arn
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.prometheus.arn
    container_name   = "prometheus"
    container_port   = 9090
  }

  depends_on = [
    aws_efs_mount_target.monitoring,
    aws_lb_listener.monitoring
  ]

  tags = var.common_tags
}

# ECS Service for Grafana
resource "aws_ecs_service" "grafana" {
  name            = "${var.name_prefix}-grafana"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.grafana.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.monitoring.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.grafana.arn
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.grafana.arn
    container_name   = "grafana"
    container_port   = 3000
  }

  depends_on = [
    aws_efs_mount_target.monitoring,
    aws_lb_listener.monitoring
  ]

  tags = var.common_tags
}

# Application Load Balancer for Monitoring
resource "aws_lb" "monitoring" {
  name               = "${var.name_prefix}-monitoring-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false

  tags = merge(
    var.common_tags,
    {
      Name = "${var.name_prefix}-monitoring-alb"
    }
  )
}

# Target Group for Prometheus
resource "aws_lb_target_group" "prometheus" {
  name        = "${var.name_prefix}-prometheus-tg"
  port        = 9090
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/prometheus/-/healthy"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  deregistration_delay = 30

  tags = var.common_tags
}

# Target Group for Grafana
resource "aws_lb_target_group" "grafana" {
  name        = "${var.name_prefix}-grafana-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  deregistration_delay = 30

  tags = var.common_tags
}

# ALB Listener
resource "aws_lb_listener" "monitoring" {
  load_balancer_arn = aws_lb.monitoring.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Monitoring Stack - Use /grafana or /prometheus"
      status_code  = "200"
    }
  }

  tags = var.common_tags
}

# Listener Rule for Grafana
resource "aws_lb_listener_rule" "grafana" {
  listener_arn = aws_lb_listener.monitoring.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grafana.arn
  }

  condition {
    path_pattern {
      values = ["/grafana*", "/"]
    }
  }

  tags = var.common_tags
}

# Listener Rule for Prometheus
resource "aws_lb_listener_rule" "prometheus" {
  listener_arn = aws_lb_listener.monitoring.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.prometheus.arn
  }

  condition {
    path_pattern {
      values = ["/prometheus*"]
    }
  }

  tags = var.common_tags
}

# Data source for current region
data "aws_region" "current" {}
