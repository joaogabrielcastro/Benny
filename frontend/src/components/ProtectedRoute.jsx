import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Redirecionar para login se não estiver autenticado
    return <Navigate to="/login" replace />;
  }

  return children;
}
