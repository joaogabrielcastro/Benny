import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FiPlus, FiSave, FiInfo, FiLock } from "react-icons/fi";
import api from "../services/api";
import ClienteAutocomplete from "../components/ClienteAutocomplete";
import NovoClienteModal from "../components/NovoClienteModal";
import NovoVeiculoModal from "../components/NovoVeiculoModal";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import Section from "../components/ui/Section";
import StatusBadge from "../components/ui/StatusBadge";
import ItensEditor, { limparLinha, faltaEstoque, totaisItens } from "../features/itens/ItensEditor";
import { useAuth } from "../contexts/AuthContext";
import { rotuloVeiculo } from "../features/veiculos/rotuloVeiculo";
import { formatarMoeda } from "../utils/formatters";
import { useOrdemServicoQuery } from "../hooks/os/useOrdemServicoQuery";

const EDITAVEL = new Set(["Aberta", "Em andamento"]);

function erroApi(error, padrao) {
  const d = error?.response?.data;
  const campo = d?.details?.fieldErrors && Object.values(d.details.fieldErrors).flat()[0];
  return d?.error && d.error !== "Dados inválidos" ? d.error : campo || d?.error || padrao;
}

/**
 * Edição da OS: cliente/veículo, dados do atendimento e itens.
 * Itens são gravados com `editar_itens`, e o backend ajusta o estoque
 * pela diferença de quantidades (baixa ou devolução).
 */
export default function OSForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const { os, loading } = useOrdemServicoQuery(id);

  const [form, setForm] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [novoCliente, setNovoCliente] = useState(false);
  const [novoVeiculo, setNovoVeiculo] = useState(false);

  // Inicializa o formulário uma vez com os dados da OS
  useEffect(() => {
    if (!os || form) return;
    setForm({
      cliente_id: os.cliente_id,
      veiculo_id: os.veiculo_id,
      km: os.km ?? "",
      previsao_entrega: os.previsao_entrega ? String(os.previsao_entrega).slice(0, 10) : "",
      observacoes_veiculo: os.observacoes_veiculo || "",
      observacoes_gerais: os.observacoes_gerais || "",
      consumidor_final: os.consumidor_final === true ? "true" : os.consumidor_final === false ? "false" : "",
      responsavel_usuario_id: os.responsavel_usuario_id ? String(os.responsavel_usuario_id) : "",
      responsavel_tecnico: os.responsavel_tecnico || "",
    });
    setServicos(
      (os.servicos || []).map((s) => ({
        _key: `s${s.id}`,
        codigo: s.codigo || "",
        descricao: s.descricao,
        quantidade: Number(s.quantidade),
        valor_unitario: Number(s.valor_unitario),
        valor_total: Number(s.valor_total),
      })),
    );
    setProdutos(
      (os.produtos || []).map((p) => ({
        _key: `p${p.id}`,
        produto_id: p.produto_id || null,
        codigo: p.codigo || "",
        descricao: p.descricao,
        ncm: p.ncm || p.produto_ncm || "",
        quantidade: Number(p.quantidade),
        valor_unitario: Number(p.valor_unitario),
        valor_total: Number(p.valor_total),
        _reservado: Number(p.quantidade),
      })),
    );
  }, [os, form]);

  // Estoque atual das peças já lançadas (o reservado nesta OS conta como disponível)
  const idsProdutos = useMemo(
    () => [...new Set((os?.produtos || []).map((p) => p.produto_id).filter(Boolean))],
    [os],
  );
  const { data: estoques } = useQuery({
    queryKey: ["produtos", "estoque-os", id, idsProdutos],
    enabled: idsProdutos.length > 0,
    queryFn: async () => {
      const res = await Promise.all(
        idsProdutos.map((pid) => api.get(`/produtos/${pid}`).then((r) => r.data).catch(() => null)),
      );
      return Object.fromEntries(res.filter(Boolean).map((p) => [p.id, Number(p.quantidade)]));
    },
  });
  useEffect(() => {
    if (!estoques) return;
    setProdutos((linhas) =>
      linhas.map((l) => (l.produto_id && estoques[l.produto_id] != null && l._estoque == null ? { ...l, _estoque: estoques[l.produto_id] } : l)),
    );
  }, [estoques]);

  const { data: veiculos = [], refetch: recarregarVeiculos } = useQuery({
    queryKey: ["veiculos", "cliente", form?.cliente_id],
    enabled: Boolean(form?.cliente_id),
    queryFn: async () => (await api.get(`/veiculos/cliente/${form.cliente_id}`)).data,
  });

  const { data: responsaveis = [] } = useQuery({
    queryKey: ["responsaveis"],
    queryFn: async () => (await api.get("/responsaveis")).data,
    staleTime: 5 * 60_000,
  });

  if (loading || !os || !form) return <LoadingSpinner size="lg" />;

  if (!EDITAVEL.has(os.status)) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <FiLock className="h-8 w-8 mx-auto text-ink-400" />
        <h1 className="mt-3 text-lg font-semibold text-ink-900 dark:text-white">OS {os.numero} não pode mais ser editada</h1>
        <p className="mt-1 text-sm text-ink-500">
          Ordens {os.status === "Finalizada" ? "finalizadas" : "canceladas"} ficam bloqueadas para preservar estoque, pagamentos e notas fiscais.
        </p>
        <Link to={`/ordens-servico/${id}`} className="btn-secondary mt-5 inline-flex">
          Voltar para a OS
        </Link>
      </div>
    );
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const totais = totaisItens(produtos, servicos);
  const diferenca = totais.valor_total - Number(os.valor_total);
  const algumaFalta = produtos.some(faltaEstoque);

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.cliente_id || !form.veiculo_id) {
      toast.error("Selecione o cliente e o veículo.");
      return;
    }
    const semDescricao = [...produtos, ...servicos].some((l) => !String(l.descricao || "").trim());
    if (semDescricao) {
      toast.error("Informe a descrição de todos os itens.");
      return;
    }
    const ncmInvalido = produtos.find((l) => l.ncm && String(l.ncm).length !== 8);
    if (ncmInvalido) {
      toast.error(`NCM de “${ncmInvalido.descricao}” precisa ter 8 dígitos.`);
      return;
    }
    if (algumaFalta) {
      toast.error("Há peças com estoque insuficiente. Ajuste as quantidades.");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        cliente_id: Number(form.cliente_id),
        veiculo_id: Number(form.veiculo_id),
        km: form.km === "" ? null : form.km,
        previsao_entrega: form.previsao_entrega || null,
        observacoes_veiculo: form.observacoes_veiculo,
        observacoes_gerais: form.observacoes_gerais,
        consumidor_final: form.consumidor_final === "true" ? true : form.consumidor_final === "false" ? false : null,
        editar_itens: true,
        produtos: produtos.map(limparLinha),
        servicos: servicos.map(limparLinha),
      };
      if (isAdmin || responsaveis.length) {
        payload.responsavel_usuario_id = form.responsavel_usuario_id ? Number(form.responsavel_usuario_id) : null;
        if (!form.responsavel_usuario_id) payload.responsavel_tecnico = form.responsavel_tecnico || null;
      }
      await api.put(`/ordens-servico/${id}`, payload);
      toast.success("OS atualizada. Estoque ajustado conforme os itens.");
      qc.invalidateQueries({ queryKey: ["ordens-servico"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      navigate(`/ordens-servico/${id}`);
    } catch (error) {
      toast.error(erroApi(error, "Erro ao atualizar a OS"), { duration: 7000 });
    } finally {
      setSalvando(false);
    }
  };

  const veiculoSelecionado = veiculos.find((v) => Number(v.id) === Number(form.veiculo_id));

  return (
    <div className="page-enter">
      <PageHeader
        back={{ to: `/ordens-servico/${id}`, label: os.numero }}
        title={`Editar ${os.numero}`}
        badge={<StatusBadge kind="os" status={os.status} />}
        subtitle="Alterações nos itens ajustam o estoque automaticamente ao salvar."
      />

      <form onSubmit={salvar} className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start pb-20 lg:pb-0">
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <Section title="Cliente e veículo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-pro">Cliente *</label>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <ClienteAutocomplete
                      value={form.cliente_id}
                      onChange={(cid) =>
                        setForm((f) =>
                          String(cid || "") === String(f.cliente_id || "")
                            ? f
                            : { ...f, cliente_id: cid, veiculo_id: "" },
                        )
                      }
                      onClienteSelecionado={(c) => {
                        if (!c) setForm((f) => ({ ...f, cliente_id: "", veiculo_id: "" }));
                      }}
                      required
                    />
                  </div>
                  {isAdmin && (
                    <button type="button" className="btn-secondary btn-icon" onClick={() => setNovoCliente(true)} title="Novo cliente" aria-label="Novo cliente">
                      <FiPlus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="label-pro" htmlFor="os-veiculo">Veículo *</label>
                <div className="flex gap-2">
                  <select
                    id="os-veiculo"
                    className="input-pro flex-1 min-w-0"
                    value={form.veiculo_id}
                    onChange={(e) => set("veiculo_id", e.target.value)}
                    disabled={!form.cliente_id}
                    required
                  >
                    <option value="">{form.cliente_id ? "Selecione o veículo" : "Escolha o cliente primeiro"}</option>
                    {veiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {rotuloVeiculo(v)}
                      </option>
                    ))}
                    {Number(form.veiculo_id) === Number(os.veiculo_id) &&
                      Number(form.cliente_id) === Number(os.cliente_id) &&
                      !veiculos.some((v) => Number(v.id) === Number(os.veiculo_id)) && (
                        <option value={os.veiculo_id}>
                          {rotuloVeiculo({
                            marca: os.veiculo_marca,
                            modelo: os.veiculo_modelo,
                            ano: os.veiculo_ano,
                            placa: os.veiculo_placa,
                          })}{" "}
                          (vínculo atual)
                        </option>
                      )}
                  </select>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn-secondary btn-icon"
                      onClick={() => setNovoVeiculo(true)}
                      disabled={!form.cliente_id}
                      title="Novo veículo"
                      aria-label="Novo veículo"
                    >
                      <FiPlus className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {veiculoSelecionado?.chassi && <p className="help-pro font-mono">Chassi {veiculoSelecionado.chassi}</p>}
              </div>
            </div>
          </Section>

          <Section title="Relato e diagnóstico">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-pro" htmlFor="os-relato">Relato do cliente / condição do veículo</label>
                <textarea
                  id="os-relato"
                  rows={4}
                  className="input-pro"
                  value={form.observacoes_veiculo}
                  onChange={(e) => set("observacoes_veiculo", e.target.value)}
                  placeholder="Ex.: barulho ao frear, luz do motor acesa…"
                />
              </div>
              <div>
                <label className="label-pro" htmlFor="os-diag">Diagnóstico e observações</label>
                <textarea
                  id="os-diag"
                  rows={4}
                  className="input-pro"
                  value={form.observacoes_gerais}
                  onChange={(e) => set("observacoes_gerais", e.target.value)}
                  placeholder="O que foi constatado e o que será feito."
                />
              </div>
            </div>
          </Section>

          <ItensEditor
            produtos={produtos}
            servicos={servicos}
            onChangeProdutos={setProdutos}
            onChangeServicos={setServicos}
          />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20">
          <Section title="Atendimento">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-pro" htmlFor="os-km">Quilometragem</label>
                  <input
                    id="os-km"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className="input-pro num"
                    value={form.km}
                    onChange={(e) => set("km", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-pro" htmlFor="os-prev">Previsão de entrega</label>
                  <input id="os-prev" type="date" className="input-pro" value={form.previsao_entrega} onChange={(e) => set("previsao_entrega", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label-pro" htmlFor="os-resp">Responsável</label>
                <select
                  id="os-resp"
                  className="input-pro"
                  value={form.responsavel_usuario_id}
                  onChange={(e) => set("responsavel_usuario_id", e.target.value)}
                >
                  <option value="">
                    {form.responsavel_tecnico && !form.responsavel_usuario_id ? `${form.responsavel_tecnico} (texto livre)` : "Não atribuído"}
                  </option>
                  {responsaveis.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                      {u.role === "mecanico" ? " · mecânico" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-pro" htmlFor="consumidor-final">Consumidor final?</label>
                <select
                  id="consumidor-final"
                  className="input-pro"
                  value={form.consumidor_final}
                  onChange={(e) => set("consumidor_final", e.target.value)}
                >
                  <option value="">Não informado</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
                <p className="help-pro">Vale só para esta ordem de serviço. Não muda o cadastro do cliente.</p>
              </div>
            </div>
          </Section>

          <div className="pro-card p-4 space-y-2">
            <div className="flex justify-between text-sm text-ink-600 dark:text-ink-300">
              <span>Total anterior</span>
              <span className="num">{formatarMoeda(os.valor_total)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-ink-900 dark:text-white">
              <span>Novo total</span>
              <span className="num">{formatarMoeda(totais.valor_total)}</span>
            </div>
            {Math.abs(diferenca) > 0.009 && (
              <p className={`text-xs num ${diferenca > 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                {diferenca > 0 ? "+" : "−"}
                {formatarMoeda(Math.abs(diferenca))} em relação ao atual
              </p>
            )}
            <p className="flex items-start gap-1.5 text-2xs text-ink-500 pt-1">
              <FiInfo className="h-3 w-3 mt-0.5 shrink-0" />
              Peças removidas voltam ao estoque; peças adicionadas são baixadas.
            </p>
            <div className="hidden lg:flex gap-2 pt-2">
              <Link to={`/ordens-servico/${id}`} className="btn-secondary flex-1">
                Descartar
              </Link>
              <button type="submit" className="btn-brand flex-1" disabled={salvando || algumaFalta}>
                <FiSave className="h-4 w-4" />
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </aside>

        {/* Barra de ações fixa no mobile/tablet */}
        <div className="lg:hidden fixed inset-x-0 bottom-14 z-30 border-t border-ink-200 dark:border-ink-800 bg-white/95 dark:bg-ink-900/95 backdrop-blur px-4 py-2.5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-2xs text-ink-500">Novo total</p>
            <p className="text-base font-semibold num text-ink-900 dark:text-white">{formatarMoeda(totais.valor_total)}</p>
          </div>
          <Link to={`/ordens-servico/${id}`} className="btn-secondary">
            Descartar
          </Link>
          <button type="submit" className="btn-brand" disabled={salvando || algumaFalta}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>

      <NovoClienteModal
        isOpen={novoCliente}
        onClose={() => setNovoCliente(false)}
        onClienteCriado={(cliente) => {
          qc.invalidateQueries({ queryKey: ["clientes"] });
          if (cliente?.id) setForm((f) => ({ ...f, cliente_id: cliente.id, veiculo_id: "" }));
        }}
      />
      <NovoVeiculoModal
        isOpen={novoVeiculo}
        onClose={() => setNovoVeiculo(false)}
        clienteId={form.cliente_id}
        onVeiculoCriado={(v) => {
          recarregarVeiculos();
          const vid = v?.id || v?.veiculo?.id;
          if (vid) set("veiculo_id", vid);
        }}
      />
    </div>
  );
}
