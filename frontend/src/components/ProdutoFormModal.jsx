import { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import Modal from "./Modal";
import { buscarNcmAutomotivo, rotuloNcm } from "../features/produtos/ncmAutomotivo";

const getProdutoSaveErrorMessage = (error) => {
  const status = error?.response?.status;
  const backendMessage = error?.response?.data?.error;

  if (status === 409) {
    return backendMessage || "Codigo de produto ja cadastrado.";
  }

  if (typeof backendMessage === "string") {
    if (
      backendMessage.includes("duplicate key value") ||
      backendMessage.includes("produtos_codigo_key")
    ) {
      return "Codigo de produto ja cadastrado. Use outro codigo ou deixe em branco para gerar automaticamente.";
    }
    return backendMessage;
  }

  return error.message || "Nao foi possivel salvar o produto.";
};

export default function ProdutoFormModal({
  produto,
  isOpen = true,
  onClose,
  onSaved,
  produtosExistentes = [],
}) {
  const emptyForm = {
    codigo: "",
    nome: "",
    descricao: "",
    quantidade: 0,
    valor_custo: 0,
    valor_venda: 0,
    estoque_minimo: 5,
    ncm: "",
  };

  const [buscaNcm, setBuscaNcm] = useState("");
  const [formData, setFormData] = useState(() =>
    produto?.id
      ? {
          codigo: produto.codigo ?? "",
          nome: produto.nome ?? "",
          descricao: produto.descricao ?? "",
          quantidade: produto.quantidade ?? 0,
          valor_custo: produto.valor_custo ?? 0,
          valor_venda: produto.valor_venda ?? 0,
          estoque_minimo: produto.estoque_minimo ?? 5,
          ncm: produto.ncm ?? "",
        }
      : { ...emptyForm },
  );

  useEffect(() => {
    if (!isOpen) return;
    setBuscaNcm("");
    if (produto?.id) {
      setFormData({
        codigo: produto.codigo ?? "",
        nome: produto.nome ?? "",
        descricao: produto.descricao ?? "",
        quantidade: produto.quantidade ?? 0,
        valor_custo: produto.valor_custo ?? 0,
        valor_venda: produto.valor_venda ?? 0,
          estoque_minimo: produto.estoque_minimo ?? 5,
          ncm: produto.ncm ?? "",
      });
    } else {
      setFormData({ ...emptyForm });
    }
  }, [isOpen, produto]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: [
        "quantidade",
        "valor_custo",
        "valor_venda",
        "estoque_minimo",
      ].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const codigoInformado = (formData.codigo || "").trim();
    if (codigoInformado) {
      const codigoNormalizado = codigoInformado.toUpperCase();
      const codigoDuplicado = produtosExistentes.some((item) => {
        if (!item || item.id === produto?.id) return false;
        return (
          String(item.codigo ?? "").trim().toUpperCase() === codigoNormalizado
        );
      });

      if (codigoDuplicado) {
        toast.error(
          "Codigo ja cadastrado. Use outro codigo ou deixe em branco para gerar automaticamente.",
        );
        return;
      }
    }

    const ncmInformado = String(formData.ncm ?? "").trim();
    const ncmDigits = ncmInformado.replace(/[.\-\s]/g, "");
    if (ncmInformado && !/^\d{8}$/.test(ncmDigits)) {
      toast.error("NCM deve ter exatamente 8 dígitos.");
      return;
    }
    const payloadBase = { ...formData, ncm: ncmInformado ? ncmDigits : null };

    try {
      let res;
      if (produto && produto.id) {
        res = await api.put(`/produtos/${produto.id}`, payloadBase);
        toast.success("Produto atualizado com sucesso!");
      } else {
        const payload = { ...payloadBase };
        const c = String(payload.codigo ?? "").trim();
        if (!c) delete payload.codigo;
        res = await api.post("/produtos", payload);
        toast.success("Produto criado com sucesso!");
      }
      onSaved && onSaved(res.data.produto || res.data);
      onClose && onClose();
    } catch (error) {
      toast.error(`Erro ao salvar produto: ${getProdutoSaveErrorMessage(error)}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={produto ? "Editar Produto" : "Novo Produto"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código
            </label>
            <input
              type="text"
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              placeholder="(gerado automaticamente se vazio)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="produto-nome">
              Nome *
            </label>
            <input
              id="produto-nome"
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descrição
          </label>
          <textarea
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            rows="2"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantidade
            </label>
            <input
              type="number"
              name="quantidade"
              value={formData.quantidade}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estoque Mínimo
            </label>
            <input
              type="number"
              name="estoque_minimo"
              value={formData.estoque_minimo}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Valor Custo
            </label>
            <input
              type="number"
              name="valor_custo"
              value={formData.valor_custo}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Valor Venda
            </label>
            <input
              type="number"
              name="valor_venda"
              value={formData.valor_venda}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="busca-ncm">
            Buscar NCM pela peça
          </label>
          <input
            id="busca-ncm"
            type="text"
            value={buscaNcm}
            onChange={(e) => setBuscaNcm(e.target.value)}
            placeholder="Ex.: pastilha, filtro, óleo"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {buscarNcmAutomotivo(buscaNcm).length > 0 && (
            <ul className="mt-2 border border-gray-200 dark:border-gray-600 rounded-md divide-y divide-gray-200 dark:divide-gray-600">
              {buscarNcmAutomotivo(buscaNcm).map((item) => (
                <li key={item.ncm}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, ncm: item.ncm }));
                      setBuscaNcm("");
                    }}
                  >
                    <span className="font-medium">{item.ncm}</span>
                    <span className="text-gray-500 dark:text-gray-400"> — {item.descricao}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 mt-3" htmlFor="produto-ncm">
            NCM
          </label>
          <input
            id="produto-ncm"
            type="text"
            name="ncm"
            value={formData.ncm}
            onChange={handleChange}
            placeholder="Ex.: 87083090"
            inputMode="numeric"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {rotuloNcm(formData.ncm)?.descricao || "Necessário para emissão de NF-e. A busca preenche o código; você confirma ao salvar."}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}
