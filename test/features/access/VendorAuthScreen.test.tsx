import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VendorAuthScreen } from "../../../src/features/access/VendorAuthScreen.tsx";

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

jest.mock("@/components/shared/Seg", () => ({
  Seg: ({ children }: { children?: React.ReactNode }) => (
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
  window.history.pushState({}, "", "/vendedor");
});

describe("VendorAuthScreen", () => {
  it("inicia sesión con correo y contraseña", async () => {
    const user = userEvent.setup();
    const loginVendor = jest.fn(async () => {});
    render(
      <VendorAuthScreen
        onLoginVendor={loginVendor}
        onRegisterVendor={jest.fn(async () => {})}
      />,
    );

    await user.type(screen.getByPlaceholderText("Tu correo *"), "juan@x.com");
    await user.type(screen.getByPlaceholderText("Contraseña *"), "secreto");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(loginVendor).toHaveBeenCalledWith("juan@x.com", "secreto");
  });

  it("el registro pide el nombre y crea la cuenta de vendedor", async () => {
    const user = userEvent.setup();
    const registerVendor = jest.fn(async () => {});
    render(
      <VendorAuthScreen
        onLoginVendor={jest.fn(async () => {})}
        onRegisterVendor={registerVendor}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Crear cuenta de vendedor" }),
    );
    await user.type(screen.getByPlaceholderText("Tu nombre *"), "Juan");
    await user.type(screen.getByPlaceholderText("Tu correo *"), "juan@x.com");
    await user.type(
      screen.getByPlaceholderText("Contraseña (mín. 6 caracteres) *"),
      "123456",
    );
    await user.click(screen.getByRole("button", { name: "Crear mi cuenta" }));

    expect(registerVendor).toHaveBeenCalledWith(
      "Juan",
      "juan@x.com",
      "123456",
    );
  });

  it("explica para qué sirve la app", () => {
    render(
      <VendorAuthScreen
        onLoginVendor={jest.fn(async () => {})}
        onRegisterVendor={jest.fn(async () => {})}
      />,
    );
    expect(screen.getByText(/Lleva tus fiados sin papel/)).toBeInTheDocument();
  });

  it("el botón Mostrar contraseña revela y oculta la clave", async () => {
    const user = userEvent.setup();
    render(
      <VendorAuthScreen
        onLoginVendor={jest.fn(async () => {})}
        onRegisterVendor={jest.fn(async () => {})}
      />,
    );

    const input = screen.getByPlaceholderText(
      "Contraseña *",
    ) as HTMLInputElement;
    expect(input.type).toBe("password");
    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );
    expect(input.type).toBe("text");
    await user.click(
      screen.getByRole("button", { name: "Ocultar contraseña" }),
    );
    expect(input.type).toBe("password");
  });

  it("un login fallido muestra el error traducido", async () => {
    const user = userEvent.setup();
    const loginVendor = jest.fn(async () => {
      throw { code: "auth/invalid-credential" };
    });
    render(
      <VendorAuthScreen
        onLoginVendor={loginVendor}
        onRegisterVendor={jest.fn(async () => {})}
      />,
    );

    await user.type(screen.getByPlaceholderText("Tu correo *"), "juan@x.com");
    await user.type(screen.getByPlaceholderText("Contraseña *"), "mala");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Error de prueba")).toBeInTheDocument();
  });
});
