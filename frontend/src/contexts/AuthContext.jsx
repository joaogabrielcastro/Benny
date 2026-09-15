import { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../services/api";
import { normalizeRole, isAdmin, isMecanico, roleLabel } from "../utils/roles";

const AuthContext = createContext(null);

function normalizeAuthPayload(payload) {
  return {
    token: payload?.token || payload?.accessToken || null,
    user: payload?.user || payload?.usuario || null,
  };
}

function clearLegacyAuthStorage() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("usuario");
}

/**
 * ASE 5.2 — autenticação cookie-first.
 * O JWT fica no cookie httpOnly (backend). localStorage guarda só o perfil
 * para UX; a prova de sessão é GET /auth/me com credentials.
 * Tokens legados em localStorage ainda são enviados como Bearer (compat).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        const raw = data?.user || data;
        const role = normalizeRole(raw?.role);
        if (!role) {
          clearLegacyAuthStorage();
          if (!cancelled) setUser(null);
          return;
        }
        const userWithRole = { ...raw, role };
        localStorage.setItem("auth_user", JSON.stringify(userWithRole));
        // Remove token do storage: cookie httpOnly é a fonte da verdade
        localStorage.removeItem("auth_token");
        if (!cancelled) setUser(userWithRole);
      } catch {
        // Fallback: perfil cacheado + Bearer legado (migração)
        try {
          const stored = localStorage.getItem("auth_user");
          const token = localStorage.getItem("auth_token");
          if (stored && token) {
            const parsed = JSON.parse(stored);
            const role = normalizeRole(parsed?.role);
            if (role && !cancelled) {
              setUser({ ...parsed, role });
              return;
            }
          }
        } catch {
          /* ignore */
        }
        clearLegacyAuthStorage();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, senha) => {
    const { data } = await api.post("/auth/login", { email, senha });
    const auth = normalizeAuthPayload(data);

    if (!auth.user) {
      throw new Error("Resposta de autenticação inválida");
    }

    const role = normalizeRole(auth.user.role);
    if (!role) {
      throw new Error("Perfil de acesso inválido");
    }

    // Cookie httpOnly já foi setado pelo backend; não persistir JWT no storage
    localStorage.removeItem("auth_token");
    const userWithRole = { ...auth.user, role };
    localStorage.setItem("auth_user", JSON.stringify(userWithRole));
    setUser(userWithRole);
    return { ...auth, token: null };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* cookie pode já ter expirado */
    }
    clearLegacyAuthStorage();
    setUser(null);
  }, []);

  const role = normalizeRole(user?.role);
  const isAuthenticated = !!user && !!role;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        bootstrapping,
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
