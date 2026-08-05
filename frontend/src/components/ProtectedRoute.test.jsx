import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../contexts/AuthContext";

function renderWithAuth(auth, initialPath = "/estoque") {
  useAuth.mockReturnValue(auth);
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/ordens-servico" element={<div>OS Page</div>} />
        <Route
          path="/estoque"
          element={
            <ProtectedRoute>
              <div>Estoque Page</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/agendamentos"
          element={
            <ProtectedRoute>
              <div>Agenda Page</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redireciona para login se não autenticado", () => {
    renderWithAuth({ isAuthenticated: false, user: null });
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("admin acessa estoque", () => {
    renderWithAuth({
      isAuthenticated: true,
      user: { role: "admin" },
    });
    expect(screen.getByText("Estoque Page")).toBeInTheDocument();
  });

  it("mecânico não acessa estoque (vai para OS)", () => {
    renderWithAuth(
      {
        isAuthenticated: true,
        user: { role: "mecanico" },
      },
      "/estoque",
    );
    expect(screen.getByText("OS Page")).toBeInTheDocument();
  });

  it("mecânico acessa agenda", () => {
    renderWithAuth(
      {
        isAuthenticated: true,
        user: { role: "mecanico" },
      },
      "/agendamentos",
    );
    expect(screen.getByText("Agenda Page")).toBeInTheDocument();
  });
});
