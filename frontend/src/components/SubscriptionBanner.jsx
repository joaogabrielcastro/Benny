import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

/**
 * Banner global quando assinatura está past_due / canceled / incomplete.
 */
export default function SubscriptionBanner() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/billing/subscription");
        if (!cancelled) setStatus(data?.subscription_status || data?.status);
      } catch {
        if (!cancelled) setStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAdmin]);

  if (!status) return null;
  const ok = status === "active" || status === "trialing";
  if (ok) return null;

  const pastDue = status === "past_due";

  return (
    <div
      className={`px-4 py-2.5 text-sm text-center ${
        pastDue
          ? "bg-amber-500 text-amber-950"
          : "bg-rose-600 text-white"
      }`}
    >
      {pastDue
        ? "Pagamento em atraso — regularize para continuar editando dados."
        : "Assinatura inativa — algumas ações estão bloqueadas."}{" "}
      <Link to="/assinatura" className="underline font-semibold">
        Gerenciar assinatura
      </Link>
    </div>
  );
}
