import { initializeApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

/* ============================================================
   ⚠️ PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE
   La encuentras en: consola de Firebase > Configuración del
   proyecto > "Tus apps" > Configuración del SDK
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyBtqDz9U8y40a7I-ql5R0zyRsbHLk8BQLY",
  authDomain: "app-venta-f07d9.firebaseapp.com",
  databaseURL:
    "https://app-venta-f07d9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "app-venta-f07d9",
  storageBucket: "app-venta-f07d9.firebasestorage.app",
  messagingSenderId: "574283791715",
  appId: "1:574283791715:web:b9cf21e487350515426756",
  measurementId: "G-HKD7WYCYES",
};

const app = initializeApp(firebaseConfig);
export const database: Database = getDatabase(app);
