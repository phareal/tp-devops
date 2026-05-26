#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[SETUP]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

# Load AWS credentials
if [ -f /tmp/gh_aws_creds.json ]; then
  export AWS_ACCESS_KEY_ID=$(python3 -c "import json; print(json.load(open('/tmp/gh_aws_creds.json'))['key_id'])")
  export AWS_SECRET_ACCESS_KEY=$(python3 -c "import json; print(json.load(open('/tmp/gh_aws_creds.json'))['secret'])")
fi
export AWS_DEFAULT_REGION=eu-west-3

# ─── 1. Terraform apply pour créer CodeCommit + CodePipeline ───
log "Applying Terraform (CodePipeline module)..."
cd infrastructure/terraform
terraform init -reconfigure
terraform apply -target=module.codepipeline -auto-approve
CODECOMMIT_URL=$(terraform output -raw codecommit_clone_url_http)
CI_URL=$(terraform output -raw ci_pipeline_url)
CD_URL=$(terraform output -raw cd_pipeline_url)
cd ../..

log "CodeCommit URL: $CODECOMMIT_URL"

# ─── 2. Configure Git credential helper for CodeCommit ───
log "Configuring Git credential helper..."
git config --global credential.helper \
  '!aws codecommit credential-helper $@'
git config --global credential.UseHttpPath true

# ─── 3. Add CodeCommit remote ───
if git remote get-url aws 2>/dev/null; then
  git remote set-url aws "$CODECOMMIT_URL"
  log "Updated remote 'aws'"
else
  git remote add aws "$CODECOMMIT_URL"
  log "Added remote 'aws'"
fi

# ─── 4. Push both branches ───
log "Pushing develop branch..."
git push aws develop

log "Pushing main branch..."
git push aws main

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN} CodeCommit + CodePipeline configurés !${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  CI Pipeline  → ${YELLOW}$CI_URL${NC}"
echo -e "  CD Pipeline  → ${YELLOW}$CD_URL${NC}"
echo ""
echo "  Chaque push sur 'develop' → déclenche CI"
echo "  Chaque push sur 'main'    → déclenche CD"
echo ""
echo "  Pour push futur :"
echo "    git push aws develop   # trigger CI"
echo "    git push aws main      # trigger CD"
