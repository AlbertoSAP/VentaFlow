/** Fake mínimo de firebase/app */
export const initializeApp = jest.fn((_config: unknown, name?: string) => ({
  name: name ?? "[DEFAULT]",
}));
export const deleteApp = jest.fn(async (_app: unknown) => {});
