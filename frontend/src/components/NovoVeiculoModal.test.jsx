import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NovoVeiculoModal from "./NovoVeiculoModal";

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
vi.mock("../utils/toast.jsx", () => ({ showSuccess: vi.fn(), showError: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import api from "../services/api";
import { showError } from "../utils/toast.jsx";

function renderModal(onVeiculoCriado = vi.fn()) {
  render(<NovoVeiculoModal isOpen onClose={() => {}} clienteId={7} onVeiculoCriado={onVeiculoCriado} />);
  return onVeiculoCriado;
}

describe("NovoVeiculoModal - cadastro rápido", () => {
  beforeEach(() => vi.clearAllMocks());

  it("salva só com placa e modelo; ano vazio vai como null (não 0)", async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 3 } });
    const cb = renderModal();
    await user.type(screen.getByLabelText(/Placa/), "abc1d23");
    await user.type(screen.getByLabelText(/Modelo/), "Onix");
    await user.click(screen.getByText("Cadastrar Veículo"));
    expect(showError).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith(
      "/veiculos",
      expect.objectContaining({ cliente_id: 7, placa: "ABC1D23", modelo: "Onix", marca: null, ano: null }),
    );
    expect(cb).toHaveBeenCalledWith({ id: 3 });
  });

  it("exige modelo", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText(/Placa/), "ABC1234");
    await user.click(screen.getByText("Cadastrar Veículo"));
    expect(showError).toHaveBeenCalledWith("Informe o modelo do veículo.");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("exige placa", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText(/Modelo/), "Gol");
    await user.click(screen.getByText("Cadastrar Veículo"));
    expect(showError).toHaveBeenCalledWith("Informe a placa do veículo.");
  });

  it("detalhes ficam recolhidos", () => {
    renderModal();
    expect(screen.queryByLabelText(/Chassi/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mais detalhes/ })).toBeInTheDocument();
  });
});
