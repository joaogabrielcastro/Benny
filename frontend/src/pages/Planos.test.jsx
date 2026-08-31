import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Planos from "./Planos";

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, isAdmin: false }),
}));

import api from "../services/api";

const PLANS = [
  {
    id: "basic",
    nome: "Basic",
    descricao: "Oficina pequena",
    precoLabel: "R$ 100/mês",
    maxUsuarios: 2,
    maxOrcamentosMes: 50,
    destaque: false,
    disponivel: true,
  },
  {
    id: "premium",
    nome: "Premium",
    descricao: "Oficina média",
    precoLabel: "R$ 250/mês",
    maxUsuarios: 5,
    maxOrcamentosMes: 200,
    destaque: true,
    disponivel: true,
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    descricao: "Oficina grande",
    precoLabel: "R$ 397/mês",
    maxUsuarios: 999,
    maxOrcamentosMes: 9999,
    destaque: false,
    disponivel: false,
  },
];

function cardDoPlano(nome) {
  return screen.getByRole("heading", { name: nome, level: 2 }).closest("div");
}

describe("Planos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { plans: PLANS } });
  });

  async function renderPlanos() {
    render(
      <MemoryRouter>
        <Planos />
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "Basic", level: 2 });
  }

  it("mostra limites diferentes em cada plano", async () => {
    await renderPlanos();

    const basic = within(cardDoPlano("Basic"));
    expect(basic.getByText("Usuários").nextSibling).toHaveTextContent("2");
    expect(
      basic.getByText("Orçamentos por mês").nextSibling,
    ).toHaveTextContent("50");

    const premium = within(cardDoPlano("Premium"));
    expect(premium.getByText("Usuários").nextSibling).toHaveTextContent("5");
    expect(
      premium.getByText("Orçamentos por mês").nextSibling,
    ).toHaveTextContent("200");

    const enterprise = within(cardDoPlano("Enterprise"));
    expect(enterprise.getByText("Usuários").nextSibling).toHaveTextContent(
      "Ilimitado",
    );
    expect(
      enterprise.getByText("Orçamentos por mês").nextSibling,
    ).toHaveTextContent("Ilimitado");
  });

  it("não repete os recursos comuns dentro dos cards", async () => {
    await renderPlanos();

    expect(screen.getAllByText("Controle de estoque")).toHaveLength(1);
    expect(screen.getAllByText("Ordens de serviço")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Incluído em todos os planos" }),
    ).toBeVisible();
  });

  it("desabilita o plano sem preço configurado na Stripe", async () => {
    await renderPlanos();

    const enterprise = within(cardDoPlano("Enterprise"));
    expect(enterprise.getByRole("button", { name: "Em breve" })).toBeDisabled();

    const basic = within(cardDoPlano("Basic"));
    expect(basic.getByRole("button", { name: "Começar" })).toBeEnabled();
  });

  it("destaca o plano mais popular", async () => {
    await renderPlanos();
    expect(screen.getAllByText("Mais popular")).toHaveLength(1);
    expect(
      within(cardDoPlano("Premium")).getByText("Mais popular"),
    ).toBeVisible();
  });
});
