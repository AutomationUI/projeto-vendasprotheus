import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

const CrashingComponent = () => {
  throw new Error("Simulated component crash for test");
};

const SafeComponent = () => <div>Componente Seguro Carregado</div>;

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should render children when there is no error", () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Componente Seguro Carregado")).toBeInTheDocument();
  });

  it("should render fallback UI when child throws error", () => {
    render(
      <ErrorBoundary>
        <CrashingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
  });

  it("should render custom fallback if provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom Error UI</div>}>
        <CrashingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom Error UI")).toBeInTheDocument();
  });
});

describe("RouteErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should render children in valid route", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RouteErrorBoundary>
          <SafeComponent />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText("Componente Seguro Carregado")).toBeInTheDocument();
  });

  it("should catch route errors and render fallback UI", () => {
    render(
      <MemoryRouter initialEntries={["/produtos"]}>
        <RouteErrorBoundary>
          <CrashingComponent />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText("Erro na página")).toBeInTheDocument();
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
  });
});
