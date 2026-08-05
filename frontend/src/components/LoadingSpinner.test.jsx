import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import LoadingSpinner from "./LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renderiza spinner com role implícito via estrutura", () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("aceita size sm", () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    expect(container.querySelector(".w-4")).toBeTruthy();
  });
});
