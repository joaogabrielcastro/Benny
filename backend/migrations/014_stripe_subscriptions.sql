-- Stripe subscriptions + campos de billing em tenants

BEGIN;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(40) DEFAULT 'incomplete';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_stripe_customer
  ON tenants (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_stripe_subscription
  ON tenants (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS subscription_events (
  id SERIAL PRIMARY KEY,
  stripe_event_id VARCHAR(120) NOT NULL UNIQUE,
  tipo VARCHAR(80) NOT NULL,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant legado (Bennys / single-tenant): assinatura ativa sem Stripe
UPDATE tenants
SET subscription_status = COALESCE(NULLIF(subscription_status, ''), 'active'),
    status = COALESCE(NULLIF(status, ''), 'active')
WHERE id = 1
  AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '');

COMMIT;
