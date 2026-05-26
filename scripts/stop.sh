#!/usr/bin/env bash
# Arrête l'environnement de développement
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[STOP]${NC} $1"; }

info "Arrêt backend..."
if [[ -f /tmp/ecommerce_backend.pid ]]; then
  kill "$(cat /tmp/ecommerce_backend.pid)" 2>/dev/null || true
  rm -f /tmp/ecommerce_backend.pid
fi
pkill -f "ts-node-dev.*index.ts" 2>/dev/null || true

info "Arrêt frontend..."
if [[ -f /tmp/ecommerce_frontend.pid ]]; then
  kill "$(cat /tmp/ecommerce_frontend.pid)" 2>/dev/null || true
  rm -f /tmp/ecommerce_frontend.pid
fi
pkill -f "vite" 2>/dev/null || true

info "Arrêt PostgreSQL (Docker)..."
cd "$ROOT"
docker compose -f docker-compose.dev.yml down

echo ""
echo -e "${GREEN}Environnement arrêté.${NC}"
echo -e "Données PostgreSQL conservées. Pour tout supprimer : ${YELLOW}./scripts/kill.sh${NC}"
