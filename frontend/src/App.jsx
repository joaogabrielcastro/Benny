import { lazy, Suspense } from "react";
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
const GatewayConfigs = lazy(() => import("./pages/GatewayConfigs"));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
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
                  <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
                  <Route path="/orcamentos" element={<ProtectedRoute><Orcamentos /></ProtectedRoute>} />
                  <Route path="/orcamentos/novo" element={<ProtectedRoute><OrcamentoForm /></ProtectedRoute>} />
                  <Route path="/orcamentos/:id" element={<ProtectedRoute><OrcamentoDetalhes /></ProtectedRoute>} />
                  <Route path="/ordens-servico" element={<ProtectedRoute><OrdensServico /></ProtectedRoute>} />
                  <Route path="/ordens-servico/nova" element={<ProtectedRoute><Navigate to="/orcamentos/novo" replace /></ProtectedRoute>} />
                  <Route path="/ordens-servico/:id/editar" element={<ProtectedRoute><OSForm /></ProtectedRoute>} />
                  <Route path="/ordens-servico/:id" element={<ProtectedRoute><OSDetalhes /></ProtectedRoute>} />
                  <Route path="/agendamentos" element={<ProtectedRoute><Agendamentos /></ProtectedRoute>} />
                  <Route path="/contas-pagar" element={<ProtectedRoute><ContasPagar /></ProtectedRoute>} />
                  {/* <Route path="/gateway-configs" element={<ProtectedRoute><GatewayConfigs /></ProtectedRoute>} /> */}
                </Routes>
              </Suspense>
            </main>
            <ConditionalNotifications />
          </div>
        </Router>
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

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const handleLogout = () => {
    if (confirm("Deseja realmente sair do sistema?")) {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("usuario");
      navigate("/login");
    }
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 dark:from-gray-800 dark:via-gray-900 dark:to-black text-white shadow-lg transition-colors">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <Logo size="sm" />
            <div>
              <div className="text-xl font-bold">Benny's Motorsport</div>
              <div className="text-xs text-blue-100 dark:text-gray-400">
                Centro Automotivo
              </div>
            </div>
          </Link>
          <div className="flex items-center space-x-1">
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
            {/* <NavLink to="/gateway-configs" active={isActive("/gateway-configs")}> 
              Gateways
            </NavLink> */}
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
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, children, active }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-md transition-colors ${
        active ? "bg-blue-700 font-semibold" : "hover:bg-blue-500"
      }`}
    >
      {children}
    </Link>
  );
}

export default App;
