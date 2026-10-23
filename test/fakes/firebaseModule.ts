/** Sustituto de src/firebase.ts para las pruebas (sin import.meta.env). */
export const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "fake.firebaseapp.com",
  databaseURL: "https://fake.firebaseio.com",
  projectId: "fake-project",
  storageBucket: "fake.appspot.com",
  messagingSenderId: "0",
  appId: "1:0:web:fake",
  measurementId: "G-FAKE",
};

export const app = { name: "[DEFAULT]" };
export const auth = { name: "fake-auth" };
export const database = { name: "fake-database" };
