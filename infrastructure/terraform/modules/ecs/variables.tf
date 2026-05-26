variable "project_name"              { type = string }
variable "environment"               { type = string }
variable "aws_region"                { type = string }
variable "vpc_id"                    { type = string }
variable "private_subnet_ids"        { type = list(string) }
variable "alb_security_group_id"     { type = string }
variable "backend_target_group_arn"  { type = string }
variable "frontend_target_group_arn" { type = string }
variable "backend_ecr_uri"           { type = string }
variable "frontend_ecr_uri"          { type = string }
variable "database_url"              { type = string; sensitive = true }
variable "jwt_secret"                { type = string; sensitive = true }
variable "backend_desired_count"     { type = number; default = 2 }
variable "frontend_desired_count"    { type = number; default = 2 }
