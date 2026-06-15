import { forwardRef } from "react";
import { formatarMoeda } from "../../utils/formatters";

const NotaFiscalImpressao = forwardRef(({ modelo, nota, os }, ref) => {
  const label = modelo === "NFE" ? "NF-e" : "NFS-e";
  const tipoValor =
    modelo === "NFE" ? "Valor das peças" : "Valor dos serviços";

  return (
    <div ref={ref} className="nf-impressao p-8 text-black bg-white text-sm">
      <header className="border-b-2 border-slate-800 pb-4 mb-6">
        <h1 className="text-2xl font-bold">BENNYS CENTRO AUTOMOTIVO</h1>
        <p className="text-xs text-slate-600 mt-1">
          Documento auxiliar de {label} — não substitui o DANFE/DANFSe oficial
        </p>
      </header>

      <h2 className="text-xl font-bold mb-4">
        {label} Nº {nota.numero}
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-500">Data de emissão</p>
          <p>
            {nota.data_emissao
              ? new Date(nota.data_emissao).toLocaleDateString("pt-BR")
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500">Ordem de serviço</p>
          <p>{os?.numero || "—"}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-semibold text-slate-500">Cliente / tomador</p>
          <p>{os?.cliente_nome || "—"}</p>
        </div>
        {nota.chave_acesso && (
          <div className="col-span-2">
            <p className="text-xs font-semibold text-slate-500">Chave de acesso</p>
            <p className="text-xs break-all font-mono">{nota.chave_acesso}</p>
          </div>
        )}
      </div>

      <table className="w-full border-collapse mb-6">
        <tbody>
          <tr>
            <td className="border border-slate-300 p-2">{tipoValor}</td>
            <td className="border border-slate-300 p-2 text-right font-semibold">
              {formatarMoeda(nota.valor_base)}
            </td>
          </tr>
          {modelo === "NFSE" && nota.valor_iss > 0 && (
            <tr>
              <td className="border border-slate-300 p-2">ISS (referência)</td>
              <td className="border border-slate-300 p-2 text-right">
                {formatarMoeda(nota.valor_iss)}
              </td>
            </tr>
          )}
          <tr>
            <td className="border border-slate-300 p-2 font-bold">
              Valor total da {label}
            </td>
            <td className="border border-slate-300 p-2 text-right font-bold text-lg">
              {formatarMoeda(nota.valor_total)}
            </td>
          </tr>
        </tbody>
      </table>

      {nota.observacoes && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Observações</p>
          <p className="text-xs whitespace-pre-wrap">{nota.observacoes}</p>
        </div>
      )}

      <footer className="text-xs text-slate-500 border-t pt-4 mt-8">
        Emitido via integração Nuvem Fiscal ·{" "}
        {new Date().toLocaleString("pt-BR")}
      </footer>
    </div>
  );
});

NotaFiscalImpressao.displayName = "NotaFiscalImpressao";

export default NotaFiscalImpressao;
