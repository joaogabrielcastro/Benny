import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FiDownload, FiFileText } from "react-icons/fi";
import api from "../../services/api";
import Card from "../../components/Card";
import Button from "../../components/Button";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  formatarDataHoraBrasil,
  formatarMoeda,
} from "../../utils/formatters";

function periodoAtual() {
  const now = new Date();
  return {
    ano: now.getFullYear(),
    mes: now.getMonth() + 1,
    input: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  };
}

function parseInputMes(valor) {
  const [anoStr, mesStr] = String(valor || "").split("-");
  return {
    ano: Number(anoStr),
    mes: Number(mesStr),
  };
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export default function FechamentoMensal() {
  const inicial = useMemo(() => periodoAtual(), []);
  const [mesInput, setMesInput] = useState(inicial.input);
  const [exportando, setExportando] = useState(false);
  const { ano, mes } = parseInputMes(mesInput);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["relatorios", "fechamento-mensal", ano, mes],
    queryFn: async () => {
      const { data: res } = await api.get("/relatorios/fechamento-mensal", {
        params: { ano, mes },
      });
      return res;
    },
    enabled: Number.isFinite(ano) && Number.isFinite(mes) && mes >= 1 && mes <= 12,
  });

  const handleExport = async () => {
    try {
      setExportando(true);
      const { data: blob } = await api.get(
        "/relatorios/fechamento-mensal/export",
        {
          params: { ano, mes },
          responseType: "blob",
        },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fechamento-${ano}-${String(mes).padStart(2, "0")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Pacote fiscal baixado.");
    } catch (err) {
      let msg = "Falha ao exportar o fechamento mensal.";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          msg = parsed.error || parsed.message || msg;
        } catch {
          /* ignore */
        }
      } else if (err.response?.data?.error) {
        msg = err.response.data.error;
      }
      toast.error(msg);
    } finally {
      setExportando(false);
    }
  };

  const totais = data?.totais;

  return (
    <Card
      title="Fechamento mensal fiscal"
      subtitle="Resumo consolidado de NFS-e/NF-e do mês para o contador, com exportação em lote."
      className="mt-10"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <label
            htmlFor="fechamento-mes"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Competência
          </label>
          <input
            id="fechamento-mes"
            type="month"
            value={mesInput}
            onChange={(e) => setMesInput(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => refetch()}
            loading={isFetching && !isLoading}
          >
            Atualizar
          </Button>
          <Button
            leftIcon={FiDownload}
            onClick={handleExport}
            loading={exportando}
            disabled={isLoading || isError || !data}
          >
            Baixar pacote (.zip)
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          Não foi possível carregar o fechamento deste mês.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
            Período:{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {data?.periodo?.rotulo}
            </span>
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="NFS-e emitidas"
              value={totais?.nfseAutorizadas ?? 0}
            />
            <Stat
              label="NFS-e canceladas"
              value={totais?.nfseCanceladas ?? 0}
            />
            <Stat label="NF-e emitidas" value={totais?.nfeAutorizadas ?? 0} />
            <Stat
              label="Faturamento fiscal"
              value={formatarMoeda(totais?.faturamentoTotal ?? 0)}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="ISS"
              value={formatarMoeda(totais?.tributos?.iss ?? 0)}
            />
            <Stat
              label="PIS"
              value={formatarMoeda(totais?.tributos?.pis ?? 0)}
            />
            <Stat
              label="COFINS"
              value={formatarMoeda(totais?.tributos?.cofins ?? 0)}
            />
            <Stat
              label="ICMS"
              value={formatarMoeda(totais?.tributos?.icms ?? 0)}
            />
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <FiFileText />
              Notas do período ({data?.notas?.length ?? 0})
            </div>

            {data?.notas?.length ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900/60">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        OS
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Modelo
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Número
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Emissão
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {data.notas.map((nota) => (
                      <tr key={nota.id}>
                        <td className="px-4 py-3 text-slate-900 dark:text-white">
                          {nota.os_numero || `#${nota.os_id}`}
                        </td>
                        <td className="px-4 py-3">
                          {nota.modelo_documento === "NFE" ? "NF-e" : "NFS-e"}
                        </td>
                        <td className="px-4 py-3">{nota.numero || "—"}</td>
                        <td className="px-4 py-3 capitalize">{nota.status}</td>
                        <td className="px-4 py-3">
                          {formatarDataHoraBrasil(nota.data_emissao)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatarMoeda(nota.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhuma nota com data de emissão neste mês.
              </p>
            )}
          </div>

          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
            O pacote .zip inclui resumo (CSV/JSON), PDFs, XMLs de emissão e XMLs
            de cancelamento quando disponíveis na Notaas.
          </p>
        </>
      )}
    </Card>
  );
}
