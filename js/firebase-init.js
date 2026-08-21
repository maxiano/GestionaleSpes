/**
 * @file firebase-init.js
 * @brief Gestionale Tecnico - Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 * 
 * Questo software è riservato esclusivamente all'uso interno della società 
 * sportiva Spes Montesacro. Ne è vietata la copia, la riproduzione o la 
 * distribuzione non autorizzata.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const firebaseConfig  = {
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

// --- AGGIUNTI QUESTE RIGHE PER RENDERLI GLOBALI ---
window.db = db;
window.auth = auth;
window.firebaseConfig = firebaseConfig;
