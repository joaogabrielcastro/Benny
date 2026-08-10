import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Clientes from "./Clientes";

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ isAdmin: true }),
}));

import api from "../services/api";
import toast from "react-hot-toast";

function respostaPaginada(rows, total = rows.length) {
  return {
    data: {
      data: rows,
      pagination: { page: 1, limit: 10, total, pages: Math.ceil(total / 10) },
    },
  };
}

const JOAO = {
  id: 1,
  nome: "João da Silva",
  cpf_cnpj: "12345678901",
  cidade: "Curitiba",
  estado: "PR",
};
const LEANDRO = { id: 2, nome: "LEANDRO", cidade: "Colombo", estado: "PR" };

function paramsDaUltimaChamada() {
  const chamadas = api.get.mock.calls;
  return chamadas[chamadas.length - 1][1].params;
}

describe("Clientes - busca", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(respostaPaginada([JOAO, LEANDRO]));
  });

  it("envia o termo digitado como parâmetro busca para a API", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Clientes />
      </MemoryRouter>,
    );

    await screen.findByText("LEANDRO");
    expect(paramsDaUltimaChamada().busca).toBeUndefined();

    api.get.mockResolvedValue(respostaPaginada([JOAO], 1));
    await user.type(
      screen.getByPlaceholderText(/Buscar por nome, telefone ou CPF\/CNPJ/i),
      "joao",
    );

    await waitFor(() => {
      expect(paramsDaUltimaChamada().busca).toBe("joao");
    });
  });

  it("volta para a primeira página ao buscar", async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(respostaPaginada([JOAO, LEANDRO], 25));
    render(
      <MemoryRouter>
        <Clientes />
      </MemoryRouter>,
    );

    await screen.findByText("LEANDRO");
    await user.click(screen.getByText("2"));
    await waitFor(() => {
      expect(paramsDaUltimaChamada().page).toBe(2);
    });

    await user.type(
      screen.getByPlaceholderText(/Buscar por nome, telefone ou CPF\/CNPJ/i),
      "joao",
    );

    await waitFor(() => {
      const params = paramsDaUltimaChamada();
      expect(params.busca).toBe("joao");
      expect(params.page).toBe(1);
    });
  });

  it("limpar a busca remove o filtro da requisição", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Clientes />
      </MemoryRouter>,
    );

    await screen.findByText("LEANDRO");
    const campo = screen.getByPlaceholderText(
      /Buscar por nome, telefone ou CPF\/CNPJ/i,
    );

    await user.type(campo, "joao");
    await waitFor(() => {
      expect(paramsDaUltimaChamada().busca).toBe("joao");
    });

    await user.clear(campo);
    await waitFor(() => {
      expect(paramsDaUltimaChamada().busca).toBeUndefined();
    });
  });
});

describe("Clientes - exclusão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(respostaPaginada([JOAO, LEANDRO]));
  });

  it("só exclui o cliente após confirmação explícita da cascata", async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({
      data: { message: "Cliente e vínculos excluídos com sucesso" },
    });
    render(
      <MemoryRouter>
        <Clientes />
      </MemoryRouter>,
    );

    await screen.findByText("João da Silva");
    await user.click(screen.getAllByRole("button", { name: "Excluir" })[0]);

    expect(
      screen.getByText(/TODO o histórico vinculado/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/não cancela NFS-e\/NF-e/i)).toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Excluir tudo" }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/clientes/1");
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Cliente e vínculos excluídos com sucesso",
    );
  });

  it("cancela a exclusão sem chamar a API", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Clientes />
      </MemoryRouter>,
    );

    await screen.findByText("João da Silva");
    await user.click(screen.getAllByRole("button", { name: "Excluir" })[0]);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(api.delete).not.toHaveBeenCalled();
  });
});
