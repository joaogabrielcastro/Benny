import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

describe("authService — login e tenant", () => {
  it("em single-tenant filtra usuário por tenant_id", () => {
    const src = fs.readFileSync(
      path.join(dir, "../src/services/authService.js"),
      "utf8",
    );
    assert.match(src, /WHERE email = \$1 AND tenant_id = \$2/);
    assert.match(src, /result\.rows\.length > 1/);
    assert.match(src, /ambiguous/);
  });
});
