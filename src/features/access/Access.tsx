import { Topbar } from "@/components/shared/Topbar";
import { Wrap } from "@/components/shared/Wrap";
import { useAuth } from "@/hooks/useAuth";
import { AuthRoutes } from "@/routes";
import { VendorApp } from "../vendor/VendorApp";
import ClientApp from "../client/ClientApp";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

  const logoutHandle = async () => {
    await logout();
    navigate("/");
  };

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
      <AuthRoutes
        loginVendor={loginVendor}
        registerVendor={registerVendor}
        loginClient={loginClient}
      />
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
    return <ClientApp clientUid={user.uid} onLogout={logoutHandle} />;
  }

  // Hay sesión pero ningún registro asociado (ej: la cuenta quedó
  // huérfana porque su registro fue eliminado por el vendedor).
  return (
    <div className="min-h-screen">
      <Topbar>
        <Button variant="outline" size="sm" onClick={() => void logoutHandle()}>
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
