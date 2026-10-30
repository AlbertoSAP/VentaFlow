import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequestCard from "../../../src/components/shared/RequestCard.tsx";

// Row es una función pura de render (no un componente con estado):
// se prueba junto a RequestCard, que es quien la usa.
const VENDOR = {
  id: "v1",
  name: "Nuevo",
  email: "nuevo@x.com",
  created: 1,
};

describe("RequestCard", () => {
  it("pendiente: Aprobar aprueba y Rechazar rechaza", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <RequestCard
        mapValue={[{ ...VENDOR, estado: "pendiente" as const }]}
        onClick={onClick}
        state="pendiente"
      />,
    );

    expect(screen.getByText("Nuevo")).toBeInTheDocument();
    // El email comparte nodo con la fecha de registro.
    expect(screen.getByText(/nuevo@x\.com/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aprobar" }));
    expect(onClick).toHaveBeenCalledWith("v1", "aprobado");
    await user.click(screen.getByRole("button", { name: "Rechazar" }));
    expect(onClick).toHaveBeenCalledWith("v1", "rechazado");
  });

  it("aprobado: solo Revocar, y vuelve a pendiente (no a rechazado)", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <RequestCard
        mapValue={[{ ...VENDOR, estado: "aprobado" as const }]}
        onClick={onClick}
        state="aprobado"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Aprobar" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Revocar acceso" }));
    expect(onClick).toHaveBeenCalledWith("v1", "pendiente");
  });

  it("rechazado: solo Aprobar", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <RequestCard
        mapValue={[{ ...VENDOR, estado: "rechazado" as const }]}
        onClick={onClick}
        state="rechazado"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Aprobar" }));
    expect(onClick).toHaveBeenCalledWith("v1", "aprobado");
    expect(
      screen.queryByRole("button", { name: "Rechazar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Revocar acceso" }),
    ).not.toBeInTheDocument();
  });
});
