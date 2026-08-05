import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SINGLE_TENANT_ID,
  SINGLE_TENANT_MODE,
  resolveTenantId,
} from "../src/config/singleTenant.js";

describe("singleTenant", () => {
  it("em single-tenant mode resolveTenantId ignora JWT/body", () => {
    if (!SINGLE_TENANT_MODE) {
      // Ambiente SaaS: não aplica esta asserção
      return;
    }
    assert.equal(resolveTenantId({ tenantId: 99 }), SINGLE_TENANT_ID);
    assert.equal(resolveTenantId(null), SINGLE_TENANT_ID);
  });

  it("em multi-tenant mode resolveTenantId usa req.tenantId", () => {
    if (SINGLE_TENANT_MODE) return;
    assert.equal(resolveTenantId({ tenantId: 42, user: { tenantId: 7 } }), 42);
    assert.equal(resolveTenantId({ user: { tenantId: 7 } }), 7);
    assert.throws(() => resolveTenantId({}), /Tenant/);
  });
});
