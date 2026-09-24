import { useEffect, useState } from "react";
import api from "../../services/api";

const ROTULO = {
  NFSE_SOLICITADA: "NFS-e solicitada",
  NFSE_EMISSAO_SOLICITADA: "NFS-e solicitada",
  NFSE_AUTORIZADA: "NFS-e autorizada",
  NFSE_REJEITADA: "NFS-e rejeitada",
  NFSE_CANCELADA: "NFS-e cancelada",
  NFE_SOLICITADA: "NF-e solicitada",
  NFE_EMISSAO_SOLICITADA: "NF-e solicitada",
  NFE_AUTORIZADA: "NF-e autorizada",
  NFE_REJEITADA: "NF-e rejeitada",
  NFE_CANCELADA: "NF-e cancelada",
};

function eventoFiscal(row) {
  const dados = row?.dados_novos || {};
  const nome = dados.evento || row?.acao;
  if (!nome || !String(nome).match(/^(NFSE|NFE)_/)) return null;
  return {
    quando: row.criado_em,
    rotulo: ROTULO[nome] || String(nome).replace(/_/g, " "),
    nota: dados.nota_fiscal_id,
    provedor: dados.provedor === "brasil_nfe" ? "Brasil NFe" : dados.provedor === "notaas" ? "Notaas" : dados.provedor,
    usuario: row.usuario && row.usuario !== "sistema" ? `Usuário ${row.usuario}` : null,
  };
}

export default function AuditoriaFiscalOs({ osId, osNumero }) {
  const [itens, setItens] = useState([]);

  useEffect(() => {
    if (!osId) return undefined;
    let vivo = true;
    api
      .get(`/auditoria/ordens-servico/${osId}`)
      .then(({ data }) => {
        if (!vivo) return;
        const lista = (Array.isArray(data) ? data : [])
          .map(eventoFiscal)
          .filter(Boolean);
        setItens(lista);
      })
      .catch(() => {
        if (vivo) setItens([]);
      });
    return () => {
      vivo = false;
    };
  }, [osId]);

  if (!itens.length) return null;

  return (
    <div className="pro-card p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Auditoria fiscal
      </h2>
      <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
        {itens.map((item, i) => (
          <li key={`${item.quando}-${i}`}>
            {item.quando
              ? new Date(item.quando).toLocaleString("pt-BR")
              : ""}
            {" · "}
            {item.rotulo}
            {osNumero ? ` · OS ${osNumero}` : ""}
            {item.nota ? ` · Nota ${item.nota}` : ""}
            {item.provedor ? ` · ${item.provedor}` : ""}
            {item.usuario ? ` · ${item.usuario}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
