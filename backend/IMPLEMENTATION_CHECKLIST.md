# Checklist de implementação — Benny

## Arquitetura (atualizado)

- [x] Modo **single-tenant** documentado (`ARCHITECTURE.md`, `resolveTenantId`)
- [x] `asyncHandler` + `AppError` + `errorHandler` central
- [x] Validação **Zod** (login, clientes)
- [x] Paginação padronizada (clientes, OS, orçamentos, produtos)
- [x] `helmet` + rate limit no login
- [x] `JWT_SECRET` obrigatório em produção
- [x] Runner de migrations: `npm run migrate`
- [x] `SKIP_DB_INIT_DDL` para desligar DDL no boot
- [x] RBAC: backup manual só `admin`

## Deploy (Coolify)

- [ ] `JWT_SECRET` forte (≥ 32 caracteres)
- [ ] `SKIP_DB_INIT_DDL=true` + `npm run migrate` no pipeline
- [ ] Migration `005_notas_fiscais_por_modelo.sql` aplicada
- [ ] Variáveis Nuvem Fiscal alinhadas com contadora

## Fiscal

- [x] NFS-e (serviços) + NF-e (peças) separados
- [ ] NBS definitivo da contadora em `C_NBS`
- [ ] Certificado A1 e painel Nuvem em produção

## Frontend

- [x] React Query (`QueryClientProvider`)
- [x] `unwrapListResponse` para API paginada
- [x] `ConfirmDialog` em exclusões OS/orçamento
- [x] Hook `useOrdemServico` (carga OS + NF)
- [x] `asyncHandler` em todas as rotas da API
- [x] Paginação em serviços, veículos, agendamentos, contas, lembretes, NF
- [x] Zod em produtos e serviços (login + clientes já existiam)
- [x] React Query nas páginas: OS lista, orçamentos, dashboard, detalhe OS
- [x] `OSDetalhes`: `useNotasFiscaisOs`, `NotaFiscalModal`, `OSDetalhesAcoes`, `ClienteCepNfseBlock`
- [x] `OSForm`: `useOSForm`, `OSFormItensProdutos`, `OSFormItensServicos`
- [x] Testes Node (`npm test`) + GitHub Actions CI
- [x] Guia deploy: `docs/DEPLOY_COOLIFY.md` + `backend/.env.example`
