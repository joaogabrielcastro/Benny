import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiTruck, FiChevronRight } from "react-icons/fi";
import api from "../services/api";
import PageHeader from "../components/layout/PageHeader";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { unwrapListResponse, unwrapPagination } from "../utils/apiList";
import { formatarData } from "../utils/formatters";
import { formatarPlaca, tempoRelativo } from "../features/os/osHelpers";

const POR_PAGINA = 20;

/**
 * Consulta de veículos: placa, modelo, cliente e resumo de atendimentos.
 * O cadastro/edição acontece na ficha do cliente (o veículo pertence a ele).
 */
export default function Veiculos() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["veiculos", "lista", busca, pagina],
    queryFn: async () => {
      const { data: res } = await api.get("/veiculos", {
        params: { busca: busca || undefined, page: pagina, limit: POR_PAGINA },
      });
      return { rows: unwrapListResponse(res), pagination: unwrapPagination(res) };
    },
    placeholderData: (prev) => prev,
  });
  const veiculos = data?.rows ?? [];

  const abrir = (v) => navigate(`/clientes/${v.cliente_id}?veiculo=${v.id}`);

  return (
    <div className="page-enter">
      <PageHeader
        title="Veículos"
        subtitle="Encontre um veículo pela placa e veja o histórico de serviços. Para cadastrar, use a ficha do cliente."
      />
      <SearchBar
        className="mb-4"
        onSearch={(v) => {
          setBusca(v.trim());
          setPagina(1);
        }}
        placeholder="Placa (com ou sem hífen), modelo, marca, chassi ou cliente…"
      />

      <div className="pro-card overflow-hidden relative">
        {isFetching && !isLoading && <div className="absolute top-0 inset-x-0 h-0.5 bg-brand-500/70 animate-pulse" />}
        {isLoading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : veiculos.length === 0 ? (
          <EmptyState
            icon={FiTruck}
            title={busca ? "Nenhum veículo encontrado" : "Nenhum veículo cadastrado"}
            description={busca ? "Confira a placa ou busque pelo nome do cliente." : "Os veículos são cadastrados na ficha de cada cliente."}
            action={!busca && <Link to="/clientes" className="btn-secondary">Ir para clientes</Link>}
          />
        ) : (
          <table className="table-pro">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Veículo</th>
                <th className="hidden md:table-cell">Cliente</th>
                <th className="hidden sm:table-cell text-right">Atendimentos</th>
                <th className="hidden lg:table-cell">Último atendimento</th>
                <th className="hidden lg:table-cell text-right">Último km</th>
                <th className="w-0"><span className="sr-only">Abrir</span></th>
              </tr>
            </thead>
            <tbody>
              {veiculos.map((v) => (
                <tr key={v.id} className="row-link group" onClick={() => abrir(v)}>
                  <td>
                    <span className="inline-block rounded border border-ink-300 dark:border-ink-600 px-1.5 py-0.5 font-mono text-xs font-semibold text-ink-900 dark:text-white">
                      {formatarPlaca(v.placa)}
                    </span>
                  </td>
                  <td>
                    <p className="font-medium text-ink-900 dark:text-white">{[v.marca, v.modelo, v.versao].filter(Boolean).join(" ")}</p>
                    <p className="text-xs text-ink-500">
                      {[v.ano, v.cor, v.combustivel].filter(Boolean).join(" · ")}
                      <span className="md:hidden">{v.cliente_nome ? ` · ${v.cliente_nome}` : ""}</span>
                    </p>
                  </td>
                  <td className="hidden md:table-cell">
                    <Link to={`/clientes/${v.cliente_id}`} onClick={(e) => e.stopPropagation()} className="hover:text-brand-600">
                      {v.cliente_nome || "—"}
                    </Link>
                  </td>
                  <td className="hidden sm:table-cell text-right num">{v.total_os ?? 0}</td>
                  <td className="hidden lg:table-cell">
                    {v.ultima_os_em ? (
                      <>
                        <span className="num">{formatarData(v.ultima_os_em)}</span>
                        <span className="block text-xs text-ink-500">{tempoRelativo(v.ultima_os_em)}</span>
                      </>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell text-right num">
                    {v.ultimo_km ? `${Number(v.ultimo_km).toLocaleString("pt-BR")} km` : "—"}
                  </td>
                  <td>
                    <FiChevronRight className="h-4 w-4 text-ink-300 group-hover:text-ink-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={pagina}
          totalPages={data?.pagination?.pages ?? 1}
          onPageChange={setPagina}
          itemsPerPage={POR_PAGINA}
          totalItems={data?.pagination?.total ?? 0}
        />
      </div>
    </div>
  );
}
