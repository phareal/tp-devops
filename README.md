# E-Commerce DevOps — Bachelor 3

Application e-commerce complète avec pipeline DevOps de bout en bout, déployée sur AWS ECS.

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Base de données | PostgreSQL 15 + Prisma ORM |
| Auth | JWT + bcrypt |
| Tests | Jest + Supertest (coverage >70%) |
| Conteneurisation | Docker multi-stage |
| CI/CD | GitHub Actions |
| Infrastructure | Terraform (AWS ECS Fargate) |
| Monitoring | CloudWatch + Container Insights |

## Architecture

```
Internet → ALB → ECS Fargate
                 ├── Frontend (nginx, port 80)
                 └── Backend (Node.js, port 3000)
                          └── RDS PostgreSQL (privé)
```

## API REST

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | /api/auth/register | — | Inscription |
| POST | /api/auth/login | — | Connexion |
| GET | /api/auth/me | JWT | Profil |
| GET | /api/products | — | Liste produits (pagination, filtre) |
| POST | /api/products | ADMIN | Créer produit |
| PATCH | /api/products/:id | ADMIN | Modifier produit |
| DELETE | /api/products/:id | ADMIN | Supprimer (soft) |
| GET | /api/cart | JWT | Voir panier |
| POST | /api/cart/items | JWT | Ajouter au panier |
| PATCH | /api/cart/items/:id | JWT | Modifier quantité |
| DELETE | /api/cart/items/:id | JWT | Retirer article |
| POST | /api/orders | JWT | Passer commande |
| GET | /api/orders | JWT | Mes commandes |
| PATCH | /api/orders/:id/status | ADMIN | Changer statut |
| GET | /api/health | — | Health check |

## Démarrage rapide

### Prérequis
- Docker + Docker Compose
- Node.js 20+

### Développement local

```bash
# 1. Cloner le repo
git clone <repo-url> && cd mon-projet-devops

# 2. Démarrer PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# 3. Backend
cd src/backend
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed  # (optionnel) données de démo
npm run dev

# 4. Frontend (autre terminal)
cd src/frontend
npm install
npm run dev
```

L'application est accessible sur :
- Frontend : http://localhost:5173
- Backend API : http://localhost:3000/api
- Health check : http://localhost:3000/api/health

### Avec Docker Compose (tout en un)

```bash
cp src/backend/.env.example src/backend/.env
docker compose up --build
```

### Tests

```bash
cd src/backend
npm test              # Tests + coverage
npm test -- --watch   # Mode watch
```

## Variables d'environnement

Copier `src/backend/.env.example` → `src/backend/.env` et renseigner :

| Variable | Description | Exemple |
|----------|-------------|---------|
| DATABASE_URL | URL PostgreSQL | postgresql://... |
| JWT_SECRET | Clé JWT (32+ chars) | openssl rand -base64 32 |
| JWT_EXPIRES_IN | Expiration token | 7d |
| NODE_ENV | Environnement | development |
| PORT | Port API | 3000 |

## Déploiement AWS

### Prérequis AWS
- AWS CLI configuré (`aws configure`)
- Compte AWS avec droits IAM appropriés

### Infrastructure Terraform

```bash
cd infrastructure/terraform

# Configurer les variables
cp terraform.tfvars.example terraform.tfvars
# Éditer terraform.tfvars avec vos valeurs

# Déployer
terraform init
terraform plan
terraform apply
```

### Secrets GitHub Actions

Configurer dans GitHub → Settings → Secrets :

| Secret | Description |
|--------|-------------|
| AWS_ACCESS_KEY_ID | Clé AWS |
| AWS_SECRET_ACCESS_KEY | Secret AWS |
| ALB_BACKEND_URL | URL de l'ALB |

### Flux CI/CD

```
Push feature/* → CI (lint + tests + build Docker)
Push main      → CI + CD (push ECR + deploy ECS)
```

## Structure du projet

```
mon-projet-devops/
├── .github/workflows/
│   ├── ci.yml           # Tests, lint, build
│   └── cd.yml           # Deploy AWS ECS
├── src/
│   ├── frontend/        # React + TypeScript
│   └── backend/
│       ├── src/
│       │   ├── controllers/
│       │   ├── routes/
│       │   ├── middleware/
│       │   ├── utils/
│       │   └── __tests__/
│       └── prisma/
│           └── schema.prisma
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   └── nginx.conf
│   └── terraform/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── modules/
│           ├── vpc/
│           ├── ecr/
│           ├── rds/
│           ├── alb/
│           └── ecs/
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md
```

## Comptes de démonstration

Après `npm run db:seed` :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@ecommerce.com | Admin1234! |
| Client | customer@ecommerce.com | Customer1234! |

---

*Projet réalisé dans le cadre du Bachelor 3 DevOps*
