import { describe, it, expect } from "vitest";
import {
  normalizeRole,
  isAdmin,
  isMecanico,
  canAccessRoute,
  navItemsForRole,
  roleLabel,
  ROLES,
} from "./roles";

describe("roles", () => {
  it("normalizeRole fail-closed", () => {
    expect(normalizeRole("admin")).toBe(ROLES.ADMIN);
    expect(normalizeRole("mecanico")).toBe(ROLES.MECANICO);
    expect(normalizeRole("user")).toBe(ROLES.ADMIN);
    expect(normalizeRole("atendente")).toBe(ROLES.ADMIN);
    expect(normalizeRole("hacker")).toBeNull();
    expect(normalizeRole("")).toBeNull();
    expect(normalizeRole(null)).toBeNull();
  });

  it("isAdmin / isMecanico", () => {
    expect(isAdmin({ role: "admin" })).toBe(true);
    expect(isAdmin({ role: "mecanico" })).toBe(false);
    expect(isMecanico({ role: "mecanico" })).toBe(true);
    expect(isAdmin({ role: "super" })).toBe(false);
  });

  it("canAccessRoute restringe mecânico", () => {
    expect(canAccessRoute("admin", "/estoque")).toBe(true);
    expect(canAccessRoute("mecanico", "/ordens-servico")).toBe(true);
    expect(canAccessRoute("mecanico", "/ordens-servico/1")).toBe(true);
    expect(canAccessRoute("mecanico", "/agendamentos")).toBe(true);
    expect(canAccessRoute("mecanico", "/estoque")).toBe(false);
    expect(canAccessRoute("mecanico", "/orcamentos")).toBe(false);
    expect(canAccessRoute(null, "/")).toBe(false);
  });

  it("navItemsForRole filtra menu", () => {
    const admin = navItemsForRole("admin");
    const mec = navItemsForRole("mecanico");
    expect(admin.some((i) => i.to === "/estoque")).toBe(true);
    expect(mec.every((i) =>
      ["/ordens-servico", "/agendamentos"].includes(i.to),
    )).toBe(true);
    expect(navItemsForRole("x")).toEqual([]);
  });

  it("roleLabel", () => {
    expect(roleLabel("admin")).toBe("Administrador");
    expect(roleLabel("mecanico")).toBe("Mecânico");
    expect(roleLabel("x")).toBe("Sem permissão");
  });
});
