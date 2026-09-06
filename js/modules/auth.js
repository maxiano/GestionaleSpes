/**
 * @file modules/auth.js
 * @brief Gestione autenticazione, sessione utente e sicurezza password
 * @project Gestionale Tecnico - Spes Montesacro
 */

import { auth, db } from '../firebase-init.js';
import { normalizeUserProfile } from '../config.js';
import { AppState } from '../state.js';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    EmailAuthProvider, 
    reauthenticateWithCredential, 
    updatePassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function initAuth({ onLoginSuccess, onLogout, onParentLogin }) {
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email')?.value?.trim();
            const password = document.getElementById('login-password')?.value;
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (err) {
                alert("Errore di accesso: " + err.message);
            }
        });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => signOut(auth));
    }

    initPasswordChangeModal();

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (!userDoc.exists()) {
                    alert("Accesso negato: il profilo utente non esiste o è stato rimosso.");
                    await signOut(auth);
                    return;
                }

                const profile = normalizeUserProfile(userDoc.data());
                AppState.setCurrentUserProfile(profile);

                if (profile.role === 'parent') {
                    if (onParentLogin) onParentLogin(profile);
                } else {
                    if (onLoginSuccess) onLoginSuccess(profile);
                }
            } catch (err) {
                console.error("Errore recupero profilo:", err);
            }
        } else {
            AppState.reset();
            if (onLogout) onLogout();
        }
    });
}

function initPasswordChangeModal() {
    const modalPassword = document.getElementById('modal-change-password');
    const navBtnPassword = document.getElementById('nav-btn-password');
    const btnCloseModal = document.getElementById('btn-close-modal-password');
    const formPassword = document.getElementById('form-change-password');

    if (navBtnPassword && modalPassword) {
        navBtnPassword.addEventListener('click', () => modalPassword.classList.remove('hidden'));
    }

    if (btnCloseModal && modalPassword && formPassword) {
        btnCloseModal.addEventListener('click', () => {
            modalPassword.classList.add('hidden');
            formPassword.reset();
        });
    }

    if (formPassword && modalPassword) {
        formPassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPass = document.getElementById('current-password')?.value;
            const newPass = document.getElementById('new-password')?.value;
            const user = auth.currentUser;
            if (!user?.email) return alert("Nessun utente autenticato.");

            try {
                const cred = EmailAuthProvider.credential(user.email, currentPass);
                await reauthenticateWithCredential(user, cred);
                await updatePassword(user, newPass);
                alert("Password aggiornata con successo!");
                formPassword.reset();
                modalPassword.classList.add('hidden');
            } catch (err) {
                alert("Errore durante il cambio password: " + err.message);
            }
        });
    }
}