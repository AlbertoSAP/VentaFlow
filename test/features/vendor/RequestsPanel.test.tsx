import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestsPanel } from "../../../src/features/vendor/RequestsPanel.tsx";

// Hijos mockeados: RequestCard tiene sus propias pruebas. El mock
// reenvía la acción tal cual para probar el cableado del panel
// (secciones, conteos, exclusión del propio uid).
jest.mock("../../../src/components/shared/RequestCard.tsx", () => ({
  __esModule: true,
  default: ({
    mapValue,
    onClick,
    state,
  }: {
    mapValue: { id: string; name: string }[];
    onClick: (uid: string, estado: string) => void;
    state: string;
  }) => (
    <div data-testid={`card-${state}`}>
      {mapValue.map((v) => (
        <button key={v.id} onClick={() => onClick(v.id, "aprobado")}>
          Acción {v.name}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("@/components/shared/Wrap", () => ({
  Wrap: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const VENDEDORES = [
  {
    id: "v2",
    name: "Nuevo Vendedor",
    email: "nuevo@x.com",
    created: 2,
    estado: "pendiente" as const,
  },
  {
    id: "v3",
    name: "Aprobada",
    email: "a@x.com",
    created: 3,
    estado: "aprobado" as const,
  },
];

function renderPanel(props: Partial<React.ComponentProps<typeof RequestsPanel>> = {}) {
  return render(
    <RequestsPanel
      vendedores={VENDEDORES}
      miUid="vendor-1"
      onSetEstado={jest.fn()}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RequestsPanel", () => {
  it("agrupa por estado con sus conteos y excluye al propio vendedor", () => {
    renderPanel({
      vendedores: [
        ...VENDEDORES,
        {
          id: "vendor-1",
          name: "Yo",
          email: "yo@x.com",
          created: 1,
          estado: "pendiente" as const,
        },
      ],
    });

    expect(screen.getByText("Pendientes (1)")).toBeInTheDocument();
    expect(screen.getByText("Aprobados (1)")).toBeInTheDocument();
    expect(screen.getByText("Acción Nuevo Vendedor")).toBeInTheDocument();
    expect(screen.queryByText("Acción Yo")).not.toBeInTheDocument();
    expect(screen.queryByText("Rechazados")).not.toBeInTheDocument();
  });

  it("sin pendientes lo dice y sin aprobados también", () => {
    renderPanel({ vendedores: [] });
    expect(
      screen.getByText("No hay solicitudes pendientes."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Todavía no aprobaste a ningún vendedor."),
    ).toBeInTheDocument();
  });

  it("muestra la sección de rechazados solo cuando hay", () => {
    renderPanel({
      vendedores: [
        {
          id: "v4",
          name: "Rechazado",
          email: "r@x.com",
          created: 4,
          estado: "rechazado" as const,
        },
      ],
    });
    expect(screen.getByText("Rechazados (1)")).toBeInTheDocument();
    expect(screen.getByTestId("card-rechazado")).toBeInTheDocument();
  });

  it("la acción de una tarjeta llega al padre con uid y estado", async () => {
    const user = userEvent.setup();
    const onSetEstado = jest.fn();
    renderPanel({ onSetEstado });

    await user.click(
      screen.getByRole("button", { name: "Acción Nuevo Vendedor" }),
    );
    expect(onSetEstado).toHaveBeenCalledWith("v2", "aprobado");
  });
});
