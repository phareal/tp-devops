locals {
  prefix = "${var.project_name}-${var.environment}"
}

# ─────────────────────────────────────────────
# CodeCommit — Git repository
# ─────────────────────────────────────────────
resource "aws_codecommit_repository" "main" {
  repository_name = "${local.prefix}-repo"
  description     = "Source code for ${var.project_name} ${var.environment}"
}

# ─────────────────────────────────────────────
# S3 — Pipeline artifacts
# ─────────────────────────────────────────────
resource "aws_s3_bucket" "artifacts" {
  bucket        = "${local.prefix}-pipeline-artifacts-${var.aws_account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─────────────────────────────────────────────
# IAM — CodeBuild role
# ─────────────────────────────────────────────
resource "aws_iam_role" "codebuild" {
  name = "${local.prefix}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "codebuild" {
  name = "${local.prefix}-codebuild-policy"
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:/aws/codebuild/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject", "s3:GetObjectVersion",
          "s3:PutObject", "s3:GetBucketAcl", "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.artifacts.arn,
          "${aws_s3_bucket.artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:WaitUntilServicesStable"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["sts:GetCallerIdentity"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "codecommit:GitPull",
          "codecommit:GetBranch",
          "codecommit:GetCommit"
        ]
        Resource = aws_codecommit_repository.main.arn
      }
    ]
  })
}

# ─────────────────────────────────────────────
# IAM — CodePipeline role
# ─────────────────────────────────────────────
resource "aws_iam_role" "codepipeline" {
  name = "${local.prefix}-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "codepipeline" {
  name = "${local.prefix}-codepipeline-policy"
  role = aws_iam_role.codepipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject", "s3:GetObjectVersion",
          "s3:PutObject", "s3:GetBucketAcl", "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.artifacts.arn,
          "${aws_s3_bucket.artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "codecommit:GetBranch",
          "codecommit:GetCommit",
          "codecommit:UploadArchive",
          "codecommit:GetUploadArchiveStatus",
          "codecommit:CancelUploadArchive"
        ]
        Resource = aws_codecommit_repository.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "codebuild:BatchGetBuilds",
          "codebuild:StartBuild"
        ]
        Resource = "*"
      }
    ]
  })
}

# ─────────────────────────────────────────────
# CloudWatch Logs
# ─────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "codebuild_ci" {
  name              = "/aws/codebuild/${local.prefix}-ci"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "codebuild_cd" {
  name              = "/aws/codebuild/${local.prefix}-cd"
  retention_in_days = 7
}

# ─────────────────────────────────────────────
# CodeBuild — CI project (tests + lint)
# ─────────────────────────────────────────────
resource "aws_codebuild_project" "ci" {
  name          = "${local.prefix}-ci"
  description   = "CI: lint, tests, Docker build"
  build_timeout = 20
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true  # needed for Docker
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.codebuild_ci.name
    }
  }
}

# ─────────────────────────────────────────────
# CodeBuild — CD project (build + push + deploy)
# ─────────────────────────────────────────────
resource "aws_codebuild_project" "cd" {
  name          = "${local.prefix}-cd"
  description   = "CD: Docker build, ECR push, ECS deploy"
  build_timeout = 30
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true  # needed for Docker

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "ECS_CLUSTER"
      value = var.ecs_cluster_name
    }

    environment_variable {
      name  = "BACKEND_SERVICE"
      value = var.backend_service_name
    }

    environment_variable {
      name  = "FRONTEND_SERVICE"
      value = var.frontend_service_name
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-deploy.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.codebuild_cd.name
    }
  }
}

# ─────────────────────────────────────────────
# CodePipeline — CI (déclenché sur develop)
# ─────────────────────────────────────────────
resource "aws_codepipeline" "ci" {
  name     = "${local.prefix}-ci-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeCommit"
      version          = "1"
      output_artifacts = ["source"]

      configuration = {
        RepositoryName       = aws_codecommit_repository.main.repository_name
        BranchName           = "develop"
        PollForSourceChanges = "true"
      }
    }
  }

  stage {
    name = "CI"
    action {
      name            = "Test"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source"]

      configuration = {
        ProjectName = aws_codebuild_project.ci.name
      }
    }
  }
}

# ─────────────────────────────────────────────
# CodePipeline — CD (déclenché sur main)
# ─────────────────────────────────────────────
resource "aws_codepipeline" "cd" {
  name     = "${local.prefix}-cd-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeCommit"
      version          = "1"
      output_artifacts = ["source"]

      configuration = {
        RepositoryName       = aws_codecommit_repository.main.repository_name
        BranchName           = "main"
        PollForSourceChanges = "true"
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "Deploy"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source"]

      configuration = {
        ProjectName = aws_codebuild_project.cd.name
      }
    }
  }
}
