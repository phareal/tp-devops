#!/usr/bin/env bash
# Rebuild + push images ECR + force redéploiement ECS
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

TARGET="${1:-all}"  # all | backend | frontend

command -v docker >/dev/null 2>&1 || error "Docker non installé"
command -v aws    >/dev/null 2>&1 || error "AWS CLI non installé"

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

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="eu-west-3"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_TAG="$(git rev-parse --short HEAD)-$(date +%s)"
CLUSTER="ecommerce-production-cluster"

info "Login ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

deploy_backend() {
  info "Build image backend (tag: ${IMAGE_TAG})..."
  docker build \
    --file infrastructure/docker/Dockerfile.backend \
    --tag "${ECR_REGISTRY}/ecommerce-backend:${IMAGE_TAG}" \
    --tag "${ECR_REGISTRY}/ecommerce-backend:latest" \
    .

  info "Push backend → ECR..."
  docker push "${ECR_REGISTRY}/ecommerce-backend:${IMAGE_TAG}"
  docker push "${ECR_REGISTRY}/ecommerce-backend:latest"

  info "Force redéploiement ECS backend..."
  aws ecs update-service \
    --cluster "$CLUSTER" \
    --service "ecommerce-production-backend-service" \
    --force-new-deployment \
    --output json | python3 -c "
import sys, json
d = json.load(sys.stdin)
s = d['service']
print(f'  Service: {s[\"serviceName\"]}')
print(f'  Status:  {s[\"status\"]}')
print(f'  Running: {s[\"runningCount\"]}/{s[\"desiredCount\"]}')
"
}

deploy_frontend() {
  info "Build image frontend (tag: ${IMAGE_TAG})..."

  # Récupère l'URL ALB pour VITE_API_URL
  ALB_DNS=$(aws elbv2 describe-load-balancers \
    --names "ecommerce-production-alb" \
    --query 'LoadBalancers[0].DNSName' \
    --output text 2>/dev/null || echo "localhost:3000")

  docker build \
    --file infrastructure/docker/Dockerfile.frontend \
    --build-arg VITE_API_URL="http://${ALB_DNS}" \
    --tag "${ECR_REGISTRY}/ecommerce-frontend:${IMAGE_TAG}" \
    --tag "${ECR_REGISTRY}/ecommerce-frontend:latest" \
    .

  info "Push frontend → ECR..."
  docker push "${ECR_REGISTRY}/ecommerce-frontend:${IMAGE_TAG}"
  docker push "${ECR_REGISTRY}/ecommerce-frontend:latest"

  info "Force redéploiement ECS frontend..."
  aws ecs update-service \
    --cluster "$CLUSTER" \
    --service "ecommerce-production-frontend-service" \
    --force-new-deployment \
    --output json | python3 -c "
import sys, json
d = json.load(sys.stdin)
s = d['service']
print(f'  Service: {s[\"serviceName\"]}')
print(f'  Status:  {s[\"status\"]}')
print(f'  Running: {s[\"runningCount\"]}/{s[\"desiredCount\"]}')
"
}

wait_stable() {
  local svc="$1"
  info "Attente stabilisation ${svc}..."
  aws ecs wait services-stable \
    --cluster "$CLUSTER" \
    --services "$svc" && \
    echo -e "  ${GREEN}✓ ${svc} stable${NC}" || \
    warn "${svc} pas encore stable (vérifier: ./scripts/logs.sh)"
}

case "$TARGET" in
  backend)
    deploy_backend
    wait_stable "ecommerce-production-backend-service"
    ;;
  frontend)
    deploy_frontend
    wait_stable "ecommerce-production-frontend-service"
    ;;
  all)
    deploy_backend
    deploy_frontend
    wait_stable "ecommerce-production-backend-service"
    wait_stable "ecommerce-production-frontend-service"
    ;;
  *)
    error "Usage: ./scripts/redeploy.sh [all|backend|frontend]"
    ;;
esac

# URL finale
ALB=$(aws elbv2 describe-load-balancers \
  --names "ecommerce-production-alb" \
  --query 'LoadBalancers[0].DNSName' \
  --output text 2>/dev/null || echo "")

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN} Redéploiement terminé ! (tag: ${IMAGE_TAG})${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
[[ -n "$ALB" ]] && echo -e "  URL → ${YELLOW}http://${ALB}${NC}"
echo ""
echo -e "  Logs : ${CYAN}./scripts/logs.sh backend${NC}"
echo -e "  État : ${CYAN}./scripts/status.sh${NC}"
