import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";

const STATUS_LABEL = {
  active: "Ativa",
  trialing: "Período de teste",
  past_due: "Pagamento em atraso",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  suspended: "Suspensa",
};

export default function Assinatura() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const carregar = async () => {
    try {
      setLoading(true);
      const { data: sub } = await api.get("/billing/subscription");
      setData(sub);
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao carregar assinatura");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const openPortal = async () => {
    setBusy(true);
    try {
      const { data: portal } = await api.post("/billing/portal");
      if (portal.url) window.location.href = portal.url;
      else throw new Error("Portal indisponível");
    } catch (err) {
      toast.error(err.response?.data?.error || "Não foi possível abrir o portal Stripe");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner size="xl" />;

  const status = data?.subscription_status || data?.status || "—";

  return (
    <div className="page-enter">
      <PageHeader
        title="Assinatura"
        subtitle="Plano atual, limites e gerenciamento no Stripe."
        actions={
          <Link to="/planos" className="btn-brand">
            Ver planos
          </Link>
        }
      />

      <div className="pro-card p-6 space-y-4 max-w-2xl">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Oficina</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{data?.nome}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Plano</p>
            <p className="font-semibold capitalize">{data?.plan_nome || data?.plano}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
            <p className="font-semibold">{STATUS_LABEL[status] || status}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Usuários</p>
            <p className="font-semibold">
              {data?.usuarios_ativos ?? 0} / {data?.max_usuarios ?? "—"}
            </p>
          </div>
          {data?.data_expiracao && (
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Próxima renovação / expiração
              </p>
              <p className="font-semibold">
                {new Date(data.data_expiracao).toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}
        </div>

        {!data?.writable && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            Sua assinatura não está ativa. Leituras continuam disponíveis; alterações ficam
            bloqueadas até regularizar o pagamento.
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            className="btn-brand"
            disabled={busy || !data?.has_stripe}
            onClick={openPortal}
          >
            {busy ? "Abrindo…" : "Gerenciar no Stripe"}
          </button>
          {!data?.has_stripe && (
            <Link to="/planos" className="btn-secondary">
              Assinar um plano
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
