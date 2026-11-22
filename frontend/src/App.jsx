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
import ProtectedRoute from "./components/ProtectedRoute";
import AppSidebar from "./components/layout/AppSidebar";
import SubscriptionBanner from "./components/SubscriptionBanner";

const Login = lazy(() => import("./pages/Login"));
const Estoque = lazy(() => import("./pages/Estoque"));
const Servicos = lazy(() => import("./pages/Servicos"));
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
const ConfiguracaoFiscal = lazy(() => import("./pages/ConfiguracaoFiscal"));
const BillingSucesso = lazy(() => import("./pages/BillingSucesso"));
const ClienteDetalhes = lazy(() => import("./pages/ClienteDetalhes"));
const Veiculos = lazy(() => import("./pages/Veiculos"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const NotasFiscais = lazy(() => import("./pages/NotasFiscais"));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3200,
                className: "!text-sm !font-medium",
                style: {
                  background: "#15181d",
                  color: "#f7f8fa",
                  borderRadius: "0.625rem",
                  padding: "10px 14px",
                  boxShadow:
                    "0 16px 40px -12px rgb(13 15 19 / 0.35), 0 4px 12px -4px rgb(13 15 19 / 0.2)",
                },
                success: {
                  iconTheme: { primary: "#10b981", secondary: "#f7f8fa" },
                },
                error: {
                  duration: 5000,
                  iconTheme: { primary: "#ef4444", secondary: "#f7f8fa" },
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
  const isBare =
    location.pathname.startsWith("/v/") ||
    location.pathname === "/login" ||
    location.pathname === "/planos" ||
    location.pathname.startsWith("/billing");

  return (
    <div className="app-shell">
      {!isBare && <AppSidebar />}
      <main className={isBare ? "" : "lg:pl-60"}>
        {!isBare && <SubscriptionBanner />}
        <div
          className={
            isBare
              ? ""
              : "w-full max-w-[1400px] mx-auto px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pt-7 lg:pb-10"
          }
        >
          <Suspense fallback={<LoadingSpinner size="lg" />}>
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
                path="/servicos"
                element={
                  <ProtectedRoute>
                    <Servicos />
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
                path="/clientes/:id"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <ClienteDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/veiculos"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <Veiculos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/financeiro"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <Financeiro />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notas-fiscais"
                element={
                  <ProtectedRoute roles={["admin"]} planFeature="nfse">
                    <NotasFiscais />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agendamentos"
                element={
                  <ProtectedRoute planFeature="agenda">
                    <Agendamentos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contas-pagar"
                element={
                  <ProtectedRoute planFeature="contas_pagar">
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
                  <ProtectedRoute planFeature="relatorios">
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
              <Route
                path="/configuracao-fiscal"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <ConfiguracaoFiscal />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NaoEncontrado />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function NaoEncontrado() {
  return (
    <div className="py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-xl font-semibold text-ink-900 dark:text-white">Página não encontrada</h1>
      <p className="mt-1 text-sm text-ink-500">O endereço acessado não existe ou foi movido.</p>
      <a href="/" className="btn-secondary mt-5 inline-flex">Voltar ao início</a>
    </div>
  );
}

export default App;
