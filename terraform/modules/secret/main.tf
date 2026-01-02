resource "aws_secretsmanager_secret" "db_password" {
  name        = "${var.name_prefix}-db-password"
  description = "RDS PostgreSQL password"
  tags        = var.common_tags
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

resource "aws_secretsmanager_secret" "db_username" {
  name        = "${var.name_prefix}-db-username"
  description = "RDS PostgreSQL username"
  tags        = var.common_tags
}

resource "aws_secretsmanager_secret_version" "db_username" {
  secret_id     = aws_secretsmanager_secret.db_username.id
  secret_string = var.db_username
}