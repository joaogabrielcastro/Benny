import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Logo from "./components/Logo";
import LoadingSpinner from "./components/LoadingSpinner";
import ThemeToggle from "./components/ThemeToggle";

// Lazy loading das páginas
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Estoque = lazy(() => import("./pages/Estoque"));
const Orcamentos = lazy(() => import("./pages/Orcamentos"));
const OrcamentoForm = lazy(() => import("./pages/OrcamentoForm"));
const OrcamentoDetalhes = lazy(() => import("./pages/OrcamentoDetalhes"));
const OrdensServico = lazy(() => import("./pages/OrdensServico"));
const OSForm = lazy(() => import("./pages/OSForm"));
const OSDetalhes = lazy(() => import("./pages/OSDetalhes"));

function App() {
  return (
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
          <Navigation />
          <main className="container mx-auto px-4 py-8">
            <Suspense fallback={<LoadingSpinner size="xl" />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/estoque" element={<Estoque />} />
                <Route path="/orcamentos" element={<Orcamentos />} />
                <Route path="/orcamentos/novo" element={<OrcamentoForm />} />
                <Route path="/orcamentos/:id" element={<OrcamentoDetalhes />} />
                <Route path="/ordens-servico" element={<OrdensServico />} />
                <Route path="/ordens-servico/nova" element={<OSForm />} />
                <Route path="/ordens-servico/:id" element={<OSDetalhes />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

function Navigation() {
  const location = useLocation();

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
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
              Ordens de Serviço
            </NavLink>
            <NavLink to="/orcamentos" active={isActive("/orcamentos")}>
              Orçamentos
            </NavLink>
            <NavLink to="/estoque" active={isActive("/estoque")}>
              Estoque
            </NavLink>
            <ThemeToggle />
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
