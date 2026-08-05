import toast from "react-hot-toast";
import Modal from "../../components/Modal";
import {
  formatarDataBrasil,
  formatarDataHoraBrasil,
  formatarMoeda,
} from "../../utils/formatters";
import {
  rotuloFonteTributo,
  formatarAliquota,
  mensagemRejeicaoNota,
  mostrarObservacoesNota,
  dicaRejeicaoNfse,
} from "./fiscalUtils";
import {
  resolvePdfUrl,
  abrirDanfePdf,
  baixarDanfePdf,
  urlConsultaPublicaNfse,
  abrirConsultaPublicaNfse,
} from "./notaFiscalPdf";

export default function NotaFiscalModal({
  isOpen,
  modelo,
  nota,
  os,
  onClose,
  onCancelar,
  cancelando = false,
  onCorrigirEndereco,
}) {
  const isNfe = modelo === "NFE";
  const labelDoc = isNfe ? "NF-e" : "NFS-e";
  const labelDanfe = isNfe ? "DANFE" : "DANFSe";
  const pdf = nota ? resolvePdfUrl(nota) : null;
  const consultaPortal = nota ? urlConsultaPublicaNfse(nota) : null;
  const pdfFilename = `${labelDoc}_${nota?.numero || nota?.id || "nota"}`;

  const handleAbrirDanfe = async () => {
    if (!pdf) {
      toast.error(
        nota?.status_nf === "autorizada"
          ? "PDF oficial indisponível. Use Atualizar status e tente novamente."
          : "Aguarde a autorização na SEFAZ/prefeitura para obter o DANFE.",
      );
      return;
    }
    await abrirDanfePdf(pdf);
  };

  const handleImprimirDanfe = async () => {
    if (!pdf) {
      toast.error(
        "Só é possível imprimir após autorização, com o PDF oficial da Notaas.",
      );
      return;
    }
    await abrirDanfePdf(pdf, { imprimir: true });
  };

  const handleBaixarDanfe = async () => {
    if (!pdf) {
      toast.error("PDF oficial indisponível.");
      return;
    }
    await baixarDanfePdf(pdf, pdfFilename);
  };

  if (!isOpen || !nota || !modelo) return null;

  const mensagemRejeicao =
    nota.status_nf === "rejeitada" ? mensagemRejeicaoNota(nota) : "";
  const dicaNfse = !isNfe && mensagemRejeicao ? dicaRejeicaoNfse(nota) : null;
  const numeroVisivel = /^\d{1,8}$/.test(String(nota.numero || ""));

  const tributos = isNfe
    ? []
    : [
        {
          label: "ISS",
          valor: nota.valor_iss,
          aliquota: nota.aliquota_iss,
          fonte: nota.fonte_iss,
        },
        {
          label: "PIS",
          valor: nota.valor_pis,
          aliquota: nota.aliquota_pis,
          fonte: nota.fonte_pis,
        },
        {
          label: "COFINS",
          valor: nota.valor_cofins,
          aliquota: nota.aliquota_cofins,
          fonte: nota.fonte_cofins,
        },
      ].filter((t) => Number(t.valor) > 0);

  const mostrarComposicao =
    tributos.length > 0 ||
    Number(nota.valor_base) !== Number(nota.valor_total);

  const temDadosTecnicos =
    nota.status_provedor || nota.id_provedor || nota.atualizado_em_nf;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={numeroVisivel ? `${labelDoc} Nº ${nota.numero}` : `${labelDoc}`}
      size="lg"
      footer={
        <>
          {nota.status_nf === "autorizada" && onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              disabled={cancelando}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 sm:mr-auto"
            >
              {cancelando ? "Cancelando…" : "Cancelar nota"}
            </button>
          )}
          {onCorrigirEndereco && (
            <button
              type="button"
              onClick={onCorrigirEndereco}
              className="px-4 py-2 rounded-lg font-semibold text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              Corrigir endereço
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-secondary">
            Fechar
          </button>
          {pdf && (
            <>
              <button
                type="button"
                onClick={handleBaixarDanfe}
                className="btn-secondary"
              >
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={handleImprimirDanfe}
                className="btn-secondary"
              >
                Imprimir
              </button>
              <button
                type="button"
                onClick={handleAbrirDanfe}
                className="btn-brand"
              >
                Abrir {labelDanfe}
              </button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <StatusNota status={nota.status_nf} modelo={modelo} />

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-4">
          <Campo
            label="Número"
            valor={
              numeroVisivel
                ? nota.numero
                : nota.chave_acesso
                  ? "Ver chave abaixo"
                  : nota.numero || "—"
            }
          />
          <Campo
            label="Emissão"
            valor={formatarDataBrasil(nota.data_emissao)}
          />
          <Campo label="OS" valor={os.numero} />
          <Campo
            label="Cliente"
            valor={os.cliente_nome}
            className="col-span-2 sm:col-span-3"
          />

          {nota.chave_acesso && (
            <div className="col-span-2 sm:col-span-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Chave de acesso
              </dt>
              <dd className="mt-1 font-mono text-[11px] leading-relaxed break-all text-gray-700 dark:text-gray-300">
                {nota.chave_acesso}
              </dd>
              {consultaPortal && nota.status_nf === "autorizada" && (
                <button
                  type="button"
                  onClick={() => abrirConsultaPublicaNfse(nota)}
                  className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Consultar no portal nacional
                </button>
              )}
            </div>
          )}
        </dl>

        <div className="flex items-baseline justify-between gap-4 rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Valor total da {labelDoc}
          </span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatarMoeda(nota.valor_total)}
          </span>
        </div>

        {mostrarComposicao && (
          <Recolhivel titulo="Composição e tributos">
            <Linha
              label={
                isNfe ? "Valor das peças (base)" : "Valor dos serviços (base)"
              }
              valor={formatarMoeda(nota.valor_base)}
              destaque
            />
            {tributos.map((t) => (
              <Linha
                key={t.label}
                label={`${t.label}${
                  formatarAliquota(t.aliquota)
                    ? ` (${formatarAliquota(t.aliquota)})`
                    : ""
                }${rotuloFonteTributo(t.fonte)}`}
                valor={formatarMoeda(t.valor)}
              />
            ))}
            {nota.valor_liquido != null &&
              Number(nota.valor_liquido) !== Number(nota.valor_total) && (
                <Linha
                  label="Referência (base − ISS estimado)"
                  valor={formatarMoeda(nota.valor_liquido)}
                />
              )}
            {!isNfe && (
              <p className="pt-2 text-xs text-gray-500 dark:text-gray-400">
                O valor total da NFS-e é o dos serviços prestados — o cliente
                não paga ISS em cima dele. Os tributos acima são
                referência/estimativa da oficina; no Simples Nacional o ISS
                costuma compor o DAS.
              </p>
            )}
          </Recolhivel>
        )}

        {mensagemRejeicao && (
          <div className="rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4">
            <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">
              Motivo da rejeição
            </h4>
            <p className="text-sm text-red-900 dark:text-red-200 whitespace-pre-wrap">
              {mensagemRejeicao}
            </p>
            {dicaNfse && (
              <p className="text-xs text-red-800/80 dark:text-red-300/80 mt-3">
                {dicaNfse} Depois use <strong>Reemitir</strong> na tela da OS.
              </p>
            )}
            {isNfe && (
              <p className="text-xs text-red-800/80 dark:text-red-300/80 mt-3">
                {/975|CSRT|hashCSRT/i.test(mensagemRejeicao) ? (
                  <>
                    Solicite o token CSRT na Receita/PR (UPD → Sistema → CSRT,
                    CNPJ do desenvolvedor do ERP). Configure no Coolify as vars
                    de responsável técnico / CSRT quando a NF-e Notaas for
                    habilitada. A oficina pode precisar autorizar o fornecedor
                    no portal da Receita/PR. Depois{" "}
                    <strong>Reemitir NF-e</strong>.
                  </>
                ) : /972|responsavel tecnico|infRespTec/i.test(
                    mensagemRejeicao,
                  ) ? (
                  <>
                    Configure no Coolify os dados de responsável técnico do ERP.
                    Depois <strong>Reemitir NF-e</strong>.
                  </>
                ) : (
                  <>
                    Confira Inscrição Estadual, certificado A1 no painel Notaas
                    e dados do cliente. Depois <strong>Reemitir NF-e</strong>.
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {mostrarObservacoesNota(nota) && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
              Observações
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {nota.observacoes}
            </p>
          </div>
        )}

        {!pdf && nota.status_nf === "autorizada" && (
          <p className="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Nota autorizada, mas o PDF ainda não está disponível. Use{" "}
            <strong>Atualizar status</strong> na OS e tente novamente em alguns
            minutos.
          </p>
        )}

        {temDadosTecnicos && (
          <Recolhivel titulo="Detalhes técnicos">
            {nota.status_provedor && (
              <Linha label="Status no provedor" valor={nota.status_provedor} />
            )}
            {nota.id_provedor && (
              <Linha label="ID no provedor" valor={nota.id_provedor} />
            )}
            {nota.atualizado_em_nf && (
              <Linha
                label="Última consulta"
                valor={formatarDataHoraBrasil(nota.atualizado_em_nf)}
              />
            )}
          </Recolhivel>
        )}
      </div>
    </Modal>
  );
}

function Campo({ label, valor, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">
        {valor}
      </dd>
    </div>
  );
}

function Linha({ label, valor, destaque = false }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span
        className={`text-right break-all ${
          destaque
            ? "font-semibold text-gray-900 dark:text-gray-100"
            : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {valor}
      </span>
    </div>
  );
}

function Recolhivel({ titulo, children }) {
  return (
    <details className="rounded-lg border border-gray-200 dark:border-gray-700">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-lg">
        {titulo}
      </summary>
      <div className="px-4 pb-3 pt-1 divide-y divide-gray-100 dark:divide-gray-800">
        {children}
      </div>
    </details>
  );
}

function StatusNota({ status, modelo = "NFSE" }) {
  const labelDoc = modelo === "NFE" ? "NF-e" : "NFS-e";
  const cfg = {
    autorizada: {
      bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40",
      text: "text-green-800 dark:text-green-300",
      icon: "✓",
      label: "Nota fiscal autorizada",
    },
    configuracao_pendente: {
      bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40",
      text: "text-amber-800 dark:text-amber-200",
      icon: "⏳",
      label:
        "Integração Notaas: configure NOTAAS_API_KEY no servidor e use Reprocessar NF.",
    },
    processamento: {
      bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40",
      text: "text-amber-800 dark:text-amber-200",
      icon: "⏳",
      label:
        "Em processamento na Notaas — o status atualiza sozinho a cada ~60s.",
    },
    erro_autenticacao: {
      bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40",
      text: "text-red-700 dark:text-red-400",
      icon: "✕",
      label: "Falha na autenticação com a Notaas. Verifique NOTAAS_API_KEY.",
    },
    rejeitada: {
      bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40",
      text: "text-red-700 dark:text-red-400",
      icon: "✕",
      label: `${labelDoc} rejeitada — use Reemitir na tela da OS`,
    },
    cancelada: {
      bg: "bg-gray-100 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700",
      text: "text-gray-700 dark:text-gray-300",
      icon: "—",
      label: `${labelDoc} cancelada`,
    },
    substituida: {
      bg: "bg-gray-100 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700",
      text: "text-gray-700 dark:text-gray-300",
      icon: "—",
      label: `${labelDoc} substituída`,
    },
  };

  const c = cfg[status] || {
    bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40",
    text: "text-amber-800 dark:text-amber-200",
    icon: "⏳",
    label: `Status: ${status || "desconhecido"}`,
  };

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${c.bg}`}>
      <span className="text-lg leading-none">{c.icon}</span>
      <p className={`text-sm font-semibold ${c.text}`}>{c.label}</p>
    </div>
  );
}
