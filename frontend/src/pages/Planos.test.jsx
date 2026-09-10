import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const COMPARACAO = [
  {
    id: "operacao",
    titulo: "Organize sua operação comercial",
    itens: [
      {
        label: "Ordens de serviço",
        valores: { basic: true, premium: true, enterprise: true },
      },
      {
        label: "Agenda de serviços",
        valores: { basic: false, premium: true, enterprise: true },
      },
    ],
  },
  {
    id: "relatorios",
    titulo: "Relatórios e indicadores",
    itens: [
      {
        label: "Emissão de NFS-e",
        valores: { basic: false, premium: false, enterprise: true },
      },
    ],
  },
];

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
    recursos: ["Ordens de serviço", "Controle de estoque"],
    beneficiosExtras: [],
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
    recursos: ["Tudo do Basic", "Agenda de serviços", "Relatórios e indicadores"],
    beneficiosExtras: ["Suporte prioritário por e-mail"],
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
    recursos: ["Tudo do Premium", "Emissão de NFS-e"],
    beneficiosExtras: ["Suporte dedicado via WhatsApp"],
  },
];

function cardDoPlano(nome) {
  return screen.getByRole("heading", { name: nome, level: 2 }).closest("div");
}

describe("Planos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { plans: PLANS, comparacao: COMPARACAO } });
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

  it("mostra recursos e benefícios exclusivos por plano", async () => {
    await renderPlanos();

    const basic = within(cardDoPlano("Basic"));
    expect(basic.getByText("Ordens de serviço")).toBeVisible();
    expect(basic.queryByText("Agenda de serviços")).toBeNull();

    const premium = within(cardDoPlano("Premium"));
    expect(premium.getByText("Agenda de serviços")).toBeVisible();
    expect(premium.getByText("Suporte prioritário por e-mail")).toBeVisible();

    const enterprise = within(cardDoPlano("Enterprise"));
    expect(enterprise.getByText("Emissão de NFS-e")).toBeVisible();
    expect(enterprise.getByText("Suporte dedicado via WhatsApp")).toBeVisible();
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

  it("exibe a comparação detalhada em accordion", async () => {
    const user = userEvent.setup();
    await renderPlanos();

    expect(
      screen.getByRole("heading", { name: "Compare os planos", level: 2 }),
    ).toBeVisible();

    const secaoOperacao = screen.getByRole("button", {
      name: /Organize sua operação comercial/i,
    });
    expect(secaoOperacao).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("rowheader", { name: "Ordens de serviço" })).toBeVisible();

    const secaoRelatorios = screen.getByRole("button", {
      name: /Relatórios e indicadores/i,
    });
    expect(secaoRelatorios).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("rowheader", { name: "Emissão de NFS-e" })).toBeNull();

    await user.click(secaoRelatorios);
    await waitFor(() => {
      expect(secaoRelatorios).toHaveAttribute("aria-expanded", "true");
    });
    expect(
      await screen.findByRole("rowheader", { name: "Emissão de NFS-e" }),
    ).toBeVisible();
  });
});
