import "@testing-library/jest-dom";

// jsdom no expone structuredClone (los navegadores sí): se emula
// para las pruebas, la app lo usa al guardar cambios de un cliente.
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = ((value: unknown) =>
    JSON.parse(JSON.stringify(value))) as typeof structuredClone;
}
