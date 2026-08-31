import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import Logo from "../components/Logo";
import ComparacaoPlanos from "../components/planos/ComparacaoPlanos";
import { useAuth } from "../contexts/AuthContext";

function rotuloUsuarios(max) {
  if (max == null) return "—";
  return max >= 999 ? "Ilimitado" : String(max);
}

function rotuloOrcamentos(max) {
  if (max == null) return "—";
  return max >= 9999 ? "Ilimitado" : max.toLocaleString("pt-BR");
}

const emptySignup = {
  oficinaNome: "",
  oficinaEmail: "",
  oficinaTelefone: "",
  adminNome: "",
  adminEmail: "",
  adminSenha: "",
};

export default function Planos() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [comparacao, setComparacao] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptySignup);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("cancelado")) {
      toast("Checkout cancelado. Você pode escolher outro plano quando quiser.");
    }
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/billing/plans");
        setPlans(data.plans || []);
        setComparacao(data.comparacao || []);
      } catch {
        toast.error("Não foi possível carregar os planos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startCheckout = async (planId) => {
    setSubmitting(true);
    try {
      if (isAuthenticated && isAdmin) {
        const { data } = await api.post("/billing/checkout", { planId });
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("URL de checkout ausente");
      }

      setSelected(planId);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Erro no checkout");
    } finally {
      setSubmitting(false);
    }
  };

  const submitSignup = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/billing/checkout", {
        planId: selected,
        oficina: {
          nome: form.oficinaNome,
          email: form.oficinaEmail,
          telefone: form.oficinaTelefone || undefined,
        },
        admin: {
          nome: form.adminNome,
          email: form.adminEmail,
          senha: form.adminSenha,
        },
      });
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("URL de checkout ausente");
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Erro ao iniciar assinatura");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
        <Link to={isAuthenticated ? "/" : "/login"} className="flex items-center gap-3">
          <Logo size="md" />
          <span className="font-semibold tracking-tight">Benny</span>
        </Link>
        <Link
          to={isAuthenticated ? "/assinatura" : "/login"}
          className="text-sm text-blue-300 hover:text-white"
        >
          {isAuthenticated ? "Minha assinatura" : "Entrar"}
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Planos para sua oficina
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Comece com o essencial e evolua para relatórios, fiscal e suporte
            dedicado conforme sua oficina cresce.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-slate-400">Carregando planos…</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col ${
                  plan.destaque
                    ? "border-blue-400/60 bg-blue-500/10 shadow-lg shadow-blue-900/30"
                    : "border-slate-700 bg-slate-900/60"
                }`}
              >
                {plan.destaque && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-300 mb-2">
                    Mais popular
                  </span>
                )}
                <h2 className="text-xl font-bold">{plan.nome}</h2>
                <p className="text-3xl font-extrabold mt-3 mb-1">{plan.precoLabel}</p>
                <p className="text-sm text-slate-400">{plan.descricao}</p>

                <dl className="my-4 divide-y divide-slate-700/60 border-y border-slate-700/60">
                  <Limite
                    label="Usuários"
                    valor={rotuloUsuarios(plan.maxUsuarios)}
                  />
                  <Limite
                    label="Orçamentos por mês"
                    valor={rotuloOrcamentos(plan.maxOrcamentosMes)}
                  />
                </dl>

                <ul className="flex-1 space-y-2 text-sm text-slate-300 mb-5">
                  {(plan.recursos || []).map((recurso) => (
                    <li key={recurso} className="flex items-start gap-2">
                      <span aria-hidden="true" className="text-emerald-400 shrink-0">
                        ✓
                      </span>
                      {recurso}
                    </li>
                  ))}
                  {(plan.beneficiosExtras || []).map((beneficio) => (
                    <li key={beneficio} className="flex items-start gap-2">
                      <span aria-hidden="true" className="text-blue-400 shrink-0">
                        ★
                      </span>
                      <span className="text-blue-100">{beneficio}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={submitting || !plan.disponivel}
                  onClick={() => startCheckout(plan.id)}
                  className={`w-full rounded-xl px-4 py-2.5 font-semibold transition ${
                    plan.destaque
                      ? "bg-blue-500 hover:bg-blue-400 text-white"
                      : "bg-slate-100 hover:bg-white text-slate-900"
                  } disabled:opacity-50`}
                >
                  {!plan.disponivel
                    ? "Em breve"
                    : isAuthenticated && isAdmin
                      ? "Assinar / trocar"
                      : "Começar"}
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && plans.length > 0 && (
          <ComparacaoPlanos comparacao={comparacao} />
        )}

        {!loading && plans.length > 0 && (
          <p className="mt-8 text-center text-xs text-slate-500 max-w-2xl mx-auto">
            Pagamento processado com segurança pela Stripe. Você pode trocar de
            plano a qualquer momento pela área de assinatura.
          </p>
        )}

        {selected && !(isAuthenticated && isAdmin) && (
          <form
            onSubmit={submitSignup}
            className="mt-10 max-w-xl mx-auto rounded-2xl border border-slate-700 bg-slate-900/80 p-6 space-y-4"
          >
            <h3 className="text-lg font-bold">
              Cadastro — plano {plans.find((p) => p.id === selected)?.nome}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                Nome da oficina
                <input
                  required
                  className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
                  value={form.oficinaNome}
                  onChange={(e) => setForm((f) => ({ ...f, oficinaNome: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                E-mail da oficina
                <input
                  required
                  type="email"
                  className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
                  value={form.oficinaEmail}
                  onChange={(e) => setForm((f) => ({ ...f, oficinaEmail: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                Telefone
                <input
                  className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
                  value={form.oficinaTelefone}
                  onChange={(e) => setForm((f) => ({ ...f, oficinaTelefone: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                Seu nome (admin)
                <input
                  required
                  className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
                  value={form.adminNome}
                  onChange={(e) => setForm((f) => ({ ...f, adminNome: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                Seu e-mail (login)
                <input
                  required
                  type="email"
                  className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
                  value={form.adminEmail}
                  onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                Senha
                <input
                  required
                  type="password"
                  minLength={6}
                  className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
                  value={form.adminSenha}
                  onChange={(e) => setForm((f) => ({ ...f, adminSenha: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="rounded-xl px-4 py-2 border border-slate-600"
                onClick={() => setSelected(null)}
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold px-4 py-2 disabled:opacity-50"
              >
                {submitting ? "Redirecionando…" : "Ir para pagamento"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-slate-500 mt-8">
          &ldquo;Ilimitado&rdquo; usa um teto alto no sistema, não um limite
          rígido.
        </p>
      </main>
    </div>
  );
}

function Limite({ label, valor }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="text-lg font-bold text-white">{valor}</dd>
    </div>
  );
}
