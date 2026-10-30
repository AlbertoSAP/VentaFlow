import { BrowserRouter } from "react-router-dom";
import { Access } from "./features/access/Access.tsx";

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
      <Access />
    </BrowserRouter>
  );
}

export default App;
