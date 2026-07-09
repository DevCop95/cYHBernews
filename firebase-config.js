import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyA3VP-eq3En0rD2fAXd_mi9E60rdTO_e1U",
  authDomain: "cyhbernews.firebaseapp.com",
  projectId: "cyhbernews",
  storageBucket: "cyhbernews.firebasestorage.app",
  messagingSenderId: "363457293427",
  appId: "1:363457293427:web:3a11cb9d89ff1922850e06",
  measurementId: "G-5JZC1B2HVX"
};

// Initialize Firebase
let app = null;
let db = null;
let analytics = null;
let appCheck = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  analytics = getAnalytics(app);
  
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (!isLocalhost) {
    // Inicialización de App Check para bloquear bots en producción
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6Lc1eDMtAAAAACAMMwpxUm2pNziMKOrhYUoKTyFV'),
      isTokenAutoRefreshEnabled: true
    });
  } else {
    // Por defecto, desactivamos App Check en localhost para que Firestore funcione sin registrar tokens de depuración.
    // Si necesitas probar App Check localmente, descomenta la línea de abajo y registra el token generado en la consola de Firebase:
    // self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    console.log("[Firebase Config] App Check omitido en localhost para desarrollo local.");
  }
} catch (error) {
  console.error("Error inicializando Firebase:", error);
}

export { db, doc, getDoc, setDoc, updateDoc, increment, analytics, appCheck };
