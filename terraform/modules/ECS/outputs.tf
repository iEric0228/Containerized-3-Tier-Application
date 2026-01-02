output "frontend_service_arn" {
  description = "ARN of the frontend ECS service"
  value       = aws_ecs_service.frontend.arn
}

output "backend_service_arn" {
  description = "ARN of the backend ECS service"
  value       = aws_ecs_service.backend.arn
}

output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "frontend_task_definition_arn" {
  description = "ARN of the frontend ECS task definition"
  value       = aws_ecs_task_definition.frontend.arn
}

output "backend_task_definition_arn" {
  description = "ARN of the backend ECS task definition"
  value       = aws_ecs_task_definition.backend.arn
}