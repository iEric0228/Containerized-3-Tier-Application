output "db_endpoint" {
  description = "The endpoint of the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "db_identifier" {
  description = "The RDS instance identifier"
  value       = aws_db_instance.main.id
}