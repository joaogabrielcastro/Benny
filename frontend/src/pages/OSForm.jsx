import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function OSForm() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [mostrarClienteForm, setMostrarClienteForm] = useState(false);
  const [mostrarVeiculoForm, setMostrarVeiculoForm] = useState(false);

  const [formData, setFormData] = useState({
    cliente_id: "",
    veiculo_id: "",
    km: "",
    chassi: "",
    previsao_entrega: "",
    observacoes_veiculo: "",
    observacoes_gerais: "",
    responsavel_tecnico: "",
  });

  const [itensProdutos, setItensProdutos] = useState([]);
  const [itensServicos, setItensServicos] = useState([]);

  useEffect(() => {
    carregarClientes();
    carregarProdutos();
  }, []);

  useEffect(() => {
    if (formData.cliente_id) {
      carregarVeiculos(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  const carregarClientes = async () => {
    try {
      const response = await api.get("/clientes");
      setClientes(response.data);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

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
      const response = await api.get("/produtos");
      // A API agora retorna { data: [...], pagination: {...} }
      setProdutos(
        Array.isArray(response.data) ? response.data : response.data.data || []
      );
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const adicionarProduto = () => {
    setItensProdutos([
      ...itensProdutos,
      {
        produto_id: "",
        codigo: "",
        descricao: "",
        quantidade: 1,
        valor_unitario: 0,
        valor_total: 0,
      },
    ]);
  };

  const adicionarServico = () => {
    setItensServicos([
      ...itensServicos,
      {
        codigo: "",
        descricao: "",
        quantidade: 1,
        valor_unitario: 0,
        valor_total: 0,
      },
    ]);
  };

  const removerProduto = (index) => {
    setItensProdutos(itensProdutos.filter((_, i) => i !== index));
  };

  const removerServico = (index) => {
    setItensServicos(itensServicos.filter((_, i) => i !== index));
  };

  const atualizarProduto = (index, campo, valor) => {
    const novosProdutos = [...itensProdutos];
    novosProdutos[index][campo] = valor;

    if (campo === "produto_id" && valor) {
      const produto = produtos.find((p) => p.id == valor);
      if (produto) {
        novosProdutos[index].codigo = produto.codigo;
        novosProdutos[index].descricao = produto.nome;
        novosProdutos[index].valor_unitario = produto.valor_venda;

        // Alertar se não há estoque suficiente
        if (produto.quantidade < novosProdutos[index].quantidade) {
          alert(
            `ATENÇÃO: Produto ${produto.nome} tem apenas ${produto.quantidade} unidades em estoque!`
          );
        }
      }
    }

    if (campo === "quantidade" || campo === "valor_unitario") {
      novosProdutos[index].valor_total =
        novosProdutos[index].quantidade * novosProdutos[index].valor_unitario;

      // Verificar estoque ao alterar quantidade
      if (campo === "quantidade" && novosProdutos[index].produto_id) {
        const produto = produtos.find(
          (p) => p.id == novosProdutos[index].produto_id
        );
        if (produto && produto.quantidade < novosProdutos[index].quantidade) {
          alert(
            `ATENÇÃO: Produto ${produto.nome} tem apenas ${produto.quantidade} unidades em estoque!`
          );
        }
      }
    }

    setItensProdutos(novosProdutos);
  };

  const atualizarServico = (index, campo, valor) => {
    const novosServicos = [...itensServicos];
    novosServicos[index][campo] = valor;

    if (campo === "quantidade" || campo === "valor_unitario") {
      novosServicos[index].valor_total =
        novosServicos[index].quantidade * novosServicos[index].valor_unitario;
    }

    setItensServicos(novosServicos);
  };

  const calcularTotal = () => {
    const totalProdutos = itensProdutos.reduce(
      (sum, item) => sum + item.valor_total,
      0
    );
    const totalServicos = itensServicos.reduce(
      (sum, item) => sum + item.valor_total,
      0
    );
    return totalProdutos + totalServicos;
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
      alert("Selecione o cliente e o veículo");
      return;
    }

    const erroEstoque = validarEstoque();
    if (erroEstoque) {
      if (!confirm(`${erroEstoque}\n\nDeseja continuar mesmo assim?`)) {
        return;
      }
    }

    try {
      const dados = {
        ...formData,
        produtos: itensProdutos,
        servicos: itensServicos,
      };

      const response = await api.post("/ordens-servico", dados);
      alert("OS criada com sucesso!");
      navigate(`/ordens-servico/${response.data.id}`);
    } catch (error) {
      alert(
        "Erro ao criar OS: " + (error.response?.data?.error || error.message)
      );
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Nova Ordem de Serviço
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados do Cliente e Veículo */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Cliente e Veículo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <div className="flex space-x-2">
                <select
                  value={formData.cliente_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cliente_id: e.target.value,
                      veiculo_id: "",
                    })
                  }
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} - {c.telefone}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMostrarClienteForm(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  + Novo
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Veículo *
              </label>
              <div className="flex space-x-2">
                <select
                  value={formData.veiculo_id}
                  onChange={(e) =>
                    setFormData({ ...formData, veiculo_id: e.target.value })
                  }
                  required
                  disabled={!formData.cliente_id}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Selecione o veículo</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.modelo} - {v.placa}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMostrarVeiculoForm(true)}
                  disabled={!formData.cliente_id}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  + Novo
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Km
              </label>
              <input
                type="number"
                value={formData.km}
                onChange={(e) =>
                  setFormData({ ...formData, km: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chassi
              </label>
              <input
                type="text"
                value={formData.chassi}
                onChange={(e) =>
                  setFormData({ ...formData, chassi: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Previsão de Entrega
              </label>
              <input
                type="date"
                value={formData.previsao_entrega}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    previsao_entrega: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações do Veículo
              </label>
              <input
                type="text"
                value={formData.observacoes_veiculo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    observacoes_veiculo: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsável Técnico
              </label>
              <input
                type="text"
                value={formData.responsavel_tecnico}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    responsavel_tecnico: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Produtos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Produtos</h2>
            <button
              type="button"
              onClick={adicionarProduto}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Adicionar Produto
            </button>
          </div>

          <div className="space-y-3">
            {itensProdutos.map((item, index) => {
              const produto = produtos.find((p) => p.id == item.produto_id);
              const estoqueInsuficiente =
                produto && produto.quantidade < item.quantidade;

              return (
                <div
                  key={index}
                  className={`grid grid-cols-12 gap-2 items-end border-b pb-3 ${
                    estoqueInsuficiente ? "bg-red-50" : ""
                  }`}
                >
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Produto
                    </label>
                    <select
                      value={item.produto_id}
                      onChange={(e) =>
                        atualizarProduto(index, "produto_id", e.target.value)
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} (Estoque: {p.quantidade})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Código
                    </label>
                    <input
                      type="text"
                      value={item.codigo}
                      onChange={(e) =>
                        atualizarProduto(index, "codigo", e.target.value)
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) =>
                        atualizarProduto(index, "descricao", e.target.value)
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Qtd
                    </label>
                    <input
                      type="number"
                      value={item.quantidade}
                      onChange={(e) =>
                        atualizarProduto(
                          index,
                          "quantidade",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      step="1"
                      className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 ${
                        estoqueInsuficiente
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Valor Unit.
                    </label>
                    <input
                      type="number"
                      value={item.valor_unitario}
                      onChange={(e) =>
                        atualizarProduto(
                          index,
                          "valor_unitario",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Total
                    </label>
                    <input
                      type="text"
                      value={`R$ ${item.valor_total.toFixed(2)}`}
                      readOnly
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removerProduto(index)}
                      className="w-full px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      X
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Serviços */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Serviços</h2>
            <button
              type="button"
              onClick={adicionarServico}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Adicionar Serviço
            </button>
          </div>

          <div className="space-y-3">
            {itensServicos.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-end border-b pb-3"
              >
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={item.codigo}
                    onChange={(e) =>
                      atualizarServico(index, "codigo", e.target.value)
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={item.descricao}
                    onChange={(e) =>
                      atualizarServico(index, "descricao", e.target.value)
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Qtd/Horas
                  </label>
                  <input
                    type="number"
                    value={item.quantidade}
                    onChange={(e) =>
                      atualizarServico(
                        index,
                        "quantidade",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    min="0"
                    step="0.5"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Valor Unit.
                  </label>
                  <input
                    type="number"
                    value={item.valor_unitario}
                    onChange={(e) =>
                      atualizarServico(
                        index,
                        "valor_unitario",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Total
                  </label>
                  <input
                    type="text"
                    value={`R$ ${item.valor_total.toFixed(2)}`}
                    readOnly
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                  />
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => removerServico(index)}
                    className="w-full px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observações e Total */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações Gerais
            </label>
            <textarea
              value={formData.observacoes_gerais}
              onChange={(e) =>
                setFormData({ ...formData, observacoes_gerais: e.target.value })
              }
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-between items-center border-t pt-4">
            <span className="text-2xl font-bold text-gray-800">
              Valor Total:
            </span>
            <span className="text-3xl font-bold text-blue-600">
              R$ {calcularTotal().toFixed(2)}
            </span>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate("/ordens-servico")}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Salvar OS
          </button>
        </div>
      </form>

      {/* Modais */}
      {mostrarClienteForm && (
        <ClienteFormModal
          onClose={(clienteId) => {
            setMostrarClienteForm(false);
            if (clienteId) {
              carregarClientes();
              setFormData({ ...formData, cliente_id: clienteId });
            }
          }}
        />
      )}

      {mostrarVeiculoForm && formData.cliente_id && (
        <VeiculoFormModal
          clienteId={formData.cliente_id}
          onClose={(veiculoId) => {
            setMostrarVeiculoForm(false);
            if (veiculoId) {
              carregarVeiculos(formData.cliente_id);
              setFormData({ ...formData, veiculo_id: veiculoId });
            }
          }}
        />
      )}
    </div>
  );
}

function ClienteFormModal({ onClose }) {
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    cpf_cnpj: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/clientes", formData);
      alert("Cliente criado com sucesso!");
      onClose(response.data.id);
    } catch (error) {
      alert("Erro ao criar cliente");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Novo Cliente
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone *
              </label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) =>
                  setFormData({ ...formData, telefone: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF/CNPJ
              </label>
              <input
                type="text"
                value={formData.cpf_cnpj}
                onChange={(e) =>
                  setFormData({ ...formData, cpf_cnpj: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => onClose(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function VeiculoFormModal({ clienteId, onClose }) {
  const [formData, setFormData] = useState({
    cliente_id: clienteId,
    modelo: "",
    cor: "",
    placa: "",
    ano: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/veiculos", formData);
      alert("Veículo criado com sucesso!");
      onClose(response.data.id);
    } catch (error) {
      alert("Erro ao criar veículo");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Novo Veículo
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modelo *
              </label>
              <input
                type="text"
                value={formData.modelo}
                onChange={(e) =>
                  setFormData({ ...formData, modelo: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor
                </label>
                <input
                  type="text"
                  value={formData.cor}
                  onChange={(e) =>
                    setFormData({ ...formData, cor: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano
                </label>
                <input
                  type="text"
                  value={formData.ano}
                  onChange={(e) =>
                    setFormData({ ...formData, ano: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placa *
              </label>
              <input
                type="text"
                value={formData.placa}
                onChange={(e) =>
                  setFormData({ ...formData, placa: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => onClose(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
