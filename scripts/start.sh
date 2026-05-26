#!/usr/bin/env bash
# Démarre l'environnement de développement complet
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[START]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Vérifications prérequis
command -v docker >/dev/null 2>&1 || error "Docker non installé"
command -v node   >/dev/null 2>&1 || error "Node.js non installé"

info "Démarrage PostgreSQL..."
docker compose -f docker-compose.dev.yml up -d
sleep 3

# Backend setup
info "Installation dépendances backend..."
cd "$ROOT/src/backend"
[[ ! -f .env ]] && cp .env.example .env && warn ".env créé depuis .env.example — vérifier les valeurs"
npm install --silent

info "Génération client Prisma..."
npx prisma generate --silent

info "Migrations base de données..."
npx prisma migrate dev --name init 2>/dev/null || npx prisma migrate deploy

info "Seed base de données (données de démo)..."
npx ts-node src/database/seed.ts 2>/dev/null && info "Seed OK" || warn "Seed ignoré (données existent déjà)"

info "Démarrage backend (port 3000)..."
npm run dev &
BACKEND_PID=$!
echo "$BACKEND_PID" > /tmp/ecommerce_backend.pid

# Frontend setup
info "Installation dépendances frontend..."
cd "$ROOT/src/frontend"
npm install --silent

info "Démarrage frontend (port 5173)..."
npm run dev &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > /tmp/ecommerce_frontend.pid

sleep 3

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN} Application démarrée avec succès !${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  Frontend  → ${YELLOW}http://localhost:5173${NC}"
echo -e "  Backend   → ${YELLOW}http://localhost:3000/api${NC}"
echo -e "  Health    → ${YELLOW}http://localhost:3000/api/health${NC}"
echo -e "  PgAdmin   → ${YELLOW}http://localhost:5050${NC} (admin/admin)"
echo ""
echo -e "  Comptes démo :"
echo -e "    Admin    : admin@ecommerce.com / Admin1234!"
echo -e "    Client   : customer@ecommerce.com / Customer1234!"
echo ""
echo -e "  Pour arrêter : ${YELLOW}./scripts/stop.sh${NC}"
echo ""

wait
