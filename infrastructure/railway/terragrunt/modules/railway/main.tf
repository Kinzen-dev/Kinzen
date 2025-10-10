terraform {
  required_version = ">= 1.0"
  
  required_providers {
    railway = {
      source  = "terraform-community-providers/railway"
      version = "~> 0.3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "railway" {
  # Token will be read from RAILWAY_TOKEN environment variable
}

# Generate JWT secrets
resource "random_password" "jwt_secret" {
  length  = 32
  special = true
}

resource "random_password" "jwt_refresh_secret" {
  length  = 32
  special = true
}

# Create Railway project
resource "railway_project" "kinzen" {
  name        = "kinzen-backend-${var.environment}"
  description = "Kinzen Backend API - ${var.environment}"
}

# Create PostgreSQL database
resource "railway_service" "postgres" {
  project_id = railway_project.kinzen.id
  name       = "postgres"
  source = {
    image = "postgres:16-alpine"
  }
}

# Create backend service
resource "railway_service" "backend" {
  project_id = railway_project.kinzen.id
  name       = "kinzen-backend"
  
  source = {
    repo   = var.github_repo
    branch = var.github_branch
    root_directory = "backend"
  }

  # Environment variables
  variables = {
    NODE_ENV              = var.node_env
    PORT                  = var.port
    API_PREFIX            = var.api_prefix
    JWT_SECRET            = random_password.jwt_secret.result
    JWT_REFRESH_SECRET    = random_password.jwt_refresh_secret.result
    JWT_EXPIRES_IN        = var.jwt_expires_in
    JWT_REFRESH_EXPIRES_IN = var.jwt_refresh_expires_in
    CORS_ORIGINS          = var.cors_origins
  }

  # Reference PostgreSQL DATABASE_URL
  depends_on = [railway_service.postgres]
}

# Link database to backend
resource "railway_service_instance_variable" "database_url" {
  project_id = railway_project.kinzen.id
  service_id = railway_service.backend.id
  name       = "DATABASE_URL"
  value      = railway_service.postgres.database_url
}
