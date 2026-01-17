terraform {
  backend "s3" {
    bucket         = "containerized-3-tier-application"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock-3-tier"
    encrypt        = true
  }
}