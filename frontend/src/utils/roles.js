export const ROLES = {
  ADMIN: "admin",
  MECANICO: "mecanico",
};

export function normalizeRole(role) {
  const r = String(role ?? "").trim().toLowerCase();
  if (r === ROLES.MECANICO) return ROLES.MECANICO;
  return ROLES.ADMIN;
}

export function isAdmin(user) {
  return normalizeRole(user?.role) === ROLES.ADMIN;
}

export function isMecanico(user) {
  return normalizeRole(user?.role) === ROLES.MECANICO;
}

export function roleLabel(role) {
  return isMecanico({ role }) ? "Mecânico" : "Administrador";
}

/** Rotas que o mecânico pode acessar (prefixo). */
const MECANICO_ROUTE_PREFIXES = ["/ordens-servico", "/agendamentos"];

export function canAccessRoute(role, pathname) {
  if (isAdmin({ role })) return true;
  return MECANICO_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export const NAV_ITEMS = [
  { to: "/", label: "Início", end: true, roles: [ROLES.ADMIN] },
  { to: "/ordens-servico", label: "Ordens de serviço", roles: [ROLES.ADMIN, ROLES.MECANICO] },
  { to: "/orcamentos", label: "Orçamentos", roles: [ROLES.ADMIN] },
  { to: "/agendamentos", label: "Agenda", roles: [ROLES.ADMIN, ROLES.MECANICO] },
  { to: "/contas-pagar", label: "Contas a pagar", roles: [ROLES.ADMIN] },
  { to: "/estoque", label: "Estoque", roles: [ROLES.ADMIN] },
  { to: "/clientes", label: "Clientes", roles: [ROLES.ADMIN] },
  { to: "/usuarios", label: "Usuários", roles: [ROLES.ADMIN] },
];

export function navItemsForRole(role) {
  const r = normalizeRole(role);
  return NAV_ITEMS.filter((item) => item.roles.includes(r));
}
