import { useState, useEffect } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";

import {

  FiHome,

  FiTool,

  FiFileText,

  FiCalendar,

  FiDollarSign,

  FiPackage,

  FiUsers,

  FiLogOut,

  FiMenu,

  FiX,

} from "react-icons/fi";

import Logo from "../Logo";

import ThemeToggle from "../ThemeToggle";

import { useAuth } from "../../contexts/AuthContext";

import { navItemsForRole } from "../../utils/roles";



const ICONS = {

  "/": FiHome,

  "/ordens-servico": FiTool,

  "/orcamentos": FiFileText,

  "/agendamentos": FiCalendar,

  "/contas-pagar": FiDollarSign,

  "/estoque": FiPackage,

  "/usuarios": FiUsers,

};



function NavItem({ to, label, icon: Icon, active, onClick }) {

  return (

    <Link

      to={to}

      onClick={onClick}

      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${

        active

          ? "bg-brand-600 text-white shadow-md shadow-brand-900/20"

          : "text-slate-400 hover:text-white hover:bg-slate-800"

      }`}

    >

      <Icon className={`h-5 w-5 shrink-0 ${active ? "opacity-100" : "opacity-70"}`} />

      <span>{label}</span>

    </Link>

  );

}



export default function AppSidebar() {

  const location = useLocation();

  const navigate = useNavigate();

  const { logout, user, roleLabel: papel } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = navItemsForRole(user?.role);



  const isActive = (path, end) => {

    if (end) return location.pathname === path;

    return (

      location.pathname === path ||

      location.pathname.startsWith(`${path}/`)

    );

  };



  useEffect(() => {

    setMobileOpen(false);

  }, [location.pathname]);



  const handleLogout = () => {

    if (window.confirm("Deseja sair do sistema?")) {

      logout();

      navigate("/login");

    }

  };



  const sidebarContent = (

    <div className="flex h-full flex-col">

      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">

        <Logo size="sm" />

        <div className="min-w-0">

          <p className="text-sm font-bold text-white truncate">Benny&apos;s</p>

          <p className="text-[11px] text-slate-500 truncate">Centro Automotivo</p>

        </div>

      </div>



      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

        {navItems.map((item) => {

          const Icon = ICONS[item.to] || FiTool;

          return (

            <NavItem

              key={item.to}

              to={item.to}

              label={item.label}

              icon={Icon}

              active={isActive(item.to, item.end)}

              onClick={() => setMobileOpen(false)}

            />

          );

        })}

      </nav>



      <div className="border-t border-slate-800 p-3 space-y-2">

        {(user?.nome || user?.email) && (

          <div className="px-3">

            <p className="text-xs text-slate-300 truncate" title={user?.email}>

              {user?.nome || user?.email}

            </p>

            <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">

              {papel}

            </p>

          </div>

        )}

        <div className="flex items-center gap-2 px-1">

          <ThemeToggle className="!text-slate-400 hover:!bg-slate-800 !rounded-lg" />

          <button

            type="button"

            onClick={handleLogout}

            className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"

          >

            <FiLogOut className="h-4 w-4" />

            Sair

          </button>

        </div>

      </div>

    </div>

  );



  return (

    <>

      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 h-14">

        <button

          type="button"

          onClick={() => setMobileOpen(true)}

          className="btn-ghost !p-2"

          aria-label="Abrir menu"

        >

          <FiMenu className="h-5 w-5" />

        </button>

        <div className="flex items-center gap-2 min-w-0">

          <Logo size="sm" />

          <span className="font-semibold text-slate-900 dark:text-white truncate text-sm">

            Benny&apos;s

          </span>

        </div>

        <ThemeToggle />

      </header>



      {mobileOpen && (

        <button

          type="button"

          className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"

          aria-label="Fechar menu"

          onClick={() => setMobileOpen(false)}

        />

      )}



      <aside

        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-sidebar shadow-sidebar transform transition-transform duration-300 ${

          mobileOpen ? "translate-x-0" : "-translate-x-full"

        }`}

      >

        <button

          type="button"

          className="absolute top-4 right-3 p-2 text-slate-400 hover:text-white"

          onClick={() => setMobileOpen(false)}

          aria-label="Fechar"

        >

          <FiX className="h-5 w-5" />

        </button>

        {sidebarContent}

      </aside>



      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-sidebar shadow-sidebar">

        {sidebarContent}

      </aside>

    </>

  );

}


