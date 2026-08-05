# Arquitetura Benny (tenancy)

## Modelo de tenancy

O schema sempre foi multi-tenant (`tenants` + `tenant_id`). O **runtime** depende de `SINGLE_TENANT_MODE`:

| Modo | Quando | Comportamento |
|------|--------|---------------|
| `SINGLE_TENANT_MODE=true` (default se omitido) | Um deploy = uma oficina | `resolveTenantId()` força `DEFAULT_TENANT_ID` (ex.: 1) e ignora JWT |
| `SINGLE_TENANT_MODE=false` | SaaS compartilhado | JWT carrega `tenantId`; queries usam o tenant da sessão |

Billing Stripe (Checkout, Portal, webhooks) e limites por plano: `docs/SAAS_STRIPE.md`.

**Regra:** nunca confiar em `tenant_id` vindo do body; só do JWT / `resolveTenantId(req)`.

## Stack

| Camada    | Tecnologia              |
|-----------|-------------------------|
| Frontend  | React 18, Vite 5, JS    |
| Backend   | Node.js, Express (ESM)  |
| Banco     | PostgreSQL (`pg`)       |
| Fiscal    | Notaas (NFS-e via API Key — global nesta fase) |
| Billing   | Stripe (Checkout + webhooks) |

## API

- Erros: `{ error: string, ...details }` via `AppError` + `errorHandler`.
- Listagens paginadas: `{ data: [], pagination: { page, limit, total, pages } }`.
- Validação: Zod (`validate` middleware) em rotas críticas.
- Handlers async: `asyncHandler` — erros vão ao middleware central.
- Billing: `/api/billing/*` + webhook raw body em `/api/billing/webhook`.

## Módulos principais

| Domínio | Caminho |
|---------|---------|
| Tenancy | `src/config/singleTenant.js` |
| Planos / Stripe | `src/config/plans.js`, `src/services/billingService.js` |
| Numeração ORC/OS | `src/domain/numeracao.js` + sequences PostgreSQL |
| Notas fiscais | `src/services/notasFiscais/` (emitir, sincronizar, cancelar) |
| RBAC | `src/config/roles.js` + `requireRole` |
| Assinatura ativa | `src/middleware/requireActiveSubscription.js` |
