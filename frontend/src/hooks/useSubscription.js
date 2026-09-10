import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_FEATURES = {
  agenda: true,
  contas_pagar: true,
  relatorios: true,
  nfse: true,
  backup: true,
};

/**
 * Carrega plano/features da assinatura (admin autenticado).
 * Em modo single-tenant ou sem assinatura, libera tudo.
 */
export function useSubscription() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data: sub } = await api.get("/billing/subscription");
        if (!cancelled) setData(sub);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAdmin]);

  const features = data?.features || DEFAULT_FEATURES;

  function hasFeature(key) {
    return Boolean(features[key]);
  }

  return { subscription: data, features, hasFeature, loading };
}
