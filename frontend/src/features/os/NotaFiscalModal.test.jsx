import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NotaFiscalModal from "./NotaFiscalModal";

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("./notaFiscalPdf", () => ({
  resolvePdfUrl: vi.fn(() => ({ url: "/storage/nota.pdf", auth: true })),
  abrirDanfePdf: vi.fn(),
  baixarDanfePdf: vi.fn(),
  urlConsultaPublicaNfse: vi.fn(() => "https://portal.nfse.gov.br/consulta"),
  abrirConsultaPublicaNfse: vi.fn(),
}));

const NOTA = {
  id: 8,
  numero: "8",
  data_emissao: "2026-08-05T12:00:00.000Z",
  chave_acesso: "41058052255961553000100000000000008260847465783",
  status_nf: "autorizada",
  valor_base: 7150,
  valor_iss: 143,
  aliquota_iss: 2,
  fonte_iss: "estimativa",
  valor_pis: 0,
  valor_cofins: 0,
  valor_liquido: 7007,
  valor_total: 7150,
  status_provedor: "issued",
  id_provedor: "f9551171-60fc-40ab-b6e1-8124131c2267",
  atualizado_em_nf: "2026-08-05T13:30:14.000Z",
  observacoes:
    "NFS-e autorizada na Notaas. (Notaas: issued — consulta 05/08/2026, 13:30:14)",
};

const OS = {
  numero: "OS-0023",
  cliente_nome: "NSA SERVIÇOS E PRODUTOS AUTOMOTIVOS LTDA",
};

function renderModal(props = {}) {
  return render(
    <NotaFiscalModal
      isOpen
      modelo="NFSE"
      nota={NOTA}
      os={OS}
      onClose={() => {}}
      {...props}
    />,
  );
}

describe("NotaFiscalModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra o status da nota uma única vez", () => {
    renderModal();
    expect(screen.getAllByText("Nota fiscal autorizada")).toHaveLength(1);
  });

  it("omite a observação que apenas repete o status", () => {
    renderModal();
    expect(screen.queryByText("Observações")).not.toBeInTheDocument();
    expect(screen.queryByText(/NFS-e autorizada na Notaas/)).not.toBeInTheDocument();
  });

  it("não lista tributos zerados", () => {
    renderModal();
    expect(screen.queryByText(/^PIS/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^COFINS/)).not.toBeInTheDocument();
  });

  it("destaca o valor total e recolhe a composição", () => {
    renderModal();
    const [totalEmDestaque] = screen.getAllByText("R$ 7.150,00");
    expect(screen.getByText(/Valor total da/)).toBeVisible();
    expect(totalEmDestaque).toBeVisible();
    expect(screen.getByText(/^ISS/)).not.toBeVisible();
    expect(screen.getByText("Valor dos serviços (base)")).not.toBeVisible();
  });

  it("esconde os dados do provedor atrás de detalhes técnicos", () => {
    renderModal();
    expect(screen.getByText("Status no provedor")).not.toBeVisible();
    expect(screen.getByText("ID no provedor")).not.toBeVisible();
    expect(screen.getByText("Detalhes técnicos")).toBeVisible();
  });

  it("mantém as ações do documento acessíveis", () => {
    renderModal({ onCancelar: () => {} });
    expect(screen.getByRole("button", { name: "Abrir DANFSe" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Imprimir" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Baixar PDF" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancelar nota" })).toBeVisible();
  });

  it("exibe o motivo quando a nota é rejeitada", () => {
    renderModal({
      nota: {
        ...NOTA,
        status_nf: "rejeitada",
        detalhe_rejeicao: "E0120 - IM do prestador inválida",
        observacoes: "E0120 - IM do prestador inválida",
      },
    });
    expect(screen.getByText("Motivo da rejeição")).toBeVisible();
    expect(
      screen.getByText(/E0120 - IM do prestador inválida/),
    ).toBeVisible();
  });
});
