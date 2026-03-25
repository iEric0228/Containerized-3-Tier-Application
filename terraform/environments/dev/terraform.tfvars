aws_region             = "us-east-1"
vpc_cidr               = "10.0.0.0/16"
name_prefix            = "dev"
frontend_port          = 3000
backend_port           = 3001
db_name                = "myappdb"
db_username            = "myappuser"
# Use TF_VAR_db_password and TF_VAR_grafana_admin_password env vars instead of hardcoding passwords here.
availability_zones     = ["us-east-1a", "us-east-1b"]
common_tags = {
  Environment = "dev"
  Project     = "3-Tier-App"
}