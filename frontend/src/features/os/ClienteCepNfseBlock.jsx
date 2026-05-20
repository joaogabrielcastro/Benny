import BuscaCEP from "../../components/BuscaCEP";
import { mascaraCEP } from "../../utils/masks";

export default function ClienteCepNfseBlock({
  os,
  cepClienteEdicao,
  setCepClienteEdicao,
  salvandoCepCliente,
  onSalvar,
}) {
  if (os?.status !== "Finalizada") return null;

  const cepOk = String(os?.cliente_cep || "").replace(/\D/g, "").length === 8;
  if (cepOk) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5 shadow-sm">
      <p className="text-sm text-amber-950 dark:text-amber-100 font-medium">
        Para emitir NFS-e na Nuvem Fiscal é obrigatório o CEP do tomador (8
        dígitos) no cadastro do cliente{" "}
        <span className="font-semibold">{os.cliente_nome}</span>. Em homologação
        você pode definir{" "}
        <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
          NUVEM_FISCAL_TOMADOR_CEP
        </code>{" "}
        no servidor como alternativa.
      </p>
      <div className="mt-4 flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="flex-1 min-w-0">
          <BuscaCEP
            value={cepClienteEdicao}
            onChange={setCepClienteEdicao}
            onEnderecoEncontrado={(end) => {
              setCepClienteEdicao(mascaraCEP(end.cep || ""));
            }}
          />
        </div>
        <button
          type="button"
          onClick={onSalvar}
          disabled={salvandoCepCliente}
          className="shrink-0 px-5 py-2.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {salvandoCepCliente ? "Salvando…" : "Salvar CEP no cliente"}
        </button>
      </div>
    </div>
  );
}
