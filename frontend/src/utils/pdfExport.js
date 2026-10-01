import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const LOGO_URL = "/bennys-logo.jpg";
const LOGO_SIZE_MM = 18;

let logoDataUrlPromise = null;

function carregarLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch(LOGO_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Falha ao carregar logo (${res.status})`);
        return res.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }),
      )
      .catch((err) => {
        logoDataUrlPromise = null;
        throw err;
      });
  }
  return logoDataUrlPromise;
}

async function adicionarCabecalho(doc, titulo) {
  let yTexto = 20;
  try {
    const dataUrl = await carregarLogoDataUrl();
    doc.addImage(dataUrl, "JPEG", 14, 10, LOGO_SIZE_MM, LOGO_SIZE_MM);
    yTexto = 14;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Benny's Motorsport", 14 + LOGO_SIZE_MM + 4, yTexto + 6);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(titulo, 14 + LOGO_SIZE_MM + 4, yTexto + 13);
    doc.setFontSize(10);
    doc.text(
      `Data: ${new Date().toLocaleDateString("pt-BR")}`,
      14 + LOGO_SIZE_MM + 4,
      yTexto + 19,
    );
    return 10 + LOGO_SIZE_MM + 8;
  } catch {
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Benny's Motorsport", 14, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(titulo, 14, 28);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 34);
    return 40;
  }
}

export async function exportOSListToPDF(ordensServico) {
  const doc = new jsPDF();
  const startY = await adicionarCabecalho(doc, "Relatório de Ordens de Serviço");

  const tableData = ordensServico.map((os) => [
    os.numero,
    os.cliente_nome || "-",
    os.veiculo_modelo || "-",
    new Date(os.criado_em).toLocaleDateString("pt-BR"),
    os.status,
    `R$ ${parseFloat(os.valor_total).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY,
    head: [["Número", "Cliente", "Veículo", "Data", "Status", "Valor"]],
    body: tableData,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 75, 184] },
  });

  const total = ordensServico.reduce(
    (sum, os) => sum + parseFloat(os.valor_total),
    0,
  );
  const finalY = doc.previousAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: R$ ${total.toFixed(2)}`, 14, finalY);

  doc.save(`ordens-servico-${new Date().getTime()}.pdf`);
}

export async function exportOrcamentosListToPDF(orcamentos) {
  const doc = new jsPDF();
  const startY = await adicionarCabecalho(doc, "Relatório de Orçamentos");

  const tableData = orcamentos.map((orc) => [
    orc.numero,
    orc.cliente_nome || "-",
    orc.veiculo_modelo || "-",
    new Date(orc.criado_em).toLocaleDateString("pt-BR"),
    orc.status,
    `R$ ${parseFloat(orc.valor_total).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY,
    head: [["Número", "Cliente", "Veículo", "Data", "Status", "Valor"]],
    body: tableData,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 75, 184] },
  });

  const total = orcamentos.reduce(
    (sum, orc) => sum + parseFloat(orc.valor_total),
    0,
  );
  const finalY = doc.previousAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: R$ ${total.toFixed(2)}`, 14, finalY);

  doc.save(`orcamentos-${new Date().getTime()}.pdf`);
}

export async function exportDashboardToPDF(stats, chartData) {
  const doc = new jsPDF();
  const startY = await adicionarCabecalho(doc, "Relatório de Dashboard");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Estatísticas Gerais", 14, startY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = startY + 7;
  doc.text(`OS Abertas: ${stats.osAbertas} de ${stats.totalOS}`, 14, y);
  y += 7;
  doc.text(`Faturamento do Mês: R$ ${stats.faturamentoMes.toFixed(2)}`, 14, y);
  y += 7;
  doc.text(`Ticket Médio: R$ ${stats.ticketMedio.toFixed(2)}`, 14, y);
  y += 7;
  doc.text(`Produtos com Estoque Baixo: ${stats.estoqueBaixo}`, 14, y);
  y += 12;

  if (chartData.produtosMaisVendidos.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Produtos Mais Vendidos", 14, y);

    const tableData = chartData.produtosMaisVendidos.map((p) => [
      p.nome,
      p.quantidade.toString(),
    ]);

    autoTable(doc, {
      startY: y + 5,
      head: [["Produto", "Quantidade Vendida"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 75, 184] },
    });
  }

  doc.save(`dashboard-${new Date().getTime()}.pdf`);
}
