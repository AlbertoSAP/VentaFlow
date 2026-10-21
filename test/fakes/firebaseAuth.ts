/** Fake controlable de firebase/auth.
 *  Las pruebas ajustan el comportamiento con __fakeAuth. */

type AuthCallback = (user: unknown) => void;

export const __fakeAuth = {
  listener: null as AuthCallback | null,
  createUserImpl: jest.fn(
    async (_auth: unknown, email: string, _password: string) => ({
      user: { uid: `uid-${email}`, email },
    }),
  ),
  signInImpl: jest.fn(async (_auth: unknown, email: string) => ({
    user: { uid: `uid-${email}`, email },
  })),
  emit(user: unknown) {
    this.listener?.(user);
  },
  reset() {
    this.listener = null;
    this.createUserImpl.mockClear();
    this.signInImpl.mockClear();
    this.createUserImpl.mockImplementation(
      async (_auth: unknown, email: string) => ({
        user: { uid: `uid-${email}`, email },
      }),
    );
    this.signInImpl.mockImplementation(async (_auth: unknown, email: string) => ({
      user: { uid: `uid-${email}`, email },
    }));
  },
};

export const getAuth = jest.fn((_app?: unknown) => ({ name: "fake-auth" }));

export const onAuthStateChanged = jest.fn(
  (_auth: unknown, cb: AuthCallback) => {
    __fakeAuth.listener = cb;
    return () => {
      __fakeAuth.listener = null;
    };
  },
);

export const createUserWithEmailAndPassword = jest.fn(
  (auth: unknown, email: string, password: string) =>
    __fakeAuth.createUserImpl(auth, email, password),
);

export const signInWithEmailAndPassword = jest.fn(
  (auth: unknown, email: string, password: string) =>
    __fakeAuth.signInImpl(auth, email, password),
);

export const signOut = jest.fn(async (_auth: unknown) => {});
export const deleteUser = jest.fn(async (_user: unknown) => {});
