import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientAuthScreen } from "../../../src/features/client/ClientAuthScreen.tsx";

// Hijos mockeados: cada uno tiene sus propias pruebas. El Topbar
// mock expone el gesto del logo como un botón para probar el cableado
// (el gesto real de 900 ms se prueba en Topbar.test).
jest.mock("@/components/shared/Topbar", () => ({
  Topbar: ({
    children,
    onLogoPress,
  }: {
    children?: React.ReactNode;
    onLogoPress?: () => void;
  }) => (
    <div>
      {onLogoPress && (
        <button data-testid="logo-btn" onClick={onLogoPress}>
          logo
        </button>
      )}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/Wrap", () => ({
  Wrap: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/shared/ShowPwButton", () => ({
  ShowPwButton: ({
    show,
    onToggle,
  }: {
    show: boolean;
    onToggle: () => void;
  }) => (
    <button onClick={onToggle}>
      {show ? "Ocultar contraseña" : "Mostrar contraseña"}
    </button>
  ),
}));

jest.mock("@/components/shared/Errorhelper", () => ({
  ErrorMsg: ({ children }: { children?: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

jest.mock("@/hooks/useAuth", () => ({
  mapAuthError: () => "Error de prueba",
}));

beforeEach(() => {
  jest.clearAllMocks();
});

function renderScreen(props: Partial<React.ComponentProps<typeof ClientAuthScreen>> = {}) {
  return render(
    <ClientAuthScreen
      onLoginClient={jest.fn(async () => {})}
      onIrVendedor={jest.fn()}
      {...props}
    />,
  );
}

describe("ClientAuthScreen", () => {
  it("el cliente entra con su teléfono y NO ve nada de vendedores", async () => {
    const user = userEvent.setup();
    const loginClient = jest.fn(async () => {});
    renderScreen({ onLoginClient: loginClient });

    // Ni registro, ni login de vendedor, ni su formulario de correo:
    expect(
      screen.queryByRole("button", { name: "Crear cuenta de vendedor" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Tu correo *"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Tu nombre *"),
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Tu número de teléfono *"),
      "88887777",
    );
    await user.type(screen.getByPlaceholderText("Contraseña *"), "temporal");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(loginClient).toHaveBeenCalledWith("88887777", "temporal");
  });

  it("el botón Mostrar contraseña revela y oculta la clave", async () => {
    const user = userEvent.setup();
    renderScreen();

    const input = screen.getByPlaceholderText(
      "Contraseña *",
    ) as HTMLInputElement;
    expect(input.type).toBe("password");
    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );
    expect(input.type).toBe("text");
  });

  it("un login fallido muestra el error traducido", async () => {
    const user = userEvent.setup();
    const loginClient = jest.fn(async () => {
      throw { code: "auth/invalid-credential" };
    });
    renderScreen({ onLoginClient: loginClient });

    await user.type(
      screen.getByPlaceholderText("Tu número de teléfono *"),
      "88887777",
    );
    await user.type(screen.getByPlaceholderText("Contraseña *"), "mala");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Error de prueba")).toBeInTheDocument();
  });

  it("el gesto del logo cablea hacia el acceso de vendedor", async () => {
    const user = userEvent.setup();
    const onIrVendedor = jest.fn();
    renderScreen({ onIrVendedor });

    await user.click(screen.getByTestId("logo-btn"));
    expect(onIrVendedor).toHaveBeenCalledTimes(1);
  });
});
