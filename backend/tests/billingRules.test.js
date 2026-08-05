import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isSubscriptionWritable,
  publicTenantBilling,
} from "../src/services/billingService.js";
import { SINGLE_TENANT_MODE } from "../src/config/singleTenant.js";

describe("billingService regras", () => {
  it("isSubscriptionWritable: active e trialing", () => {
    if (SINGLE_TENANT_MODE) {
      assert.equal(isSubscriptionWritable({ subscription_status: "canceled" }), true);
      return;
    }
    assert.equal(
      isSubscriptionWritable({ subscription_status: "active" }),
      true,
    );
    assert.equal(
      isSubscriptionWritable({ subscription_status: "trialing" }),
      true,
    );
    assert.equal(
      isSubscriptionWritable({ subscription_status: "past_due" }),
      false,
    );
    assert.equal(
      isSubscriptionWritable({ subscription_status: "canceled" }),
      false,
    );
  });

  it("isSubscriptionWritable: legado active sem Stripe", () => {
    if (SINGLE_TENANT_MODE) return;
    assert.equal(
      isSubscriptionWritable({
        status: "active",
        stripe_subscription_id: null,
      }),
      true,
    );
  });

  it("isSubscriptionWritable: null tenant", () => {
    if (SINGLE_TENANT_MODE) {
      assert.equal(isSubscriptionWritable(null), false);
      return;
    }
    assert.equal(isSubscriptionWritable(null), false);
  });

  it("publicTenantBilling omite campos sensíveis demais e inclui limites", () => {
    const pub = publicTenantBilling({
      id: 9,
      nome: "Oficina X",
      plano: "premium",
      status: "active",
      subscription_status: "active",
      data_expiracao: null,
      max_usuarios: 5,
      max_orcamentos_mes: 200,
      stripe_customer_id: "cus_123",
      senha_hash: "should-not-appear",
    });
    assert.equal(pub.id, 9);
    assert.equal(pub.max_usuarios, 5);
    assert.equal(pub.max_orcamentos_mes, 200);
    assert.equal(pub.has_stripe, true);
    assert.equal("senha_hash" in pub, false);
  });

  it("publicTenantBilling null", () => {
    assert.equal(publicTenantBilling(null), null);
  });
});
