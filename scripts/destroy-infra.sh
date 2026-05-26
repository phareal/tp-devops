#!/usr/bin/env bash
# DÉTRUIT toute l'infrastructure AWS — IRRÉVERSIBLE
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/infrastructure/terraform"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  DANGER : DESTRUCTION DE L'INFRASTRUCTURE AWS         ║${NC}"
echo -e "${RED}║  VPC, ECS, RDS, ALB, ECR — TOUT SERA SUPPRIMÉ         ║${NC}"
echo -e "${RED}║  Les données RDS seront perdues définitivement !        ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
read -r -p "Confirmer en tapant le nom du projet (ecommerce) : " confirm
[[ "$confirm" != "ecommerce" ]] && echo "Annulé." && exit 0

# Credentials AWS — IAM permanent (priorité) ou STS cache
IAM_CREDS_FILE="/tmp/gh_aws_creds.json"
if [[ -f "$IAM_CREDS_FILE" ]] && python3 -c "
import json, subprocess, os
d = json.load(open('$IAM_CREDS_FILE'))
env = os.environ.copy()
env['AWS_ACCESS_KEY_ID'] = d['key_id']
env['AWS_SECRET_ACCESS_KEY'] = d['secret']
env.pop('AWS_SESSION_TOKEN', None)
env['AWS_DEFAULT_REGION'] = 'eu-west-3'
r = subprocess.run(['aws','sts','get-caller-identity'], env=env, capture_output=True)
exit(r.returncode)
" 2>/dev/null; then
  export AWS_ACCESS_KEY_ID=$(python3 -c "import json; print(json.load(open('$IAM_CREDS_FILE'))['key_id'])")
  export AWS_SECRET_ACCESS_KEY=$(python3 -c "import json; print(json.load(open('$IAM_CREDS_FILE'))['secret'])")
  unset AWS_SESSION_TOKEN
  export AWS_DEFAULT_REGION="eu-west-3"
else
  CACHE_FILE=$(ls ~/.aws/login/cache/*.json 2>/dev/null | head -1)
  [[ -z "$CACHE_FILE" ]] && error "Pas de credentials AWS. Lance: aws login"
  export AWS_ACCESS_KEY_ID=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['accessKeyId'])")
  export AWS_SECRET_ACCESS_KEY=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['secretAccessKey'])")
  export AWS_SESSION_TOKEN=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['sessionToken'])")
  export AWS_DEFAULT_REGION="eu-west-3"
fi
aws sts get-caller-identity >/dev/null 2>&1 || error "Credentials invalides ou expirés. Lance: aws login"

cd "$TF_DIR"

# Désactiver deletion_protection sur RDS avant destroy
echo -e "${YELLOW}[DESTROY]${NC} Désactivation deletion_protection RDS..."
terraform apply -target=module.rds.aws_db_instance.postgres \
  -var="deletion_protection=false" -auto-approve 2>/dev/null || true

echo -e "${YELLOW}[DESTROY]${NC} Destruction infrastructure..."
terraform destroy -auto-approve

echo ""
echo -e "${GREEN}Infrastructure supprimée. Plus aucune ressource AWS active.${NC}"
