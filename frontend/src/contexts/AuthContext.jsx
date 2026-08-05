import { createContext, useContext, useState, useCallback } from "react";
import api from "../services/api";
import { normalizeRole, isAdmin, isMecanico, roleLabel } from "../utils/roles";

const AuthContext = createContext(null);

function normalizeAuthPayload(payload) {
  return {
    token: payload?.token || payload?.accessToken || null,
    user: payload?.user || payload?.usuario || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("auth_user");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (!parsed) return null;
      const role = normalizeRole(parsed.role);
      if (!role) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        return null;
      }
      return { ...parsed, role };
    } catch {
      return null;
    }
  });

  const token = localStorage.getItem("auth_token");
  const isAuthenticated = !!token && !!user;

  const login = useCallback(async (email, senha) => {
    const { data } = await api.post("/auth/login", { email, senha });
    const auth = normalizeAuthPayload(data);

    if (!auth.token || !auth.user) {
      throw new Error("Resposta de autenticação inválida");
    }

    const role = normalizeRole(auth.user.role);
    if (!role) {
      throw new Error("Perfil de acesso inválido");
    }

    localStorage.setItem("auth_token", auth.token);
    const userWithRole = {
      ...auth.user,
      role,
    };
    localStorage.setItem("auth_user", JSON.stringify(userWithRole));
    setUser(userWithRole);
    return auth;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* cookie pode já ter expirado */
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("usuario");
    setUser(null);
  }, []);

  const role = normalizeRole(user?.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isAdmin: isAdmin(user),
        isMecanico: isMecanico(user),
        roleLabel: roleLabel(role),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
