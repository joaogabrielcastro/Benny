import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Relatorios from "./Relatorios";

vi.mock("../hooks/queries/useDashboard", () => ({
  useDashboardData: vi.fn(),
}));

vi.mock("../features/dashboard/DashboardCharts", () => ({
  default: ({ relatorio }) => (
    <div>Gráficos carregados: {relatorio?.faturamentoMes}</div>
  ),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn() },
}));

import { useDashboardData } from "../hooks/queries/useDashboard";
import toast from "react-hot-toast";

describe("Relatorios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe os indicadores retornados pelo dashboard", async () => {
    useDashboardData.mockReturnValue({
      data: { relatorio: { faturamentoMes: 7850 } },
      isLoading: false,
      isError: false,
    });

    render(<Relatorios />);

    expect(screen.getByText("Relatórios")).toBeInTheDocument();
    expect(
      await screen.findByText("Gráficos carregados: 7850"),
    ).toBeInTheDocument();
  });

  it("exibe carregamento enquanto consulta os dados", () => {
    useDashboardData.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<Relatorios />);

    expect(
      container.querySelector('[class*="animate-spin"]'),
    ).toBeInTheDocument();
  });

  it("avisa quando os relatórios não podem ser carregados", () => {
    useDashboardData.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<Relatorios />);

    expect(toast.error).toHaveBeenCalledWith("Erro ao carregar os relatórios");
  });
});
