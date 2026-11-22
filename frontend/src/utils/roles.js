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

/**
 * Itens de navegação agrupados por área de trabalho.
 * `group` organiza o menu lateral; `mobile` marca atalhos da barra inferior.
 */
export const NAV_GROUPS = [
  { id: "operacao", label: "Operação" },
  { id: "cadastros", label: "Cadastros" },
  { id: "financeiro", label: "Financeiro" },
  { id: "admin", label: "Administração" },
];

export const NAV_ITEMS = [
  { to: "/", label: "Início", end: true, roles: [ROLES.ADMIN], group: "operacao" },
  { to: "/ordens-servico", label: "Ordens de serviço", roles: [ROLES.ADMIN, ROLES.MECANICO], group: "operacao" },
  { to: "/orcamentos", label: "Orçamentos", roles: [ROLES.ADMIN], group: "operacao" },
  { to: "/agendamentos", label: "Agenda", roles: [ROLES.ADMIN, ROLES.MECANICO], planFeature: "agenda", group: "operacao" },
  { to: "/clientes", label: "Clientes", roles: [ROLES.ADMIN], group: "cadastros" },
  { to: "/veiculos", label: "Veículos", roles: [ROLES.ADMIN], group: "cadastros" },
  { to: "/servicos", label: "Serviços", roles: [ROLES.ADMIN], group: "cadastros" },
  { to: "/estoque", label: "Peças e estoque", roles: [ROLES.ADMIN], group: "cadastros" },
  { to: "/financeiro", label: "Visão financeira", roles: [ROLES.ADMIN], group: "financeiro" },
  { to: "/contas-pagar", label: "Contas a pagar", roles: [ROLES.ADMIN], planFeature: "contas_pagar", group: "financeiro" },
  { to: "/notas-fiscais", label: "Notas fiscais", roles: [ROLES.ADMIN], planFeature: "nfse", group: "financeiro" },
  { to: "/relatorios", label: "Relatórios", roles: [ROLES.ADMIN], planFeature: "relatorios", group: "financeiro" },
  { to: "/usuarios", label: "Usuários", roles: [ROLES.ADMIN], group: "admin" },
  { to: "/configuracao-fiscal", label: "Configuração fiscal", roles: [ROLES.ADMIN], group: "admin" },
  { to: "/assinatura", label: "Assinatura", roles: [ROLES.ADMIN], group: "admin" },
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
