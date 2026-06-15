import { forwardRef, useImperativeHandle } from "react";
import { formatarMoeda } from "../../utils/formatters";

const NotaFiscalImpressao = forwardRef(({ modelo, nota, os }, ref) => {
  const label = modelo === "NFE" ? "NF-e" : "NFS-e";
  const tipoValor =
    modelo === "NFE" ? "Valor das peças" : "Valor dos serviços";

  useImperativeHandle(ref, () => ({
    imprimir: () => {
      document.body.classList.add("printing-nf");
      window.print();
      window.setTimeout(() => {
        document.body.classList.remove("printing-nf");
      }, 500);
    },
  }));

  return (
    <div style={{ display: "none" }} className="nf-impressao">
      <style>
        {`
          @media print {
            body.printing-nf * {
              visibility: hidden !important;
            }
            body.printing-nf .os-impressao,
            body.printing-nf .orcamento-impressao {
              display: none !important;
            }
            body.printing-nf .nf-impressao {
              display: block !important;
              visibility: visible !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            body.printing-nf .nf-impressao,
            body.printing-nf .nf-impressao * {
              visibility: visible !important;
            }
            body.printing-nf .nf-impressao {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.45;
              color: #000;
              background: #fff;
              padding: 24px;
            }
          }
        `}
      </style>

      <header style={{ borderBottom: "2px solid #1e293b", paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          BENNYS CENTRO AUTOMOTIVO
        </h1>
        <p style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
          Documento auxiliar de {label} — não substitui o DANFE/DANFSe oficial
        </p>
      </header>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
        {label} Nº {nota.numero}
      </h2>

      <table style={{ width: "100%", marginBottom: 20, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ padding: "4px 8px 4px 0", fontWeight: 600 }}>Data de emissão</td>
            <td>
              {nota.data_emissao
                ? new Date(nota.data_emissao).toLocaleDateString("pt-BR")
                : "—"}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "4px 8px 4px 0", fontWeight: 600 }}>Ordem de serviço</td>
            <td>{os?.numero || "—"}</td>
          </tr>
          <tr>
            <td style={{ padding: "4px 8px 4px 0", fontWeight: 600 }}>Cliente</td>
            <td>{os?.cliente_nome || "—"}</td>
          </tr>
          {nota.chave_acesso && (
            <tr>
              <td style={{ padding: "4px 8px 4px 0", fontWeight: 600, verticalAlign: "top" }}>
                Chave de acesso
              </td>
              <td style={{ fontSize: 10, wordBreak: "break-all" }}>{nota.chave_acesso}</td>
            </tr>
          )}
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #cbd5e1", padding: 8 }}>{tipoValor}</td>
            <td style={{ border: "1px solid #cbd5e1", padding: 8, textAlign: "right" }}>
              {formatarMoeda(nota.valor_base)}
            </td>
          </tr>
          {modelo === "NFSE" && Number(nota.valor_iss) > 0 && (
            <tr>
              <td style={{ border: "1px solid #cbd5e1", padding: 8 }}>ISS (referência)</td>
              <td style={{ border: "1px solid #cbd5e1", padding: 8, textAlign: "right" }}>
                {formatarMoeda(nota.valor_iss)}
              </td>
            </tr>
          )}
          <tr>
            <td style={{ border: "1px solid #cbd5e1", padding: 8, fontWeight: 700 }}>
              Valor total da {label}
            </td>
            <td style={{ border: "1px solid #cbd5e1", padding: 8, textAlign: "right", fontWeight: 700 }}>
              {formatarMoeda(nota.valor_total)}
            </td>
          </tr>
        </tbody>
      </table>

      {nota.observacoes && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Observações</p>
          <p style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{nota.observacoes}</p>
        </div>
      )}

      <footer style={{ fontSize: 10, color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
        Emitido via integração Nuvem Fiscal · {new Date().toLocaleString("pt-BR")}
      </footer>
    </div>
  );
});

NotaFiscalImpressao.displayName = "NotaFiscalImpressao";

export default NotaFiscalImpressao;
