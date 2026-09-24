import { describe, it, expect } from "vitest";
import { mensagemConfigFiscalIncompleta, mensagemDestinatarioIncompleto, mensagemProdutosSemNcm } from "./fiscalUtils";

describe("mensagem de NF-e sem NCM", () => {
  it("lista os produtos e orienta o cadastro", () => {
    const texto = mensagemProdutosSemNcm({
      code: "NFE_PRODUTO_SEM_NCM",
      produtos: [
        { descricao: "Pastilha de freio" },
        { descricao: "Disco dianteiro" },
      ],
    });
    expect(texto).toContain("Não foi possível emitir a NF-e");
    expect(texto).toContain("Pastilha de freio");
    expect(texto).toContain("Disco dianteiro");
    expect(texto).toContain("informar NCM");
  });

  it("lista os campos do destinatário incompleto", () => {
    const texto = mensagemDestinatarioIncompleto({
      code: "NFE_DESTINATARIO_INCOMPLETO",
      campos: [
        { campo: "cpf_cnpj" },
        { campo: "cep" },
        { campo: "bairro" },
        { campo: "codigo_ibge" },
      ],
    });
    expect(texto).toContain("cadastro do cliente está incompleto");
    expect(texto).toContain("CPF/CNPJ");
    expect(texto).toContain("CEP");
    expect(texto).toContain("Bairro");
    expect(texto).toContain("Edite o cadastro do cliente");
  });

  it("lista situação ICMS e inscrição estadual", () => {
    const texto = mensagemDestinatarioIncompleto({
      code: "NFE_DESTINATARIO_INCOMPLETO",
      campos: [
        { campo: "situacao_icms" },
        { campo: "inscricao_estadual" },
      ],
    });
    expect(texto).toContain("Situação perante o ICMS");
    expect(texto).toContain("Inscrição Estadual");
  });

  it("explica regime fiscal ausente sem abrir o cliente", () => {
    const texto = mensagemConfigFiscalIncompleta({
      code: "NFE_CONFIGURACAO_FISCAL_INCOMPLETA",
    });
    expect(texto).toContain("Regime tributário");
    expect(mensagemConfigFiscalIncompleta({ code: "NFE_DESTINATARIO_INCOMPLETO" })).toBeNull();
  });
});