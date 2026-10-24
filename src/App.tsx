import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import {
  fmtMoney,
  fmtFecha,
  deuda,
  subscribeOwnClient,
  type Client,
} from "./storage.ts";
import { useAuth } from "./hooks/useAuth.ts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VendorAuthScreen } from "./features/access/VendorAuthScreen.tsx";
import {
  moneyCls,
  pagadoCls,
  TotalBox,
} from "./components/shared/TotalBox.tsx";
import { Wrap } from "./components/shared/Wrap.tsx";
import { Topbar } from "./components/shared/Topbar.tsx";
import { ClientAuthScreen } from "./features/client/ClientAuthScreen.tsx";
import { VendorApp } from "./features/vendor/VendorApp.tsx";
import { Totals } from "./components/shared/Totals.tsx";

/**
 * Enrutado con React Router: /vendedor es la entrada de vendedores
 * (login + registro); cualquier otra ruta —incluida la raíz— es la
 * entrada de clientes, que SOLO ven su propio formulario. Así el
 * cliente nunca ve el acceso ni el registro de un vendedor: a cada
 * quien se le comparte su enlace. Con la sesión iniciada manda el
 * rol, no la ruta: el vendedor ve su panel y el cliente su estado.
 */
function App() {
  return (
    <BrowserRouter>
      <Acceso />
    </BrowserRouter>
  );
}

function Acceso() {
  const {
    user,
    role,
    resolving,
    estado,
    esAdmin,
    registerVendor,
    loginVendor,
    loginClient,
    logout,
  } = useAuth();
  const navigate = useNavigate();

  if (resolving) {
    return (
      <div className="min-h-screen">
        <Topbar />
        <Wrap>
          <p className="py-16 text-center text-muted-foreground">Conectando…</p>
        </Wrap>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route
          path="/vendedor"
          element={
            <VendorAuthScreen
              onLoginVendor={loginVendor}
              onRegisterVendor={registerVendor}
            />
          }
        />
        <Route
          path="*"
          element={
            <ClientAuthScreen
              onLoginClient={loginClient}
              onIrVendedor={() => navigate("/vendedor")}
            />
          }
        />
      </Routes>
    );
  }

  if (role === "vendedor") {
    return (
      <VendorApp
        vendorUid={user.uid}
        onLogout={logout}
        estado={estado}
        esAdmin={esAdmin}
      />
    );
  }

  if (role === "cliente") {
    return <ClientApp clientUid={user.uid} onLogout={logout} />;
  }

  // Hay sesión pero ningún registro asociado (ej: la cuenta quedó
  // huérfana porque su registro fue eliminado por el vendedor).
  return (
    <div className="min-h-screen">
      <Topbar>
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          Salir
        </Button>
      </Topbar>
      <Wrap>
        <p className="py-16 text-center text-muted-foreground">
          Esta cuenta no tiene un registro activo en VentaFlow. Si eras cliente,
          pide a tu vendedor que te registre de nuevo.
        </p>
      </Wrap>
    </div>
  );
}

/* ==================== Vista del cliente (solo lectura) ==================== */

interface ClientProps {
  clientUid: string;
  onLogout: () => Promise<void>;
}

function ClientApp({ clientUid, onLogout }: ClientProps) {
  const [cliente, setCliente] = useState<Client | null | undefined>(undefined);

  useEffect(() => subscribeOwnClient(clientUid, setCliente), [clientUid]);

  return (
    <div className="min-h-screen">
      <Topbar>
        <Button variant="outline" size="sm" onClick={() => void onLogout()}>
          Salir
        </Button>
      </Topbar>

      {cliente === undefined ? (
        <Wrap>
          <p className="py-16 text-center text-muted-foreground">
            Cargando tu registro…
          </p>
        </Wrap>
      ) : cliente === null ? (
        <Wrap>
          <p className="py-16 text-center text-muted-foreground">
            Tu registro no fue encontrado.
          </p>
        </Wrap>
      ) : (
        <Wrap>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Hola, {cliente.name}
              </h2>
              <span className="text-sm text-muted-foreground">
                Este es tu estado de cuenta
              </span>
            </div>
            <TotalBox monto={deuda(cliente)} />
          </div>

          <Card className="gap-2 p-6">
            <h3 className="text-base font-semibold tracking-tight">
              Productos fiados
            </h3>
            {(cliente.items || []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sin productos registrados.
              </p>
            )}
            {(cliente.items || []).map((it) => (
              <div
                className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"
                key={it.id}
              >
                <div className="min-w-0">
                  <strong className="block truncate">{it.descripcion}</strong>
                  <div className="text-xs text-muted-foreground">
                    {fmtFecha(it.fecha)} ·{" "}
                    {it.cantidad > 1
                      ? `${it.cantidad} × ${fmtMoney(it.precio)}`
                      : fmtMoney(it.precio)}
                  </div>
                </div>
                <strong className={cn("shrink-0", moneyCls)}>
                  {fmtMoney(it.precio * (it.cantidad || 1))}
                </strong>
              </div>
            ))}
            <Totals cliente={cliente} />
          </Card>

          {(cliente.pagos || []).length > 0 && (
            <Card className="gap-3 p-6">
              <h3 className="text-base font-semibold tracking-tight">
                Mis abonos
              </h3>
              <div className="flex flex-col gap-2">
                {(cliente.pagos || []).map((p) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-emerald-50 px-3.5 py-2 text-sm"
                    key={p.id}
                  >
                    <span className="text-xs text-muted-foreground">
                      {fmtFecha(p.fecha)}
                    </span>
                    <strong className={cn(moneyCls, pagadoCls)}>
                      − {fmtMoney(p.monto)}
                    </strong>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </Wrap>
      )}
    </div>
  );
}

export default App;
