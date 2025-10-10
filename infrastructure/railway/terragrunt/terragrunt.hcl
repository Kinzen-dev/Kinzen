# Root Terragrunt configuration
locals {
  # Get environment from the current directory name
  env = basename(get_terragrunt_dir())
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
# Provider configuration is handled by the module
EOF
}

# Input variables
inputs = {
  environment = local.env
}

