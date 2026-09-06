/**
 * @file firebase-init.js
 * @brief Inizializzazione centralizzata di Firebase SDK (v10 Modular)
 * @project Gestionale Tecnico - Spes Montesacro
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    enableMultiTabIndexedDbPersistence 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const firebaseConfig = window.firebaseConfig || {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

try {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Persistenza offline non disponibile in schede multiple contemporanee.");
        } else if (err.code === 'unimplemented') {
            console.warn("Il browser non supporta la persistenza IndexedDb.");
        }
    });
} catch (e) {
    console.warn("Nota persistenza Firebase:", e);
}