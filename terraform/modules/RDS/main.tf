resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnet-group"
  subnet_ids = var.private_subnet_ids
  tags       = var.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "main" {
  identifier              = "${var.name_prefix}-db"
  engine                  = "postgres"
  engine_version          = "15.18"
  instance_class          = "db.t3.micro"
  db_name                 = var.db_name
  allocated_storage       = 20
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [var.rds_sg_id]
  storage_encrypted       = true
  skip_final_snapshot     = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.db_name}-final-${formatdate("YYYYMMDD", timestamp())}"
  multi_az                = var.multi_az
  backup_retention_period = var.multi_az ? 7 : 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  tags                    = var.common_tags

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [password] # Prevent unnecessary recreations
  }

  depends_on = [aws_db_subnet_group.main]
}
