import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SINGLE_TENANT_ID,
  resolveTenantId,
} from "../src/config/singleTenant.js";

describe("singleTenant", () => {
  it("resolveTenantId sempre retorna SINGLE_TENANT_ID", () => {
    assert.equal(resolveTenantId({ tenantId: 99 }), SINGLE_TENANT_ID);
    assert.equal(resolveTenantId(null), SINGLE_TENANT_ID);
  });
});
