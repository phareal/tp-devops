#!/usr/bin/env bash
# Supprime TOUT : conteneurs, volumes, données, node_modules
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'

echo -e "${RED}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  ATTENTION : suppression totale de l'environnement  ║${NC}"
echo -e "${RED}║  Conteneurs + volumes (données DB) + node_modules    ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════╝${NC}"
echo ""
read -r -p "Confirmer ? (tapez 'oui') : " confirm
[[ "$confirm" != "oui" ]] && echo "Annulé." && exit 0

# Kill processes
echo -e "${YELLOW}[KILL]${NC} Arrêt des processus..."
pkill -f "ts-node-dev.*index.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
rm -f /tmp/ecommerce_*.pid

# Docker
echo -e "${YELLOW}[KILL]${NC} Suppression Docker (conteneurs + volumes)..."
cd "$ROOT"
docker compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true

# Node modules
echo -e "${YELLOW}[KILL]${NC} Suppression node_modules..."
rm -rf "$ROOT/src/backend/node_modules"
rm -rf "$ROOT/src/frontend/node_modules"

# Prisma generated
rm -rf "$ROOT/src/backend/node_modules/.prisma" 2>/dev/null || true

# Build artifacts
rm -rf "$ROOT/src/backend/dist"
rm -rf "$ROOT/src/frontend/dist"

# Coverage
rm -rf "$ROOT/src/backend/coverage"

echo ""
echo -e "${GREEN}Nettoyage complet. Relancer avec ./scripts/start.sh${NC}"
