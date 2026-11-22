import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FiPlus, FiSave, FiCheckCircle, FiPackage, FiTool } from "react-icons/fi";
import api from "../services/api";
import ClienteAutocomplete from "../components/ClienteAutocomplete";
import NovoClienteModal from "../components/NovoClienteModal";
import NovoVeiculoModal from "../components/NovoVeiculoModal";
import ProdutoFormModal from "../components/ProdutoFormModal";
import ServicoFormModal from "../components/ServicoFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import Section from "../components/ui/Section";
import AssistenteOrcamento from "../features/orcamentos/AssistenteOrcamento";
import { aplicarSugestoesNoOrcamento } from "../features/orcamentos/aplicarSugestoes";
import ItensEditor, { limparLinha, linhaDeProduto, linhaDeServico, totaisItens } from "../features/itens/ItensEditor";
import { rotuloVeiculo } from "../features/veiculos/rotuloVeiculo";
import { formatarMoeda } from "../utils/formatters";

const FORM_VAZIO = {
  cliente_id: "",
  veiculo_id: "",
  km: "",
  previsao_entrega: "",
  observacoes_veiculo: "",
  responsavel_tecnico: "",
  observacoes_gerais: "",
};

function erroApi(error, padrao) {
  const d = error?.response?.data;
  const campo = d?.details?.fieldErrors && Object.values(d.details.fieldErrors).flat()[0];
  return d?.error && d.error !== "Dados inválidos" ? d.error : campo || d?.error || padrao;
}

/**
 * Novo atendimento / orçamento. O orçamento é a porta de entrada da OS:
 * "Salvar e abrir OS" cria e aprova na sequência (baixa estoque e gera a OS),
 * exatamente como a aprovação pela tela de detalhes.
 */
export default function OrcamentoForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id: orcamentoId } = useParams();
  const [searchParams] = useSearchParams();
  const editando = Boolean(orcamentoId);

  const [form, setForm] = useState(() => ({
    ...FORM_VAZIO,
    cliente_id: searchParams.get("cliente_id") || "",
    veiculo_id: searchParams.get("veiculo_id") || "",
  }));
  const [produtos, setProdutos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [novoCliente, setNovoCliente] = useState(false);
  const [novoVeiculo, setNovoVeiculo] = useState(false);
  const [novoProduto, setNovoProduto] = useState(false);
  const [novoServico, setNovoServico] = useState(false);
  const [confirmarAprovacao, setConfirmarAprovacao] = useState(false);

  useEffect(() => {
    if (!editando) return;
    (async () => {
      try {
        const { data: o } = await api.get(`/orcamentos/${orcamentoId}`);
        if (o.status !== "Pendente") {
          toast.error("Só é possível editar orçamentos pendentes.");
          navigate(`/orcamentos/${orcamentoId}`);
          return;
        }
        setForm({
          cliente_id: String(o.cliente_id || ""),
          veiculo_id: String(o.veiculo_id || ""),
          km: o.km ?? "",
          previsao_entrega: o.previsao_entrega ? String(o.previsao_entrega).slice(0, 10) : "",
          observacoes_veiculo: o.observacoes_veiculo || "",
          responsavel_tecnico: o.responsavel_tecnico || "",
          observacoes_gerais: o.observacoes_gerais || "",
        });
        setProdutos(
          (o.produtos || []).map((p, i) => ({
            _key: `p${p.id || i}`,
            produto_id: p.produto_id || null,
            codigo: p.codigo || "",
            descricao: p.descricao,
            ncm: p.ncm || p.produto_ncm || "",
            quantidade: Number(p.quantidade),
            valor_unitario: Number(p.valor_unitario),
            valor_total: Number(p.valor_total),
          })),
        );
        setServicos(
          (o.servicos || []).map((s, i) => ({
            _key: `s${s.id || i}`,
            codigo: s.codigo || "",
            descricao: s.descricao,
            quantidade: Number(s.quantidade),
            valor_unitario: Number(s.valor_unitario),
            valor_total: Number(s.valor_total),
          })),
        );
      } catch {
        toast.error("Erro ao carregar orçamento");
        navigate("/orcamentos");
      } finally {
        setCarregando(false);
      }
    })();
  }, [editando, orcamentoId, navigate]);

  const { data: veiculos = [], refetch: recarregarVeiculos } = useQuery({
    queryKey: ["veiculos", "cliente", String(form.cliente_id)],
    enabled: Boolean(form.cliente_id),
    queryFn: async () => (await api.get(`/veiculos/cliente/${form.cliente_id}`)).data,
  });

  // Sugere o último km conhecido do veículo selecionado
  const { data: ultimaOs } = useQuery({
    queryKey: ["ordens-servico", "ultima-km", form.veiculo_id],
    enabled: Boolean(form.veiculo_id) && !editando,
    queryFn: async () => {
      const { data } = await api.get("/ordens-servico", {
        params: { veiculo_id: form.veiculo_id, limit: 1, page: 1, ordenar: "criado_em", direcao: "desc" },
      });
      return (data?.data || [])[0] || null;
    },
  });

  if (carregando) return <LoadingSpinner size="lg" />;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const totais = totaisItens(produtos, servicos);
  const veiculoSel = veiculos.find((v) => String(v.id) === String(form.veiculo_id));

  const montarDados = () => ({
    ...form,
    km: form.km === "" ? null : form.km,
    previsao_entrega: form.previsao_entrega || null,
    status: "Pendente",
    produtos: produtos.map(limparLinha),
    servicos: servicos.map(limparLinha),
  });

  const validar = () => {
    if (!form.cliente_id || !form.veiculo_id) {
      toast.error("Selecione o cliente e o veículo.");
      return false;
    }
    if (!produtos.length && !servicos.length) {
      toast.error("Adicione ao menos um serviço ou peça.");
      return false;
    }
    if ([...produtos, ...servicos].some((l) => !String(l.descricao || "").trim())) {
      toast.error("Informe a descrição de todos os itens.");
      return false;
    }
    const ncm = produtos.find((l) => l.ncm && String(l.ncm).length !== 8);
    if (ncm) {
      toast.error(`NCM de “${ncm.descricao}” precisa ter 8 dígitos.`);
      return false;
    }
    return true;
  };

  const salvar = async (e) => {
    e?.preventDefault();
    if (!validar()) return;
    setSalvando(true);
    try {
      const dados = montarDados();
      if (editando) {
        await api.put(`/orcamentos/${orcamentoId}`, dados);
        toast.success("Orçamento atualizado.");
        navigate(`/orcamentos/${orcamentoId}`);
      } else {
        const { data } = await api.post("/orcamentos", dados);
        toast.success(`Orçamento ${data?.numero || ""} criado.`.replace("  ", " "));
        navigate(data?.id ? `/orcamentos/${data.id}` : "/orcamentos");
      }
      qc.invalidateQueries({ queryKey: ["orcamentos"] });
    } catch (error) {
      toast.error(erroApi(error, editando ? "Erro ao atualizar orçamento" : "Erro ao criar orçamento"), { duration: 7000 });
    } finally {
      setSalvando(false);
    }
  };

  const salvarEAprovar = async () => {
    setConfirmarAprovacao(false);
    setSalvando(true);
    let criadoId = orcamentoId;
    try {
      const dados = montarDados();
      if (editando) await api.put(`/orcamentos/${orcamentoId}`, dados);
      else {
        const { data } = await api.post("/orcamentos", dados);
        criadoId = data?.id;
      }
      const { data: aprovado } = await api.put(`/orcamentos/${criadoId}`, { ...dados, status: "Aprovado" });
      qc.invalidateQueries({ queryKey: ["orcamentos"] });
      qc.invalidateQueries({ queryKey: ["ordens-servico"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      if (aprovado?.os?.id) {
        toast.success(`OS ${aprovado.os.numero} aberta.`);
        navigate(`/ordens-servico/${aprovado.os.id}`);
      } else {
        toast.success("Orçamento aprovado.");
        navigate(`/orcamentos/${criadoId}`);
      }
    } catch (error) {
      toast.error(erroApi(error, "Não foi possível aprovar o orçamento."), { duration: 8000 });
      if (criadoId && !editando) navigate(`/orcamentos/${criadoId}`);
    } finally {
      setSalvando(false);
    }
  };

  const botoes = (
    <>
      <button type="submit" className="btn-secondary flex-1" disabled={salvando}>
        <FiSave className="h-4 w-4" />
        {editando ? "Salvar" : "Salvar orçamento"}
      </button>
      <button
        type="button"
        className="btn-brand flex-1"
        disabled={salvando}
        onClick={() => validar() && setConfirmarAprovacao(true)}
      >
        <FiCheckCircle className="h-4 w-4" />
        Aprovar e abrir OS
      </button>
    </>
  );

  return (
    <div className="page-enter">
      <PageHeader
        back={editando ? { to: `/orcamentos/${orcamentoId}`, label: "Orçamento" } : { to: "/orcamentos", label: "Orçamentos" }}
        title={editando ? "Editar orçamento" : "Novo atendimento"}
        subtitle={
          editando
            ? "Ajuste itens e valores antes de enviar ao cliente."
            : "Identifique o veículo, descreva o problema e monte o orçamento. Aprove na hora para abrir a OS."
        }
      />

      <form onSubmit={salvar} className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start pb-24 lg:pb-0">
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <Section title="1 · Cliente e veículo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-pro">Cliente *</label>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <ClienteAutocomplete
                      value={form.cliente_id}
                      onChange={(cid) =>
                        setForm((f) => (String(cid || "") === String(f.cliente_id || "") ? f : { ...f, cliente_id: cid, veiculo_id: "" }))
                      }
                      required
                    />
                  </div>
                  <button type="button" className="btn-secondary btn-icon" onClick={() => setNovoCliente(true)} title="Novo cliente" aria-label="Novo cliente">
                    <FiPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="label-pro" htmlFor="orc-veiculo">Veículo *</label>
                <div className="flex gap-2">
                  <select
                    id="orc-veiculo"
                    className="input-pro flex-1 min-w-0"
                    value={form.veiculo_id}
                    onChange={(e) => set("veiculo_id", e.target.value)}
                    disabled={!form.cliente_id}
                    required
                  >
                    <option value="">{form.cliente_id ? (veiculos.length ? "Selecione o veículo" : "Cliente sem veículos — cadastre ao lado") : "Escolha o cliente primeiro"}</option>
                    {veiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {rotuloVeiculo(v)}
                      </option>
                    ))}
                  </select>
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
                </div>
                {veiculoSel && ultimaOs && (
                  <p className="help-pro">
                    Último atendimento: {ultimaOs.numero}
                    {ultimaOs.km ? ` · ${Number(ultimaOs.km).toLocaleString("pt-BR")} km` : ""}
                  </p>
                )}
              </div>
              <div>
                <label className="label-pro" htmlFor="orc-km">Quilometragem atual</label>
                <input
                  id="orc-km"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="input-pro num"
                  value={form.km}
                  onChange={(e) => set("km", e.target.value)}
                  placeholder={ultimaOs?.km ? `Última: ${Number(ultimaOs.km).toLocaleString("pt-BR")}` : "Ex.: 58210"}
                />
                {form.km !== "" && ultimaOs?.km && Number(form.km) < Number(ultimaOs.km) && (
                  <p className="help-pro text-amber-700 dark:text-amber-300">Menor que a última registrada ({Number(ultimaOs.km).toLocaleString("pt-BR")} km). Confira.</p>
                )}
              </div>
              <div>
                <label className="label-pro" htmlFor="orc-prev">Previsão de entrega</label>
                <input id="orc-prev" type="date" className="input-pro" value={form.previsao_entrega} onChange={(e) => set("previsao_entrega", e.target.value)} />
              </div>
            </div>
          </Section>

          <Section title="2 · Problema e diagnóstico">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-pro" htmlFor="orc-relato">Relato do cliente / condição do veículo</label>
                <textarea
                  id="orc-relato"
                  rows={3}
                  className="input-pro"
                  value={form.observacoes_veiculo}
                  onChange={(e) => set("observacoes_veiculo", e.target.value)}
                  placeholder="Ex.: ruído ao frear, luz do óleo acendendo…"
                />
              </div>
              <div>
                <label className="label-pro" htmlFor="orc-obs">Diagnóstico e observações</label>
                <textarea
                  id="orc-obs"
                  rows={3}
                  className="input-pro"
                  value={form.observacoes_gerais}
                  onChange={(e) => set("observacoes_gerais", e.target.value)}
                  placeholder="O que foi constatado, garantia, condições…"
                />
              </div>
            </div>
          </Section>

          <AssistenteOrcamento
            clienteId={form.cliente_id}
            veiculoId={form.veiculo_id}
            km={form.km}
            itensProdutos={produtos}
            itensServicos={servicos}
            onAplicar={(args) => {
              const aplicado = aplicarSugestoesNoOrcamento(args);
              setProdutos(aplicado.itensProdutos);
              setServicos(aplicado.itensServicos);
              return aplicado;
            }}
          />

          <div>
            <ItensEditor produtos={produtos} servicos={servicos} onChangeProdutos={setProdutos} onChangeServicos={setServicos} />
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <button type="button" className="link-pro inline-flex items-center gap-1" onClick={() => setNovoServico(true)}>
                <FiTool className="h-3.5 w-3.5" /> Cadastrar serviço no catálogo
              </button>
              <button type="button" className="link-pro inline-flex items-center gap-1" onClick={() => setNovoProduto(true)}>
                <FiPackage className="h-3.5 w-3.5" /> Cadastrar peça no catálogo
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20">
          <Section title="Responsável">
            <label className="label-pro" htmlFor="orc-resp">Responsável técnico</label>
            <input id="orc-resp" className="input-pro" value={form.responsavel_tecnico} onChange={(e) => set("responsavel_tecnico", e.target.value)} placeholder="Opcional" />
          </Section>
          <div className="pro-card p-4 space-y-1.5">
            <div className="flex justify-between text-sm text-ink-600 dark:text-ink-300">
              <span>Serviços</span>
              <span className="num">{formatarMoeda(totais.valor_servicos)}</span>
            </div>
            <div className="flex justify-between text-sm text-ink-600 dark:text-ink-300">
              <span>Peças</span>
              <span className="num">{formatarMoeda(totais.valor_produtos)}</span>
            </div>
            <div className="flex justify-between pt-1 text-lg font-semibold text-ink-900 dark:text-white">
              <span>Total</span>
              <span className="num">{formatarMoeda(totais.valor_total)}</span>
            </div>
            <div className="hidden lg:flex flex-col gap-2 pt-3">{botoes}</div>
            <p className="hidden lg:block text-2xs text-ink-500 pt-1">
              “Salvar orçamento” deixa pendente para enviar ao cliente. “Aprovar e abrir OS” baixa as peças do estoque e abre a ordem de serviço.
            </p>
            <Link to={editando ? `/orcamentos/${orcamentoId}` : "/orcamentos"} className="hidden lg:flex btn-ghost w-full mt-1">
              Cancelar
            </Link>
          </div>
        </aside>

        <div className="lg:hidden fixed inset-x-0 bottom-14 z-30 border-t border-ink-200 dark:border-ink-800 bg-white/95 dark:bg-ink-900/95 backdrop-blur px-4 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-500">Total</span>
            <span className="text-base font-semibold num text-ink-900 dark:text-white">{formatarMoeda(totais.valor_total)}</span>
          </div>
          <div className="flex gap-2">{botoes}</div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmarAprovacao}
        title="Aprovar e abrir OS"
        message={`O orçamento de ${formatarMoeda(totais.valor_total)} será salvo e aprovado: as peças são baixadas do estoque e a ordem de serviço é criada. Continuar?`}
        confirmLabel="Aprovar e abrir OS"
        variant="primary"
        onConfirm={salvarEAprovar}
        onCancel={() => setConfirmarAprovacao(false)}
      />
      <NovoClienteModal
        isOpen={novoCliente}
        onClose={() => setNovoCliente(false)}
        onClienteCriado={(cliente) => {
          qc.invalidateQueries({ queryKey: ["clientes"] });
          if (cliente?.id) setForm((f) => ({ ...f, cliente_id: String(cliente.id), veiculo_id: "" }));
        }}
      />
      <NovoVeiculoModal
        isOpen={novoVeiculo}
        onClose={() => setNovoVeiculo(false)}
        clienteId={form.cliente_id}
        onVeiculoCriado={(v) => {
          recarregarVeiculos();
          const vid = v?.id || v?.veiculo?.id;
          if (vid) set("veiculo_id", String(vid));
        }}
      />
      <ProdutoFormModal
        isOpen={novoProduto}
        produtosExistentes={[]}
        onClose={() => setNovoProduto(false)}
        onSaved={(p) => {
          if (p?.id) setProdutos((l) => [...l, linhaDeProduto(p)]);
          qc.invalidateQueries({ queryKey: ["produtos"] });
          setNovoProduto(false);
        }}
      />
      <ServicoFormModal
        isOpen={novoServico}
        onClose={() => setNovoServico(false)}
        onSaved={(s) => {
          if (s?.id) setServicos((l) => [...l, linhaDeServico(s)]);
          qc.invalidateQueries({ queryKey: ["servicos"] });
          setNovoServico(false);
        }}
      />
    </div>
  );
}
