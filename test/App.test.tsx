import { render, screen } from "@testing-library/react";
import App from "../src/App.tsx";

// App ya es solo el envoltorio (BrowserRouter + Access): Access se
// mockea y su puerta se prueba en Access.test.
jest.mock("../src/features/access/Access.tsx", () => ({
  Access: () => <div data-testid="access" />,
}));

describe("App", () => {
  it("renderiza la puerta de acceso dentro del router", () => {
    render(<App />);
    expect(screen.getByTestId("access")).toBeInTheDocument();
  });
});
