import { createContext, useContext, useState, useCallback } from "react";
import api from "../services/api";

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
      return stored ? JSON.parse(stored) : null;
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

    localStorage.setItem("auth_token", auth.token);
    localStorage.setItem("auth_user", JSON.stringify(auth.user));
    setUser(auth.user);
    return auth;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    // Compatibilidade com código legado
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("usuario");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
