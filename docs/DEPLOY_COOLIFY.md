# Deploy Benny no Coolify

Guia para **Bennys Centro Automotivo** (single-tenant, uma oficina).

## Visão geral

| Serviço | Sugestão |
|---------|----------|
| API | App Node (`backend/`, comando `npm start`) |
| Frontend | Build estático Vite (`frontend/`, `npm run build` → `dist/`) |
| Banco | PostgreSQL gerenciado pelo Coolify |

## 1. PostgreSQL

1. Crie um banco PostgreSQL no Coolify.
2. Copie a `DATABASE_URL` (connection string).

## 2. Backend (API)

**Build / start**

- Diretório raiz do app: `backend`
- Install: `npm ci`
- Start: `npm start`
- Node: **22**

**Variáveis obrigatórias**

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=3011
JWT_SECRET=<mínimo 32 caracteres aleatórios>
DEFAULT_TENANT_ID=1
SKIP_DB_INIT_DDL=true
```

**Após o primeiro deploy (ou a cada migration nova)**

Execute no container ou como comando one-off:

```bash
npm run migrate
```

Isso aplica `backend/migrations/*.sql` e registra em `schema_migrations`.

**Nuvem Fiscal** — copie do `backend/.env.example` e preencha com credenciais do painel (homologação ou produção).

**Health check:** `GET /api/health`

## 3. Frontend

**Build**

- Diretório: `frontend`
- Build: `npm ci && npm run build`
- Publicar pasta `dist/`

**Variável de build**

```env
VITE_API_URL=https://api-benny.seudominio.com.br
```

(sem `/api` no final — o app adiciona automaticamente)

## 4. Migrations pendentes em produção

Confirme que estas migrations foram aplicadas:

- `005_notas_fiscais_por_modelo.sql` (NFS-e + NF-e separados por OS)

```bash
cd backend && npm run migrate
```

## 5. Checklist pós-deploy

- [ ] Login com usuário existente
- [ ] Listagem de OS, clientes, produtos (formato paginado)
- [ ] OS finalizada → NFS-e (serviços) e NF-e (peças) em homologação
- [ ] CEP do cliente salvo na OS antes de emitir NFS-e
- [ ] `JWT_SECRET` forte (não usar valor de desenvolvimento)

## 6. Painel Nuvem Fiscal (contadora)

Alinhar com Débora:

- Regime apuração ISS no painel: **1** = ISS pelo Simples (ME/EPP); com `tpRetISSQN=1` o Benny **não** envia alíquota na DPS (regra ADN)
- `NUVEM_FISCAL_TP_RET_ISSQN=1` (padrão) — só use `2` se houver retenção pelo tomador
- Certificado A1 configurado
- NBS definitivo em `NUVEM_FISCAL_C_NBS`
- CNPJ software SEFAZ: **46.363.985/0001-00** (Nuvem/WA2)

## Referência

Arquitetura: `backend/ARCHITECTURE.md`  
Checklist código: `backend/IMPLEMENTATION_CHECKLIST.md`
