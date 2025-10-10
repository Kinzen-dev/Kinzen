# Production environment configuration
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../modules/railway"
}

inputs = {
  environment   = "production"
  cors_origins  = "https://kinzen-frontend-3s2c9g2fo-kinzens-projects-29b3d6f7.vercel.app"
  
  # Override specific settings for production
  node_env = "production"
}

