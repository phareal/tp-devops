terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state en S3 (à configurer après création du bucket)
  # backend "s3" {
  #   bucket = "ecommerce-terraform-state"
  #   key    = "production/terraform.tfstate"
  #   region = "eu-west-1"
  #   encrypt = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ─────────────────────────────────────────────
# VPC
# ─────────────────────────────────────────────
module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  public_subnets     = var.public_subnets
  private_subnets    = var.private_subnets
}

# ─────────────────────────────────────────────
# ECR
# ─────────────────────────────────────────────
module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

# ─────────────────────────────────────────────
# RDS PostgreSQL
# ─────────────────────────────────────────────
module "rds" {
  source = "./modules/rds"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  db_instance_class  = var.db_instance_class
}

# ─────────────────────────────────────────────
# ALB
# ─────────────────────────────────────────────
module "alb" {
  source = "./modules/alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
}

# ─────────────────────────────────────────────
# ECS
# ─────────────────────────────────────────────
module "ecs" {
  source = "./modules/ecs"

  project_name               = var.project_name
  environment                = var.environment
  aws_region                 = var.aws_region
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  alb_security_group_id      = module.alb.alb_security_group_id
  backend_target_group_arn   = module.alb.backend_target_group_arn
  frontend_target_group_arn  = module.alb.frontend_target_group_arn
  backend_ecr_uri            = module.ecr.backend_repository_url
  frontend_ecr_uri           = module.ecr.frontend_repository_url
  database_url               = "postgresql://${var.db_username}:${var.db_password}@${module.rds.db_endpoint}/${var.db_name}"
  jwt_secret                 = var.jwt_secret
  backend_desired_count      = var.backend_desired_count
  frontend_desired_count     = var.frontend_desired_count
}
