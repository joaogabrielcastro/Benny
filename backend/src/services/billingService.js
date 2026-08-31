import bcrypt from "bcrypt";
import pool from "../../database.js";
import { AppError, badRequest, notFound } from "../lib/AppError.js";
import { ROLES } from "../config/roles.js";
import {
  getPlanById,
  getPlanByStripePriceId,
  getPlanCatalog,
  getPlanFeatures,
  maxUsuariosForPlan,
  maxOrcamentosMesForPlan,
} from "../config/plans.js";
import {
  getFrontendBaseUrl,
  getStripe,
  getStripeWebhookSecret,
  isStripeConfigured,
} from "../config/stripe.js";
import { SINGLE_TENANT_MODE } from "../config/singleTenant.js";

const SALT_ROUNDS = 10;

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing"]);

function slugify(nome) {
  const base = String(nome || "oficina")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "oficina";
}

async function uniqueSlug(base) {
  let slug = base;
  let n = 0;
  for (;;) {
    const r = await pool.query(`SELECT 1 FROM tenants WHERE slug = $1`, [slug]);
    if (!r.rows[0]) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function getTenantById(tenantId) {
  const r = await pool.query(`SELECT * FROM tenants WHERE id = $1`, [tenantId]);
  return r.rows[0] || null;
}

export function isSubscriptionWritable(tenant) {
  if (!tenant) return false;
  if (SINGLE_TENANT_MODE) return true;
  const sub = String(tenant.subscription_status || tenant.status || "").toLowerCase();
  if (ACTIVE_SUB_STATUSES.has(sub)) return true;
  // Legado sem Stripe (ex.: tenant 1 migrado)
  if (!tenant.stripe_subscription_id && String(tenant.status || "").toLowerCase() === "active") {
    return true;
  }
  return false;
}

export function publicTenantBilling(tenant) {
  if (!tenant) return null;
  return {
    id: tenant.id,
    nome: tenant.nome,
    plano: tenant.plano,
    status: tenant.status,
    subscription_status: tenant.subscription_status || tenant.status,
    data_expiracao: tenant.data_expiracao,
    max_usuarios: tenant.max_usuarios,
    max_orcamentos_mes: tenant.max_orcamentos_mes,
    stripe_customer_id: tenant.stripe_customer_id || null,
    has_stripe: Boolean(tenant.stripe_customer_id),
  };
}

export async function listPublicPlans() {
  return getPlanCatalog().map(({ stripePriceId, ...rest }) => ({
    ...rest,
    // não expor price id se preferir; útil para debug em staging
    stripePriceId: process.env.NODE_ENV === "production" ? undefined : stripePriceId,
  }));
}

async function assertEmailAvailable(email, { excludeUserId } = {}) {
  const emailNorm = String(email || "").toLowerCase().trim();
  if (!emailNorm) throw badRequest("E-mail obrigatório");
  const r = await pool.query(
    `SELECT id FROM usuarios WHERE email = $1 ${excludeUserId ? "AND id <> $2" : ""} LIMIT 1`,
    excludeUserId ? [emailNorm, excludeUserId] : [emailNorm],
  );
  if (r.rows[0]) {
    throw new AppError(409, "E-mail já cadastrado");
  }
  return emailNorm;
}

async function createTenantWithAdmin({ oficina, admin, plan }) {
  const nomeOficina = String(oficina?.nome || "").trim();
  const emailOficina = String(oficina?.email || admin?.email || "")
    .toLowerCase()
    .trim();
  if (!nomeOficina) throw badRequest("Nome da oficina obrigatório");
  if (!emailOficina) throw badRequest("E-mail da oficina obrigatório");

  const adminNome = String(admin?.nome || "").trim();
  const adminEmail = await assertEmailAvailable(admin?.email);
  const senha = String(admin?.senha || "");
  if (!adminNome) throw badRequest("Nome do administrador obrigatório");
  if (senha.length < 6) throw badRequest("Senha deve ter no mínimo 6 caracteres");

  const slug = await uniqueSlug(slugify(nomeOficina));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const t = await client.query(
      `INSERT INTO tenants (
         slug, nome, email, telefone, status, plano, max_usuarios, max_orcamentos_mes, subscription_status
       ) VALUES ($1,$2,$3,$4,'incomplete',$5,$6,$7,'incomplete')
       RETURNING *`,
      [
        slug,
        nomeOficina,
        emailOficina,
        oficina?.telefone || null,
        plan.id,
        plan.maxUsuarios,
        plan.maxOrcamentosMes ?? maxOrcamentosMesForPlan(plan.id),
      ],
    );
    const tenant = t.rows[0];
    const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);
    await client.query(
      `INSERT INTO usuarios (tenant_id, nome, email, senha_hash, role, ativo)
       VALUES ($1,$2,$3,$4,$5,true)`,
      [tenant.id, adminNome, adminEmail, senha_hash, ROLES.ADMIN],
    );
    await client.query("COMMIT");
    return tenant;
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      throw new AppError(409, "E-mail ou oficina já cadastrados");
    }
    throw err;
  } finally {
    client.release();
  }
}

async function ensureStripeCustomer(tenant) {
  const stripe = getStripe();
  if (tenant.stripe_customer_id) return tenant.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: tenant.email,
    name: tenant.nome,
    metadata: { tenant_id: String(tenant.id) },
  });

  await pool.query(
    `UPDATE tenants SET stripe_customer_id = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2`,
    [customer.id, tenant.id],
  );
  return customer.id;
}

/**
 * Checkout: signup público (oficina + admin) ou upgrade de tenant autenticado.
 */
export async function createCheckout({ planId, tenantId, oficina, admin }) {
  if (!isStripeConfigured()) {
    throw new AppError(503, "Billing Stripe não configurado neste ambiente");
  }

  const plan = getPlanById(planId);
  if (!plan) throw badRequest("Plano inválido");
  if (!plan.stripePriceId) {
    throw new AppError(
      503,
      `Price ID do plano ${plan.id} não configurado (STRIPE_PRICE_${plan.id.toUpperCase()})`,
    );
  }

  let tenant;
  if (tenantId) {
    tenant = await getTenantById(tenantId);
    if (!tenant) throw notFound("Oficina não encontrada");
  } else {
    if (!oficina || !admin) {
      throw badRequest("Dados da oficina e do administrador são obrigatórios");
    }
    tenant = await createTenantWithAdmin({ oficina, admin, plan });
  }

  const customerId = await ensureStripeCustomer(tenant);
  const stripe = getStripe();
  const front = getFrontendBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${front}/billing/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${front}/planos?cancelado=1`,
    client_reference_id: String(tenant.id),
    metadata: {
      tenant_id: String(tenant.id),
      plan_id: plan.id,
    },
    subscription_data: {
      metadata: {
        tenant_id: String(tenant.id),
        plan_id: plan.id,
      },
    },
    allow_promotion_codes: true,
  });

  return {
    url: session.url,
    sessionId: session.id,
    tenantId: tenant.id,
  };
}

export async function createBillingPortal({ tenantId }) {
  if (!isStripeConfigured()) {
    throw new AppError(503, "Billing Stripe não configurado neste ambiente");
  }
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw notFound("Oficina não encontrada");
  if (!tenant.stripe_customer_id) {
    throw badRequest("Esta oficina ainda não possui cliente Stripe. Assine um plano primeiro.");
  }
  const stripe = getStripe();
  const front = getFrontendBaseUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${front}/assinatura`,
  });
  return { url: session.url };
}

function mapStripeStatus(status) {
  const s = String(status || "").toLowerCase();
  if (ACTIVE_SUB_STATUSES.has(s)) return s;
  if (s === "past_due" || s === "unpaid") return "past_due";
  if (s === "canceled" || s === "incomplete_expired") return "canceled";
  if (s === "incomplete") return "incomplete";
  return s || "incomplete";
}

function tenantStatusFromSub(subStatus) {
  if (ACTIVE_SUB_STATUSES.has(subStatus)) return "active";
  if (subStatus === "past_due") return "active"; // leitura ok; writes bloqueados
  if (subStatus === "canceled") return "canceled";
  return "suspended";
}

async function applySubscriptionToTenant(tenantId, subscription) {
  const priceId =
    subscription?.items?.data?.[0]?.price?.id ||
    subscription?.plan?.id ||
    null;
  const plan = getPlanByStripePriceId(priceId);
  const planId = plan?.id || subscription?.metadata?.plan_id || "basic";
  const maxUsers = plan?.maxUsuarios ?? maxUsuariosForPlan(planId);
  const maxOrc = plan?.maxOrcamentosMes ?? maxOrcamentosMesForPlan(planId);
  const subStatus = mapStripeStatus(subscription?.status);
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await pool.query(
    `UPDATE tenants SET
       stripe_subscription_id = $1,
       stripe_price_id = $2,
       stripe_customer_id = COALESCE($3, stripe_customer_id),
       subscription_status = $4,
       status = $5,
       plano = $6,
       max_usuarios = $7,
       max_orcamentos_mes = $8,
       data_expiracao = $9,
       atualizado_em = CURRENT_TIMESTAMP
     WHERE id = $10`,
    [
      subscription.id,
      priceId,
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id || null,
      subStatus,
      tenantStatusFromSub(subStatus),
      planId,
      maxUsers,
      maxOrc,
      periodEnd,
      tenantId,
    ],
  );
}

async function resolveTenantIdFromStripeObject(obj) {
  const metaTid = Number(obj?.metadata?.tenant_id);
  if (Number.isFinite(metaTid) && metaTid > 0) return metaTid;

  const ref = Number(obj?.client_reference_id);
  if (Number.isFinite(ref) && ref > 0) return ref;

  const subId = obj?.subscription || obj?.id;
  if (subId && typeof subId === "string" && subId.startsWith("sub_")) {
    const r = await pool.query(
      `SELECT id FROM tenants WHERE stripe_subscription_id = $1`,
      [subId],
    );
    if (r.rows[0]) return r.rows[0].id;
  }

  const customerId =
    typeof obj?.customer === "string" ? obj.customer : obj?.customer?.id;
  if (customerId) {
    const r = await pool.query(
      `SELECT id FROM tenants WHERE stripe_customer_id = $1`,
      [customerId],
    );
    if (r.rows[0]) return r.rows[0].id;
  }
  return null;
}

async function recordEvent(event, tenantId) {
  await pool.query(
    `INSERT INTO subscription_events (stripe_event_id, tipo, tenant_id, payload)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (stripe_event_id) DO NOTHING`,
    [event.id, event.type, tenantId, JSON.stringify(event.data?.object || {})],
  );
}

export async function handleStripeWebhook(rawBody, signatureHeader) {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    throw new AppError(503, "STRIPE_WEBHOOK_SECRET não configurado");
  }
  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, secret);
  } catch (err) {
    throw new AppError(400, `Webhook inválido: ${err.message}`);
  }

  const dup = await pool.query(
    `SELECT 1 FROM subscription_events WHERE stripe_event_id = $1`,
    [event.id],
  );
  if (dup.rows[0]) {
    return { received: true, duplicate: true };
  }

  const obj = event.data.object;
  let tenantId = await resolveTenantIdFromStripeObject(obj);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        tenantId =
          tenantId ||
          Number(obj.client_reference_id) ||
          Number(obj.metadata?.tenant_id);
        if (!tenantId) break;

        if (obj.customer) {
          await pool.query(
            `UPDATE tenants SET stripe_customer_id = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2`,
            [obj.customer, tenantId],
          );
        }

        if (obj.subscription) {
          const sub = await stripe.subscriptions.retrieve(obj.subscription);
          await applySubscriptionToTenant(tenantId, sub);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        if (!tenantId) break;
        await applySubscriptionToTenant(tenantId, obj);
        break;
      }
      case "customer.subscription.deleted": {
        if (!tenantId) break;
        await pool.query(
          `UPDATE tenants SET
             subscription_status = 'canceled',
             status = 'canceled',
             stripe_subscription_id = NULL,
             atualizado_em = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [tenantId],
        );
        break;
      }
      case "invoice.payment_failed": {
        if (!tenantId) break;
        await pool.query(
          `UPDATE tenants SET
             subscription_status = 'past_due',
             atualizado_em = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [tenantId],
        );
        break;
      }
      default:
        break;
    }
  } finally {
    await recordEvent(event, tenantId);
  }

  return { received: true };
}

export async function assertCanCreateUsuario(tenantId) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw notFound("Oficina não encontrada");

  const max = Number(tenant.max_usuarios) || maxUsuariosForPlan(tenant.plano);
  const count = await pool.query(
    `SELECT COUNT(*)::int AS c FROM usuarios WHERE tenant_id = $1 AND ativo = true`,
    [tenantId],
  );
  const usado = count.rows[0]?.c ?? 0;
  if (usado >= max) {
    throw new AppError(
      403,
      `Limite de usuários do plano atingido (${usado}/${max}). Faça upgrade para adicionar mais.`,
      {
        code: "USER_LIMIT",
        limite: max,
        usado,
        upgrade_para: tenant.plano === "basic" ? "premium" : "enterprise",
      },
    );
  }
}

export async function assertCanCreateOrcamento(tenantId) {
  if (SINGLE_TENANT_MODE) return;

  const tenant = await getTenantById(tenantId);
  if (!tenant) throw notFound("Oficina não encontrada");

  const max =
    Number(tenant.max_orcamentos_mes) ||
    maxOrcamentosMesForPlan(tenant.plano);
  const count = await pool.query(
    `SELECT COUNT(*)::int AS c FROM orcamentos
     WHERE tenant_id = $1 AND criado_em >= date_trunc('month', CURRENT_TIMESTAMP)`,
    [tenantId],
  );
  const usado = count.rows[0]?.c ?? 0;
  if (usado >= max) {
    throw new AppError(
      403,
      `Limite de orçamentos do mês atingido (${usado}/${max}). Faça upgrade para criar mais.`,
      {
        code: "ORCAMENTO_LIMIT",
        limite: max,
        usado,
        upgrade_para: tenant.plano === "basic" ? "premium" : "enterprise",
      },
    );
  }
}

export async function getSubscriptionSummary(tenantId) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw notFound("Oficina não encontrada");
  const count = await pool.query(
    `SELECT COUNT(*)::int AS c FROM usuarios WHERE tenant_id = $1 AND ativo = true`,
    [tenantId],
  );
  const plan = getPlanById(tenant.plano);
  return {
    ...publicTenantBilling(tenant),
    usuarios_ativos: count.rows[0]?.c ?? 0,
    plan_nome: plan?.nome || tenant.plano,
    features: getPlanFeatures(tenant.plano),
    writable: isSubscriptionWritable(tenant),
    stripe_configured: isStripeConfigured(),
  };
}
