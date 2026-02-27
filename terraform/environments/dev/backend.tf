terraform {
  backend "s3" {
    bucket         = "ericchiu-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}

# NOTE: Local state files (terraform.tfstate, terraform.tfstate.backup, terraform.tfstate.d/)
# exist in this directory, indicating state has not yet been migrated to the remote backend.
# After updating this backend config, run:
#   terraform init -migrate-state
# to migrate local state to the S3 backend above.