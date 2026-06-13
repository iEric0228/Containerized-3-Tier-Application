output "db_password_secret_arn" {
  description = "ARN of the DB password secret"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "db_password_value" {
  description = "The DB password value (from the secret version)"
  value       = aws_secretsmanager_secret_version.db_password.secret_string
  sensitive   = true
}

output "db_username_secret_arn" {
  description = "ARN of the DB username secret"
  value       = aws_secretsmanager_secret.db_username.arn
}

output "db_name_secret_arn" {
  description = "ARN of the DB name secret"
  value       = aws_secretsmanager_secret.db_name.arn
}

output "grafana_admin_password_secret_arn" {
  description = "ARN of the Grafana admin password secret"
  value       = aws_secretsmanager_secret.grafana_admin_password.arn
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for secret encryption"
  value       = aws_kms_key.secrets.arn
}

output "kms_key_id" {
  description = "ID of the KMS key used for secret encryption"
  value       = aws_kms_key.secrets.key_id
}
