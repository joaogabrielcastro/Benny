import jsPDF from "jspdf";
import "jspdf-autotable";

export function exportOSListToPDF(ordensServico) {
  const doc = new jsPDF();

  // Logo/Título
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Benny's Motorsport", 14, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório de Ordens de Serviço", 14, 28);
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 34);

  // Tabela
  const tableData = ordensServico.map((os) => [
    os.numero,
    os.cliente_nome || "-",
    os.veiculo_modelo || "-",
    new Date(os.criado_em).toLocaleDateString("pt-BR"),
    os.status,
    `R$ ${parseFloat(os.valor_total).toFixed(2)}`,
  ]);

  doc.autoTable({
    startY: 40,
    head: [["Número", "Cliente", "Veículo", "Data", "Status", "Valor"]],
    body: tableData,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  // Total
  const total = ordensServico.reduce(
    (sum, os) => sum + parseFloat(os.valor_total),
    0
  );
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: R$ ${total.toFixed(2)}`, 14, finalY);

  doc.save(`ordens-servico-${new Date().getTime()}.pdf`);
}

export function exportOrcamentosListToPDF(orcamentos) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Benny's Motorsport", 14, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório de Orçamentos", 14, 28);
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 34);

  const tableData = orcamentos.map((orc) => [
    orc.numero,
    orc.cliente_nome || "-",
    orc.veiculo_modelo || "-",
    new Date(orc.criado_em).toLocaleDateString("pt-BR"),
    orc.status,
    `R$ ${parseFloat(orc.valor_total).toFixed(2)}`,
  ]);

  doc.autoTable({
    startY: 40,
    head: [["Número", "Cliente", "Veículo", "Data", "Status", "Valor"]],
    body: tableData,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  const total = orcamentos.reduce(
    (sum, orc) => sum + parseFloat(orc.valor_total),
    0
  );
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: R$ ${total.toFixed(2)}`, 14, finalY);

  doc.save(`orcamentos-${new Date().getTime()}.pdf`);
}

export function exportDashboardToPDF(stats, chartData) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Benny's Motorsport", 14, 20);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório de Dashboard", 14, 28);
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 34);

  // Estatísticas
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Estatísticas Gerais", 14, 45);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`OS Abertas: ${stats.osAbertas} de ${stats.totalOS}`, 14, 52);
  doc.text(`Faturamento do Mês: R$ ${stats.faturamentoMes.toFixed(2)}`, 14, 59);
  doc.text(`Ticket Médio: R$ ${stats.ticketMedio.toFixed(2)}`, 14, 66);
  doc.text(`Produtos com Estoque Baixo: ${stats.estoqueBaixo}`, 14, 73);

  // Produtos Mais Vendidos
  if (chartData.produtosMaisVendidos.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Produtos Mais Vendidos", 14, 85);

    const tableData = chartData.produtosMaisVendidos.map((p) => [
      p.nome,
      p.quantidade.toString(),
    ]);

    doc.autoTable({
      startY: 90,
      head: [["Produto", "Quantidade Vendida"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });
  }

  doc.save(`dashboard-${new Date().getTime()}.pdf`);
}
