import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Logo from "./components/Logo";
import LoadingSpinner from "./components/LoadingSpinner";
import ThemeToggle from "./components/ThemeToggle";
import ErrorBoundary from "./components/ErrorBoundary";
import NotificacoesWidget from "./components/NotificacoesWidget";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy loading das páginas
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Estoque = lazy(() => import("./pages/Estoque"));
const Orcamentos = lazy(() => import("./pages/Orcamentos"));
const OrcamentoForm = lazy(() => import("./pages/OrcamentoForm"));
const OrcamentoDetalhes = lazy(() => import("./pages/OrcamentoDetalhes"));
const OrcamentoPublico = lazy(() => import("./pages/OrcamentoPublico"));
const OrdensServico = lazy(() => import("./pages/OrdensServico"));
const OSForm = lazy(() => import("./pages/OSForm"));
const OSDetalhes = lazy(() => import("./pages/OSDetalhes"));
const Agendamentos = lazy(() => import("./pages/Agendamentos"));
const ContasPagar = lazy(() => import("./pages/ContasPagar"));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: "#363636",
                  color: "#fff",
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: "#10B981",
                    secondary: "#fff",
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: "#EF4444",
                    secondary: "#fff",
                  },
                },
              }}
            />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
              <ConditionalNavigation />
              <main className="container mx-auto px-4 py-8">
                <Suspense fallback={<LoadingSpinner size="xl" />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/v/:id" element={<OrcamentoPublico />} />

                    {/* Rotas Protegidas */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Home />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/estoque"
                      element={
                        <ProtectedRoute>
                          <Estoque />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/orcamentos"
                      element={
                        <ProtectedRoute>
                          <Orcamentos />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/orcamentos/novo"
                      element={
                        <ProtectedRoute>
                          <OrcamentoForm />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/orcamentos/:id"
                      element={
                        <ProtectedRoute>
                          <OrcamentoDetalhes />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ordens-servico"
                      element={
                        <ProtectedRoute>
                          <OrdensServico />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ordens-servico/nova"
                      element={
                        <ProtectedRoute>
                          <Navigate to="/orcamentos/novo" replace />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ordens-servico/:id/editar"
                      element={
                        <ProtectedRoute>
                          <OSForm />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ordens-servico/:id"
                      element={
                        <ProtectedRoute>
                          <OSDetalhes />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/agendamentos"
                      element={
                        <ProtectedRoute>
                          <Agendamentos />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/contas-pagar"
                      element={
                        <ProtectedRoute>
                          <ContasPagar />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Suspense>
              </main>
              <ConditionalNotifications />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function ConditionalNavigation() {
  const location = useLocation();

  // Não mostrar navegação na página pública ou login
  if (location.pathname.startsWith("/v") || location.pathname === "/login") {
    return null;
  }

  return <Navigation />;
}

function ConditionalNotifications() {
  const location = useLocation();

  // Não mostrar notificações na página pública ou login
  if (location.pathname.startsWith("/v") || location.pathname === "/login") {
    return null;
  }

  return <NotificacoesWidget />;
}

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const handleLogout = () => {
    if (confirm("Deseja realmente sair do sistema?")) {
      logout();
      navigate("/login");
    }
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 dark:from-gray-800 dark:via-gray-900 dark:to-black text-white shadow-lg transition-colors">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity min-w-0"
          >
            <Logo size="sm" />
            <div className="min-w-0">
              <div className="text-sm sm:text-xl font-bold truncate">
                Benny's Motorsport
              </div>
              <div className="text-[10px] sm:text-xs text-blue-100 dark:text-gray-400 truncate">
                Centro Automotivo
              </div>
            </div>
          </Link>
          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/" active={location.pathname === "/"}>
              Início
            </NavLink>
            <NavLink to="/dashboard" active={isActive("/dashboard")}>
              Dashboard
            </NavLink>
            <NavLink to="/ordens-servico" active={isActive("/ordens-servico")}>
              OS
            </NavLink>
            <NavLink to="/orcamentos" active={isActive("/orcamentos")}>
              Orçamentos
            </NavLink>
            <NavLink to="/agendamentos" active={isActive("/agendamentos")}>
              Agenda
            </NavLink>
            <NavLink to="/contas-pagar" active={isActive("/contas-pagar")}>
              Contas
            </NavLink>
            <NavLink to="/estoque" active={isActive("/estoque")}>
              Estoque
            </NavLink>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="ml-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md transition-colors flex items-center gap-2"
              title="Sair do sistema"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                  clipRule="evenodd"
                />
              </svg>
              Sair
            </button>
          </div>

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md bg-blue-700/70 hover:bg-blue-600 transition-colors"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Abrir menu de navegação"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <NavLink
              to="/"
              active={location.pathname === "/"}
              className="block w-full text-left"
            >
              Início
            </NavLink>
            <NavLink
              to="/dashboard"
              active={isActive("/dashboard")}
              className="block w-full text-left"
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/ordens-servico"
              active={isActive("/ordens-servico")}
              className="block w-full text-left"
            >
              OS
            </NavLink>
            <NavLink
              to="/orcamentos"
              active={isActive("/orcamentos")}
              className="block w-full text-left"
            >
              Orçamentos
            </NavLink>
            <NavLink
              to="/agendamentos"
              active={isActive("/agendamentos")}
              className="block w-full text-left"
            >
              Agenda
            </NavLink>
            <NavLink
              to="/contas-pagar"
              active={isActive("/contas-pagar")}
              className="block w-full text-left"
            >
              Contas
            </NavLink>
            <NavLink
              to="/estoque"
              active={isActive("/estoque")}
              className="block w-full text-left"
            >
              Estoque
            </NavLink>

            <div className="pt-2 flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md transition-colors flex items-center justify-center gap-2"
                title="Sair do sistema"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                    clipRule="evenodd"
                  />
                </svg>
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ to, children, active, className = "" }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-md transition-colors ${
        active ? "bg-blue-700 font-semibold" : "hover:bg-blue-500"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

export default App;
