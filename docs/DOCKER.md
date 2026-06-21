# Docker — testes locais (sem produção)

Ambiente completo: **PostgreSQL + API + frontend**, isolado da produção.

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) ou Docker Engine + Compose

## Subir (modo produção local)

Na raiz do projeto:

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

Aguarde o bootstrap (schema + migrations + usuário admin).

| Serviço   | URL |
|-----------|-----|
| Frontend  | http://localhost:8080 |
| API       | http://localhost:3011/api/health |
| Postgres  | `localhost:5433` (user `benny`, db `benny`) |

### Login padrão

```
Email: admin@oficina.com
Senha: 123456
```

Altere em `.env.docker` (`DOCKER_ADMIN_EMAIL` / `DOCKER_ADMIN_PASSWORD`) **antes do primeiro boot**.

## Modo desenvolvimento (hot reload)

Backend com nodemon + frontend com Vite:

```bash
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Serviço  | URL |
|----------|-----|
| Frontend | http://localhost:5177 |
| API      | http://localhost:3011 |

No modo dev o frontend usa proxy `/api` → backend (sem CORS).

## Nuvem Fiscal (NF-e / NFS-e)

Edite `.env.docker` com credenciais de **sandbox/homologação** (`NUVEM_FISCAL_*`).  
Nunca use credenciais de produção neste ambiente.

Depois de alterar variáveis:

```bash
docker compose --env-file .env.docker up -d --build backend
```

## Comandos úteis

```bash
# Parar
docker compose --env-file .env.docker down

# Parar e apagar banco (recomeçar do zero)
docker compose --env-file .env.docker down -v

# Logs
docker compose --env-file .env.docker logs -f backend

# Migrations manuais
docker compose --env-file .env.docker exec backend npm run migrate

# Testes backend
docker compose --env-file .env.docker exec backend npm test
```

## Estrutura

```
docker-compose.yml       # stack padrão (build estático + nginx)
docker-compose.dev.yml   # override com hot reload
.env.docker.example      # variáveis de exemplo
backend/docker-entrypoint.mjs
backend/scripts/bootstrap-docker.mjs
backend/scripts/seed-admin.mjs
```

## Diferença da produção

| Item | Docker local | Produção (Coolify) |
|------|--------------|-------------------|
| Banco | Postgres no container | Postgres gerenciado |
| Bootstrap | Automático no 1º boot | `npm run migrate` manual |
| Frontend | `localhost:8080` | Domínio real |
| Nuvem Fiscal | Sandbox | Homologação ou produção |

Este ambiente **não altera** produção — banco e volumes são locais (`benny_pgdata`).
