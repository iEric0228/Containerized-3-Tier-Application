# 1. VPC (Virtual Private Cloud) - Your isolated network
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr # Example: "10.0.0.0/16" (65,536 IPs)
  enable_dns_hostnames = true         # Allows EC2 instances to get public DNS names
  enable_dns_support   = true         # Enables DNS resolution
}

# 2. Internet Gateway - Gateway to the internet
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id # Attach to our VPC
}

# 3. Public Subnets - Where internet-facing resources live (ALB, NAT Gateway)
resource "aws_subnet" "public" {
  count = length(var.availability_zones) # Creates 2 subnets (for high availability)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index) # 10.0.0.0/24, 10.0.1.0/24
  availability_zone       = var.availability_zones[count.index]      # us-east-1a, us-east-1b
  map_public_ip_on_launch = true                                     # Auto-assign public IPs
}

# 4. Private Subnets - Where secure resources live (ECS tasks, RDS database)
resource "aws_subnet" "private" {
  count = length(var.availability_zones) # Creates 2 private subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10) # 10.0.10.0/24, 10.0.11.0/24
  availability_zone = var.availability_zones[count.index]
  # No public IPs assigned (secure!)
}

# 5. NAT Gateways - Allow private subnets to access internet (outbound only)
resource "aws_eip" "nat" {
  count  = length(var.availability_zones) # Elastic IPs for NAT gateways
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  count = length(var.availability_zones)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id # NAT gateways live in public subnets
}

# 6. Route Tables - Define traffic routing rules
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"                  # All traffic (0.0.0.0/0)
    gateway_id = aws_internet_gateway.main.id # Goes to Internet Gateway
  }
}

resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"                          # All outbound traffic
    nat_gateway_id = aws_nat_gateway.main[count.index].id # Goes through NAT Gateway
  }
}

# 7. Route Table Associations - Connect subnets to route tables
resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id # Public subnet
  route_table_id = aws_route_table.public.id         # Uses public route table
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id      # Private subnet  
  route_table_id = aws_route_table.private[count.index].id # Uses private route table
}