output "alb_dns_name" {
  description = "ALB public DNS name (application URL)"
  value       = module.alb.alb_dns_name
}

output "backend_ecr_repository_url" {
  description = "Backend ECR repository URL"
  value       = module.ecr.backend_repository_url
}

output "frontend_ecr_repository_url" {
  description = "Frontend ECR repository URL"
  value       = module.ecr.frontend_repository_url
}

output "rds_endpoint" {
  description = "RDS database endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "codecommit_clone_url_http" {
  description = "CodeCommit HTTP clone URL"
  value       = module.codepipeline.codecommit_clone_url_http
}

output "codecommit_clone_url_ssh" {
  description = "CodeCommit SSH clone URL"
  value       = module.codepipeline.codecommit_clone_url_ssh
}

output "ci_pipeline_url" {
  description = "CI pipeline console URL"
  value       = module.codepipeline.ci_pipeline_url
}

output "cd_pipeline_url" {
  description = "CD pipeline console URL"
  value       = module.codepipeline.cd_pipeline_url
}
