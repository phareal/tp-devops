#!/usr/bin/env bash
# Déploie l'infrastructure AWS via Terraform
# Utilise les credentials IAM longue durée (jamais expirés)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/infrastructure/terraform"
IAM_CREDS_FILE="/tmp/gh_aws_creds.json"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

command -v terraform >/dev/null 2>&1 || error "Terraform non installé (brew install terraform)"
command -v aws       >/dev/null 2>&1 || error "AWS CLI non installé"

# ─── Stratégie credentials ─────────────────────────────────────────────────
# Priorité 1: credentials IAM user permanents (github-actions-deployer)
# Priorité 2: credentials STS depuis cache aws login
load_iam_creds() {
  [[ ! -f "$IAM_CREDS_FILE" ]] && return 1
  export AWS_ACCESS_KEY_ID=$(python3 -c "import json; d=json.load(open('$IAM_CREDS_FILE')); print(d['key_id'])")
  export AWS_SECRET_ACCESS_KEY=$(python3 -c "import json; d=json.load(open('$IAM_CREDS_FILE')); print(d['secret'])")
  unset AWS_SESSION_TOKEN
  export AWS_DEFAULT_REGION="eu-west-3"
  aws sts get-caller-identity >/dev/null 2>&1
}

load_sts_creds() {
  local cache_file
  cache_file=$(ls ~/.aws/login/cache/*.json 2>/dev/null | head -1)
  [[ -z "$cache_file" ]] && return 1
  export AWS_ACCESS_KEY_ID=$(python3 -c "import json; d=json.load(open('$cache_file')); print(d['accessToken']['accessKeyId'])")
  export AWS_SECRET_ACCESS_KEY=$(python3 -c "import json; d=json.load(open('$cache_file')); print(d['accessToken']['secretAccessKey'])")
  export AWS_SESSION_TOKEN=$(python3 -c "import json; d=json.load(open('$cache_file')); print(d['accessToken']['sessionToken'])")
  export AWS_DEFAULT_REGION="eu-west-3"
  aws sts get-caller-identity >/dev/null 2>&1
}

ensure_iam_user_permissions() {
  # Attache AdministratorAccess à l'IAM user si pas encore fait
  local attached
  attached=$(aws iam list-attached-user-policies \
    --user-name github-actions-deployer \
    --query "AttachedPolicies[?PolicyName=='AdministratorAccess'].PolicyName" \
    --output text 2>/dev/null || echo "")
  if [[ -z "$attached" ]]; then
    info "Attachement AdministratorAccess à github-actions-deployer..."
    aws iam attach-user-policy \
      --user-name github-actions-deployer \
      --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
    info "Permissions mises à jour. Attente propagation IAM (10s)..."
    sleep 10
  fi
}

info "Chargement credentials AWS..."
if load_iam_creds; then
  info "Credentials IAM permanents chargés (github-actions-deployer)"
elif load_sts_creds; then
  warn "Credentials STS (expirent dans ~1h). Mise à jour IAM user en cours..."
  ensure_iam_user_permissions
  # Regénérer si besoin (si les perms ont changé)
  if ! load_iam_creds; then
    warn "Utilisation STS pour ce déploiement (IAM user non encore configuré)"
  fi
else
  error "Aucun credentials AWS disponibles. Lance: aws login"
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
info "Compte AWS: ${ACCOUNT_ID} (eu-west-3)"

# ─── Terraform ─────────────────────────────────────────────────────────────
cd "$TF_DIR"
[[ ! -f terraform.tfvars ]] && error "terraform.tfvars manquant. Copier depuis terraform.tfvars.example"

info "Terraform init..."
terraform init -upgrade -input=false

info "Terraform plan..."
terraform plan -input=false -out=tfplan

echo ""
echo -e "${CYAN}Plan affiché ci-dessus. Coût estimé: ~80€/mois${NC}"
read -r -p "Appliquer ? (tapez 'oui') : " confirm
[[ "$confirm" != "oui" ]] && echo "Annulé." && rm -f tfplan && exit 0

info "Terraform apply..."
terraform apply -input=false tfplan
rm -f tfplan

# ─── Outputs ───────────────────────────────────────────────────────────────
ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")
BACKEND_ECR=$(terraform output -raw backend_ecr_repository_url 2>/dev/null || echo "")
FRONTEND_ECR=$(terraform output -raw frontend_ecr_repository_url 2>/dev/null || echo "")

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} Infrastructure déployée avec succès !${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Application URL → ${YELLOW}http://${ALB_DNS}${NC}"
echo -e "  Backend ECR     → ${YELLOW}${BACKEND_ECR}${NC}"
echo -e "  Frontend ECR    → ${YELLOW}${FRONTEND_ECR}${NC}"
echo ""

# Mise à jour secret GitHub ALB_BACKEND_URL
if command -v gh >/dev/null 2>&1 && [[ -n "$ALB_DNS" ]]; then
  info "Mise à jour secret GitHub ALB_BACKEND_URL..."
  gh secret set ALB_BACKEND_URL --repo phareal/tp-devops --body "http://${ALB_DNS}"
  echo -e "  ${GREEN}✓${NC} ALB_BACKEND_URL mis à jour dans GitHub"
fi

echo ""
echo -e "  Prochain push sur ${YELLOW}main${NC} → déploiement CD automatique"
echo -e "  Ou maintenant : ${CYAN}./scripts/redeploy.sh${NC}"
