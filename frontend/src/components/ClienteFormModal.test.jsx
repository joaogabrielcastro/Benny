import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClienteFormModal from "./ClienteFormModal";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock("../utils/toast.jsx", () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { showError } from "../utils/toast.jsx";

const CLIENTE_PJ = {
  id: 10,
  nome: "NSA SERVICOS E PRODUTOS AUTOMOTIVOS LTDA",
  cpf_cnpj: "13738306000191",
  telefone: "4130463121",
  cep: "81020670",
  endereco: "Rua Emanuel Kant",
  numero: "60",
  bairro: "Capão Raso",
  cidade: "Curitiba",
  estado: "PR",
};

const CNPJ_MASCARADO = "13.738.306/0001-91";

function renderModal({ isAdmin = true, clienteId = CLIENTE_PJ.id } = {}) {
  useAuth.mockReturnValue({ isAdmin });
  api.get.mockResolvedValue({ data: CLIENTE_PJ });
  return render(
    <ClienteFormModal isOpen clienteId={clienteId} onClose={() => {}} />,
  );
}

describe("ClienteFormModal - edição de documento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe CPF/CNPJ e telefone já mascarados ao carregar o cliente", async () => {
    renderModal();
    expect(await screen.findByDisplayValue(CNPJ_MASCARADO)).toBeInTheDocument();
    expect(screen.getByDisplayValue("(41) 3046-3121")).toBeInTheDocument();
  });

  it("admin pode editar o CNPJ de um cliente existente", async () => {
    renderModal({ isAdmin: true });
    const campo = await screen.findByDisplayValue(CNPJ_MASCARADO);
    expect(campo).toBeEnabled();
    expect(
      screen.queryByText(/Somente administradores podem alterar o documento/i),
    ).not.toBeInTheDocument();
  });

  it("não-admin vê o CNPJ bloqueado com explicação", async () => {
    renderModal({ isAdmin: false });
    const campo = await screen.findByDisplayValue(CNPJ_MASCARADO);
    expect(campo).toBeDisabled();
    expect(
      screen.getByText(/Somente administradores podem alterar o documento/i),
    ).toBeInTheDocument();
  });

  it("bloqueia o salvamento quando o documento é inválido", async () => {
    const user = userEvent.setup();
    renderModal({ isAdmin: true });
    const campo = await screen.findByDisplayValue(CNPJ_MASCARADO);

    await user.clear(campo);
    await user.type(campo, "11111111111111");
    await user.click(screen.getByText("Salvar alterações"));

    expect(showError).toHaveBeenCalledWith("Informe um CNPJ válido.");
    expect(api.put).not.toHaveBeenCalled();
  });

  it("envia o novo documento sem máscara ao salvar", async () => {
    const user = userEvent.setup();
    api.put.mockResolvedValue({ data: {} });
    renderModal({ isAdmin: true });
    const campo = await screen.findByDisplayValue(CNPJ_MASCARADO);

    await user.clear(campo);
    await user.type(campo, "11222333000181");
    await user.click(screen.getByText("Salvar alterações"));

    expect(api.put).toHaveBeenCalledWith(
      `/clientes/${CLIENTE_PJ.id}`,
      expect.objectContaining({ cpf_cnpj: "11222333000181" }),
    );
  });
});
