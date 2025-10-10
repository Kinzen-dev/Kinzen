output "project_id" {
  description = "Railway project ID"
  value       = railway_project.kinzen.id
}

output "backend_service_id" {
  description = "Backend service ID"
  value       = railway_service.backend.id
}

output "postgres_service_id" {
  description = "PostgreSQL service ID"
  value       = railway_service.postgres.id
}

output "backend_url" {
  description = "Backend service URL"
  value       = railway_service.backend.url
}

output "jwt_secret" {
  description = "Generated JWT secret (sensitive)"
  value       = random_password.jwt_secret.result
  sensitive   = true
}

output "jwt_refresh_secret" {
  description = "Generated JWT refresh secret (sensitive)"
  value       = random_password.jwt_refresh_secret.result
  sensitive   = true
}

