import { forwardRef, useImperativeHandle } from "react";

const OrcamentoImpressao = forwardRef(({ orcamento }, ref) => {
  // Expor método imprimir para o componente pai
  useImperativeHandle(ref, () => ({
    imprimir: () => {
      window.print();
    }
  }));

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

  const dataCriacao = orcamento.criado_em
    ? new Date(orcamento.criado_em)
    : new Date();
  const temObservacoesVeiculo =
    orcamento.observacoes_veiculo &&
    orcamento.observacoes_veiculo.trim() !== "";
  const temObservacoesGerais =
    orcamento.observacoes_gerais && orcamento.observacoes_gerais.trim() !== "";

  return (
    <div ref={ref} style={{ display: "none" }} className="orcamento-impressao">
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
            
            .orcamento-impressao {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              display: block !important;
            }
            
            .orcamento-impressao,
            .orcamento-impressao * {
              visibility: visible !important;
            }
            
            .orcamento-impressao {
              font-family: Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              background: white;
            }
            
            .orc-header { 
              margin-bottom: 6px; 
              padding-bottom: 5px; 
              border-bottom: 3px solid #3b4e9e; 
            }
            
            .orc-section { 
              margin-bottom: 6px; 
            }
            
            .orc-section-title { 
              font-size: 11px; 
              font-weight: bold; 
              margin-bottom: 3px; 
              padding-bottom: 2px;
              border-bottom: 1px solid #ddd;
              color: #000;
            }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 9px; 
              margin-top: 3px; 
            }
            
            th, td { 
              padding: 3px; 
              border: 1px solid #000; 
              text-align: left;
            }
            
            th { 
              background-color: #f0f0f0; 
              font-weight: 600; 
            }
            
            .orc-totals { 
              background-color: #f5f5f5; 
              padding: 5px; 
              margin-top: 6px;
              text-align: right;
            }
            
            .signature-area { 
              margin-top: 20px; 
              padding-top: 8px; 
              border-top: 1px solid #000;
            }
            
            .signature-line { 
              border-top: 1px solid #000; 
              margin-top: 30px;
              padding-top: 4px;
              text-align: center;
            }
          }
          
          @media screen {
            .orcamento-impressao {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Cabeçalho */}
      <div className="orc-header">
        <table style={{ width: "100%", border: "none", marginBottom: "6px" }}>
          <tbody>
            <tr>
              <td
                style={{ border: "none", width: "15%", verticalAlign: "top" }}
              >
                {/* Logo Nova - Retangular Azul com Listras */}
                <div
                  style={{
                    width: "80px",
                    height: "65px",
                    backgroundColor: "#3b4e9e",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Listras decorativas */}
                  <div style={{ 
                    position: "absolute", 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    height: "3px", 
                    background: "linear-gradient(90deg, #fff 0%, #fff 30%, transparent 30%, transparent 70%, #fff 70%, #fff 100%)" 
                  }} />
                  <div style={{ 
                    position: "absolute", 
                    bottom: 0, 
                    left: 0, 
                    right: 0, 
                    height: "3px", 
                    background: "linear-gradient(90deg, #fff 0%, #fff 30%, transparent 30%, transparent 70%, #fff 70%, #fff 100%)" 
                  }} />
                  
                  <div style={{ textAlign: "center", color: "white", zIndex: 1 }}>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        lineHeight: "1",
                        letterSpacing: "1px",
                      }}
                    >
                      BENNY'S
                    </div>
                    <div style={{ 
                      fontSize: "8px", 
                      marginTop: "3px",
                      letterSpacing: "2px",
                      borderTop: "1px solid white",
                      borderBottom: "1px solid white",
                      padding: "2px 0"
                    }}>
                      MOTORSPORT
                    </div>
                  </div>
                </div>
              </td>
              <td
                style={{
                  border: "none",
                  width: "50%",
                  verticalAlign: "top",
                  paddingLeft: "8px",
                }}
              >
                <h1
                  style={{
                    fontSize: "15px",
                    fontWeight: "bold",
                    margin: "0 0 3px 0",
                  }}
                >
                  BENNYS CENTRO AUTOMOTIVO
                </h1>
                <p style={{ fontSize: "8px", margin: "1px 0" }}>
                  <strong>CNPJ:</strong> 55.961.553/0001-00
                </p>
                <p style={{ fontSize: "8px", margin: "1px 0" }}>
                  <strong>Telefones:</strong> 91084254-47 | (41) 9 9236-2952
                </p>
                <p style={{ fontSize: "8px", margin: "1px 0" }}>
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
                <p style={{ fontSize: "8px", margin: "1px 0" }}>
                  <strong>Data:</strong> {formatarData(dataCriacao)}{" "}
                  {formatarHora(dataCriacao)}
                </p>
                <p
                  style={{
                    fontSize: "10px",
                    margin: "3px 0",
                    fontWeight: "bold",
                  }}
                >
                  Oficina Integrada
                </p>
                <div
                  style={{
                    border: "2px solid #3b4e9e",
                    padding: "5px",
                    marginTop: "3px",
                    backgroundColor: "#f5f5f5",
                  }}
                >
                  <p style={{ fontSize: "8px", margin: "0 0 2px 0" }}>
                    Orçamento Número
                  </p>
                  <p
                    style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}
                  >
                    {orcamento.numero || "N/A"}
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dados do Cliente e Veículo */}
      <div className="orc-section">
        <table
          style={{ width: "100%", border: "1px solid #000", fontSize: "9px" }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  padding: "3px",
                  width: "50%",
                  borderRight: "1px solid #000",
                }}
              >
                <strong>Cliente:</strong>{" "}
                {orcamento.cliente_nome || "Não informado"}
              </td>
              <td style={{ padding: "3px", width: "50%" }}>
                <strong>Veículo:</strong> {orcamento.veiculo_marca}{" "}
                {orcamento.veiculo_modelo} {orcamento.veiculo_cor}{" "}
                {orcamento.veiculo_ano || "Não informado"}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "3px",
                  borderTop: "1px solid #000",
                  borderRight: "1px solid #000",
                }}
              >
                <strong>Telefone:</strong>{" "}
                {orcamento.cliente_telefone || "Não informado"}
              </td>
              <td style={{ padding: "3px", borderTop: "1px solid #000" }}>
                <strong>Placa:</strong>{" "}
                {orcamento.veiculo_placa || "Não informada"}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "3px",
                  borderTop: "1px solid #000",
                  borderRight: "1px solid #000",
                }}
              >
                <strong>Km:</strong>{" "}
                {orcamento.km ? orcamento.km.toLocaleString() : "-"}
              </td>
              <td
                colSpan="2"
                style={{ padding: "3px", borderTop: "1px solid #000" }}
              >
                <strong>Previsão:</strong>{" "}
                {orcamento.previsao_entrega
                  ? formatarData(orcamento.previsao_entrega)
                  : "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {temObservacoesVeiculo && (
          <div
            style={{
              marginTop: "3px",
              fontSize: "9px",
              backgroundColor: "#f5f5f5",
              padding: "3px",
              border: "1px solid #ddd",
            }}
          >
            <strong>Observações do Veículo:</strong>{" "}
            {orcamento.observacoes_veiculo}
          </div>
        )}
      </div>

      {/* Serviços */}
      {orcamento.servicos && orcamento.servicos.length > 0 && (
        <div className="orc-section">
          <h2 className="orc-section-title">SERVIÇOS</h2>
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Descrição</th>
                <th style={{ width: "15%" }}>Código</th>
                <th style={{ width: "10%", textAlign: "center" }}>Qtd</th>
                <th style={{ width: "15%", textAlign: "right" }}>
                  Valor Unit.
                </th>
                <th style={{ width: "15%", textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orcamento.servicos.map((servico, index) => (
                <tr key={index}>
                  <td>{servico.descricao || "-"}</td>
                  <td>{servico.codigo || "-"}</td>
                  <td style={{ textAlign: "center" }}>
                    {servico.quantidade || 0}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {formatarMoeda(servico.valor_unitario)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {formatarMoeda(servico.valor_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Produtos */}
      {orcamento.produtos && orcamento.produtos.length > 0 && (
        <div className="orc-section">
          <h2 className="orc-section-title">PRODUTOS</h2>
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
              {orcamento.produtos.map((produto, index) => (
                <tr key={index}>
                  <td>{produto.codigo || "-"}</td>
                  <td>{produto.descricao || "-"}</td>
                  <td style={{ textAlign: "center" }}>
                    {produto.quantidade || 0}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {formatarMoeda(produto.valor_unitario)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {formatarMoeda(produto.valor_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totais */}
      <div className="orc-totals">
        <table style={{ width: "50%", marginLeft: "auto", border: "none" }}>
          <tbody>
            <tr>
              <td
                style={{
                  border: "none",
                  textAlign: "left",
                  padding: "3px 8px",
                  fontSize: "11px",
                }}
              >
                <strong>Subtotal Serviços:</strong>
              </td>
              <td
                style={{
                  border: "none",
                  textAlign: "right",
                  padding: "3px 8px",
                  fontSize: "11px",
                }}
              >
                {formatarMoeda(orcamento.valor_servicos)}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: "none",
                  textAlign: "left",
                  padding: "3px 8px",
                  fontSize: "11px",
                }}
              >
                <strong>Subtotal Produtos:</strong>
              </td>
              <td
                style={{
                  border: "none",
                  textAlign: "right",
                  padding: "3px 8px",
                  fontSize: "11px",
                }}
              >
                {formatarMoeda(orcamento.valor_produtos)}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  borderTop: "2px solid #000",
                  textAlign: "left",
                  padding: "5px 8px",
                  fontSize: "13px",
                }}
              >
                <strong>TOTAL:</strong>
              </td>
              <td
                style={{
                  borderTop: "2px solid #000",
                  textAlign: "right",
                  padding: "5px 8px",
                  fontSize: "13px",
                }}
              >
                <strong>{formatarMoeda(orcamento.valor_total)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Observações Gerais */}
      {temObservacoesGerais && (
        <div className="orc-section">
          <h2 className="orc-section-title">OBSERVAÇÕES GERAIS</h2>
          <div
            style={{
              backgroundColor: "#f5f5f5",
              padding: "5px",
              border: "1px solid #ddd",
              fontSize: "9px",
            }}
          >
            {orcamento.observacoes_gerais}
          </div>
        </div>
      )}

      {/* Informações de Garantia e Termos */}
      <div
        style={{
          marginTop: "8px",
          fontSize: "8px",
          backgroundColor: "#f5f5f5",
          padding: "5px",
          border: "1px solid #ddd",
        }}
      >
        <p style={{ margin: "0 0 2px 0", fontWeight: "bold" }}>
          VALIDADE DO ORÇAMENTO:
        </p>
        <p style={{ margin: "0 0 4px 0" }}>
          Este orçamento tem validade de 7 dias corridos a partir da data de
          emissão.
        </p>
        <p style={{ margin: "0 0 2px 0", fontWeight: "bold" }}>GARANTIA:</p>
        <p style={{ margin: 0 }}>
          Todos os nossos serviços e produtos possuem 3 meses de garantia.
        </p>
      </div>

      {/* Área de Assinatura */}
      <div className="signature-area">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "20px",
          }}
        >
          <div style={{ width: "45%", textAlign: "center" }}>
            <div className="signature-line">Assinatura do Cliente</div>
          </div>
          <div style={{ width: "45%", textAlign: "center" }}>
            <div className="signature-line">Benny's Motorsport</div>
          </div>
        </div>
      </div>
    </div>
  );
});

OrcamentoImpressao.displayName = "OrcamentoImpressao";

export default OrcamentoImpressao;
