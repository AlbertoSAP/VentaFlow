import { Topbar } from "@/components/shared/Topbar";
import { Wrap } from "@/components/shared/Wrap";
import { useAuth } from "@/hooks/useAuth";
import { Route, Routes, useNavigate } from "react-router-dom";
import { VendorAuthScreen } from "./VendorAuthScreen";
import { ClientAuthScreen } from "./ClientAuthScreen";
import { VendorApp } from "../vendor/VendorApp";
import ClientApp from "../client/ClientApp";
import { Button } from "@/components/ui/button";

export function Access() {
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
