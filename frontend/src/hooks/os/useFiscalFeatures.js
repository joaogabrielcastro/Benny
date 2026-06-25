import { useState, useEffect } from "react";
import api from "../../services/api";

/** Recursos fiscais habilitados no backend (ex.: NF-e aguardando SEFAZ/PR). */
export function useFiscalFeatures() {
  const [nfeHabilitada, setNfeHabilitada] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/notas-fiscais/features");
        if (!cancelled) setNfeHabilitada(!!data?.nfeHabilitada);
      } catch {
        if (!cancelled) setNfeHabilitada(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { nfeHabilitada, loading };
}
