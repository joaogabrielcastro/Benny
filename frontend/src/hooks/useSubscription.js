import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_FEATURES = {
  agenda: true,
  contas_pagar: true,
  relatorios: true,
  nfse: true,
  backup: true,
};

export const SUBSCRIPTION_QUERY_KEY = ["billing", "subscription"];

/**
 * Plano/features da assinatura (admin autenticado).
 * Em modo single-tenant ou sem assinatura, libera tudo.
 * Cacheado via React Query: uma única requisição compartilhada por
 * menu, banner e rotas protegidas (antes eram 3–4 por navegação).
 */
export function useSubscription() {
  const { isAuthenticated, isAdmin } = useAuth();
  const enabled = Boolean(isAuthenticated && isAdmin);

  const { data, isLoading } = useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      try {
        const { data: sub } = await api.get("/billing/subscription");
        return sub ?? null;
      } catch {
        return null;
      }
    },
  });

  const subscription = enabled ? data ?? null : null;
  const features = subscription?.features || DEFAULT_FEATURES;

  function hasFeature(key) {
    return Boolean(features[key]);
  }

  return { subscription, features, hasFeature, loading: enabled && isLoading };
}
