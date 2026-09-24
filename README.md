# Benny — Gestão de Oficina Automotiva (SaaS)

Sistema de gestão para oficinas mecânicas: OS, orçamentos, estoque, agenda, financeiro, NFS-e e billing Stripe. Roda como **SaaS multi-oficina** (um backend + Postgres) ou em modo **single-tenant** (uma oficina por deploy).

**Produção (referência):** frontend `https://benny.jwsoftware.com.br` · API `https://api-benny.jwsoftware.com.br`

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, Vite, TailwindCSS, TanStack Query, React Router |
| Backend | Node.js 22, Express, Zod, JWT (Bearer + cookie httpOnly) |
| Banco | PostgreSQL 14+ (migrations em `backend/migrations/`) |
| Fiscal | **Notaas** — NFS-e em produção |
| Billing | Stripe (planos Basic / Premium / Enterprise) |
| Deploy | Coolify (Docker multistage) |
| Testes | `node:test` (backend), Vitest + Testing Library (frontend) |

---

## Funcionalidades

### Operação
- **Ordens de serviço** — workflow (Aberta → Em andamento → Finalizada / Cancelada), impressão, auditoria
- **Orçamentos** — link público, aprovação pelo cliente, conversão em OS com baixa de estoque
- **Estoque** — produtos, alertas de mínimo, movimentações rastreadas
- **Clientes e veículos** — CEP (ViaCEP + fallback BrasilAPI), exclusão em cascata (admin)
- **Agenda** — conflitos de horário, lembretes
- **Contas a pagar** — categorias, vencimentos, contas recorrentes
- **Usuários** — roles `admin` e `mecanico` (RBAC)

### Relatórios e fiscal
- **Relatórios** — faturamento, OS, estoque (gráficos)
- **Fechamento mensal** — totais NFS-e/NF-e do mês, tributos e **export ZIP** (CSV/JSON + PDF + XML) para o contador
- **NFS-e** — emissão via Notaas a partir de OS finalizada (serviços; peças na mesma nota enquanto NF-e estiver off)
- **NF-e** — emissão de peças via **Brasil NFe** (`BRASILNFE_TOKEN`); NFS-e de serviço continua na Notaas

### SaaS
- Multi-tenant por `tenant_id`
- Planos com limites de usuários e orçamentos/mês
- Assinatura Stripe (checkout / portal) — ver `docs/SAAS_STRIPE.md`
- Tenant legado pode ficar **Premium sem Stripe** (ajuste direto em `tenants`)

---

## Planos (catálogo)

| Plano | Preço (exibição) | Usuários | Orçamentos/mês |
|-------|------------------|----------|----------------|
| Basic | R$ 100/mês | 2 | 50 |
| Premium | R$ 250/mês | 5 | 200 |
| Enterprise | R$ 397/mês | 999 | 9999 |

A cobrança efetiva usa os Price IDs do Stripe (`STRIPE_PRICE_*`). Os valores acima são o catálogo da aplicação.

---

## Requisitos

- Node.js **22**
- PostgreSQL **14+**
- NPM

---

## Ambiente local

### Docker (recomendado)

```bash
cp .env.docker.example .env.docker   # se ainda não tiver
docker compose --env-file .env.docker up --build
```

- Frontend: http://localhost:8080  
- API: http://localhost:3011/api/health  
- Login padrão (seed): ver `docs/DOCKER.md`

### Manual

**Backend**

```bash
cd backend
cp .env.example .env
# Ajuste DATABASE_URL, JWT_SECRET, PORT=3011
npm install
npm run migrate
npm run dev
```

**Frontend**

```bash
cd frontend
cp .env.example .env   # se existir
# VITE_API_URL=http://localhost:3011/api  (ou deixe o proxy do Vite)
npm install
npm run dev
```

Frontend: http://localhost:5173 · API: http://localhost:3011

---

## Produção (Coolify)

Guia completo: [`docs/DEPLOY_COOLIFY.md`](docs/DEPLOY_COOLIFY.md)

Resumo:

1. Postgres no Coolify → `DATABASE_URL` no backend  
2. Backend: base `/backend`, porta **3011**, healthcheck `GET /api/health`  
3. Frontend: build Vite com `VITE_API_URL=https://api-benny.seudominio.com.br`  
4. Variáveis críticas: `JWT_SECRET`, `FRONTEND_URL`, `SINGLE_TENANT_MODE`, `NOTAAS_*`, Stripe se SaaS. Assistente de orçamento (opcional): `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_MS` — ver `backend/.env.example`  
5. Após deploy: migrations rodam no start (`npm start` → `migrate` + `server.js`)

---

## Fiscal (Notaas)

| Documento | Status |
|-----------|--------|
| NFS-e | Integrada (emitir, status, PDF, XML, cancelar) |
| NF-e | Integrada via Brasil NFe (`BRASILNFE_TOKEN`); desligada sem o token |

Documentação: [`docs/MIGRACAO_NOTAAS.md`](docs/MIGRACAO_NOTAAS.md)

Variáveis típicas:

```env
NOTAAS_API_KEY=ntaas_...
NOTAAS_API_URL=https://platform.notaas.com.br/api/v1
NOTAAS_CNPJ_EMITENTE=...
NOTAAS_AMBIENTE=producao
NOTAAS_CODIGO_MUNICIPIO_IBGE=4105805
NOTAAS_C_TRIB_NAC=310103
NOTAAS_NFE_ENABLED=false
```

Teste de API Key: `cd backend && npm run test-notaas`

---

## Estrutura (visão geral)

```
Benny/
├── backend/
│   ├── server.js                 # Express + CORS + health
│   ├── database.js               # Pool PostgreSQL
│   ├── docker-entrypoint.mjs     # wait DB → migrate → seed → server
│   ├── migrations/               # SQL versionado
│   ├── scripts/                  # migrate, seed, smoke Notaas
│   ├── tests/                    # node:test
│   └── src/
│       ├── config/               # plans, jwt, Notaas, Stripe, roles
│       ├── controllers/
│       ├── services/             # domínio (OS, NF, billing, fechamento…)
│       ├── routes/
│       ├── middleware/
│       └── schemas/              # Zod
├── frontend/
│   └── src/
│       ├── pages/
│       ├── features/             # OS fiscal, dashboard, fechamento
│       ├── components/
│       ├── hooks/
│       └── contexts/             # Auth, Theme
├── docs/                         # Deploy, Docker, SaaS, Notaas, RBAC
└── docker-compose.yml
```

---

## API (principais grupos)

Todas sob `/api` (exceto health). Autenticadas com JWT, salvo auth, CEP, orçamento público e webhook Stripe.

| Grupo | Exemplos |
|-------|----------|
| Auth | `POST /auth/login`, `POST /auth/logout` |
| OS / orçamentos / estoque / clientes | CRUD paginado |
| Notas fiscais | `POST /notas-fiscais/gerar/:osId/nfse`, `GET /:id/pdf`, cancelar |
| Relatórios | `GET /relatorios/dashboard`, `GET /relatorios/fechamento-mensal`, export ZIP |
| Billing | `GET /billing/plans`, checkout, subscription, webhook |
| Sistema | `GET /health`, backup, auditoria |

---

## Testes

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

CI: `.github/workflows/ci.yml`

---

## Documentação

| Doc | Conteúdo |
|-----|----------|
| [`docs/DEPLOY_COOLIFY.md`](docs/DEPLOY_COOLIFY.md) | Deploy produção |
| [`docs/DOCKER.md`](docs/DOCKER.md) | Ambiente local Docker |
| [`docs/SAAS_STRIPE.md`](docs/SAAS_STRIPE.md) | Multi-tenant + Stripe |
| [`docs/MIGRACAO_NOTAAS.md`](docs/MIGRACAO_NOTAAS.md) | Provedor fiscal Notaas |
| [`docs/RBAC.md`](docs/RBAC.md) | Roles admin / mecânico |
| [`docs/REFACTORING.md`](docs/REFACTORING.md) | Notas de arquitetura |

---

## Segurança (resumo)

- JWT + cookie httpOnly (híbrido)
- Helmet, rate limit, CORS com allow-list
- Senhas com bcrypt
- Secrets só em env / Coolify (nunca no git)
- Assinatura inativa bloqueia mutações no modo SaaS

---

## Roadmap conhecido

- [ ] Integração **NF-e** na Notaas (peças separadas da NFS-e)
- [ ] CT-e / notas de entrada (fora do escopo atual)
- [ ] Notificações por e-mail

---

**Licença:** uso proprietário / interno.  
**Produto:** Benny — gestão automotiva (JW Software).
