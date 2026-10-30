import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Topbar } from "../../../src/components/shared/Topbar.tsx";

// Logo es una hoja sin lógica: se mockea para aislar el Topbar
// (el logo real se prueba en shared.test).
jest.mock("@/components/shared/Logo", () => ({
  Logo: () => <span>VF</span>,
}));

describe("Topbar", () => {
  it("sin menú muestra los hijos directo", () => {
    render(
      <Topbar>
        <button>Salir</button>
      </Topbar>,
    );
    expect(screen.getByRole("button", { name: "Salir" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Abrir menú" }),
    ).not.toBeInTheDocument();
  });

  it("el menú hamburguesa abre el panel móvil y se cierra al navegar", async () => {
    const user = userEvent.setup();
    render(
      <Topbar menu>
        <button>Ir</button>
      </Topbar>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(
      screen.getByRole("button", { name: "Cerrar menú" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ir" }));
    expect(
      screen.getByRole("button", { name: "Abrir menú" }),
    ).toBeInTheDocument();
  });

  it("mantener presionado el logo ~1 s dispara onLogoPress", async () => {
    const onLogoPress = jest.fn();
    render(<Topbar onLogoPress={onLogoPress} />);

    fireEvent.pointerDown(screen.getByTestId("logo"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100));
    });
    expect(onLogoPress).toHaveBeenCalledTimes(1);
  });

  it("soltar antes de tiempo no dispara onLogoPress", async () => {
    const onLogoPress = jest.fn();
    render(<Topbar onLogoPress={onLogoPress} />);

    fireEvent.pointerDown(screen.getByTestId("logo"));
    fireEvent.pointerUp(screen.getByTestId("logo"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100));
    });
    expect(onLogoPress).not.toHaveBeenCalled();
  });

  it("sin onLogoPress no hay zona de gesto en el logo", () => {
    render(<Topbar />);
    expect(screen.queryByTestId("logo")).not.toBeInTheDocument();
  });
});
