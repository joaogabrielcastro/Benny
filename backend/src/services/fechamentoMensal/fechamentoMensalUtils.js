const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function validarPeriodo(ano, mes) {
  const y = Number(ano);
  const m = Number(mes);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    return { ok: false, erro: "Ano inválido." };
  }
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    return { ok: false, erro: "Mês inválido." };
  }
  return { ok: true, ano: y, mes: m };
}

export function rotuloMes(ano, mes) {
  const m = Number(mes);
  return `${MESES_PT[m - 1]}/${ano}`;
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function tributosDaNota(row) {
  const t =
    typeof row.tributos === "object" && row.tributos !== null ? row.tributos : {};
  return {
    iss: Number(t.valor_iss ?? 0),
    pis: Number(t.valor_pis ?? 0),
    cofins: Number(t.valor_cofins ?? 0),
    icms: Number(t.valor_icms ?? 0),
  };
}

export function mapNotaFechamento(row) {
  const trib = tributosDaNota(row);
  return {
    id: row.id,
    os_id: row.ordem_servico_id,
    os_numero: row.os_numero ?? null,
    modelo_documento: row.modelo_documento,
    status: row.status,
    numero: row.numero,
    chave_acesso: row.chave_acesso,
    valor_total: roundMoney(row.valor_total ?? 0),
    data_emissao: row.data_emissao,
    id_provedor: row.id_provedor,
    mensagem_status: row.mensagem_status,
    tributos: trib,
  };
}

export function montarResumoFromNotas(notas, ano, mes) {
  const lista = notas.map(mapNotaFechamento);

  const contar = (modelo, status) =>
    lista.filter(
      (n) =>
        String(n.modelo_documento).toUpperCase() === modelo &&
        n.status === status,
    ).length;

  const somaValor = (modelo, status) =>
    roundMoney(
      lista
        .filter(
          (n) =>
            String(n.modelo_documento).toUpperCase() === modelo &&
            n.status === status,
        )
        .reduce((acc, n) => acc + Number(n.valor_total || 0), 0),
    );

  const tributos = lista
    .filter((n) => n.status === "autorizada")
    .reduce(
      (acc, n) => ({
        iss: roundMoney(acc.iss + n.tributos.iss),
        pis: roundMoney(acc.pis + n.tributos.pis),
        cofins: roundMoney(acc.cofins + n.tributos.cofins),
        icms: roundMoney(acc.icms + n.tributos.icms),
      }),
      { iss: 0, pis: 0, cofins: 0, icms: 0 },
    );

  const faturamentoNfse = somaValor("NFSE", "autorizada");
  const faturamentoNfe = somaValor("NFE", "autorizada");

  return {
    periodo: { ano, mes, rotulo: rotuloMes(ano, mes) },
    totais: {
      nfseAutorizadas: contar("NFSE", "autorizada"),
      nfseCanceladas: contar("NFSE", "cancelada"),
      nfeAutorizadas: contar("NFE", "autorizada"),
      nfeCanceladas: contar("NFE", "cancelada"),
      cte: null,
      notasEntrada: null,
      faturamentoTotal: roundMoney(faturamentoNfse + faturamentoNfe),
      faturamentoNfse,
      faturamentoNfe,
      tributos,
    },
    notas: lista,
    avisos: [
      "CT-e e notas de entrada ainda não estão disponíveis nesta versão.",
      "NF-e só entra no fechamento quando a emissão via Notaas estiver habilitada.",
    ],
  };
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function gerarCsvResumo(notas) {
  const header = [
    "id",
    "os_numero",
    "modelo",
    "status",
    "numero",
    "chave_acesso",
    "data_emissao",
    "valor_total",
    "iss",
    "pis",
    "cofins",
    "icms",
    "id_provedor",
  ].join(",");

  const linhas = notas.map((n) =>
    [
      n.id,
      n.os_numero,
      n.modelo_documento,
      n.status,
      n.numero,
      n.chave_acesso,
      n.data_emissao,
      n.valor_total,
      n.tributos.iss,
      n.tributos.pis,
      n.tributos.cofins,
      n.tributos.icms,
      n.id_provedor,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [header, ...linhas].join("\n");
}

export function gerarCsvEventos(notas) {
  const canceladas = notas.filter((n) => n.status === "cancelada");
  const header = [
    "id",
    "os_numero",
    "modelo",
    "numero",
    "chave_acesso",
    "data_emissao",
    "valor_total",
    "motivo",
  ].join(",");

  const linhas = canceladas.map((n) =>
    [
      n.id,
      n.os_numero,
      n.modelo_documento,
      n.numero,
      n.chave_acesso,
      n.data_emissao,
      n.valor_total,
      n.mensagem_status,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [header, ...linhas].join("\n");
}

export function nomeArquivoZip(ano, mes) {
  return `fechamento-${ano}-${String(mes).padStart(2, "0")}.zip`;
}

export function nomeArquivoNota(nota, ext) {
  const modelo = String(nota.modelo_documento || "NF").toLowerCase();
  const numero = String(nota.numero || nota.id).replace(/[^\w.-]+/g, "_");
  return `${modelo}_${numero}.${ext}`;
}
