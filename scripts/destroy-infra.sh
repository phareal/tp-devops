#!/usr/bin/env bash
# DÉTRUIT toute l'infrastructure AWS — IRRÉVERSIBLE
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/infrastructure/terraform"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'

echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  DANGER : DESTRUCTION DE L'INFRASTRUCTURE AWS         ║${NC}"
echo -e "${RED}║  VPC, ECS, RDS, ALB, ECR — TOUT SERA SUPPRIMÉ         ║${NC}"
echo -e "${RED}║  Les données RDS seront perdues définitivement !        ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
read -r -p "Confirmer en tapant le nom du projet (ecommerce) : " confirm
[[ "$confirm" != "ecommerce" ]] && echo "Annulé." && exit 0

# Credentials
CACHE_FILE=$(ls ~/.aws/login/cache/*.json 2>/dev/null | head -1)
if [[ -n "$CACHE_FILE" ]]; then
  export AWS_ACCESS_KEY_ID=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['accessKeyId'])")
  export AWS_SECRET_ACCESS_KEY=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['secretAccessKey'])")
  export AWS_SESSION_TOKEN=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['sessionToken'])")
  export AWS_DEFAULT_REGION="eu-west-3"
fi

cd "$TF_DIR"

# Désactiver deletion_protection sur RDS avant destroy
echo -e "${YELLOW}[DESTROY]${NC} Désactivation deletion_protection RDS..."
terraform apply -target=module.rds.aws_db_instance.postgres \
  -var="deletion_protection=false" -auto-approve 2>/dev/null || true

echo -e "${YELLOW}[DESTROY]${NC} Destruction infrastructure..."
terraform destroy -auto-approve

echo ""
echo -e "${GREEN}Infrastructure supprimée. Plus aucune ressource AWS active.${NC}"
