import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import LoadingSpinner from "./components/LoadingSpinner";
import ErrorBoundary from "./components/ErrorBoundary";
import NotificacoesWidget from "./components/NotificacoesWidget";
import ProtectedRoute from "./components/ProtectedRoute";
import AppSidebar from "./components/layout/AppSidebar";
import SubscriptionBanner from "./components/SubscriptionBanner";
import { useAuth } from "./contexts/AuthContext";

const Login = lazy(() => import("./pages/Login"));
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
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Planos = lazy(() => import("./pages/Planos"));
const Assinatura = lazy(() => import("./pages/Assinatura"));
const BillingSucesso = lazy(() => import("./pages/BillingSucesso"));

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
                className: "!text-sm !font-medium",
                style: {
                  background: "#0f172a",
                  color: "#f8fafc",
                  borderRadius: "0.75rem",
                  padding: "12px 16px",
                  boxShadow:
                    "0 10px 15px -3px rgb(15 23 42 / 0.2), 0 4px 6px -4px rgb(15 23 42 / 0.1)",
                },
                success: {
                  iconTheme: { primary: "#10b981", secondary: "#f8fafc" },
                },
                error: {
                  duration: 4000,
                  iconTheme: { primary: "#ef4444", secondary: "#f8fafc" },
                },
              }}
            />
            <AppShell />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppShell() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const isBare =
    location.pathname.startsWith("/v") ||
    location.pathname === "/login" ||
    location.pathname === "/planos" ||
    location.pathname.startsWith("/billing");
  const wideListLayout =
    location.pathname === "/ordens-servico" ||
    location.pathname === "/orcamentos" ||
    location.pathname === "/estoque" ||
    location.pathname === "/clientes";

  return (
    <div className="app-shell">
      {!isBare && <SubscriptionBanner />}
      {!isBare && <AppSidebar />}
      <main className={isBare ? "" : "lg:pl-64"}>
        <div
          className={
            isBare
              ? ""
              : wideListLayout
                ? "w-full max-w-none mx-auto px-4 py-6 sm:px-5 lg:px-6 xl:px-8 lg:py-8"
                : "max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          }
        >
          <Suspense fallback={<LoadingSpinner size="xl" />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/planos" element={<Planos />} />
              <Route path="/billing/sucesso" element={<BillingSucesso />} />
              <Route path="/v/:id" element={<OrcamentoPublico />} />

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
                element={<Navigate to="/" replace />}
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
                path="/orcamentos/:id/editar"
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
              <Route
                path="/clientes"
                element={
                  <ProtectedRoute>
                    <Clientes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorios"
                element={
                  <ProtectedRoute>
                    <Relatorios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute>
                    <Usuarios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assinatura"
                element={
                  <ProtectedRoute>
                    <Assinatura />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </div>
      </main>
      {!isBare && isAdmin && <NotificacoesWidget />}
    </div>
  );
}

export default App;
