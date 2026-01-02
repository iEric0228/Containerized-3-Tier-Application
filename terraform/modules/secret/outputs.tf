output "db_password_secret_arn" {
  description = "ARN of the DB password secret"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "db_username_secret_arn" {
  description = "ARN of the DB username secret"
  value       = aws_secretsmanager_secret.db_username.arn
}