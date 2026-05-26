#!/usr/bin/env bash
# Lance les tests avec coverage
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[TEST]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# PostgreSQL requis pour les tests d'intégration
docker ps --filter "name=postgres" --format "{{.Status}}" 2>/dev/null | grep -q "Up" || {
  info "Démarrage PostgreSQL pour les tests..."
  cd "$ROOT"
  docker compose -f docker-compose.dev.yml up -d postgres
  sleep 5
}

cd "$ROOT/src/backend"

[[ ! -f .env ]] && cp .env.example .env

info "Génération client Prisma..."
npx prisma generate --silent

info "Migration DB de test..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --force-reset

info "Lancement des tests (coverage ≥70%)..."
npm test -- --coverage --verbose "$@"

echo ""
echo -e "${GREEN}Rapport de couverture : src/backend/coverage/index.html${NC}"
