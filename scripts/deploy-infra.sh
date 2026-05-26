#!/usr/bin/env bash
# Déploie l'infrastructure AWS via Terraform
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/infrastructure/terraform"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

command -v terraform >/dev/null 2>&1 || error "Terraform non installé (brew install terraform)"
command -v aws       >/dev/null 2>&1 || error "AWS CLI non installé"

# Credentials AWS
CACHE_FILE=$(ls ~/.aws/login/cache/*.json 2>/dev/null | head -1)
if [[ -n "$CACHE_FILE" ]]; then
  export AWS_ACCESS_KEY_ID=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['accessKeyId'])")
  export AWS_SECRET_ACCESS_KEY=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['secretAccessKey'])")
  export AWS_SESSION_TOKEN=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['sessionToken'])")
  export AWS_DEFAULT_REGION="eu-west-3"
  info "Credentials AWS chargés depuis le cache"
else
  error "Pas de credentials AWS. Lance: aws login"
fi

# Vérification connexion
aws sts get-caller-identity >/dev/null 2>&1 || error "Credentials AWS invalides ou expirés. Relancer: aws login"
info "Compte AWS: $(aws sts get-caller-identity --query Account --output text)"

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

# Récupération outputs
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
  echo -e "  Secret ALB_BACKEND_URL mis à jour ✓"
  echo ""
  echo -e "${YELLOW}Prochain push sur main déclenchera le déploiement CD automatiquement.${NC}"
fi
