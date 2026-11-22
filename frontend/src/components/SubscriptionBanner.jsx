import { Link } from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi";
import { useSubscription } from "../hooks/useSubscription";

/**
 * Banner global quando assinatura está past_due / canceled / incomplete.
 */
export default function SubscriptionBanner() {
  const { subscription } = useSubscription();
  const status = subscription?.subscription_status || subscription?.status;

  if (!status) return null;
  if (status === "active" || status === "trialing") return null;

  const pastDue = status === "past_due";

  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-2 px-4 py-2 text-sm ${
        pastDue ? "bg-amber-400 text-amber-950" : "bg-red-600 text-white"
      }`}
    >
      <FiAlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        {pastDue
          ? "Pagamento em atraso — regularize para continuar editando dados."
          : "Assinatura inativa — algumas ações estão bloqueadas."}{" "}
        <Link to="/assinatura" className="underline font-semibold">
          Gerenciar assinatura
        </Link>
      </span>
    </div>
  );
}
