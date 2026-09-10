export const ROLES = {
  ADMIN: "admin",
  MECANICO: "mecanico",
};

const LEGACY_ADMIN_ALIASES = new Set(["user", "atendente"]);

/**
 * Normaliza role do JWT/localStorage.
 * Fail-closed: desconhecido/vazio → null (nunca promove a admin).
 */
export function normalizeRole(role) {
  const r = String(role ?? "").trim().toLowerCase();
  if (!r) return null;
  if (r === ROLES.MECANICO) return ROLES.MECANICO;
  if (r === ROLES.ADMIN) return ROLES.ADMIN;
  if (LEGACY_ADMIN_ALIASES.has(r)) return ROLES.ADMIN;
  return null;
}

export function isAdmin(user) {
  return normalizeRole(user?.role) === ROLES.ADMIN;
}

export function isMecanico(user) {
  return normalizeRole(user?.role) === ROLES.MECANICO;
}

export function roleLabel(role) {
  const r = normalizeRole(role);
  if (r === ROLES.MECANICO) return "Mecânico";
  if (r === ROLES.ADMIN) return "Administrador";
  return "Sem permissão";
}

/** Rotas que o mecânico pode acessar (prefixo). */
const MECANICO_ROUTE_PREFIXES = ["/ordens-servico", "/agendamentos"];

export function canAccessRoute(role, pathname) {
  if (isAdmin({ role })) return true;
  if (!isMecanico({ role })) return false;
  return MECANICO_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export const NAV_ITEMS = [
  { to: "/", label: "Início", end: true, roles: [ROLES.ADMIN] },
  { to: "/ordens-servico", label: "Ordens de serviço", roles: [ROLES.ADMIN, ROLES.MECANICO] },
  { to: "/orcamentos", label: "Orçamentos", roles: [ROLES.ADMIN] },
  { to: "/agendamentos", label: "Agenda", roles: [ROLES.ADMIN, ROLES.MECANICO], planFeature: "agenda" },
  { to: "/contas-pagar", label: "Contas a pagar", roles: [ROLES.ADMIN], planFeature: "contas_pagar" },
  { to: "/relatorios", label: "Relatórios", roles: [ROLES.ADMIN], planFeature: "relatorios" },
  { to: "/estoque", label: "Estoque", roles: [ROLES.ADMIN] },
  { to: "/clientes", label: "Clientes", roles: [ROLES.ADMIN] },
  { to: "/usuarios", label: "Usuários", roles: [ROLES.ADMIN] },
  { to: "/assinatura", label: "Assinatura", roles: [ROLES.ADMIN] },
];

export function navItemsForRole(role, { hasFeature } = {}) {
  const r = normalizeRole(role);
  if (!r) return [];
  return NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(r)) return false;
    if (item.planFeature && hasFeature && !hasFeature(item.planFeature)) return false;
    return true;
  });
}
