# Arquitetura Benny (single-tenant)

## Modelo de tenancy

### Decisão: single-tenant por deploy

O Benny opera como **uma oficina por instalação** (Bennys Centro Automotivo). Cada deploy (Render, VPS, etc.) serve **um único tenant** com ID fixo (`SINGLE_TENANT_ID`, padrão `1`).

| Aspecto | Escolha atual | Motivo |
|---------|---------------|--------|
| Isolamento de dados | `tenant_id` em todas as tabelas, sempre `1` | Compatibilidade com schema legado multi-tenant; migração futura possível |
| JWT | Não troca tenant | `resolveTenantId()` ignora claims de tenant — evita vazamento entre “empresas” fictícias |
| Novo cliente SaaS | Novo deploy + novo banco | Simplicidade operacional para oficina única |
| Multi-tenant real | Não no roadmap imediato | Exigiria RBAC por empresa, billing e `tenant_id` no JWT |

**Regra prática:** trate o sistema como monolito single-tenant; use `tenant_id` apenas como coluna de schema, não como produto multi-oficina.

## Stack

| Camada    | Tecnologia              |
|-----------|-------------------------|
| Frontend  | React 18, Vite 5, JS    |
| Backend   | Node.js, Express (ESM)  |
| Banco     | PostgreSQL (`pg`)       |
| Fiscal    | Nuvem Fiscal API        |

## API

- Erros: `{ error: string, details?: object }` via `AppError` + `errorHandler`.
- Listagens paginadas: `{ data: [], pagination: { page, limit, total, pages } }`.
- Validação: Zod (`validate` middleware) em rotas críticas.
- Handlers async: `asyncHandler` — erros vão ao middleware central.

## Módulos principais

| Domínio | Caminho |
|---------|---------|
| Numeração ORC/OS | `src/domain/numeracao.js` + sequences PostgreSQL |
| Notas fiscais | `src/services/notasFiscais/` (emitir, sincronizar, cancelar) |
| RBAC | `src/config/roles.js` + `requireRole` |

## Banco de dados

- **Boot:** `database.js` cria/verifica schema se `SKIP_DB_INIT_DDL` não for `true`.
- **Produção recomendado:** `SKIP_DB_INIT_DDL=true` e `npm run migrate` no deploy.
- Migrations em `backend/migrations/*.sql`, runner: `npm run migrate`.

## Segurança

- `JWT_SECRET` obrigatório em produção (≥ 32 caracteres).
- `helmet` + rate limit no login.
- RBAC: `admin` (acesso total) e `mecanico` (OS + agenda). Ver `docs/RBAC.md`.

## CI

GitHub Actions (`.github/workflows/ci.yml`):

- PostgreSQL 16 + `npm test` + `npm run test:integration`
- Build do frontend (`npm run build`)

## Variáveis úteis

| Variável            | Descrição                          |
|---------------------|------------------------------------|
| `DEFAULT_TENANT_ID` | ID do tenant (padrão 1)            |
| `SKIP_DB_INIT_DDL`  | `true` desliga DDL pesado no boot  |
| `JWT_SECRET`        | Segredo JWT (obrigatório em prod)  |
| `DATABASE_URL`      | PostgreSQL (testes de integração)  |
