#!/usr/bin/env bash
# Affiche l'état de l'application (local + AWS)
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${CYAN}→${NC} $1"; }

echo -e "${CYAN}════════ STATUS E-COMMERCE ════════${NC}"
echo ""

# Local
echo -e "${YELLOW}[ LOCAL ]${NC}"
curl -sf http://localhost:3000/api/health >/dev/null 2>&1 \
  && ok "Backend http://localhost:3000" || fail "Backend offline"
curl -sf http://localhost:5173 >/dev/null 2>&1 \
  && ok "Frontend http://localhost:5173" || fail "Frontend offline"
docker ps --filter "name=postgres" --format "{{.Status}}" 2>/dev/null | grep -q "Up" \
  && ok "PostgreSQL (Docker)" || fail "PostgreSQL offline"

echo ""
echo -e "${YELLOW}[ AWS — ECS ]${NC}"

# Credentials
IAM_CREDS_FILE="/tmp/gh_aws_creds.json"
if [[ -f "$IAM_CREDS_FILE" ]]; then
  export AWS_ACCESS_KEY_ID=$(python3 -c "import json; print(json.load(open('$IAM_CREDS_FILE'))['key_id'])")
  export AWS_SECRET_ACCESS_KEY=$(python3 -c "import json; print(json.load(open('$IAM_CREDS_FILE'))['secret'])")
  unset AWS_SESSION_TOKEN
else
  CACHE_FILE=$(ls ~/.aws/login/cache/*.json 2>/dev/null | head -1)
  if [[ -n "$CACHE_FILE" ]]; then
    export AWS_ACCESS_KEY_ID=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['accessKeyId'])")
    export AWS_SECRET_ACCESS_KEY=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['secretAccessKey'])")
    export AWS_SESSION_TOKEN=$(python3 -c "import json; d=json.load(open('$CACHE_FILE')); print(d['accessToken']['sessionToken'])")
  fi
fi
export AWS_DEFAULT_REGION="eu-west-3"

CLUSTER="ecommerce-production-cluster"

# ECS services status
for SVC in ecommerce-production-backend-service ecommerce-production-frontend-service; do
  STATUS=$(aws ecs describe-services \
    --cluster "$CLUSTER" \
    --services "$SVC" \
    --query 'services[0].{status:status,running:runningCount,desired:desiredCount}' \
    --output json 2>/dev/null || echo '{}')
  RUNNING=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('running','?'))" 2>/dev/null)
  DESIRED=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('desired','?'))" 2>/dev/null)
  SVC_SHORT="${SVC##*production-}"
  [[ "$RUNNING" == "$DESIRED" && "$RUNNING" != "?" ]] \
    && ok "${SVC_SHORT}: ${RUNNING}/${DESIRED} tâches" \
    || fail "${SVC_SHORT}: ${RUNNING}/${DESIRED} tâches"
done

# ALB URL
ALB=$(aws elbv2 describe-load-balancers \
  --names "ecommerce-production-alb" \
  --query 'LoadBalancers[0].DNSName' \
  --output text 2>/dev/null || echo "")
[[ -n "$ALB" && "$ALB" != "None" ]] \
  && info "URL: http://${ALB}" \
  || fail "ALB introuvable (terraform apply requis ?)"

echo ""
echo -e "${YELLOW}[ CI/CD ]${NC}"
gh run list --repo phareal/tp-devops --limit 3 --json status,conclusion,name,createdAt \
  --jq '.[] | "  \(.status) \(.conclusion // "running") — \(.name)"' 2>/dev/null || fail "gh non authentifié"

echo ""
