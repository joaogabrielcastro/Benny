import { forwardRef } from "react";

const OSImpressao = forwardRef(({ os }, ref) => {
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
  const temObservacoesVeiculo = os.observacoes_veiculo && os.observacoes_veiculo.trim() !== "";
  const temObservacoesGerais = os.observacoes_gerais && os.observacoes_gerais.trim() !== "";

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
            }
            
            .os-impressao,
            .os-impressao * {
              visibility: visible !important;
            }
            
            .os-impressao {
              font-family: Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              background: white;
            }
            
            .os-header { 
              margin-bottom: 10px; 
              padding-bottom: 8px; 
              border-bottom: 3px solid #1e40af; 
            }
            
            .os-section { 
              margin-bottom: 10px; 
            }
            
            .os-section-title { 
              font-size: 12px; 
              font-weight: bold; 
              margin-bottom: 5px; 
              padding-bottom: 3px;
              border-bottom: 1px solid #ddd;
              color: #000;
            }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 10px; 
              margin-top: 5px; 
            }
            
            th, td { 
              padding: 4px; 
              border: 1px solid #000; 
              text-align: left;
            }
            
            th { 
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
              padding: 8px; 
              margin-top: 10px;
              text-align: right;
            }
            
            .signature-area { 
              margin-top: 30px; 
              padding-top: 10px; 
              border-top: 1px solid #000;
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
              <td style={{ border: "none", width: "15%", verticalAlign: "top" }}>
                <div
                  style={{
                    width: "70px",
                    height: "70px",
                    border: "2px solid #000",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#1e40af",
                  }}
                >
                  <div style={{ textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "14px", fontWeight: "bold", lineHeight: "1" }}>
                      BENNY'S
                    </div>
                    <div style={{ fontSize: "8px", marginTop: "2px" }}>
                      MOTORSPORT
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ border: "none", width: "50%", verticalAlign: "top", paddingLeft: "10px" }}>
                <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 5px 0" }}>
                  BENNYS CENTRO AUTOMOTIVO
                </h1>
                <p style={{ fontSize: "9px", margin: "2px 0" }}>
                  <strong>CNPJ:</strong> 55.961.553
                </p>
                <p style={{ fontSize: "9px", margin: "2px 0" }}>
                  <strong>Telefones:</strong> 91084254-47 | (41) 9 9236-2952
                </p>
                <p style={{ fontSize: "9px", margin: "2px 0" }}>
                  <strong>Endereço:</strong> Prefeito João Batista Stocco N°247
                </p>
              </td>
              <td style={{ border: "none", width: "35%", textAlign: "right", verticalAlign: "top" }}>
                <p style={{ fontSize: "9px", margin: "2px 0" }}>
                  <strong>Data:</strong> {formatarData(dataCriacao)} {formatarHora(dataCriacao)}
                </p>
                <p style={{ fontSize: "11px", margin: "5px 0", fontWeight: "bold" }}>
                  Oficina Integrada
                </p>
                <div style={{ border: "2px solid #000", padding: "8px", marginTop: "5px", backgroundColor: "#f5f5f5" }}>
                  <p style={{ fontSize: "9px", margin: "0 0 3px 0" }}>
                    Ordem de serviço Numero
                  </p>
                  <p style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>
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
        <table style={{ width: "100%", border: "1px solid #000", fontSize: "10px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "5px", width: "50%", borderRight: "1px solid #000" }}>
                <strong>Cliente:</strong> {os.cliente_nome || "Não informado"}
              </td>
              <td style={{ padding: "5px", width: "50%" }}>
                <strong>Veículo:</strong> {os.veiculo_modelo || "Não informado"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "5px", borderTop: "1px solid #000", borderRight: "1px solid #000" }}>
                <strong>Telefone:</strong> {os.cliente_telefone || "Não informado"}
              </td>
              <td style={{ padding: "5px", borderTop: "1px solid #000" }}>
                <strong>Entrada:</strong> {formatarData(dataCriacao)} {formatarHora(dataCriacao)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "5px", borderTop: "1px solid #000", borderRight: "1px solid #000" }} colSpan="1">
                {/* Vazio */}
              </td>
              <td style={{ padding: "5px", borderTop: "1px solid #000" }}>
                <strong>Previsão:</strong> {os.previsao_entrega ? formatarData(os.previsao_entrega) : "-"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "5px", borderTop: "1px solid #000", borderRight: "1px solid #000" }}>
                <strong>Placa:</strong> {os.veiculo_placa || "Não informada"}
              </td>
              <td style={{ padding: "5px", borderTop: "1px solid #000" }}>
                <strong>Km:</strong> {os.km ? os.km.toLocaleString() : "-"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "5px", borderTop: "1px solid #000" }} colSpan="2">
                <strong>Chassi:</strong> {os.chassi || "Não informado"}
              </td>
            </tr>
          </tbody>
        </table>
        
        {temObservacoesVeiculo && (
          <div style={{ marginTop: "5px", fontSize: "10px", backgroundColor: "#f5f5f5", padding: "5px", border: "1px solid #ddd" }}>
            <strong>Observações do Veículo:</strong> {os.observacoes_veiculo}
          </div>
        )}
      </div>

      {/* Serviços */}
      {os.servicos && os.servicos.length > 0 && (
        <div className="os-section">
          <h2 className="os-section-title">SERVIÇOS</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: "15%" }}>Código</th>
                <th style={{ textAlign: "left" }}>Descrição</th>
                <th style={{ width: "10%", textAlign: "center" }}>Qtd</th>
                <th style={{ width: "15%", textAlign: "right" }}>Valor Unit.</th>
                <th style={{ width: "15%", textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {os.servicos.map((servico, index) => (
                <tr key={index}>
                  <td>{servico.codigo || "-"}</td>
                  <td>{servico.descricao || "-"}</td>
                  <td style={{ textAlign: "center" }}>{servico.quantidade || 0}</td>
                  <td style={{ textAlign: "right" }}>{formatarMoeda(servico.valor_unitario)}</td>
                  <td style={{ textAlign: "right", fontWeight: "600" }}>{formatarMoeda(servico.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Produtos/Peças */}
      {os.produtos && os.produtos.length > 0 && (
        <div className="os-section">
          <h2 className="os-section-title">PEÇAS E PRODUTOS</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: "15%" }}>Código</th>
                <th style={{ textAlign: "left" }}>Descrição</th>
                <th style={{ width: "10%", textAlign: "center" }}>Qtd</th>
                <th style={{ width: "15%", textAlign: "right" }}>Valor Unit.</th>
                <th style={{ width: "15%", textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {os.produtos.map((produto, index) => (
                <tr key={index}>
                  <td>{produto.codigo || "-"}</td>
                  <td>{produto.descricao || "-"}</td>
                  <td style={{ textAlign: "center" }}>{produto.quantidade || 0}</td>
                  <td style={{ textAlign: "right" }}>{formatarMoeda(produto.valor_unitario)}</td>
                  <td style={{ textAlign: "right", fontWeight: "600" }}>{formatarMoeda(produto.valor_total)}</td>
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
              <td style={{ border: "none", textAlign: "right", width: "70%" }}>Serviços:</td>
              <td style={{ border: "none", textAlign: "right", fontWeight: "bold" }}>
                {formatarMoeda(os.valor_servicos)}
              </td>
            </tr>
            <tr>
              <td style={{ border: "none", textAlign: "right" }}>Produtos:</td>
              <td style={{ border: "none", textAlign: "right", fontWeight: "bold" }}>
                {formatarMoeda(os.valor_produtos)}
              </td>
            </tr>
            <tr>
              <td style={{ border: "none", textAlign: "right", paddingTop: "5px" }}>
                <strong>VALOR TOTAL:</strong>
              </td>
              <td style={{ border: "none", textAlign: "right", fontWeight: "bold", fontSize: "14px", paddingTop: "5px" }}>
                {formatarMoeda(os.valor_total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Observações Gerais */}
      {temObservacoesGerais && (
        <div className="os-section">
          <p style={{ fontSize: "10px", margin: 0, padding: "5px", backgroundColor: "#f5f5f5", border: "1px solid #ddd" }}>
            <strong>Observações:</strong> {os.observacoes_gerais}
          </p>
        </div>
      )}

      {/* Garantia */}
      <div style={{ marginTop: "15px", marginBottom: "15px", textAlign: "center", padding: "10px", backgroundColor: "#f5f5f5", border: "1px solid #000" }}>
        <p style={{ fontSize: "10px", margin: 0, fontWeight: "bold" }}>
          Todos os nossos serviços e produtos possuem 3 meses de garantia.
        </p>
        <p style={{ fontSize: "10px", margin: "5px 0 0 0", fontWeight: "bold" }}>
          Obrigado pela preferência!
        </p>
      </div>

      {/* Status e Responsável */}
      {(os.status || os.responsavel_tecnico) && (
        <table style={{ width: "100%", border: "none", fontSize: "9px", marginBottom: "10px" }}>
          <tbody>
            <tr>
              <td style={{ border: "none", padding: "2px" }}>
                <strong>Status:</strong> {os.status || "Não informado"}
              </td>
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
              <td style={{ border: "none", width: "50%", textAlign: "center", paddingRight: "20px" }}>
                <div style={{ borderBottom: "1px solid #000", marginTop: "50px", paddingTop: "5px" }}>
                  <strong style={{ fontSize: "10px" }}>BENNYS CENTRO AUTOMOTIVO</strong>
                </div>
              </td>
              <td style={{ border: "none", width: "50%", textAlign: "center", paddingLeft: "20px" }}>
                <div style={{ borderBottom: "1px solid #000", marginTop: "50px", paddingTop: "5px" }}>
                  <strong style={{ fontSize: "10px" }}>{os.cliente_nome?.toUpperCase() || "CLIENTE"}</strong>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

OSImpressao.displayName = "OSImpressao";

export default OSImpressao;