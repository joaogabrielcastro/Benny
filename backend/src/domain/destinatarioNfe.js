/**
 * Destinatário da NF-e Brasil NFe.
 * Só usa o cadastro do cliente. Não completa com ENV nem com cidade/UF/bairro fictícios.
 * IndicadorIe e ConsumidorFinal não são decididos aqui.
 *
 * Número: vazio bloqueia. "S/N" só entra se o usuário gravou esse texto.
 * Bairro é exigido porque o corpo atual de EnviarNotaFiscal sempre envia Bairro
 * e os exemplos oficiais da Brasil NFe incluem o campo. Complemento é opcional.
 */

function digits(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function texto(valor) {
  return String(valor || "").trim();
}

function falta(campos, campo, motivo) {
  campos.push({ campo, motivo });
}

export function validarDestinatarioNfe(cliente) {
  const campos = [];
  const nome = texto(cliente?.nome);
  if (!nome) falta(campos, "nome", "Nome não informado.");

  const doc = digits(cliente?.cpf_cnpj);
  if (doc.length !== 11 && doc.length !== 14) {
    falta(campos, "cpf_cnpj", "CPF/CNPJ ausente ou com tamanho inválido.");
  }

  const logradouro = texto(cliente?.endereco);
  if (!logradouro) falta(campos, "endereco", "Logradouro não informado.");

  const numero = texto(cliente?.numero);
  if (!numero) falta(campos, "numero", "Número não informado.");

  const bairro = texto(cliente?.bairro);
  if (!bairro) falta(campos, "bairro", "Bairro não informado.");

  const cep = digits(cliente?.cep);
  if (cep.length !== 8) falta(campos, "cep", "CEP não informado.");

  const cidade = texto(cliente?.cidade);
  if (!cidade) falta(campos, "cidade", "Município não informado.");

  const uf = texto(cliente?.estado).toUpperCase();
  if (!/^[A-Z]{2}$/.test(uf)) falta(campos, "estado", "UF não informada.");

  const ibge = digits(cliente?.codigo_ibge);
  if (ibge.length !== 7) {
    falta(campos, "codigo_ibge", "Código IBGE do município não informado.");
  }

  const situacao = texto(cliente?.situacao_icms);
  const indicadorIe = {
    CONTRIBUINTE_ICMS: 1,
    CONTRIBUINTE_ISENTO: 2,
    NAO_CONTRIBUINTE: 9,
  }[situacao];
  if (!indicadorIe) {
    falta(campos, "situacao_icms", "Situação perante o ICMS não informada.");
  }
  const ie = texto(cliente?.inscricao_estadual);
  if (ie && (ie.length > 20 || !/^[A-Za-z0-9./\-\s]+$/.test(ie))) {
    falta(campos, "inscricao_estadual", "Inscrição estadual inválida.");
  } else if (situacao === "CONTRIBUINTE_ICMS" && !ie) {
    falta(campos, "inscricao_estadual", "Inscrição estadual não informada.");
  }

  if (campos.length) {
    return {
      ok: false,
      code: "NFE_DESTINATARIO_INCOMPLETO",
      message: "O cadastro do cliente está incompleto para emissão de NF-e.",
      campos,
    };
  }

  const complemento = texto(cliente?.complemento);
  return {
    ok: true,
    destinatario: {
      nome: nome.slice(0, 60),
      documento: doc,
      tipoDocumento: doc.length === 11 ? "CPF" : "CNPJ",
      logradouro: logradouro.slice(0, 60),
      numero: numero.slice(0, 60),
      complemento: complemento ? complemento.slice(0, 60) : "",
      bairro: bairro.slice(0, 60),
      cep,
      cidade: cidade.slice(0, 60),
      uf,
      codigoIbge: ibge,
      email: texto(cliente?.email).slice(0, 60),
      indicadorIe,
      ie: ie || "",
    },
  };
}
