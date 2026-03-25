# KMS key for encrypting all secrets
resource "aws_kms_key" "secrets" {
  description             = "${var.name_prefix} Secrets Manager encryption key"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                    = var.common_tags
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.name_prefix}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# --- Database password ---
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.name_prefix}-db-password"
  description             = "RDS PostgreSQL password"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = var.recovery_window_days
  tags                    = var.common_tags
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

# --- Database username ---
resource "aws_secretsmanager_secret" "db_username" {
  name                    = "${var.name_prefix}-db-username"
  description             = "RDS PostgreSQL username"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = var.recovery_window_days
  tags                    = var.common_tags
}

resource "aws_secretsmanager_secret_version" "db_username" {
  secret_id     = aws_secretsmanager_secret.db_username.id
  secret_string = var.db_username
}

# --- Database name ---
resource "aws_secretsmanager_secret" "db_name" {
  name                    = "${var.name_prefix}-db-name"
  description             = "RDS PostgreSQL database name"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = var.recovery_window_days
  tags                    = var.common_tags
}

resource "aws_secretsmanager_secret_version" "db_name" {
  secret_id     = aws_secretsmanager_secret.db_name.id
  secret_string = var.db_name
}

# --- Grafana admin password ---
resource "aws_secretsmanager_secret" "grafana_admin_password" {
  name                    = "${var.name_prefix}-grafana-admin-password"
  description             = "Grafana admin password"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = var.recovery_window_days
  tags                    = var.common_tags
}

resource "aws_secretsmanager_secret_version" "grafana_admin_password" {
  secret_id     = aws_secretsmanager_secret.grafana_admin_password.id
  secret_string = var.grafana_admin_password
}

# --- Optional automatic rotation ---
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
