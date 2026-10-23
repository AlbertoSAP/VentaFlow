import { initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

/* ============================================================
   Configuración de Firebase: los valores viven en el archivo
   .env de la raíz del proyecto (variables VITE_FIREBASE_*).
   Ver .env.example para la plantilla. En producción (Vercel)
   hay que declarar las mismas variables en el panel del sitio.
   ============================================================ */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
  throw new Error(
    "Falta la configuración de Firebase: revisa que el archivo .env exista y tenga las variables VITE_FIREBASE_* (ver .env.example).",
  );
}

/** App principal: su sesión es la del usuario que está usando la app */
export const app = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const database: Database = getDatabase(app);
