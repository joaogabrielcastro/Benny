import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { canAccessRoute } from "../utils/roles";

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.roles] — se definido, exige um destes papéis
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to="/ordens-servico" replace />;
  }

  if (!canAccessRoute(user?.role, location.pathname)) {
    return <Navigate to="/ordens-servico" replace />;
  }

  return children;
}
