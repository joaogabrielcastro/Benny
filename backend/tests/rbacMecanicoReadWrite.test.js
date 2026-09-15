import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requireRole } from "../src/middleware/requireRole.js";
import { ROLES } from "../src/config/roles.js";

/**
 * Documenta a decisão ASE 5.2 / BENNY-API-001:
 * Mecânico precisa de GET em clientes/produtos/veículos para operar OS/agenda.
 * Mutações continuam admin-only (já aplicado nas rotas).
 */
describe("RBAC mecânico — leitura vs mutação (BENNY-API-001)", () => {
  it("mecânico NÃO passa em gate admin (mutações)", () => {
    const gate = requireRole(ROLES.ADMIN);
    let err = null;
    gate({ user: { role: ROLES.MECANICO } }, {}, (e) => {
      err = e ?? null;
    });
    assert.ok(err);
    assert.equal(err.statusCode, 403);
  });

  it("admin passa no gate admin", () => {
    const gate = requireRole(ROLES.ADMIN);
    let err = "sentinel";
    gate({ user: { role: ROLES.ADMIN } }, {}, (e) => {
      err = e;
    });
    assert.equal(err, undefined);
  });

  it("mecânico passa quando a rota lista mecanico (team OS)", () => {
    const gate = requireRole(ROLES.ADMIN, ROLES.MECANICO);
    let err = "sentinel";
    gate({ user: { role: ROLES.MECANICO } }, {}, (e) => {
      err = e;
    });
    assert.equal(err, undefined);
  });
});
