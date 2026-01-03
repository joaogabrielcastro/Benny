import { forwardRef } from "react";

const OSImpressao = forwardRef(({ os }, ref) => {
  const formatarData = (data) => {
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  return (
    <div ref={ref} className="hidden print:block bg-white p-8 text-black">
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 1cm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>

      {/* Cabeçalho da Empresa */}
      <div className="border-b-4 border-blue-600 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-20 h-20">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="95" fill="#1e40af"/>
                <text 
                  x="100" 
                  y="85" 
                  fontFamily="Arial, sans-serif" 
                  fontSize="32" 
                  fontWeight="bold" 
                  fill="white" 
                  textAnchor="middle"
                >
                  BENNY'S
                </text>
                <line x1="40" y1="100" x2="80" y2="100" stroke="white" strokeWidth="2"/>
                <text 
                  x="100" 
                  y="105" 
                  fontFamily="Arial, sans-serif" 
                  fontSize="12" 
                  fontWeight="normal" 
                  fill="white" 
                  textAnchor="middle" 
                  letterSpacing="2"
                >
                  MOTORSPORT
                </text>
                <line x1="120" y1="100" x2="160" y2="100" stroke="white" strokeWidth="2"/>
                <text 
                  x="100" 
                  y="125" 
                  fontFamily="Arial, sans-serif" 
                  fontSize="11" 
                  fontWeight="normal" 
                  fill="white" 
                  textAnchor="middle" 
                  letterSpacing="1"
                >
                  CENTRO AUTOMOTIVO
                </text>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-blue-600">
                BENNY'S MOTORSPORT
              </h1>
              <p className="text-gray-700 mt-1 font-semibold">
                Centro Automotivo • Excelência em Serviços
              </p>
              <div className="mt-2 text-sm text-gray-600">
                <p>📍 Endereço da Oficina • Cidade - Estado</p>
                <p>📞 (00) 0000-0000 | 📧 contato@bennysmotorsport.com.br</p>
                <p>🆔 CNPJ: 00.000.000/0000-00</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block">
              <p className="text-lg font-bold">{os.numero}</p>
              <p className="text-xs">Ordem de Serviço</p>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Data: {formatarData(os.criado_em)}
            </p>
          </div>
        </div>
      </div>

      {/* Dados do Cliente */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-1">
          DADOS DO CLIENTE
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Cliente:</p>
            <p className="font-semibold">{os.cliente_nome}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Telefone:</p>
            <p className="font-semibold">
              {os.cliente_telefone || "Não informado"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">CPF/CNPJ:</p>
            <p className="font-semibold">
              {os.cliente_cpf_cnpj || "Não informado"}
            </p>
          </div>
        </div>
      </div>

      {/* Dados do Veículo */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-1">
          DADOS DO VEÍCULO
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Modelo:</p>
            <p className="font-semibold">{os.veiculo_modelo}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Placa:</p>
            <p className="font-semibold">{os.veiculo_placa}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Cor:</p>
            <p className="font-semibold">{os.veiculo_cor}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">KM:</p>
            <p className="font-semibold">
              {os.km ? os.km.toLocaleString() : "-"}
            </p>
          </div>
        </div>
        {os.observacoes_veiculo && (
          <div className="mt-3 bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Observações do Veículo:</p>
            <p className="text-sm">{os.observacoes_veiculo}</p>
          </div>
        )}
      </div>

      {/* Serviços */}
      {os.servicos && os.servicos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-1">
            SERVIÇOS REALIZADOS
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Código</th>
                <th className="text-left p-2 border">Descrição</th>
                <th className="text-center p-2 border">Qtd</th>
                <th className="text-right p-2 border">Valor Unit.</th>
                <th className="text-right p-2 border">Total</th>
              </tr>
            </thead>
            <tbody>
              {os.servicos.map((servico, index) => (
                <tr key={index}>
                  <td className="p-2 border">{servico.codigo}</td>
                  <td className="p-2 border">{servico.descricao}</td>
                  <td className="text-center p-2 border">
                    {servico.quantidade}
                  </td>
                  <td className="text-right p-2 border">
                    {formatarMoeda(servico.valor_unitario)}
                  </td>
                  <td className="text-right p-2 border font-semibold">
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
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-1">
            PEÇAS E PRODUTOS UTILIZADOS
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Código</th>
                <th className="text-left p-2 border">Descrição</th>
                <th className="text-center p-2 border">Qtd</th>
                <th className="text-right p-2 border">Valor Unit.</th>
                <th className="text-right p-2 border">Total</th>
              </tr>
            </thead>
            <tbody>
              {os.produtos.map((produto, index) => (
                <tr key={index}>
                  <td className="p-2 border">{produto.codigo}</td>
                  <td className="p-2 border">{produto.descricao}</td>
                  <td className="text-center p-2 border">
                    {produto.quantidade}
                  </td>
                  <td className="text-right p-2 border">
                    {formatarMoeda(produto.valor_unitario)}
                  </td>
                  <td className="text-right p-2 border font-semibold">
                    {formatarMoeda(produto.valor_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totais */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-end space-x-12">
          <div className="text-right">
            <p className="text-gray-600 mb-1">Serviços:</p>
            <p className="text-gray-600 mb-1">Produtos:</p>
            <p className="text-lg font-bold text-gray-800 mt-2">TOTAL:</p>
          </div>
          <div className="text-right">
            <p className="mb-1">{formatarMoeda(os.valor_servicos || 0)}</p>
            <p className="mb-1">{formatarMoeda(os.valor_produtos || 0)}</p>
            <p className="text-xl font-bold text-blue-600 mt-2">
              {formatarMoeda(os.valor_total || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Observações Gerais */}
      {os.observacoes_gerais && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-1">
            OBSERVAÇÕES GERAIS
          </h2>
          <p className="text-sm whitespace-pre-wrap">{os.observacoes_gerais}</p>
        </div>
      )}

      {/* Informações Adicionais */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Status:</p>
            <p className="font-semibold">{os.status}</p>
          </div>
          {os.responsavel_tecnico && (
            <div>
              <p className="text-gray-600">Responsável Técnico:</p>
              <p className="font-semibold">{os.responsavel_tecnico}</p>
            </div>
          )}
        </div>
      </div>

      {/* Assinaturas */}
      <div className="mt-12 pt-6 border-t-2 border-gray-300">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-16">
              <p className="font-semibold">Assinatura do Cliente</p>
              <p className="text-xs text-gray-600">Data: ___/___/___</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-16">
              <p className="font-semibold">Benny's Motorsport</p>
              <p className="text-xs text-gray-600">Centro Automotivo • Responsável Técnico</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>
          Este documento comprova a prestação de serviços automotivos realizados pela <strong>Benny's Motorsport - Centro Automotivo</strong>.
        </p>
        <p className="mt-1">
          Validade: 90 dias • Garantia conforme legislação vigente
        </p>
      </div>
    </div>
  );
});

OSImpressao.displayName = "OSImpressao";

export default OSImpressao;
