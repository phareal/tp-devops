output "codecommit_clone_url_ssh" {
  value = aws_codecommit_repository.main.clone_url_ssh
}

output "codecommit_clone_url_http" {
  value = aws_codecommit_repository.main.clone_url_http
}

output "ci_pipeline_url" {
  value = "https://${var.aws_region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${aws_codepipeline.ci.name}/view"
}

output "cd_pipeline_url" {
  value = "https://${var.aws_region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${aws_codepipeline.cd.name}/view"
}
