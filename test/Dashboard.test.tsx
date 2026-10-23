import { render, screen } from "@testing-library/react";
import Dashboard, { metricas } from "../src/Dashboard.tsx";
import { makeClient, makeClientSinDeuda, makeClientSinRegistros } from "./fixtures";

describe("metricas", () => {
  it("calcula totales y tasa de recuperación", () => {
    const m = metricas([makeClient(), makeClientSinDeuda()]);
    // cliente 1: fiado 120, abono 20 | cliente 2: fiado 100, abono 100
    expect(m.totalFiado).toBe(220);
    expect(m.totalAbonado).toBe(120);
    expect(m.totalPorCobrar).toBe(100);
    expect(m.clientesConDeuda).toBe(1);
    expect(m.tasaRecuperacion).toBeCloseTo((120 / 220) * 100);
  });

  it("sin clientes devuelve todo en cero sin dividir por cero", () => {
    const m = metricas([]);
    expect(m.totalPorCobrar).toBe(0);
    expect(m.tasaRecuperacion).toBe(0);
  });
});

describe("Dashboard (componente)", () => {
  it("muestra las métricas y el top de deudores", () => {
    render(<Dashboard clientes={[makeClient()]} />);
    expect(screen.getByText("Total por cobrar")).toBeInTheDocument();
    expect(screen.getAllByText("C$ 100.00").length).toBeGreaterThan(0);
    expect(screen.getByText(/#1 Ana López/)).toBeInTheDocument();
    expect(screen.getByText("17%")).toBeInTheDocument(); // 20/120 recuperado
  });

  it("muestra la actividad reciente con signo según el tipo", () => {
    render(<Dashboard clientes={[makeClient()]} />);
    expect(screen.getByText("Actividad reciente")).toBeInTheDocument();
    expect(screen.getByText("+C$ 120.00")).toBeInTheDocument(); // fiado
    expect(screen.getByText("− C$ 20.00")).toBeInTheDocument(); // abono
  });

  it("con clientes al día muestra los estados vacíos", () => {
    render(<Dashboard clientes={[makeClientSinDeuda()]} />);
    expect(
      screen.getByText("¡Sin deudas! Todos están al corriente."),
    ).toBeInTheDocument();
  });

  it("sin clientes muestra actividad vacía", () => {
    render(<Dashboard clientes={[]} />);
    expect(screen.getByText("Sin actividad aún.")).toBeInTheDocument();
    expect(makeClientSinRegistros().items).toHaveLength(0);
  });

  it("sin clientes guía al usuario con la tarjeta de bienvenida", () => {
    render(<Dashboard clientes={[]} />);
    expect(screen.getByText(/Bienvenido a VentaFlow/)).toBeInTheDocument();
    expect(screen.getByText(/pestaña/)).toBeInTheDocument();
  });
});
