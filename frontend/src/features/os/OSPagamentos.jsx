import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FiDollarSign, FiPlus, FiCheck, FiTrash2 } from "react-icons/fi";
import api from "../../services/api";
import Section from "../../components/ui/Section";
import StatusBadge from "../../components/ui/StatusBadge";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { formatarMoeda, formatarData } from "../../utils/formatters";
import { statusRecebimento } from "../../utils/statusColors";
import { moedaParaNumero, mascaraMoeda } from "../../utils/masks";

export const FORMAS_PAGAMENTO = [
  "Dinheiro",
  "PIX",
  "Cartão de débito",
  "Cartão de crédito",
  "Boleto",
  "Transferência",
  "Outro",
];

const hojeISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function usePagamentosOs(osId, enabled = true) {
  return useQuery({
    queryKey: ["ordens-servico", osId, "pagamentos"],
    enabled: Boolean(osId) && enabled,
    queryFn: async () => (await api.get(`/ordens-servico/${osId}/pagamentos`)).data,
  });
}

function erroApi(error, padrao) {
  const d = error?.response?.data;
  const campo = d?.details?.fieldErrors && Object.values(d.details.fieldErrors).flat()[0];
  return campo || d?.error || d?.erro || padrao;
}

function NovoPagamentoModal({ isOpen, onClose, osId, saldoSugerido, onSalvo }) {
  const [form, setForm] = useState(() => ({
    valor: saldoSugerido > 0 ? mascaraMoeda(saldoSugerido.toFixed(2).replace(".", "")) : "",
    forma_pagamento: "PIX",
    status: "Recebido",
    data_pagamento: hojeISO(),
    data_vencimento: hojeISO(),
    observacoes: "",
  }));
  const [salvando, setSalvando] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = async (e) => {
    e.preventDefault();
    const valor = moedaParaNumero(form.valor);
    if (!(valor > 0)) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    setSalvando(true);
    try {
      await api.post(`/ordens-servico/${osId}/pagamentos`, {
        valor,
        forma_pagamento: form.forma_pagamento,
        status: form.status,
        data_pagamento: form.status === "Recebido" ? form.data_pagamento : null,
        data_vencimento: form.status === "Pendente" ? form.data_vencimento : null,
        observacoes: form.observacoes || null,
      });
      toast.success(form.status === "Recebido" ? "Pagamento registrado." : "Parcela a receber registrada.");
      onSalvo();
      onClose();
    } catch (error) {
      toast.error(erroApi(error, "Não foi possível registrar o pagamento."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar pagamento"
      description="Recebimento agora ou parcela a receber (conta a receber)."
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="form-pagamento" className="btn-brand" disabled={salvando}>
            {salvando ? "Salvando…" : "Registrar"}
          </button>
        </>
      }
    >
      <form id="form-pagamento" onSubmit={salvar} className="space-y-3">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
          {[
            ["Recebido", "Recebido agora"],
            ["Pendente", "A receber"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={form.status === v}
              onClick={() => set("status", v)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                form.status === v
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                  : "border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-850"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-pro" htmlFor="pg-valor">Valor (R$)</label>
            <input
              id="pg-valor"
              inputMode="numeric"
              className="input-pro num"
              value={form.valor}
              onChange={(e) => set("valor", mascaraMoeda(e.target.value))}
              placeholder="0,00"
              autoFocus
            />
          </div>
          <div>
            <label className="label-pro" htmlFor="pg-forma">Forma</label>
            <select
              id="pg-forma"
              className="input-pro"
              value={form.forma_pagamento}
              onChange={(e) => set("forma_pagamento", e.target.value)}
            >
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        {form.status === "Recebido" ? (
          <div>
            <label className="label-pro" htmlFor="pg-data">Data do recebimento</label>
            <input id="pg-data" type="date" className="input-pro" value={form.data_pagamento} onChange={(e) => set("data_pagamento", e.target.value)} />
          </div>
        ) : (
          <div>
            <label className="label-pro" htmlFor="pg-venc">Vencimento</label>
            <input id="pg-venc" type="date" className="input-pro" value={form.data_vencimento} onChange={(e) => set("data_vencimento", e.target.value)} />
          </div>
        )}
        <div>
          <label className="label-pro" htmlFor="pg-obs">Observação (opcional)</label>
          <input id="pg-obs" className="input-pro" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Ex.: 2ª parcela, nº do comprovante…" />
        </div>
      </form>
    </Modal>
  );
}

/**
 * Pagamentos da OS (admin): resumo, recebimentos, parcelas a receber.
 */
export default function OSPagamentos({ os }) {
  const qc = useQueryClient();
  const { data, isLoading } = usePagamentosOs(os.id);
  const [novo, setNovo] = useState(false);
  const [remover, setRemover] = useState(null);

  const resumo = data?.resumo;
  const pagamentos = data?.pagamentos ?? [];
  const cancelada = os.status === "Cancelada";

  const atualizar = () => {
    qc.invalidateQueries({ queryKey: ["ordens-servico"] });
    qc.invalidateQueries({ queryKey: ["financeiro"] });
  };

  const marcarRecebido = async (p) => {
    try {
      await api.put(`/ordens-servico/${os.id}/pagamentos/${p.id}`, {
        status: "Recebido",
        data_pagamento: hojeISO(),
      });
      toast.success("Parcela marcada como recebida.");
      atualizar();
    } catch (error) {
      toast.error(erroApi(error, "Não foi possível atualizar."));
    }
  };

  const confirmarRemocao = async () => {
    const p = remover;
    setRemover(null);
    try {
      await api.delete(`/ordens-servico/${os.id}/pagamentos/${p.id}`);
      toast.success("Lançamento removido.");
      atualizar();
    } catch (error) {
      toast.error(erroApi(error, "Não foi possível remover."));
    }
  };

  const pct = resumo?.valor_total > 0 ? Math.min(100, (resumo.valor_recebido / resumo.valor_total) * 100) : 0;

  return (
    <Section
      title="Pagamento"
      icon={FiDollarSign}
      actions={
        resumo && <StatusBadge kind="situacaoPagamento" status={resumo.situacao} size="sm" />
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-ink-500">Recebido</p>
              <p className="text-lg font-semibold num text-ink-900 dark:text-white">
                {formatarMoeda(resumo?.valor_recebido || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-500">Saldo</p>
              <p className={`text-lg font-semibold num ${resumo?.saldo > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {formatarMoeda(Math.max(0, resumo?.saldo || 0))}
              </p>
            </div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden" aria-hidden>
            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>

          {pagamentos.length > 0 && (
            <ul className="mt-4 divide-y divide-ink-100 dark:divide-ink-800 -mx-1">
              {pagamentos.map((p) => {
                const st = statusRecebimento(p);
                return (
                  <li key={p.id} className="flex items-center gap-2 px-1 py-2 group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-900 dark:text-ink-100 num">
                        {formatarMoeda(p.valor)}
                        <span className="font-normal text-ink-500"> · {p.forma_pagamento}</span>
                      </p>
                      <p className="text-2xs text-ink-500">
                        {p.status === "Recebido"
                          ? `Recebido em ${formatarData(p.data_pagamento)}`
                          : `Vence em ${formatarData(p.data_vencimento)}`}
                        {p.observacoes ? ` · ${p.observacoes}` : ""}
                      </p>
                    </div>
                    <StatusBadge kind="pagamento" status={st} size="sm" />
                    {p.status === "Pendente" && (
                      <button
                        type="button"
                        onClick={() => marcarRecebido(p)}
                        className="btn-ghost btn-sm !px-1.5 text-emerald-600"
                        title="Marcar como recebido hoje"
                        aria-label="Marcar como recebido"
                      >
                        <FiCheck className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRemover(p)}
                      className="btn-ghost btn-sm !px-1.5 text-ink-400 hover:!text-red-600 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Remover lançamento"
                      aria-label="Remover lançamento"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!cancelada && (resumo?.saldo ?? 0) > 0.009 && (
            <button type="button" onClick={() => setNovo(true)} className="btn-secondary w-full mt-4">
              <FiPlus className="h-4 w-4" />
              Registrar pagamento
            </button>
          )}
          {cancelada && pagamentos.length === 0 && (
            <p className="mt-3 text-xs text-ink-500">OS cancelada — sem cobrança.</p>
          )}
        </>
      )}

      {novo && (
        <NovoPagamentoModal
          isOpen
          onClose={() => setNovo(false)}
          osId={os.id}
          saldoSugerido={Math.max(0, (resumo?.saldo || 0) - (resumo?.valor_pendente || 0))}
          onSalvo={atualizar}
        />
      )}
      <ConfirmDialog
        open={!!remover}
        title="Remover lançamento"
        message={remover ? `Remover ${formatarMoeda(remover.valor)} (${remover.forma_pagamento}) desta OS?` : ""}
        confirmLabel="Remover"
        onConfirm={confirmarRemocao}
        onCancel={() => setRemover(null)}
      />
    </Section>
  );
}
