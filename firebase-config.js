import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

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

try {
  // Solo inicializar si la key no es la de por defecto
  if (firebaseConfig.apiKey !== "TU_API_KEY") {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    analytics = getAnalytics(app);
  } else {
    console.warn("⚠️ Firebase no está configurado. Reemplaza las credenciales en firebase-config.js");
  }
} catch (error) {
  console.error("Error inicializando Firebase:", error);
}

export { db, doc, getDoc, setDoc, updateDoc, increment, analytics };
