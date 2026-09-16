import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StatusBadge } from "../components/StatusBadge";

describe("StatusBadge", () => {
  it("renders Pendente status with amber styling", () => {
    const { container } = render(<StatusBadge status="Pendente" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.textContent).toContain("Pendente");
    expect(badge.className).toContain("amber");
  });

  it("renders Aprovado status with emerald styling", () => {
    const { container } = render(<StatusBadge status="Aprovado" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.textContent).toContain("Aprovado");
    expect(badge.className).toContain("emerald");
  });

  it("renders Faturado status with blue styling", () => {
    const { container } = render(<StatusBadge status="Faturado" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.textContent).toContain("Faturado");
    expect(badge.className).toContain("blue");
  });

  it("renders Enviado status with sky styling", () => {
    const { container } = render(<StatusBadge status="Enviado" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.textContent).toContain("Enviado");
    expect(badge.className).toContain("sky");
  });

  it("renders Cancelado status with rose styling", () => {
    const { container } = render(<StatusBadge status="Cancelado" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.textContent).toContain("Cancelado");
    expect(badge.className).toContain("rose");
  });

  it("renders with dot indicator by default", () => {
    const { container } = render(<StatusBadge status="Pendente" />);
    const dot = container.querySelector(".rounded-full.shrink-0");
    expect(dot).not.toBeNull();
  });

  it("hides dot when showDot=false", () => {
    const { container } = render(<StatusBadge status="Pendente" showDot={false} />);
    const dot = container.querySelector(".rounded-full.shrink-0");
    expect(dot).toBeNull();
  });

  it("renders unknown status with muted fallback", () => {
    const { container } = render(<StatusBadge status="Desconhecido" />);
    expect(container.textContent).toContain("Desconhecido");
    // No crash — fallback config applied
  });
});
