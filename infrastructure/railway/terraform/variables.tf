variable "cors_origins" {
  description = "Comma-separated list of allowed CORS origins"
  type        = string
  default     = "*"
}

variable "railway_token" {
  description = "Railway API token"
  type        = string
  sensitive   = true
  default     = "" # Will be read from RAILWAY_TOKEN env var
}

