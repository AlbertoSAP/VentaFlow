import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AwaitScreen } from "../../../src/features/access/AwaitScreen.tsx";

// Hijos mockeados: cada uno tiene sus propias pruebas.
jest.mock("@/components/shared/Topbar", () => ({
  Topbar: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/shared/Wrap", () => ({
  Wrap: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("AwaitScreen", () => {
  it("un vendedor pendiente solo ve la pantalla de espera", () => {
    render(<AwaitScreen estado="pendiente" onLogout={jest.fn()} />);
    expect(screen.getByText(/Por favor espere/)).toBeInTheDocument();
    expect(screen.getByText(/su cuenta será validada/)).toBeInTheDocument();
    expect(
      screen.getByText("Tu cuenta está en revisión"),
    ).toBeInTheDocument();
  });

  it("un vendedor rechazado ve el aviso de no aprobado", () => {
    render(<AwaitScreen estado="rechazado" onLogout={jest.fn()} />);
    expect(
      screen.getByText("Tu cuenta no fue aprobada"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Por favor espere/)).not.toBeInTheDocument();
  });

  it("el botón Salir cierra la sesión", async () => {
    const user = userEvent.setup();
    const onLogout = jest.fn(async () => {});
    render(<AwaitScreen estado="pendiente" onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
