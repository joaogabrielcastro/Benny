import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiPlus, FiUsers, FiChevronRight } from "react-icons/fi";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import toast from "react-hot-toast";
import api from "../services/api";
import { unwrapListResponse, unwrapPagination } from "../utils/apiList";
import { useDebounce } from "../hooks/useDebounce";
import { useConfirm } from "../hooks/useConfirm";
import { mascaraCEP } from "../utils/masks";
import PageHeader from "../components/layout/PageHeader";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import ClienteFormModal from "../components/ClienteFormModal";
import ConfirmDialog from "../components/ConfirmDialog";

const ITEMS_PER_PAGE = 10;

export default function Clientes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
    <div className="page-enter">
      <PageHeader
        title="Clientes"
        subtitle="Contatos, veículos e histórico de atendimentos de cada cliente."
        actions={
          <button type="button" onClick={abrirNovo} className="btn-brand">
            <FiPlus className="h-4 w-4" />
            Novo cliente
          </button>
        }
      />

      <SearchBar
        className="mb-4"
        onSearch={setBusca}
        placeholder="Buscar por nome, telefone ou CPF/CNPJ…"
      />

      <div className="pro-card overflow-hidden">
        {loading ? (
          <SkeletonRows rows={6} cols={4} />
        ) : clientes.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title={buscaDebounced ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            description={buscaDebounced ? "Tente outro nome, telefone ou documento." : "Cadastre o primeiro cliente para abrir atendimentos."}
            action={
              !buscaDebounced && (
                <button type="button" onClick={abrirNovo} className="btn-brand">
                  <FiPlus className="h-4 w-4" /> Novo cliente
                </button>
              )
            }
          />
        ) : (
          <table className="table-pro">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="hidden sm:table-cell">Telefone</th>
                <th className="hidden md:table-cell">Cidade</th>
                <th className="hidden lg:table-cell">CEP</th>
                <th className="text-right">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="row-link group" onClick={() => navigate(`/clientes/${c.id}`)}>
                  <td>
                    <Link
                      to={`/clientes/${c.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-ink-900 dark:text-white hover:text-brand-600"
                    >
                      {c.nome}
                    </Link>
                    <p className="text-xs text-ink-500 num">
                      {c.cpf_cnpj || <span className="sm:hidden">{c.telefone}</span>}
                    </p>
                  </td>
                  <td className="hidden sm:table-cell num">{c.telefone || "—"}</td>
                  <td className="hidden md:table-cell">
                    {[c.cidade, c.estado].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="hidden lg:table-cell num">
                    {c.cep ? (
                      mascaraCEP(c.cep)
                    ) : (
                      <span className="text-amber-600 text-xs" title="CEP é obrigatório para emitir NFS-e">
                        sem CEP
                      </span>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => abrirEditar(c)} className="btn-ghost btn-sm">
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirCliente(c)}
                        className="btn-ghost btn-sm text-red-600 hover:!text-red-700 hover:!bg-red-50 dark:hover:!bg-red-950/40"
                      >
                        Excluir
                      </button>
                      <FiChevronRight className="hidden sm:block h-4 w-4 text-ink-300 group-hover:text-ink-500" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      </div>

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
