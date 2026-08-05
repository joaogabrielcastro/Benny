import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRole,
  requireKnownRole,
  isAdmin,
  isMecanico,
  ROLES,
} from "../src/config/roles.js";

describe("normalizeRole (fail-closed)", () => {
  it("mantém admin e mecanico", () => {
    assert.equal(normalizeRole("admin"), ROLES.ADMIN);
    assert.equal(normalizeRole("MECANICO"), ROLES.MECANICO);
  });

  it("mapeia aliases legados conhecidos para admin", () => {
    assert.equal(normalizeRole("user"), ROLES.ADMIN);
    assert.equal(normalizeRole("atendente"), ROLES.ADMIN);
  });

  it("não promove vazio, null ou role desconhecida a admin", () => {
    assert.equal(normalizeRole(""), null);
    assert.equal(normalizeRole(null), null);
    assert.equal(normalizeRole(undefined), null);
    assert.equal(normalizeRole("superuser"), null);
    assert.equal(normalizeRole("hacker"), null);
  });

  it("isAdmin / isMecanico respeitam fail-closed", () => {
    assert.equal(isAdmin("admin"), true);
    assert.equal(isAdmin("superuser"), false);
    assert.equal(isAdmin(""), false);
    assert.equal(isMecanico("mecanico"), true);
    assert.equal(isMecanico("admin"), false);
  });

  it("requireKnownRole lança para inválidos", () => {
    assert.equal(requireKnownRole("admin"), ROLES.ADMIN);
    assert.throws(() => requireKnownRole("god"), /inválido/i);
    assert.throws(() => requireKnownRole(""), /inválido/i);
  });
});
