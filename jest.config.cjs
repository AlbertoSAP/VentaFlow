/** Jest + React Testing Library.
 *  Firebase queda simulado con los fakes de test/fakes/ para que
 *  ninguna prueba toque el proyecto real. */
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/test"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["babel-jest"],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.css$": "<rootDir>/test/fakes/styleMock.cjs",
    "^firebase/app$": "<rootDir>/test/fakes/firebaseApp.ts",
    "^firebase/auth$": "<rootDir>/test/fakes/firebaseAuth.ts",
    "^firebase/database$": "<rootDir>/test/fakes/firebaseDatabase.ts",
    "/firebase\\.ts$": "<rootDir>/test/fakes/firebaseModule.ts",
  },
};
