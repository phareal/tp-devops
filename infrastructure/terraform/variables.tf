variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-3"
}

variable "project_name" {
  description = "Project name (used in resource names)"
  type        = string
  default     = "ecommerce"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["eu-west-3a", "eu-west-3b"]
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "ecommerce_db"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "ecommerce_user"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "jwt_secret" {
  description = "JWT signing secret (min 32 chars)"
  type        = string
  sensitive   = true
}

variable "backend_desired_count" {
  description = "Number of backend ECS tasks"
  type        = number
  default     = 2
}

variable "frontend_desired_count" {
  description = "Number of frontend ECS tasks"
  type        = number
  default     = 2
}
