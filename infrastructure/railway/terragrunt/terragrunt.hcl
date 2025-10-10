# Root Terragrunt configuration
locals {
  # Load environment-specific variables
  environment_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  env              = local.environment_vars.locals.environment
  
  # Common tags
  common_tags = {
    Project     = "Kinzen"
    ManagedBy   = "Terragrunt"
    Environment = local.env
  }
}

# Configure Terraform backend for state management
remote_state {
  backend = "local"
  config = {
    path = "${get_parent_terragrunt_dir()}/terraform.tfstate.d/${local.env}/terraform.tfstate"
  }
  
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

# Generate provider configuration
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "railway" {
  # Token from RAILWAY_TOKEN environment variable
}

provider "random" {
  # Random provider for generating secrets
}
EOF
}

# Input variables
inputs = merge(
  local.common_tags,
  {
    environment = local.env
  }
)

