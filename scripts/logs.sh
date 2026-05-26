#!/usr/bin/env bash
# Affiche les logs CloudWatch ECS en temps réel
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

SERVICE="${1:-backend}"  # backend | frontend
REGION="eu-west-3"
LOG_GROUP="/ecs/ecommerce/production/${SERVICE}"

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

echo -e "${GREEN}[LOGS]${NC} Streaming ${YELLOW}${SERVICE}${NC} depuis CloudWatch..."
echo -e "Usage: ${YELLOW}./scripts/logs.sh [backend|frontend]${NC}"
echo ""

aws logs tail "$LOG_GROUP" \
  --region "$REGION" \
  --follow \
  --format short
