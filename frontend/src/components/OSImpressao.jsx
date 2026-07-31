import { forwardRef } from "react";
import {
  DEFAULTS_OS,
  carregarDefaultsImpressao,
} from "../utils/impressaoDefaults";

const OSImpressao = forwardRef(({ os, textosImpressao }, ref) => {
  const formatarData = (data) => {
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor) || 0);
  };

  const formatarHora = (data) => {
    return new Date(data).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const dataCriacao = os.criado_em ? new Date(os.criado_em) : new Date();
  const temObservacoesVeiculo =
    os.observacoes_veiculo && os.observacoes_veiculo.trim() !== "";
  const temObservacoesGerais =
    os.observacoes_gerais && os.observacoes_gerais.trim() !== "";

  const textos = {
    ...DEFAULTS_OS,
    ...carregarDefaultsImpressao("os"),
    ...textosImpressao,
  };
  const temTermosAdicionais =
    textos.termosAdicionais && textos.termosAdicionais.trim() !== "";
  const temMensagemRodape =
    textos.mensagemRodape && textos.mensagemRodape.trim() !== "";

  return (
    <div ref={ref} style={{ display: "none" }} className="os-impressao">
      <style>
        {`
          @media print {
            @page { 
              size: A4; 
              margin: 0.8cm; 
            }
            
            body * {
              visibility: hidden;
            }
            
            .os-impressao {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              display: block !important;
              font-family: Arial, sans-serif;
              font-size: 11px;
              line-height: 1.35;
              color: #000;
              background: white;
            }
            
            .os-impressao,
            .os-impressao * {
              visibility: visible !important;
            }
            
            .os-header { 
              margin-bottom: 6px; 
              padding-bottom: 5px; 
              border-bottom: 3px solid #3b4e9e;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .os-section { 
              margin-bottom: 6px; 
            }
            
            /* Título cola na tabela — evita "PEÇAS E PRODUTOS" sozinho no fim da página */
            .os-section-title { 
              font-size: 11px; 
              font-weight: bold; 
              margin: 0 0 3px 0; 
              padding-bottom: 2px;
              border-bottom: 1px solid #ddd;
              color: #000;
              page-break-after: avoid;
              break-after: avoid;
            }
            
            .os-impressao table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 10px; 
              margin-top: 3px;
              page-break-inside: auto;
              break-inside: auto;
            }
            
            .os-impressao thead {
              display: table-header-group;
            }
            
            .os-impressao tbody {
              display: table-row-group;
            }
            
            .os-impressao tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .os-impressao th, .os-impressao td { 
              padding: 2px 3px; 
              border: 1px solid #000; 
              text-align: left;
            }
            
            .os-impressao th { 
              background-color: #f0f0f0; 
              font-weight: 600; 
            }
            
            .os-grid { 
              display: table; 
              width: 100%; 
            }
            
            .os-grid > div { 
              display: table-cell; 
              padding: 2px 5px; 
            }
            
            .os-grid-3 { 
              display: table; 
              width: 100%; 
            }
            
            .os-grid-3 > div { 
              display: table-cell; 
              padding: 2px 5px; 
            }
            
            .os-totals { 
              background-color: #f5f5f5; 
              padding: 5px; 
              margin-top: 6px;
              text-align: right;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .os-footer-block {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .signature-area { 
              margin-top: 20px; 
              padding-top: 8px; 
              border-top: 1px solid #000;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .signature-line { 
              border-top: 1px solid #000; 
              margin-top: 40px;
              padding-top: 5px;
              text-align: center;
            }
          }
          
          @media screen {
            .os-impressao {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Cabeçalho com Informações da Empresa */}
      <div className="os-header">
        <table style={{ width: "100%", border: "none", marginBottom: "10px" }}>
          <tbody>
            <tr>
              <td
                style={{ border: "none", width: "15%", verticalAlign: "top" }}
              >
                <svg
                  width="90"
                  height="50"
                  viewBox="0 0 120 60"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ display: "block" }}
                >
                  <rect width="120" height="60" fill="#3b4e9e" rx="4" />
                  <rect
                    x="5"
                    y="5"
                    width="3"
                    height="50"
                    fill="#ffffff"
                    opacity="0.3"
                  />
                  <rect
                    x="12"
                    y="5"
                    width="2"
                    height="50"
                    fill="#ffffff"
                    opacity="0.2"
                  />
                  <rect
                    x="105"
                    y="5"
                    width="3"
                    height="50"
                    fill="#ffffff"
                    opacity="0.3"
                  />
                  <rect
                    x="112"
                    y="5"
                    width="3"
                    height="50"
                    fill="#ffffff"
                    opacity="0.2"
                  />
                  <text
                    x="60"
                    y="28"
                    fontFamily="Arial, sans-serif"
                    fontSize="18"
                    fontWeight="bold"
                    fill="#ffffff"
                    textAnchor="middle"
                    letterSpacing="1"
                  >
                    BENNY'S
                  </text>
                  <text
                    x="60"
                    y="45"
                    fontFamily="Arial, sans-serif"
                    fontSize="10"
                    fontWeight="600"
                    fill="#ffffff"
                    textAnchor="middle"
                    letterSpacing="2"
                  >
                    MOTORSPORT
                  </text>
                </svg>
              </td>
              <td
                style={{
                  border: "none",
                  width: "50%",
                  verticalAlign: "top",
                  paddingLeft: "10px",
                }}
              >
                <h1
                  style={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    margin: "0 0 5px 0",
                  }}
                >
                  BENNYS CENTRO AUTOMOTIVO
                </h1>
                <p style={{ fontSize: "9px", margin: "2px 0" }}>
                  <strong>CNPJ:</strong> 55.961.553/0001-00
                </p>
                <p style={{ fontSize: "9px", margin: "2px 0" }}>
                  <strong>Telefones:</strong> 91084254-47 | (41) 9 9236-2952
                </p>
                <p style={{ fontSize: "9px", margin: "2px 0" }}>
                  <strong>Endereço:</strong> Prefeito João Batista Stocco N°247
                </p>
              </td>
              <td
                style={{
                  border: "none",
                  width: "35%",
                  textAlign: "right",
                  verticalAlign: "top",
                }}
              >
                <p style={{ fontSize: "9px", margin: "2px 0" }}>
                  <strong>Data:</strong> {formatarData(dataCriacao)}{" "}
                  {formatarHora(dataCriacao)}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    margin: "5px 0",
                    fontWeight: "bold",
                  }}
                >
                  Oficina Integrada
                </p>
                <div
                  style={{
                    border: "2px solid #000",
                    padding: "8px",
                    marginTop: "5px",
                    backgroundColor: "#f5f5f5",
                  }}
                >
                  <p style={{ fontSize: "9px", margin: "0 0 3px 0" }}>
                    Ordem de serviço Numero
                  </p>
                  <p
                    style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}
                  >
                    {os.numero || "N/A"}
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dados do Cliente e Veículo */}
      <div className="os-section">
        <table
          style={{ width: "100%", border: "1px solid #000", fontSize: "10px" }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  padding: "5px",
                  width: "50%",
                  borderRight: "1px solid #000",
                }}
              >
                <strong>Cliente:</strong> {os.cliente_nome || "Não informado"}
              </td>
              <td style={{ padding: "5px", width: "50%" }}>
                <strong>Veículo:</strong> {os.veiculo_marca} {os.veiculo_modelo}{" "}
                {os.veiculo_cor} {os.veiculo_ano || "Não informado"}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "5px",
                  borderTop: "1px solid #000",
                  borderRight: "1px solid #000",
                }}
              >
                <strong>Telefone:</strong>{" "}
                {os.cliente_telefone || "Não informado"}
              </td>
              <td style={{ padding: "5px", borderTop: "1px solid #000" }}>
                <strong>Placa:</strong> {os.veiculo_placa || "Não informada"}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "5px",
                  borderTop: "1px solid #000",
                  borderRight: "1px solid #000",
                }}
              >
                <strong>CPF/CNPJ:</strong> {os.cliente_cpf_cnpj || "-"}
              </td>
              <td style={{ padding: "5px", borderTop: "1px solid #000" }}>
                <strong>Km:</strong> {os.km ? os.km.toLocaleString() : "-"}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "5px",
                  borderTop: "1px solid #000",
                  borderRight: "1px solid #000",
                }}
              >
                <strong>Entrada:</strong> {formatarData(dataCriacao)}{" "}
                {formatarHora(dataCriacao)}
              </td>
              <td style={{ padding: "5px", borderTop: "1px solid #000" }}>
                <strong>Previsão:</strong>{" "}
                {os.previsao_entrega ? formatarData(os.previsao_entrega) : "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {temObservacoesVeiculo && (
          <div
            style={{
              marginTop: "5px",
              fontSize: "10px",
              backgroundColor: "#f5f5f5",
              padding: "5px",
              border: "1px solid #ddd",
            }}
          >
            <strong>Observações do Veículo:</strong> {os.observacoes_veiculo}
          </div>
        )}
      </div>

      {/* Serviços */}
      {os.servicos && os.servicos.length > 0 && (
        <div className="os-section os-itens-section">
          <h2 className="os-section-title">SERVIÇOS</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: "15%" }}>Código</th>
                <th style={{ textAlign: "left" }}>Descrição</th>
                <th style={{ width: "10%", textAlign: "center" }}>Qtd</th>
                <th style={{ width: "15%", textAlign: "right" }}>
                  Valor Unit.
                </th>
                <th style={{ width: "15%", textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {os.servicos.map((servico, index) => (
                <tr key={index}>
                  <td>{servico.codigo || "-"}</td>
                  <td>{servico.descricao || "-"}</td>
                  <td style={{ textAlign: "center" }}>
                    {servico.quantidade || 0}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {formatarMoeda(servico.valor_unitario)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "600" }}>
                    {formatarMoeda(servico.valor_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Produtos/Peças */}
      {os.produtos && os.produtos.length > 0 && (
        <div className="os-section os-itens-section">
          <h2 className="os-section-title">PEÇAS E PRODUTOS</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: "15%" }}>Código</th>
                <th style={{ textAlign: "left" }}>Descrição</th>
                <th style={{ width: "10%", textAlign: "center" }}>Qtd</th>
                <th style={{ width: "15%", textAlign: "right" }}>
                  Valor Unit.
                </th>
                <th style={{ width: "15%", textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {os.produtos.map((produto, index) => (
                <tr key={index}>
                  <td>{produto.codigo || "-"}</td>
                  <td>{produto.descricao || "-"}</td>
                  <td style={{ textAlign: "center" }}>
                    {produto.quantidade || 0}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {formatarMoeda(produto.valor_unitario)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "600" }}>
                    {formatarMoeda(produto.valor_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totais */}
      <div className="os-totals">
        <table style={{ width: "100%", border: "none", fontSize: "11px" }}>
          <tbody>
            <tr>
              <td style={{ border: "none", textAlign: "right", width: "70%" }}>
                Serviços:
              </td>
              <td
                style={{
                  border: "none",
                  textAlign: "right",
                  fontWeight: "bold",
                }}
              >
                {formatarMoeda(os.valor_servicos)}
              </td>
            </tr>
            <tr>
              <td style={{ border: "none", textAlign: "right" }}>Produtos:</td>
              <td
                style={{
                  border: "none",
                  textAlign: "right",
                  fontWeight: "bold",
                }}
              >
                {formatarMoeda(os.valor_produtos)}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: "none",
                  textAlign: "right",
                  paddingTop: "5px",
                }}
              >
                <strong>VALOR TOTAL:</strong>
              </td>
              <td
                style={{
                  border: "none",
                  textAlign: "right",
                  fontWeight: "bold",
                  fontSize: "14px",
                  paddingTop: "5px",
                }}
              >
                {formatarMoeda(os.valor_total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Observações Gerais */}
      {temObservacoesGerais && (
        <div className="os-section">
          <p
            style={{
              fontSize: "10px",
              margin: 0,
              padding: "5px",
              backgroundColor: "#f5f5f5",
              border: "1px solid #ddd",
            }}
          >
            <strong>Observações:</strong> {os.observacoes_gerais}
          </p>
        </div>
      )}

      {/* Garantia + assinaturas: manter juntos no final */}
      <div className="os-footer-block">
      {/* Garantia */}
      <div
        style={{
          marginTop: "15px",
          marginBottom: "15px",
          textAlign: "center",
          padding: "10px",
          backgroundColor: "#f5f5f5",
          border: "1px solid #000",
        }}
      >
        <p style={{ fontSize: "10px", margin: 0, fontWeight: "bold" }}>
          {textos.garantia}
        </p>
        {temMensagemRodape && (
          <p
            style={{
              fontSize: "10px",
              margin: "5px 0 0 0",
              fontWeight: "bold",
            }}
          >
            {textos.mensagemRodape}
          </p>
        )}
        {temTermosAdicionais && (
          <p
            style={{
              fontSize: "9px",
              margin: "5px 0 0 0",
              whiteSpace: "pre-wrap",
            }}
          >
            {textos.termosAdicionais}
          </p>
        )}
      </div>

      {/* Status e Responsável */}
      {(os.status || os.responsavel_tecnico) && (
        <table
          style={{
            width: "100%",
            border: "none",
            fontSize: "9px",
            marginBottom: "10px",
          }}
        >
          <tbody>
            <tr>
              {os.responsavel_tecnico && (
                <td style={{ border: "none", padding: "2px" }}>
                  <strong>Responsável Técnico:</strong> {os.responsavel_tecnico}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      )}

      {/* Assinaturas */}
      <div className="signature-area">
        <table style={{ width: "100%", border: "none", marginTop: "20px" }}>
          <tbody>
            <tr>
              <td
                style={{
                  border: "none",
                  width: "50%",
                  textAlign: "center",
                  paddingRight: "20px",
                }}
              >
                <div style={{ marginTop: "40px" }}>
                  <div
                    style={{
                      borderTop: "1px solid #000",
                      width: "70%",
                      margin: "0 auto 8px auto",
                    }}
                  />
                  <div>
                    <strong style={{ fontSize: "10px" }}>
                      BENNYS CENTRO AUTOMOTIVO
                    </strong>
                  </div>
                </div>
              </td>
              <td
                style={{
                  border: "none",
                  width: "50%",
                  textAlign: "center",
                  paddingLeft: "20px",
                }}
              >
                <div style={{ marginTop: "40px" }}>
                  <div
                    style={{
                      borderTop: "1px solid #000",
                      width: "70%",
                      margin: "0 auto 8px auto",
                    }}
                  />
                  <div>
                    <strong style={{ fontSize: "10px" }}>
                      {os.cliente_nome?.toUpperCase() || "CLIENTE"}
                    </strong>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
});

OSImpressao.displayName = "OSImpressao";

export default OSImpressao;
