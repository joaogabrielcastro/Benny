# Arquitetura Benny (single-tenant)

## Modelo de tenancy

- **Modo:** single-tenant (`SINGLE_TENANT_ID`, padrão `1`).
- Tabelas mantêm `tenant_id` para compatibilidade e possível evolução futura.
- `resolveTenantId()` sempre retorna o tenant da oficina; o JWT não altera isolamento de dados.

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
- Validação: Zod (`validate` middleware) em auth, clientes, produtos e serviços.
- Handlers async: `asyncHandler` — erros vão ao middleware central.

## Banco de dados

- **Boot:** `database.js` cria/verifica schema se `SKIP_DB_INIT_DDL` não for `true`.
- **Produção recomendado:** `SKIP_DB_INIT_DDL=true` e `npm run migrate` no deploy.
- Migrations em `backend/migrations/*.sql`, runner: `npm run migrate`.

## Segurança

- `JWT_SECRET` obrigatório em produção (≥ 32 caracteres).
- `helmet` + rate limit no login.
- RBAC: `requireRole('admin')` em rotas sensíveis (ex.: backup).

## Variáveis úteis

| Variável            | Descrição                          |
|---------------------|------------------------------------|
| `DEFAULT_TENANT_ID` | ID do tenant (padrão 1)            |
| `SKIP_DB_INIT_DDL`  | `true` desliga DDL pesado no boot  |
| `JWT_SECRET`        | Segredo JWT (obrigatório em prod)  |
