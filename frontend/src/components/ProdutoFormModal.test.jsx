import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProdutoFormModal from "./ProdutoFormModal";
import api from "../services/api";

vi.mock("../services/api", () => ({
  default: { post: vi.fn(), put: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import toast from "react-hot-toast";

describe("ProdutoFormModal NCM", () => {
  beforeEach(() => {
    api.post.mockReset();
    api.put.mockReset();
    toast.error.mockReset();
    api.post.mockResolvedValue({ data: { produto: { id: 1 } } });
  });

  it("renderiza o campo NCM", () => {
    render(
      <ProdutoFormModal isOpen onClose={() => {}} onSaved={() => {}} />,
    );
    expect(screen.getByLabelText("NCM")).toBeTruthy();
    expect(screen.getByText(/Necessário para emissão de NF-e/)).toBeTruthy();
  });

  it("normaliza NCM válido antes de salvar", async () => {
    const user = userEvent.setup();
    render(
      <ProdutoFormModal isOpen onClose={() => {}} onSaved={() => {}} />,
    );
    await user.type(screen.getByRole("textbox", { name: "Nome *" }), "Pastilha");
    await user.type(screen.getByLabelText("NCM"), "8708.30.90");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(api.post).toHaveBeenCalled();
    expect(api.post.mock.calls[0][1].ncm).toBe("87083090");
  });

  it("grava o NCM escolhido na busca", async () => {
    const user = userEvent.setup();
    render(
      <ProdutoFormModal isOpen onClose={() => {}} onSaved={() => {}} />,
    );
    await user.type(screen.getByRole("textbox", { name: "Nome *" }), "Pastilha");
    await user.type(screen.getByLabelText("Buscar NCM pela peça"), "pastilha");
    await user.click(screen.getByRole("button", { name: /87083090/ }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(api.post.mock.calls[0][1].ncm).toBe("87083090");
  });

  it("não envia NCM inválido", async () => {
    const user = userEvent.setup();
    render(
      <ProdutoFormModal isOpen onClose={() => {}} onSaved={() => {}} />,
    );
    await user.type(screen.getByRole("textbox", { name: "Nome *" }), "Pastilha");
    await user.type(screen.getByLabelText("NCM"), "123");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(api.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
