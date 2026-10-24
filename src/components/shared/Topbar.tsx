import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { ReactNode, useRef, useState } from "react";
import { Logo } from "./Logo";

export function Topbar({
  children,
  menu = false,
  onLogoPress,
}: {
  children?: ReactNode;
  /** true = la navegación se colapsa en hamburguesa en móvil */
  menu?: boolean;
  /** gesto oculto: mantener presionado el logo ~1 s (acceso vendedor
   *  desde la app instalada, que siempre abre en la ruta cliente) */
  onLogoPress?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const cancelPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const startPress = () => {
    if (!onLogoPress) return;
    cancelPress();
    pressTimer.current = window.setTimeout(onLogoPress, 900);
  };
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="relative mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
        {onLogoPress ? (
          <span
            data-testid="logo"
            className="select-none [-webkit-touch-callout:none]"
            onPointerDown={startPress}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Logo />
          </span>
        ) : (
          <Logo />
        )}
        {menu ? (
          <>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 sm:hidden [&_svg]:size-5.5"
              aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={abierto}
              onClick={() => setAbierto(!abierto)}
            >
              {abierto ? <X /> : <Menu />}
            </button>
            <nav
              onClick={() => setAbierto(false)}
              className={cn(
                "absolute inset-x-4 top-full z-50 mt-2 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl max-sm:[&>button]:text-left sm:static sm:mt-0 sm:flex sm:flex-row sm:items-center sm:gap-1.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none",
                abierto ? "flex" : "hidden sm:flex",
              )}
            >
              {children}
            </nav>
          </>
        ) : (
          children
        )}
      </div>
    </header>
  );
}
