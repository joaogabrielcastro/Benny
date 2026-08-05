# SaaS multi-tenant + Stripe

Benny pode rodar como **SaaS compartilhado** (várias oficinas no mesmo app/banco) com assinaturas Stripe.

## Ativar multi-tenant

No Coolify (backend):

```env
SINGLE_TENANT_MODE=false
FRONTEND_URL=https://benny.jwsoftware.com.br
STRIPE_SECRET_KEY=sk_live_...   # ou sk_test_ em homologação
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PREMIUM=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

1. Crie 3 Products/Prices mensais no Stripe Dashboard.
2. Cole os Price IDs nas variáveis acima.
3. Webhook endpoint: `https://api-benny.seudominio.com.br/api/billing/webhook`
4. Eventos mínimos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Rode `npm run migrate` (aplica `014_stripe_subscriptions.sql`).
6. Redeploy do backend e do frontend.

## Segurança das keys

- **Nunca** coloque `sk_live_` / `whsec_` no git, issues ou chat.
- Se uma key live vazou, **rotacione** no Stripe Dashboard antes de produção.
- Use Secrets do Coolify; redeploy após alterar.

## Fluxos

| Rota | Função |
|------|--------|
| `GET /api/billing/plans` | Catálogo público |
| `POST /api/billing/checkout` | Signup (oficina+admin) ou upgrade (admin logado) |
| `POST /api/billing/portal` | Customer Portal (trocar/cancelar) |
| `GET /api/billing/subscription` | Status do tenant logado |
| `POST /api/billing/webhook` | Fonte da verdade (assinatura) |

UI: `/planos`, `/assinatura`, `/billing/sucesso`.

## Planos (default)

| Plano | Preço sugerido | `max_usuarios` |
|-------|----------------|----------------|
| basic | R$ 97/mês | 2 |
| premium | R$ 197/mês | 5 |
| enterprise | R$ 397/mês | 999 |

## Enforcement

- JWT carrega `tenantId`; `resolveTenantId` usa o token quando `SINGLE_TENANT_MODE=false`.
- Mutações bloqueadas se `subscription_status` ∉ `active|trialing` (GET liberado + banner).
- Criação de usuário respeita `max_usuarios` (403 com `limite`, `usado`, `upgrade_para`).
- Tenant legado `id=1` permanece `active` sem Stripe até migrar.

## Fora desta entrega

- NFS-e/Notaas **por tenant** (hoje a key é global).
- Trial longo, cupons, cobrança anual.
