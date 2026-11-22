import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiTool,
  FiFileText,
  FiCalendar,
  FiDollarSign,
  FiBarChart2,
  FiPackage,
  FiClipboard,
  FiUser,
  FiUsers,
  FiCreditCard,
  FiLogOut,
  FiMenu,
  FiX,
  FiSearch,
  FiPlus,
  FiTruck,
  FiPieChart,
  FiFile,
  FiSettings,
  FiMoreHorizontal,
  FiChevronDown,
} from "react-icons/fi";
import Logo from "../Logo";
import ThemeToggle from "../ThemeToggle";
import ConfirmDialog from "../ConfirmDialog";
import NotificacoesWidget from "../NotificacoesWidget";
import CommandPalette from "./CommandPalette";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { navItemsForRole, NAV_GROUPS } from "../../utils/roles";

export const NAV_ICONS = {
  "/": FiHome,
  "/ordens-servico": FiTool,
  "/orcamentos": FiFileText,
  "/agendamentos": FiCalendar,
  "/contas-pagar": FiDollarSign,
  "/financeiro": FiPieChart,
  "/notas-fiscais": FiFile,
  "/relatorios": FiBarChart2,
  "/estoque": FiPackage,
  "/servicos": FiClipboard,
  "/clientes": FiUser,
  "/veiculos": FiTruck,
  "/usuarios": FiUsers,
  "/assinatura": FiCreditCard,
  "/configuracao-fiscal": FiSettings,
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

function useIsActive() {
  const location = useLocation();
  return (path, end) =>
    end
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`);
}

function SidebarNav({ items, onNavigate }) {
  const isActive = useIsActive();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5" aria-label="Menu principal">
      {NAV_GROUPS.map((g) => {
        const groupItems = items.filter((i) => i.group === g.id);
        if (!groupItems.length) return null;
        return (
          <div key={g.id}>
            <p className="eyebrow px-2.5 mb-1.5">{g.label}</p>
            <ul className="space-y-0.5">
              {groupItems.map((item) => {
                const Icon = NAV_ICONS[item.to] || FiTool;
                const active = isActive(item.to, item.end);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        active
                          ? "bg-white dark:bg-ink-800 text-ink-900 dark:text-white font-semibold shadow-card ring-1 ring-ink-200/80 dark:ring-ink-700"
                          : "text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-ink-850"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? "text-brand-600 dark:text-brand-400" : "text-ink-400 group-hover:text-ink-600 dark:group-hover:text-ink-300"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 min-w-0">
      <Logo size="xs" className="rounded-lg overflow-hidden ring-1 ring-ink-200 dark:ring-ink-700 bg-white" />
      <div className="min-w-0 leading-tight">
        <p className="text-sm font-bold text-ink-900 dark:text-white truncate">Benny&apos;s</p>
        <p className="text-2xs text-ink-500 truncate">Centro Automotivo</p>
      </div>
    </Link>
  );
}

function UserMenu({ onLogout }) {
  const { user, roleLabel } = useAuth();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setAberto(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [aberto]);

  const nome = user?.nome || user?.email || "Usuário";
  const iniciais = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-ink-100 dark:hover:bg-ink-800"
        aria-label="Menu do usuário"
        aria-expanded={aberto}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white dark:bg-white dark:text-ink-900 text-xs font-bold">
          {iniciais}
        </span>
        <span className="hidden md:block text-left leading-tight max-w-[10rem]">
          <span className="block text-xs font-semibold text-ink-900 dark:text-white truncate">{nome}</span>
          <span className="block text-2xs text-ink-500">{roleLabel}</span>
        </span>
        <FiChevronDown className="hidden md:block h-3.5 w-3.5 text-ink-400" />
      </button>
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-56 pro-card shadow-pop z-50 p-1.5 animate-fade-in">
          <div className="px-2.5 py-2 border-b border-ink-100 dark:border-ink-800 mb-1">
            <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">{nome}</p>
            {user?.email && <p className="text-xs text-ink-500 truncate">{user.email}</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <FiLogOut className="h-4 w-4" />
            Sair do sistema
          </button>
        </div>
      )}
    </div>
  );
}

function BottomNav({ items, onSearch, onMenu }) {
  const isActive = useIsActive();
  const atalhos = ["/", "/ordens-servico", "/agendamentos"]
    .map((to) => items.find((i) => i.to === to))
    .filter(Boolean)
    .slice(0, 2);
  const agenda = items.find((i) => i.to === "/agendamentos");
  const lista = agenda && !atalhos.includes(agenda) ? [...atalhos, agenda] : atalhos;
  const curto = { "/": "Início", "/ordens-servico": "OS", "/agendamentos": "Agenda" };

  const btn = "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium";
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-ink-200 dark:border-ink-800 bg-white/95 dark:bg-ink-900/95 backdrop-blur-md safe-bottom no-print"
      aria-label="Navegação rápida"
    >
      <div className="flex h-14 px-1">
        {lista.slice(0, Math.ceil(lista.length / 2)).map((i) => {
          const Icon = NAV_ICONS[i.to];
          const a = isActive(i.to, i.end);
          return (
            <NavLink key={i.to} to={i.to} className={`${btn} ${a ? "text-brand-600 dark:text-brand-400" : "text-ink-500"}`}>
              <Icon className="h-5 w-5" />
              {curto[i.to] || i.label}
            </NavLink>
          );
        })}
        <button type="button" onClick={onSearch} className={`${btn} text-ink-500`}>
          <FiSearch className="h-5 w-5" />
          Buscar
        </button>
        {lista.slice(Math.ceil(lista.length / 2)).map((i) => {
          const Icon = NAV_ICONS[i.to];
          const a = isActive(i.to, i.end);
          return (
            <NavLink key={i.to} to={i.to} className={`${btn} ${a ? "text-brand-600 dark:text-brand-400" : "text-ink-500"}`}>
              <Icon className="h-5 w-5" />
              {curto[i.to] || i.label}
            </NavLink>
          );
        })}
        <button type="button" onClick={onMenu} className={`${btn} text-ink-500`}>
          <FiMoreHorizontal className="h-5 w-5" />
          Menu
        </button>
      </div>
    </nav>
  );
}

/**
 * Estrutura de navegação: menu lateral (desktop), gaveta (tablet/mobile),
 * barra superior com busca global e barra inferior (mobile).
 */
export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, isAdmin } = useAuth();
  const { hasFeature } = useSubscription();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [confirmSair, setConfirmSair] = useState(false);
  const navItems = navItemsForRole(user?.role, { hasFeature });

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscaAberta((v) => !v);
      } else if (e.key === "/" && !/input|textarea|select/i.test(e.target?.tagName || "") && !e.target?.isContentEditable) {
        e.preventDefault();
        setBuscaAberta(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const sair = async () => {
    setConfirmSair(false);
    await logout();
    navigate("/login");
  };

  const sidebarBody = (onNavigate) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 h-14 border-b border-ink-200/70 dark:border-ink-800">
        <Brand />
      </div>
      <SidebarNav items={navItems} onNavigate={onNavigate} />
      <div className="border-t border-ink-200/70 dark:border-ink-800 p-3 flex items-center justify-between">
        <span className="text-2xs text-ink-400">Benny&apos;s · gestão da oficina</span>
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <>
      {/* Menu lateral fixo (desktop) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-60 flex-col bg-ink-50 dark:bg-ink-950 border-r border-ink-200/80 dark:border-ink-800 no-print">
        {sidebarBody(undefined)}
      </aside>

      {/* Gaveta (tablet / mobile) */}
      {mobileOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-50 bg-ink-950/50 backdrop-blur-[2px] animate-fade-in"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-ink-50 dark:bg-ink-950 shadow-pop transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className="absolute top-3 right-3 btn-ghost btn-icon"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar"
        >
          <FiX className="h-5 w-5" />
        </button>
        {sidebarBody(() => setMobileOpen(false))}
      </aside>

      {/* Barra superior */}
      <header className="sticky top-0 z-40 lg:pl-60 bg-white/85 dark:bg-ink-950/85 backdrop-blur-md border-b border-ink-200/70 dark:border-ink-800 no-print">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden btn-ghost btn-icon"
            aria-label="Abrir menu"
          >
            <FiMenu className="h-5 w-5" />
          </button>
          <div className="lg:hidden min-w-0">
            <Brand />
          </div>

          <button
            type="button"
            onClick={() => setBuscaAberta(true)}
            className="hidden sm:flex items-center gap-2 flex-1 max-w-md mx-auto lg:mx-0 rounded-lg border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-900 px-3 h-9 text-sm text-ink-500 hover:border-ink-300 dark:hover:border-ink-600 transition-colors"
          >
            <FiSearch className="h-4 w-4" />
            <span className="flex-1 text-left truncate">Buscar placa, cliente ou OS…</span>
            <span className="kbd">{isMac ? "⌘" : "Ctrl"} K</span>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBuscaAberta(true)}
              className="sm:hidden btn-ghost btn-icon"
              aria-label="Buscar"
            >
              <FiSearch className="h-[18px] w-[18px]" />
            </button>
            {isAdmin && (
              <Link to="/orcamentos/novo" className="btn-brand !min-h-[2.25rem] !px-3 hidden sm:inline-flex">
                <FiPlus className="h-4 w-4" />
                <span className="hidden md:inline">Novo atendimento</span>
              </Link>
            )}
            {isAdmin && <NotificacoesWidget />}
            <div className="hidden sm:block lg:hidden">
              <ThemeToggle />
            </div>
            <UserMenu onLogout={() => setConfirmSair(true)} />
          </div>
        </div>
      </header>

      <BottomNav
        items={navItems}
        onSearch={() => setBuscaAberta(true)}
        onMenu={() => setMobileOpen(true)}
      />

      <CommandPalette open={buscaAberta} onClose={() => setBuscaAberta(false)} />

      <ConfirmDialog
        open={confirmSair}
        title="Sair do sistema"
        message="Deseja encerrar sua sessão neste dispositivo?"
        confirmLabel="Sair"
        variant="primary"
        onConfirm={sair}
        onCancel={() => setConfirmSair(false)}
      />
    </>
  );
}
