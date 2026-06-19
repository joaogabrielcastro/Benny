export default function OSFormItensProdutos({
  itensProdutos,
  produtos,
  onAdicionar,
  onRemover,
  onAtualizar,
}) {
  return (
    <div className="pro-card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Produtos
        </h2>
        <button
          type="button"
          onClick={onAdicionar}
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
              className={`grid grid-cols-12 gap-2 items-end border-b dark:border-gray-700 pb-3 ${
                estoqueInsuficiente ? "bg-red-50 dark:bg-red-900/20" : ""
              }`}
            >
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Produto
                </label>
                <select
                  value={item.produto_id}
                  onChange={(e) =>
                    onAtualizar(index, "produto_id", e.target.value)
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={item.codigo}
                  onChange={(e) =>
                    onAtualizar(index, "codigo", e.target.value)
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={item.descricao}
                  onChange={(e) =>
                    onAtualizar(index, "descricao", e.target.value)
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Qtd
                </label>
                <input
                  type="number"
                  value={item.quantidade}
                  onChange={(e) =>
                    onAtualizar(
                      index,
                      "quantidade",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  min="0"
                  step="1"
                  className={`w-full px-2 py-1 text-sm border rounded ${
                    estoqueInsuficiente
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } dark:bg-gray-700 dark:text-white`}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valor Unit.
                </label>
                <input
                  type="number"
                  value={item.valor_unitario}
                  onChange={(e) =>
                    onAtualizar(
                      index,
                      "valor_unitario",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  min="0"
                  step="0.01"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total
                </label>
                <input
                  type="text"
                  value={`R$ ${Number(item.valor_total).toFixed(2)}`}
                  readOnly
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-600 rounded"
                />
              </div>
              <div className="col-span-1">
                <button
                  type="button"
                  onClick={() => onRemover(index)}
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
  );
}
