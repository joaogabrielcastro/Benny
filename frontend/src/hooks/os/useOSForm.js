import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { unwrapListResponse } from "../../utils/apiList";

const emptyProduto = () => ({
  produto_id: "",
  codigo: "",
  descricao: "",
  quantidade: 1,
  valor_unitario: 0,
  valor_total: 0,
});

const emptyServico = () => ({
  codigo: "",
  descricao: "",
  quantidade: 1,
  valor_unitario: 0,
  valor_total: 0,
});

export function useOSForm(osId) {
  const navigate = useNavigate();
  const modoEdicao = !!osId;

  const [veiculos, setVeiculos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [mostrarClienteForm, setMostrarClienteForm] = useState(false);
  const [mostrarVeiculoForm, setMostrarVeiculoForm] = useState(false);
  const [carregando, setCarregando] = useState(modoEdicao);

  const [formData, setFormData] = useState({
    cliente_id: "",
    veiculo_id: "",
    km: "",
    previsao_entrega: "",
    observacoes_veiculo: "",
    observacoes_gerais: "",
    responsavel_tecnico: "",
    status: "Aberta",
  });

  const [itensProdutos, setItensProdutos] = useState([]);
  const [itensServicos, setItensServicos] = useState([]);

  const carregarVeiculos = async (clienteId) => {
    try {
      const response = await api.get(`/veiculos/cliente/${clienteId}`);
      setVeiculos(response.data);
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
    }
  };

  const carregarProdutos = async () => {
    try {
      const response = await api.get("/produtos", { params: { limit: 50000 } });
      setProdutos(unwrapListResponse(response.data));
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const carregarOS = async () => {
    try {
      setCarregando(true);
      const response = await api.get(`/ordens-servico/${osId}`);
      const os = response.data;

      setFormData({
        cliente_id: os.cliente_id,
        veiculo_id: os.veiculo_id,
        km: os.km || "",
        previsao_entrega: os.previsao_entrega
          ? os.previsao_entrega.split("T")[0]
          : "",
        observacoes_veiculo: os.observacoes_veiculo || "",
        observacoes_gerais: os.observacoes_gerais || "",
        responsavel_tecnico: os.responsavel_tecnico || "",
        status: os.status || "Aberta",
      });

      if (os.cliente_id) await carregarVeiculos(os.cliente_id);

      if (os.produtos?.length) {
        setItensProdutos(
          os.produtos.map((p) => ({
            produto_id: p.produto_id || "",
            codigo: p.codigo,
            descricao: p.descricao,
            quantidade: p.quantidade,
            valor_unitario: p.valor_unitario,
            valor_total: p.valor_total,
          })),
        );
      }

      if (os.servicos?.length) {
        setItensServicos(
          os.servicos.map((s) => ({
            codigo: s.codigo,
            descricao: s.descricao,
            quantidade: s.quantidade,
            valor_unitario: s.valor_unitario,
            valor_total: s.valor_total,
          })),
        );
      }
    } catch {
      toast.error("Erro ao carregar OS");
      navigate("/ordens-servico");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarProdutos();
    if (modoEdicao) carregarOS();
  }, [osId]);

  useEffect(() => {
    if (formData.cliente_id) carregarVeiculos(formData.cliente_id);
  }, [formData.cliente_id]);

  const adicionarProduto = () =>
    setItensProdutos([...itensProdutos, emptyProduto()]);

  const adicionarServico = () =>
    setItensServicos([...itensServicos, emptyServico()]);

  const removerProduto = (index) =>
    setItensProdutos(itensProdutos.filter((_, i) => i !== index));

  const removerServico = (index) =>
    setItensServicos(itensServicos.filter((_, i) => i !== index));

  const atualizarProduto = (index, campo, valor) => {
    const novos = [...itensProdutos];
    novos[index][campo] = valor;

    if (campo === "produto_id" && valor) {
      const produto = produtos.find((p) => p.id == valor);
      if (produto) {
        novos[index].codigo = produto.codigo;
        novos[index].descricao = produto.nome;
        novos[index].valor_unitario = produto.valor_venda;
        if (produto.quantidade < novos[index].quantidade) {
          toast.error(
            `${produto.nome}: estoque ${produto.quantidade} un.`,
            { icon: "⚠️" },
          );
        }
      }
    }

    if (
      campo === "quantidade" ||
      campo === "valor_unitario" ||
      (campo === "produto_id" && valor)
    ) {
      const q = Number(novos[index].quantidade) || 0;
      const vu = Number(novos[index].valor_unitario) || 0;
      novos[index].valor_total = q * vu;
    }

    if (campo === "quantidade" && novos[index].produto_id) {
      const produto = produtos.find((p) => p.id == novos[index].produto_id);
      if (produto && produto.quantidade < novos[index].quantidade) {
        toast.error(
          `${produto.nome}: estoque ${produto.quantidade} un.`,
          { icon: "⚠️" },
        );
      }
    }

    setItensProdutos(novos);
  };

  const atualizarServico = (index, campo, valor) => {
    const novos = [...itensServicos];
    novos[index][campo] = valor;
    if (campo === "quantidade" || campo === "valor_unitario") {
      const q = Number(novos[index].quantidade) || 0;
      const vu = Number(novos[index].valor_unitario) || 0;
      novos[index].valor_total = q * vu;
    }
    setItensServicos(novos);
  };

  const calcularTotal = () => {
    const tp = itensProdutos.reduce(
      (s, i) => s + (Number(i.valor_total) || 0),
      0,
    );
    const ts = itensServicos.reduce(
      (s, i) => s + (Number(i.valor_total) || 0),
      0,
    );
    return tp + ts;
  };

  const validarEstoque = () => {
    for (const item of itensProdutos) {
      if (item.produto_id) {
        const produto = produtos.find((p) => p.id == item.produto_id);
        if (produto && produto.quantidade < item.quantidade) {
          return `Estoque insuficiente para ${produto.nome}. Disponível: ${produto.quantidade}`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.cliente_id || !formData.veiculo_id) {
      toast.error("Selecione o cliente e o veículo");
      return;
    }

    const erroEstoque = validarEstoque();
    if (erroEstoque) {
      const ok = window.confirm(
        `${erroEstoque}\n\nDeseja continuar mesmo assim?`,
      );
      if (!ok) return;
    }

    try {
      const dados = {
        ...formData,
        produtos: itensProdutos,
        servicos: itensServicos,
      };

      if (modoEdicao) {
        await api.put(`/ordens-servico/${osId}`, dados);
        toast.success("OS atualizada com sucesso!");
        navigate(`/ordens-servico/${osId}`);
      } else {
        const response = await api.post("/ordens-servico", dados);
        toast.success("OS criada com sucesso!");
        navigate(`/ordens-servico/${response.data.id}`);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          `Erro ao ${modoEdicao ? "atualizar" : "criar"} OS`,
      );
    }
  };

  return {
    modoEdicao,
    navigate,
    veiculos,
    produtos,
    mostrarClienteForm,
    setMostrarClienteForm,
    mostrarVeiculoForm,
    setMostrarVeiculoForm,
    carregando,
    formData,
    setFormData,
    itensProdutos,
    itensServicos,
    adicionarProduto,
    adicionarServico,
    removerProduto,
    removerServico,
    atualizarProduto,
    atualizarServico,
    calcularTotal,
    handleSubmit,
    carregarVeiculos,
  };
}
