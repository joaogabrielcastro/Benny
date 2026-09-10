import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

const PLAN_COLUNAS = [
  { id: "basic", label: "Basic" },
  { id: "premium", label: "Premium" },
  { id: "enterprise", label: "Enterprise" },
];

function CelulaValor({ valor }) {
  if (valor === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-sm font-bold">
        ✓
      </span>
    );
  }

  if (valor === false) {
    return <span className="text-slate-600">—</span>;
  }

  return <span className="text-sm font-medium text-slate-200">{valor}</span>;
}

function SecaoComparacao({ secao, aberta, onToggle }) {
  const panelId = `comparacao-${secao.id}`;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/70">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={aberta}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-100 transition hover:bg-slate-800/60"
      >
        <span>{secao.titulo}</span>
        <FiChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${aberta ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {aberta ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={`${panelId}-trigger`}
          className="border-t border-slate-700/80 px-3 pb-4 pt-2 sm:px-5"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Recurso
                  </th>
                  {PLAN_COLUNAS.map((col) => (
                    <th
                      key={col.id}
                      scope="col"
                      className="px-3 py-2 text-center font-medium whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {secao.itens.map((item) => (
                  <tr key={item.label}>
                    <th
                      scope="row"
                      className="py-3 pr-4 text-left font-normal text-slate-300"
                    >
                      {item.label}
                    </th>
                    {PLAN_COLUNAS.map((col) => (
                      <td key={col.id} className="px-3 py-3 text-center">
                        <CelulaValor valor={item.valores[col.id]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ComparacaoPlanos({ comparacao = [] }) {
  const [abertas, setAbertas] = useState(() =>
    comparacao.length ? [comparacao[0].id] : [],
  );

  if (!comparacao.length) return null;

  function toggle(id) {
    setAbertas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <section className="mt-14">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Compare os planos
        </h2>
        <p className="mt-2 text-slate-400 max-w-xl mx-auto">
          Veja o que cada plano inclui para escolher o melhor para sua equipe.
        </p>
      </div>

      <div className="space-y-3">
        {comparacao.map((secao) => (
          <SecaoComparacao
            key={secao.id}
            secao={secao}
            aberta={abertas.includes(secao.id)}
            onToggle={() => toggle(secao.id)}
          />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500 max-w-2xl mx-auto">
        Limites de usuários e orçamentos são aplicados automaticamente na conta.
        Recursos marcados como integrações personalizadas são negociados no plano
        Enterprise.
      </p>
    </section>
  );
}
