# Plano de refatoração — Benny



## Fase P0 — Concluída (base)



- Remoção de código morto (`express-validator`, `date-fns`, componentes/hooks não usados, scripts legados).

- Correção DDL `contas_pagar` em `database.js`.

- `calcularTotais` compartilhado em `backend/src/domain/`.

- Zod em orçamentos e ordens de serviço.

- Rate limit em rotas públicas de orçamento.

- `tenant_id` no scheduler de lembretes.

- Índices de performance (`006_perf_indexes.sql` + `database.js`).



**Deploy:** rodar `npm run migrate` no backend após pull.



## Fase P1 — Concluída



- Painel unificado: gráficos em **Início** (`DashboardCharts`), `/dashboard` redireciona para `/`.

- API `/relatorios/dashboard` enriquecida (OS por status, estoque baixo).

- Paginação server-side em **OS** e **orçamentos** (10 por página, busca com debounce).

- Filtros avançados de OS no servidor (cliente, datas, ordenação).

- `PageHeader` + `pro-card` em orçamentos; toast + `ConfirmDialog` em detalhes do orçamento.



## Fase P1b — Concluída



- Testes de integração DB: `tests/orcamentosAprovarOs.test.js` (requer `DATABASE_URL`).

- Design system em `OrcamentoDetalhes` e `OSDetalhes` (`PageHeader`, `pro-card`, toast).

- `utils/statusColors.js` para badges de status.

- Removido `pages/Dashboard.jsx` legado.



## Fase P2 — Concluída



- Design system em `Estoque`, `Agendamentos`, `OSForm`.

- Sequences PostgreSQL `seq_orcamento_numero` / `seq_os_numero` + `src/domain/numeracao.js` (migration `007`).

- Paginação server-side no **Estoque** (busca + filtro estoque baixo/zerado).

- RBAC: papéis `admin` e `mecanico` (migration `008`, ver `docs/RBAC.md`).



## Fase P3 — Concluída



- **Notas fiscais modularizadas** em `backend/src/services/notasFiscais/`:

  - `nuvemRespostaParser.js` — status e parsing da Nuvem Fiscal

  - `notasFiscaisMapper.js` — resposta da API

  - `notasFiscaisRepository.js` — persistência e consultas

  - `notasFiscaisSincronizar.js` / `notasFiscaisEmitir.js` — fluxos de negócio

  - `notasFiscaisService.js` — fachada (compatível com controllers existentes)

- **Gestão de usuários (admin):** API `GET/POST/PUT /usuarios` + página **Usuários** no frontend.



## Fase P4 — Concluída



- **Single-tenant formal:** `backend/ARCHITECTURE.md` documenta decisão, `SINGLE_TENANT_ID`, JWT e roadmap.

- **CI:** `.github/workflows/ci.yml` — Postgres 16, `npm test`, `npm run test:integration`, build do frontend.

- **Cancelamento de NF:** `PUT /notas-fiscais/:id/cancelar` (Zod: motivo ≥ 15 chars), `notasFiscaisCancelar.js`, cliente Nuvem (`cancelarNfse` / `cancelarNfe`), botão na modal de NF em **OS Detalhes**.



## Próximo (P5 — segurança / produto)



- Auditoria de ações por usuário (log de quem alterou OS, orçamento, NF).

- 2FA no login (opcional).

- E-mail transacional (lembretes, orçamento aprovado).


