// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBv0g2gejMRNsD4INV80ODkYS2QPyCLj30",
    authDomain: "gestione-scuola-calcio-43987.firebaseapp.com",
    projectId: "gestione-scuola-calcio-43987",
    storageBucket: "gestione-scuola-calcio-43987.firebasestorage.app",
    messagingSenderId: "625497921694",
    appId: "1:625497921694:web:0e883838e8108a6ced438f",
    measurementId: "G-N1FSZNKS7N"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Persistenza offline
enableMultiTabIndexedDbPersistence(db).catch(err => {
    console.warn("Persistenza offline non abilitata:", err.code);
});
