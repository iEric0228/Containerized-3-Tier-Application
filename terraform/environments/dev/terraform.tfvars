aws_region             = "us-east-1"
vpc_cidr               = "10.0.0.0/16"
name_prefix            = "dev"
frontend_port          = 3000
backend_port           = 3001
db_name                = "myappdb"
db_username            = "myappuser"
# PLACEHOLDER — must be overridden via -var="db_password=..." or TF_VAR_db_password env var in CI/CD.
# Never commit a real password here.
db_password            = "CHANGE_ME_USE_CI_SECRET"
# PLACEHOLDER — must be overridden via -var="grafana_admin_password=..." or TF_VAR_grafana_admin_password in CI/CD.
# Never commit a real password here.
grafana_admin_password = "CHANGE_ME_USE_CI_SECRET"
availability_zones     = ["us-east-1a", "us-east-1b"]
common_tags = {
  Environment = "dev"
  Project     = "3-Tier-App"
}