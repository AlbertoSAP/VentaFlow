import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Logo } from "../../../src/components/shared/Logo.tsx";
import { Wrap } from "../../../src/components/shared/Wrap.tsx";
import { Seg } from "../../../src/components/shared/Seg.tsx";
import { AvisoOk } from "../../../src/components/shared/AvisoOk.tsx";
import { ErrorMsg } from "../../../src/components/shared/Errorhelper.tsx";
import { ShowPwButton } from "../../../src/components/shared/ShowPwButton.tsx";
import { TotalBox } from "../../../src/components/shared/TotalBox.tsx";
import { Totals } from "../../../src/components/shared/Totals.tsx";
import { segBtnCls } from "../../../src/components/shared/SegBtnCls.tsx";
import { navBtnCls } from "../../../src/components/shared/navBtnCls.tsx";
import { makeClient } from "../../fixtures";

// Piezas chicas compartidas: cada una con su prueba propia.
describe("Logo", () => {
  it("muestra el monograma y el nombre", () => {
    render(<Logo />);
    expect(screen.getByText("VF")).toBeInTheDocument();
    expect(screen.getByText(/Venta/)).toBeInTheDocument();
  });
});

describe("Wrap", () => {
  it("ancho por defecto, angosto y amplio", () => {
    const { container, rerender } = render(
      <Wrap>
        <p>hola</p>
      </Wrap>,
    );
    expect(container.querySelector("main")?.className).toContain("max-w-3xl");
    rerender(
      <Wrap narrow>
        <p>hola</p>
      </Wrap>,
    );
    expect(container.querySelector("main")?.className).toContain("max-w-md");
    rerender(
      <Wrap wide>
        <p>hola</p>
      </Wrap>,
    );
    expect(container.querySelector("main")?.className).toContain("max-w-5xl");
  });
});

describe("Seg", () => {
  it("renderiza sus botones", () => {
    render(
      <Seg>
        <button>Uno</button>
        <button>Dos</button>
      </Seg>,
    );
    expect(screen.getByRole("button", { name: "Uno" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dos" })).toBeInTheDocument();
  });
});

describe("AvisoOk", () => {
  it("anuncia el mensaje como estado", () => {
    render(<AvisoOk>Guardado</AvisoOk>);
    expect(screen.getByRole("status")).toHaveTextContent("Guardado");
  });
});

describe("ErrorMsg", () => {
  it("muestra el error", () => {
    render(<ErrorMsg>Algo falló</ErrorMsg>);
    expect(screen.getByText("Algo falló")).toBeInTheDocument();
  });
});

describe("ShowPwButton", () => {
  it("alterna su etiqueta y llama a onToggle", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    const { rerender } = render(
      <ShowPwButton show={false} onToggle={onToggle} />,
    );
    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<ShowPwButton show onToggle={onToggle} />);
    expect(
      screen.getByRole("button", { name: "Ocultar contraseña" }),
    ).toBeInTheDocument();
  });
});

describe("TotalBox", () => {
  it("muestra la deuda en rojo y el cero en verde", () => {
    const { rerender } = render(<TotalBox monto={100} />);
    expect(screen.getByText("C$ 100.00")).toBeInTheDocument();
    expect(screen.getByText("C$ 100.00").className).toContain("text-red-600");
    rerender(<TotalBox monto={0} />);
    expect(screen.getByText("C$ 0.00").className).toContain(
      "text-emerald-600",
    );
  });
});

describe("Totals", () => {
  it("muestra total fiado y total abonado sin saldo a favor", () => {
    render(<Totals cliente={makeClient({ id: "a1" })} />);
    expect(screen.getByText("Total fiado:")).toBeInTheDocument();
    expect(screen.getByText("C$ 120.00")).toBeInTheDocument();
    expect(screen.getByText("Total abonado:")).toBeInTheDocument();
    expect(screen.getByText("− C$ 20.00")).toBeInTheDocument();
    expect(screen.queryByText("Saldo a favor:")).not.toBeInTheDocument();
  });

  it("si los abonos superan el fiado muestra el saldo a favor", () => {
    render(
      <Totals
        cliente={makeClient({
          id: "a1",
          pagos: [{ id: "p1", monto: 200, fecha: 1791845068683 }],
        })}
      />,
    );
    expect(screen.getByText("Saldo a favor:")).toBeInTheDocument();
    expect(screen.getByText("+ C$ 80.00")).toBeInTheDocument();
  });
});

describe("segBtnCls / navBtnCls", () => {
  it("el estado activo se distingue del inactivo", () => {
    expect(segBtnCls(true)).toContain("bg-white");
    expect(segBtnCls(false)).toContain("text-slate-500");
    expect(navBtnCls(true)).toContain("bg-slate-900");
    expect(navBtnCls(false)).toContain("text-slate-500");
    expect(segBtnCls(true)).not.toBe(segBtnCls(false));
    expect(navBtnCls(true)).not.toBe(navBtnCls(false));
  });
});
