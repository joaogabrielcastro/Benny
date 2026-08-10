import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { unwrapListResponse, unwrapPagination } from "../utils/apiList";
import { useDebounce } from "../hooks/useDebounce";
import { useConfirm } from "../hooks/useConfirm";
import { mascaraCEP } from "../utils/masks";
import PageHeader from "../components/layout/PageHeader";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import ClienteFormModal from "../components/ClienteFormModal";
import ConfirmDialog from "../components/ConfirmDialog";

const ITEMS_PER_PAGE = 10;

export default function Clientes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const { confirm, dialogState, handleClose } = useConfirm();

  const editIdFromUrl = searchParams.get("edit");

  useEffect(() => {
    setCurrentPage(1);
  }, [buscaDebounced]);

  const listParams = useMemo(
    () => ({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      ...(buscaDebounced ? { busca: buscaDebounced } : {}),
    }),
    [currentPage, buscaDebounced],
  );

  const carregar = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/clientes", { params: listParams });
      setClientes(unwrapListResponse(data));
      const pag = unwrapPagination(data);
      setTotalItems(pag?.total ?? unwrapListResponse(data).length);
      setTotalPages(pag?.pages ?? 1);
    } catch {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [listParams]);

  useEffect(() => {
    if (editIdFromUrl) {
      setClienteEditando(Number(editIdFromUrl));
      setModalAberto(true);
    }
  }, [editIdFromUrl]);

  const abrirNovo = () => {
    setClienteEditando(null);
    setModalAberto(true);
  };

  const abrirEditar = (cliente) => {
    setClienteEditando(cliente.id);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setClienteEditando(null);
    if (editIdFromUrl) {
      searchParams.delete("edit");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleSucesso = () => {
    carregar();
  };

  const excluirCliente = async (cliente) => {
    const confirmado = await confirm({
      title: "Excluir cliente e vínculos",
      message:
        `Deseja excluir “${cliente.nome}” e TODO o histórico vinculado?\n\n` +
        `Serão removidos também: veículos, orçamentos, ordens de serviço, ` +
        `agendamentos e registros de notas fiscais no sistema.\n\n` +
        `Atenção: isso não cancela NFS-e/NF-e já autorizadas na prefeitura/SEFAZ.\n\n` +
        `Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir tudo",
    });
    if (!confirmado) return;

    try {
      const { data } = await api.delete(`/clientes/${cliente.id}`);
      toast.success(data?.message || "Cliente excluído com sucesso");

      if (clientes.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        carregar();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Erro ao excluir cliente",
      );
    }
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Cadastro e correção de endereço para emissão de NFS-e"
        actions={
          <button type="button" onClick={abrirNovo} className="btn-brand">
            Novo cliente
          </button>
        }
      />

      <SearchBar
        onSearch={setBusca}
        placeholder="Buscar por nome, telefone ou CPF/CNPJ…"
      />

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <div className="pro-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase hidden sm:table-cell">
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase hidden md:table-cell">
                    Cidade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase hidden lg:table-cell">
                    CEP
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {clientes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  clientes.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {c.nome}
                        </p>
                        {c.cpf_cnpj && (
                          <p className="text-xs text-slate-500">{c.cpf_cnpj}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                        {c.telefone || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell">
                        {[c.cidade, c.estado].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                        {c.cep ? mascaraCEP(c.cep) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => abrirEditar(c)}
                            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => excluirCliente(c)}
                            className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}

      <ClienteFormModal
        isOpen={modalAberto}
        onClose={fecharModal}
        clienteId={clienteEditando}
        onSuccess={handleSucesso}
      />

      <ConfirmDialog
        open={!!dialogState}
        title={dialogState?.title}
        message={dialogState?.message}
        confirmLabel={dialogState?.confirmLabel}
        cancelLabel={dialogState?.cancelLabel}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />
    </div>
  );
}
