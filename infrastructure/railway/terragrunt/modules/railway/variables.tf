variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = "Kinzen-dev/Kinzen"
}

variable "github_branch" {
  description = "GitHub branch to deploy from"
  type        = string
  default     = "main"
}

variable "node_env" {
  description = "Node.js environment"
  type        = string
  default     = "production"
}

variable "port" {
  description = "Application port"
  type        = string
  default     = "3001"
}

variable "api_prefix" {
  description = "API prefix"
  type        = string
  default     = "api/v1"
}

variable "jwt_expires_in" {
  description = "JWT token expiration time"
  type        = string
  default     = "15m"
}

variable "jwt_refresh_expires_in" {
  description = "JWT refresh token expiration time"
  type        = string
  default     = "7d"
}

variable "cors_origins" {
  description = "Comma-separated list of allowed CORS origins"
  type        = string
  default     = "*"
}
