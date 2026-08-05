# Deploy Benny no Coolify

Guia para o Benny em produção. O modo padrão histórico era **uma oficina por deploy**; o produto agora também roda como **SaaS multi-oficina** (mesmo backend + Postgres) com Stripe — ver `docs/SAAS_STRIPE.md`.

## Visão geral

| Serviço | Sugestão |
|---------|----------|
| API | App Node (`backend/`, comando `npm start`) |
| Frontend | Build estático Vite (`frontend/`, `npm run build` → `dist/`) |
| Banco | PostgreSQL gerenciado pelo Coolify (compartilhado no SaaS) |

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
SINGLE_TENANT_MODE=false
FRONTEND_URL=https://benny.jwsoftware.com.br
SKIP_DB_INIT_DDL=true
```

**SaaS + Stripe** (obrigatório com `SINGLE_TENANT_MODE=false`):

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PREMIUM=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

Webhook Stripe → `https://api-benny.seudominio.com.br/api/billing/webhook`  
Detalhes e rotação de secrets: `docs/SAAS_STRIPE.md`.

**Importante:** se keys `sk_live_` / `whsec_` vazaram em chat ou git, **rotacione** no Stripe antes de produção.

**Após o primeiro deploy (ou a cada migration nova)**

Execute no container ou como comando one-off:

```bash
npm run migrate
```

Isso aplica `backend/migrations/*.sql` e registra em `schema_migrations`.

**Nuvem Fiscal** — credenciais e ambiente (ver seção 7).

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
- [ ] OS finalizada → NFS-e (serviços) e NF-e (peças) em **produção** (não sandbox)
- [ ] CEP do cliente salvo na OS antes de emitir NFS-e
- [ ] `JWT_SECRET` forte (não usar valor de desenvolvimento)

## 6. Painel Notaas (contadora / fiscal)

Alinhar com o contador:

- Empresa Bennys cadastrada no Dashboard Notaas + **certificado A1**
- Município Colombo — IBGE `4105805`
- Código de serviço (cTribNac / LC 116): `310103` (mecânica — confirmar)
- Alíquota ISS alinhada com `NOTAAS_ALIQUOTA_ISS` (ex.: 2)
- Ambiente produção no painel Notaas (não misturar com sandbox)

## 7. Notaas (produção) — provedor fiscal NFS-e

Guia completo: `docs/MIGRACAO_NOTAAS.md`  
Docs API: https://docs.notaas.com.br

### 7.1 Painel Notaas (web)

1. [platform.notaas.com.br](https://platform.notaas.com.br) — empresa + certificado A1
2. Configurar serviço padrão / município / ambiente
3. Dashboard → **API Keys** → Project Key (`ntaas_...`)

### 7.2 Coolify — variáveis do **backend**

```env
NOTAAS_API_KEY=ntaas_...
NOTAAS_API_URL=https://platform.notaas.com.br/api/v1
NOTAAS_CNPJ_EMITENTE=55961553000100
NOTAAS_AMBIENTE=producao
NOTAAS_CODIGO_MUNICIPIO_IBGE=4105805
NOTAAS_C_TRIB_NAC=310103
NOTAAS_C_NBS=120013110
NOTAAS_ALIQUOTA_ISS=2
NOTAAS_NFE_ENABLED=false
WDAPI2_TOKEN=<token wdapi2>
```

Remova `ACBR_API_*` / credenciais Nuvem antigas. **Não** coloque a key no git.

4. **Redeploy** do backend após salvar.

### 7.3 Teste seguro

1. Emita **uma** NFS-e de valor baixo em OS real finalizada
2. Confirme status **autorizada** e PDF (DANFSe)
3. Contadora valida na prefeitura antes de emitir em volume

## Referência

Arquitetura: `backend/ARCHITECTURE.md`  
SaaS + Stripe: `docs/SAAS_STRIPE.md`  
Migração Notaas: `docs/MIGRACAO_NOTAAS.md`  
Checklist código: `backend/IMPLEMENTATION_CHECKLIST.md`
