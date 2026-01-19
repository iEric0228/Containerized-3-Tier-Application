resource "aws_secretsmanager_secret" "db_password" {
  name        = "${var.name_prefix}-db-password"
  description = "RDS PostgreSQL password"
  tags        = var.common_tags
  # Rotation is managed by aws_secretsmanager_secret_rotation below
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

resource "aws_secretsmanager_secret" "db_username" {
  name        = "${var.name_prefix}-db-username"
  description = "RDS PostgreSQL username"
  tags        = var.common_tags
  # Rotation is managed by aws_secretsmanager_secret_rotation below
}

resource "aws_secretsmanager_secret_version" "db_username" {
  secret_id     = aws_secretsmanager_secret.db_username.id
  secret_string = var.db_username
}

resource "aws_secretsmanager_secret" "grafana_admin_password" {
  name        = "${var.name_prefix}-grafana-admin-password"
  description = "Grafana admin password"
  tags        = var.common_tags
  # Rotation is managed by aws_secretsmanager_secret_rotation below
}

resource "aws_secretsmanager_secret_version" "grafana_admin_password" {
  secret_id     = aws_secretsmanager_secret.grafana_admin_password.id
  secret_string = var.grafana_admin_password
}

# Enable rotation for secrets if lambda ARN is provided
resource "aws_secretsmanager_secret_rotation" "db_password" {
  count               = var.rotation_lambda_arn != null && var.rotation_lambda_arn != "" ? 1 : 0
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_lambda_arn = var.rotation_lambda_arn
  rotation_rules {
    automatically_after_days = var.rotation_days
  }
}

resource "aws_secretsmanager_secret_rotation" "db_username" {
  count               = var.rotation_lambda_arn != null && var.rotation_lambda_arn != "" ? 1 : 0
  secret_id           = aws_secretsmanager_secret.db_username.id
  rotation_lambda_arn = var.rotation_lambda_arn
  rotation_rules {
    automatically_after_days = var.rotation_days
  }
}

resource "aws_secretsmanager_secret_rotation" "grafana_admin_password" {
  count               = var.rotation_lambda_arn != null && var.rotation_lambda_arn != "" ? 1 : 0
  secret_id           = aws_secretsmanager_secret.grafana_admin_password.id
  rotation_lambda_arn = var.rotation_lambda_arn
  rotation_rules {
    automatically_after_days = var.rotation_days
  }
}