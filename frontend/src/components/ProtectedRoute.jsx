import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { canAccessRoute } from "../utils/roles";
import { useSubscription } from "../hooks/useSubscription";
import LoadingSpinner from "./LoadingSpinner";

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.roles] — se definido, exige um destes papéis
 * @param {string} [props.planFeature] — exige recurso do plano (ex.: agenda, relatorios)
 */
export default function ProtectedRoute({ children, roles, planFeature }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const { hasFeature, loading } = useSubscription();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to="/ordens-servico" replace />;
  }

  if (!canAccessRoute(user?.role, location.pathname)) {
    return <Navigate to="/ordens-servico" replace />;
  }

  if (planFeature) {
    if (loading) return <LoadingSpinner size="lg" />;
    if (!hasFeature(planFeature)) {
      return <Navigate to="/planos" replace />;
    }
  }

  return children;
}
